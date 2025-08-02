"""Intelligent file watcher with burst detection and exponential backoff."""

import asyncio
import os
import time
from typing import Dict, Set, Optional, Callable
from pathlib import Path

from openhands.core.logger import openhands_logger as logger


class FileChangeEvent:
    """Represents a file change event."""
    
    def __init__(self, path: str, event_type: str):
        self.path = path
        self.event_type = event_type  # 'created', 'modified', 'deleted'
        self.timestamp = time.time()


class SmartFileWatcher:
    """Intelligent file watcher with AI agent burst detection and exponential backoff.
    
    Features:
    - Detects AI agent burst activity (many files changed quickly)
    - Exponential backoff from 2s to 30s under heavy load
    - Ignores common temporary/cache files
    - Manual sync triggers for agent completion
    """
    
    def __init__(
        self,
        watch_directory: str,
        on_change_callback: Callable[[Set[str]], None],
        min_debounce: float = 2.0,
        max_debounce: float = 30.0,
        burst_threshold: int = 10,
        poll_interval: float = 0.5,
    ):
        """Initialize the file watcher.
        
        Args:
            watch_directory: Directory to watch for changes
            on_change_callback: Callback function to call when changes detected
            min_debounce: Minimum debounce time in seconds
            max_debounce: Maximum debounce time in seconds  
            burst_threshold: Number of changes per second to trigger backoff
            poll_interval: How often to poll for changes in seconds
        """
        self.watch_directory = Path(watch_directory)
        self.on_change_callback = on_change_callback
        self.min_debounce = min_debounce
        self.max_debounce = max_debounce
        self.burst_threshold = burst_threshold
        self.poll_interval = poll_interval
        
        # State tracking
        self.file_states: Dict[str, float] = {}  # path -> mtime
        self.pending_changes: Set[str] = set()
        self.changes_per_second = 0
        self.current_debounce = min_debounce
        self.last_change_time = time.time()
        self.sync_task: Optional[asyncio.Task] = None
        self.polling_task: Optional[asyncio.Task] = None
        self.is_running = False
        
        # Patterns to ignore
        self.ignore_patterns = {
            '.git/index.lock',
            '.git/FETCH_HEAD', 
            '.git/HEAD.lock',
            '.git/refs/heads/',
            '__pycache__',
            '.pytest_cache',
            'node_modules',
            '.DS_Store',
            '.vscode',
            '.idea',
            '*.pyc',
            '*.pyo',
            '*.tmp',
            '*.swp',
            '*.swo',
            '*~',
        }
        
        logger.info(f"Initialized SmartFileWatcher for {watch_directory}")
        
    def _should_ignore(self, file_path: str) -> bool:
        """Check if a file should be ignored based on patterns."""
        relative_path = os.path.relpath(file_path, self.watch_directory)
        
        # Check ignore patterns
        for pattern in self.ignore_patterns:
            if pattern in relative_path or relative_path.endswith(pattern.replace('*', '')):
                return True
                
        # Ignore hidden files and directories
        if any(part.startswith('.') for part in Path(relative_path).parts):
            return True
            
        return False
        
    def _scan_directory(self) -> Set[str]:
        """Scan directory for file changes."""
        current_changes = set()
        
        try:
            for root, dirs, files in os.walk(self.watch_directory):
                # Skip ignored directories
                dirs[:] = [d for d in dirs if not d.startswith('.') and d not in {'__pycache__', 'node_modules'}]
                
                for file in files:
                    file_path = os.path.join(root, file)
                    
                    if self._should_ignore(file_path):
                        continue
                        
                    try:
                        current_mtime = os.path.getmtime(file_path)
                        relative_path = os.path.relpath(file_path, self.watch_directory)
                        
                        # Check if file is new or modified
                        if relative_path not in self.file_states:
                            # New file
                            self.file_states[relative_path] = current_mtime
                            current_changes.add(relative_path)
                            logger.debug(f"New file detected: {relative_path}")
                        elif current_mtime > self.file_states[relative_path]:
                            # Modified file
                            self.file_states[relative_path] = current_mtime
                            current_changes.add(relative_path)
                            logger.debug(f"Modified file detected: {relative_path}")
                            
                    except (OSError, FileNotFoundError):
                        # File might have been deleted or is inaccessible
                        relative_path = os.path.relpath(file_path, self.watch_directory)
                        if relative_path in self.file_states:
                            del self.file_states[relative_path]
                            current_changes.add(relative_path)
                            logger.debug(f"Deleted file detected: {relative_path}")
                            
        except Exception as e:
            logger.error(f"Error scanning directory: {e}")
            
        return current_changes
        
    def _update_debounce_time(self, num_changes: int) -> None:
        """Update debounce time based on activity level."""
        now = time.time()
        
        # Calculate changes per second
        if now - self.last_change_time < 1.0:
            self.changes_per_second += num_changes
        else:
            self.changes_per_second = num_changes
            
        self.last_change_time = now
        
        # Adjust debounce based on activity
        if self.changes_per_second > self.burst_threshold:
            # Heavy activity - increase debounce exponentially
            self.current_debounce = min(self.current_debounce * 1.5, self.max_debounce)
            logger.info(f"High activity detected ({self.changes_per_second} changes/s), increasing debounce to {self.current_debounce:.1f}s")
        else:
            # Light activity - decrease debounce gradually
            self.current_debounce = max(self.current_debounce * 0.9, self.min_debounce)
            
    async def _polling_loop(self) -> None:
        """Main polling loop for detecting file changes."""
        logger.info("Started file watcher polling loop")
        
        while self.is_running:
            try:
                changes = self._scan_directory()
                
                if changes:
                    self.pending_changes.update(changes)
                    self._update_debounce_time(len(changes))
                    
                    # Cancel existing sync task
                    if self.sync_task and not self.sync_task.done():
                        self.sync_task.cancel()
                        
                    # Schedule new sync with current debounce
                    self.sync_task = asyncio.create_task(self._debounced_sync())
                    
                await asyncio.sleep(self.poll_interval)
                
            except Exception as e:
                logger.error(f"Error in polling loop: {e}")
                await asyncio.sleep(self.poll_interval)
                
    async def _debounced_sync(self) -> None:
        """Wait for changes to settle, then trigger sync."""
        try:
            await asyncio.sleep(self.current_debounce)
            
            if self.pending_changes and self.is_running:
                changes_to_sync = self.pending_changes.copy()
                self.pending_changes.clear()
                
                logger.info(f"Triggering sync for {len(changes_to_sync)} changed files")
                
                try:
                    await self.on_change_callback(changes_to_sync)
                except Exception as e:
                    logger.error(f"Error in change callback: {e}")
                    # Re-add changes to pending if callback failed
                    self.pending_changes.update(changes_to_sync)
                    
        except asyncio.CancelledError:
            logger.debug("Debounced sync cancelled")
            
    async def start(self) -> None:
        """Start the file watcher."""
        if self.is_running:
            logger.warning("File watcher is already running")
            return
            
        self.is_running = True
        
        # Initial scan to establish baseline
        logger.info("Performing initial directory scan")
        initial_files = self._scan_directory()
        if initial_files:
            logger.info(f"Found {len(initial_files)} existing files")
            
        # Start polling loop
        self.polling_task = asyncio.create_task(self._polling_loop())
        logger.info("File watcher started successfully")
        
    async def stop(self) -> None:
        """Stop the file watcher."""
        if not self.is_running:
            return
            
        logger.info("Stopping file watcher")
        self.is_running = False
        
        # Cancel tasks
        if self.polling_task:
            self.polling_task.cancel()
            try:
                await self.polling_task
            except asyncio.CancelledError:
                pass
                
        if self.sync_task:
            self.sync_task.cancel()
            try:
                await self.sync_task
            except asyncio.CancelledError:
                pass
                
        logger.info("File watcher stopped")
        
    async def trigger_immediate_sync(self) -> None:
        """Manually trigger an immediate sync (for agent completion events)."""
        if not self.is_running:
            return
            
        logger.info("Manual sync trigger requested")
        
        # Cancel any pending debounced sync
        if self.sync_task and not self.sync_task.done():
            self.sync_task.cancel()
            
        # Scan for any final changes
        final_changes = self._scan_directory()
        if final_changes:
            self.pending_changes.update(final_changes)
            
        # Trigger immediate sync if there are pending changes
        if self.pending_changes:
            changes_to_sync = self.pending_changes.copy()
            self.pending_changes.clear()
            
            logger.info(f"Manual sync triggered for {len(changes_to_sync)} files")
            
            try:
                await self.on_change_callback(changes_to_sync)
                # Reset debounce after successful manual sync
                self.current_debounce = self.min_debounce
            except Exception as e:
                logger.error(f"Error in manual sync: {e}")
                # Re-add changes to pending if sync failed
                self.pending_changes.update(changes_to_sync)
        else:
            logger.debug("Manual sync requested but no pending changes")
            
    def get_status(self) -> Dict[str, any]:
        """Get current watcher status for monitoring."""
        return {
            'is_running': self.is_running,
            'pending_changes': len(self.pending_changes),
            'current_debounce': self.current_debounce,
            'changes_per_second': self.changes_per_second,
            'tracked_files': len(self.file_states),
            'watch_directory': str(self.watch_directory),
        }