"""Workspace manager that coordinates file watching, storage, and graceful shutdown."""

import asyncio
import atexit
import os
import signal
import sys
import tempfile
from datetime import datetime
from typing import Optional, Set
import tarfile

from openhands.core.logger import openhands_logger as logger
from .base import WorkspaceStorage
from .file_watcher import SmartFileWatcher


class WorkspaceManager:
    """Manages workspace synchronization, file watching, and graceful shutdown.
    
    Features:
    - Real-time file synchronization with S3/cloud storage
    - Intelligent file watching with burst detection
    - Graceful shutdown with guaranteed final sync
    - Git state preservation
    - Compressed backups for safety
    """
    
    def __init__(
        self,
        storage: WorkspaceStorage,
        conversation_id: str,
        user_id: str,
        workspace_path: str = "/workspace",
        backup_interval: int = 300,  # 5 minutes
    ):
        """Initialize workspace manager.
        
        Args:
            storage: Storage backend for workspace files
            conversation_id: Unique conversation identifier
            user_id: User identifier  
            workspace_path: Local workspace directory path
            backup_interval: Interval for compressed backups in seconds
        """
        self.storage = storage
        self.conversation_id = conversation_id
        self.user_id = user_id
        self.workspace_path = workspace_path
        self.backup_interval = backup_interval
        
        # Remote storage paths
        self.remote_base = f"conversations/{user_id}/{conversation_id}/workspace"
        self.remote_files = f"{self.remote_base}/files"
        self.remote_backups = f"{self.remote_base}/compressed"
        self.remote_git = f"{self.remote_base}/git"
        
        # State tracking
        self.file_watcher: Optional[SmartFileWatcher] = None
        self.sync_lock = asyncio.Lock()
        self.backup_task: Optional[asyncio.Task] = None
        self.is_initialized = False
        self.shutdown_in_progress = False
        
        # Setup shutdown handlers
        self._setup_shutdown_handlers()
        
        logger.info(f"Initialized WorkspaceManager for conversation {conversation_id}")
        
    def _setup_shutdown_handlers(self) -> None:
        """Setup handlers to ensure sync on shutdown."""
        # Handle process signals
        for sig in [signal.SIGTERM, signal.SIGINT]:
            try:
                signal.signal(sig, self._signal_handler)
            except (ValueError, OSError):
                # Might fail in some environments (e.g., threads)
                pass
                
        # Handle normal Python exit
        atexit.register(self._sync_on_exit)
        
    def _signal_handler(self, signum: int, frame) -> None:
        """Handle shutdown signals."""
        logger.info(f"Received signal {signum}, initiating graceful shutdown")
        
        # Create a new event loop if we're in a signal handler
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        # Run final sync with timeout
        try:
            loop.run_until_complete(asyncio.wait_for(self.final_sync(), timeout=30))
        except Exception as e:
            logger.error(f"Error during signal-triggered shutdown: {e}")
            
        # Exit gracefully
        sys.exit(0)
        
    def _sync_on_exit(self) -> None:
        """Atexit handler for final sync."""
        if self.shutdown_in_progress:
            return
            
        logger.info("Python exit detected, performing final sync")
        
        try:
            # Try to get existing loop, create new one if needed
            try:
                loop = asyncio.get_event_loop()
                if loop.is_closed():
                    raise RuntimeError("Loop is closed")
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
            loop.run_until_complete(asyncio.wait_for(self.final_sync(), timeout=30))
        except Exception as e:
            logger.error(f"Error during exit sync: {e}")
            
    async def initialize(self) -> None:
        """Initialize workspace - download existing files or create new workspace."""
        if self.is_initialized:
            logger.warning("WorkspaceManager already initialized")
            return
            
        logger.info(f"Initializing workspace for conversation {self.conversation_id}")
        
        # Ensure workspace directory exists
        os.makedirs(self.workspace_path, exist_ok=True)
        
        # Check if workspace exists in storage
        workspace_exists = await self.storage.exists(self.remote_files)
        
        if workspace_exists:
            logger.info("Downloading existing workspace from storage")
            try:
                await self.storage.download_directory(self.remote_files, self.workspace_path)
                
                # Restore git state if available
                await self._restore_git_state()
                
                logger.info("Successfully restored workspace from storage")
            except Exception as e:
                logger.error(f"Error downloading workspace: {e}")
                # Continue anyway - we'll sync current state
        else:
            logger.info("No existing workspace found, creating new one")
            
        # Initialize file watcher
        self.file_watcher = SmartFileWatcher(
            watch_directory=self.workspace_path,
            on_change_callback=self._on_files_changed
        )
        
        # Start file watching
        await self.file_watcher.start()
        
        # Start periodic backup task
        self.backup_task = asyncio.create_task(self._periodic_backup_loop())
        
        self.is_initialized = True
        logger.info("Workspace initialization complete")
        
    async def _on_files_changed(self, changed_files: Set[str]) -> None:
        """Callback for when files change - sync to storage."""
        async with self.sync_lock:
            if self.shutdown_in_progress:
                return
                
            logger.debug(f"Syncing {len(changed_files)} changed files")
            
            try:
                # Upload changed files
                upload_tasks = []
                for relative_path in changed_files:
                    local_path = os.path.join(self.workspace_path, relative_path)
                    remote_path = f"{self.remote_files}/{relative_path}"
                    
                    if os.path.exists(local_path) and os.path.isfile(local_path):
                        upload_tasks.append(self.storage.upload_file(local_path, remote_path))
                    else:
                        # File was deleted
                        upload_tasks.append(self.storage.delete_file(remote_path))
                        
                # Execute uploads in parallel
                if upload_tasks:
                    await asyncio.gather(*upload_tasks, return_exceptions=True)
                    
                logger.debug(f"Successfully synced {len(changed_files)} files")
                
            except Exception as e:
                logger.error(f"Error syncing files: {e}")
                
    async def _restore_git_state(self) -> None:
        """Restore git repository state including uncommitted changes."""
        git_bundle_path = f"{self.remote_git}/workspace.bundle"
        
        try:
            if await self.storage.exists(git_bundle_path):
                logger.info("Restoring git state from bundle")
                
                with tempfile.NamedTemporaryFile(suffix='.bundle', delete=False) as tmp_file:
                    try:
                        # Download git bundle
                        await self.storage.download_file(git_bundle_path, tmp_file.name)
                        
                        # Check if git repo already exists
                        git_dir = os.path.join(self.workspace_path, '.git')
                        if not os.path.exists(git_dir):
                            # Initialize new git repo and pull from bundle
                            import subprocess
                            subprocess.run(['git', 'init'], cwd=self.workspace_path, check=True, capture_output=True)
                            subprocess.run(['git', 'pull', tmp_file.name], cwd=self.workspace_path, check=True, capture_output=True)
                            logger.info("Git repository restored from bundle")
                        else:
                            logger.debug("Git repository already exists, skipping bundle restore")
                            
                    finally:
                        if os.path.exists(tmp_file.name):
                            os.unlink(tmp_file.name)
                            
        except Exception as e:
            logger.warning(f"Could not restore git state: {e}")
            # Not a critical error - continue without git state
            
    async def _preserve_git_state(self) -> None:
        """Save current git state including uncommitted changes."""
        git_dir = os.path.join(self.workspace_path, '.git')
        if not os.path.exists(git_dir):
            return
            
        try:
            logger.debug("Preserving git state")
            
            with tempfile.NamedTemporaryFile(suffix='.bundle', delete=False) as tmp_file:
                try:
                    # Create git bundle with all refs and objects
                    import subprocess
                    result = subprocess.run(
                        ['git', 'bundle', 'create', tmp_file.name, '--all'],
                        cwd=self.workspace_path,
                        capture_output=True,
                        text=True
                    )
                    
                    if result.returncode == 0:
                        # Upload bundle
                        bundle_remote_path = f"{self.remote_git}/workspace.bundle"
                        await self.storage.upload_file(tmp_file.name, bundle_remote_path)
                        logger.debug("Git state preserved successfully")
                    else:
                        logger.warning(f"Git bundle creation failed: {result.stderr}")
                        
                finally:
                    if os.path.exists(tmp_file.name):
                        os.unlink(tmp_file.name)
                        
        except Exception as e:
            logger.warning(f"Could not preserve git state: {e}")
            # Not critical - continue with other sync operations
            
    async def _create_compressed_backup(self) -> None:
        """Create a compressed backup of the entire workspace."""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_name = f"backup-{timestamp}.tar.gz"
        
        try:
            logger.debug(f"Creating compressed backup: {backup_name}")
            
            with tempfile.NamedTemporaryFile(suffix='.tar.gz', delete=False) as tmp_file:
                try:
                    # Create tar.gz archive excluding certain directories
                    with tarfile.open(tmp_file.name, 'w:gz') as tar:
                        tar.add(
                            self.workspace_path,
                            arcname='.',
                            filter=lambda x: None if any(
                                pattern in x.name for pattern in [
                                    'node_modules', '__pycache__', '.pytest_cache',
                                    '.git/objects', '.git/refs', '.git/logs',
                                    '.vscode', '.idea'
                                ]
                            ) else x
                        )
                        
                    # Upload backup
                    backup_remote_path = f"{self.remote_backups}/{backup_name}"
                    await self.storage.upload_file(tmp_file.name, backup_remote_path)
                    
                    logger.info(f"Created compressed backup: {backup_name}")
                    
                finally:
                    if os.path.exists(tmp_file.name):
                        os.unlink(tmp_file.name)
                        
        except Exception as e:
            logger.error(f"Error creating compressed backup: {e}")
            
    async def _periodic_backup_loop(self) -> None:
        """Periodic task to create compressed backups."""
        while self.is_initialized and not self.shutdown_in_progress:
            try:
                await asyncio.sleep(self.backup_interval)
                
                if not self.shutdown_in_progress:
                    await self._create_compressed_backup()
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in periodic backup: {e}")
                
    async def manual_sync(self) -> None:
        """Manually trigger immediate sync (for agent completion events)."""
        if not self.is_initialized or self.shutdown_in_progress:
            return
            
        logger.info("Manual sync triggered")
        
        # Trigger immediate file watcher sync
        if self.file_watcher:
            await self.file_watcher.trigger_immediate_sync()
            
        # Also do a full directory sync as backup
        async with self.sync_lock:
            try:
                await self.storage.upload_directory(self.workspace_path, self.remote_files)
                logger.debug("Manual directory sync completed")
            except Exception as e:
                logger.error(f"Error in manual directory sync: {e}")
                
    async def final_sync(self) -> None:
        """Perform final sync on shutdown - ensures no data loss."""
        if self.shutdown_in_progress:
            return
            
        self.shutdown_in_progress = True
        logger.info(f"Starting final sync for conversation {self.conversation_id}")
        
        try:
            # Stop file watcher
            if self.file_watcher:
                await self.file_watcher.stop()
                
            # Cancel backup task
            if self.backup_task:
                self.backup_task.cancel()
                try:
                    await self.backup_task
                except asyncio.CancelledError:
                    pass
                    
            # Final sync operations
            async with self.sync_lock:
                # 1. Preserve git state
                await self._preserve_git_state()
                
                # 2. Create final compressed backup
                await self._create_compressed_backup()
                
                # 3. Upload entire workspace (belt and suspenders)
                await self.storage.upload_directory(self.workspace_path, self.remote_files)
                
            logger.info(f"Final sync completed for conversation {self.conversation_id}")
            
        except Exception as e:
            logger.error(f"Error during final sync: {e}")
            
            # Emergency backup attempt
            try:
                await self._create_compressed_backup()
            except Exception as backup_error:
                logger.error(f"Emergency backup also failed: {backup_error}")
                
    async def cleanup(self) -> None:
        """Clean up resources and perform final sync."""
        await self.final_sync()
        
    def get_status(self) -> dict:
        """Get current workspace manager status."""
        status = {
            'conversation_id': self.conversation_id,
            'user_id': self.user_id,
            'workspace_path': self.workspace_path,
            'is_initialized': self.is_initialized,
            'shutdown_in_progress': self.shutdown_in_progress,
            'remote_paths': {
                'files': self.remote_files,
                'backups': self.remote_backups,
                'git': self.remote_git,
            }
        }
        
        if self.file_watcher:
            status['file_watcher'] = self.file_watcher.get_status()
            
        return status