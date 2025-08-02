"""Test suite for WorkspaceManager - Core orchestration logic."""

import pytest
import asyncio
import tempfile
import os
import shutil
from unittest.mock import Mock, AsyncMock, patch, call
from pathlib import Path

from openhands.storage.workspace import WorkspaceManager, WorkspaceStorage


class MockS3Storage(WorkspaceStorage):
    """Mock S3 storage for testing WorkspaceManager without external dependencies."""
    
    def __init__(self):
        self.uploaded_files = {}
        self.downloaded_files = {}
        self.uploaded_dirs = {}
        self.deleted_files = set()
        self.deleted_dirs = set()
        self.call_history = []
        
    async def upload_file(self, local_path: str, remote_path: str) -> None:
        """Mock file upload - stores file content in memory."""
        self.call_history.append(('upload_file', local_path, remote_path))
        if os.path.exists(local_path):
            with open(local_path, 'r') as f:
                self.uploaded_files[remote_path] = f.read()
        
    async def download_file(self, remote_path: str, local_path: str) -> None:
        """Mock file download - creates file from stored content."""
        self.call_history.append(('download_file', remote_path, local_path))
        if remote_path in self.uploaded_files:
            self.ensure_local_directory(local_path)
            with open(local_path, 'w') as f:
                f.write(self.uploaded_files[remote_path])
                
    async def upload_directory(self, local_dir: str, remote_dir: str) -> None:
        """Mock directory upload that actually uploads all files."""
        self.call_history.append(('upload_directory', local_dir, remote_dir))
        self.uploaded_dirs[remote_dir] = local_dir
        
        # Actually upload all files in the directory
        for root, dirs, files in os.walk(local_dir):
            for file in files:
                local_file_path = os.path.join(root, file)
                rel_path = os.path.relpath(local_file_path, local_dir)
                remote_file_path = f"{remote_dir}/{rel_path}".replace("\\", "/")
                await self.upload_file(local_file_path, remote_file_path)
        
    async def download_directory(self, remote_dir: str, local_dir: str) -> None:
        """Mock directory download."""
        self.call_history.append(('download_directory', remote_dir, local_dir))
        os.makedirs(local_dir, exist_ok=True)
        # Download all files that match the remote directory prefix
        prefix = remote_dir.rstrip('/') + '/'
        for remote_path in self.uploaded_files:
            if remote_path.startswith(prefix):
                rel_path = remote_path[len(prefix):]
                local_path = os.path.join(local_dir, rel_path)
                await self.download_file(remote_path, local_path)
            
    async def delete_file(self, remote_path: str) -> None:
        """Mock file deletion."""
        self.call_history.append(('delete_file', remote_path))
        self.deleted_files.add(remote_path)
        
    async def delete_directory(self, remote_dir: str) -> None:
        """Mock directory deletion."""
        self.call_history.append(('delete_directory', remote_dir))
        self.deleted_dirs.add(remote_dir)
        
    async def list_files(self, prefix: str) -> list[str]:
        """Mock file listing."""
        self.call_history.append(('list_files', prefix))
        return [path for path in self.uploaded_files.keys() if path.startswith(prefix)]
        
    async def exists(self, remote_path: str) -> bool:
        """Mock existence check."""
        self.call_history.append(('exists', remote_path))
        # Check for exact match first
        if remote_path in self.uploaded_files or remote_path in self.uploaded_dirs:
            return True
        # Check if it's a directory prefix (any files start with this path)
        prefix = remote_path.rstrip('/') + '/'
        for file_path in self.uploaded_files:
            if file_path.startswith(prefix):
                return True
        return False
        
    async def get_file_size(self, remote_path: str) -> int | None:
        """Mock file size check."""
        self.call_history.append(('get_file_size', remote_path))
        if remote_path in self.uploaded_files:
            return len(self.uploaded_files[remote_path])
        return None


@pytest.fixture
def mock_storage():
    """Provide a mock storage instance."""
    return MockS3Storage()


@pytest.fixture
def temp_workspace():
    """Provide a temporary workspace directory."""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir


@pytest.mark.asyncio
async def test_workspace_manager_initialization(mock_storage, temp_workspace):
    """Test WorkspaceManager initializes correctly."""
    manager = WorkspaceManager(
        storage=mock_storage,
        conversation_id="test-conv-123",
        user_id="test-user-456", 
        workspace_path=temp_workspace
    )
    
    assert manager.conversation_id == "test-conv-123"
    assert manager.user_id == "test-user-456"
    assert manager.workspace_path == temp_workspace
    assert manager.storage == mock_storage


@pytest.mark.asyncio
async def test_workspace_file_sync(mock_storage, temp_workspace):
    """Test that file changes trigger sync to storage."""
    manager = WorkspaceManager(
        storage=mock_storage,
        conversation_id="test-conv-123", 
        user_id="test-user-456",
        workspace_path=temp_workspace
    )
    
    await manager.initialize()
    
    # Create a test file
    test_file = os.path.join(temp_workspace, "test.py")
    with open(test_file, 'w') as f:
        f.write("print('hello world')")
        
    # Trigger manual sync (bypass debounce for testing)
    await manager.manual_sync()
    
    # Verify file was uploaded to correct S3 path
    expected_path = "conversations/test-user-456/test-conv-123/workspace/files/test.py"
    assert expected_path in mock_storage.uploaded_files
    assert mock_storage.uploaded_files[expected_path] == "print('hello world')"
    
    await manager.cleanup()


@pytest.mark.asyncio
async def test_workspace_directory_structure(mock_storage, temp_workspace):
    """Test that workspace maintains proper directory structure in S3."""
    manager = WorkspaceManager(
        storage=mock_storage,
        conversation_id="conv-789",
        user_id="user-123",
        workspace_path=temp_workspace
    )
    
    await manager.initialize()
    
    # Create nested directory structure
    nested_dir = os.path.join(temp_workspace, "src", "components")
    os.makedirs(nested_dir, exist_ok=True)
    
    # Create files in nested structure
    files = [
        ("src/main.py", "# Main module"),
        ("src/components/button.py", "# Button component"),
        ("README.md", "# Project README")
    ]
    
    for file_path, content in files:
        full_path = os.path.join(temp_workspace, file_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'w') as f:
            f.write(content)
    
    await manager.manual_sync()
    
    # Verify all files uploaded with correct paths
    for file_path, content in files:
        expected_s3_path = f"conversations/user-123/conv-789/workspace/files/{file_path}"
        assert expected_s3_path in mock_storage.uploaded_files
        assert mock_storage.uploaded_files[expected_s3_path] == content
    
    await manager.cleanup()


@pytest.mark.asyncio 
async def test_workspace_restore_from_storage(mock_storage, temp_workspace):
    """Test that workspace can be restored from storage."""
    # First, simulate an existing workspace in storage
    existing_files = {
        "conversations/user-456/conv-123/workspace/files/main.py": "print('restored')",
        "conversations/user-456/conv-123/workspace/files/utils/helper.py": "def helper(): pass"
    }
    mock_storage.uploaded_files.update(existing_files)
    
    manager = WorkspaceManager(
        storage=mock_storage,
        conversation_id="conv-123",
        user_id="user-456", 
        workspace_path=temp_workspace
    )
    
    # Initialize should download existing files
    await manager.initialize()
    
    # Verify files were downloaded to workspace
    main_file = os.path.join(temp_workspace, "main.py")
    helper_file = os.path.join(temp_workspace, "utils", "helper.py")
    
    assert os.path.exists(main_file)
    assert os.path.exists(helper_file)
    
    with open(main_file, 'r') as f:
        assert f.read() == "print('restored')"
        
    with open(helper_file, 'r') as f:
        assert f.read() == "def helper(): pass"
    
    await manager.cleanup()


@pytest.mark.asyncio
async def test_graceful_shutdown_sync(mock_storage, temp_workspace):
    """Test that graceful shutdown triggers final sync."""
    manager = WorkspaceManager(
        storage=mock_storage,
        conversation_id="conv-456",
        user_id="user-789",
        workspace_path=temp_workspace
    )
    
    await manager.initialize()
    
    # Create files that need syncing
    test_files = ["file1.py", "file2.py", "file3.py"]
    for filename in test_files:
        file_path = os.path.join(temp_workspace, filename)
        with open(file_path, 'w') as f:
            f.write(f"# Content of {filename}")
    
    # Simulate graceful shutdown
    await manager.cleanup()
    
    # Verify all files were synced during cleanup
    for filename in test_files:
        expected_path = f"conversations/user-789/conv-456/workspace/files/{filename}"
        assert expected_path in mock_storage.uploaded_files
        assert mock_storage.uploaded_files[expected_path] == f"# Content of {filename}"


@pytest.mark.asyncio
async def test_backup_creation(mock_storage, temp_workspace):
    """Test that periodic backups are created correctly."""
    manager = WorkspaceManager(
        storage=mock_storage, 
        conversation_id="conv-backup",
        user_id="user-backup",
        workspace_path=temp_workspace
    )
    
    await manager.initialize()
    
    # Create some workspace content
    test_content = {
        "app.py": "# Main application",
        "config.json": '{"debug": true}',
        "docs/README.md": "# Documentation"
    }
    
    for file_path, content in test_content.items():
        full_path = os.path.join(temp_workspace, file_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'w') as f:
            f.write(content)
    
    # Trigger backup creation (internal method)
    await manager._create_compressed_backup()
    
    # Verify backup was uploaded
    backup_calls = [call for call in mock_storage.call_history if 'compressed' in str(call)]
    assert len(backup_calls) > 0
    
    await manager.cleanup()


@pytest.mark.asyncio 
async def test_workspace_isolation_between_conversations(mock_storage):
    """Test that different conversations have completely isolated workspaces."""
    # Create two temporary workspaces
    with tempfile.TemporaryDirectory() as workspace1, \
         tempfile.TemporaryDirectory() as workspace2:
        
        # Create two workspace managers for different conversations
        manager1 = WorkspaceManager(
            storage=mock_storage,
            conversation_id="conv-isolation-1", 
            user_id="user-isolation",
            workspace_path=workspace1
        )
        manager2 = WorkspaceManager(
            storage=mock_storage,
            conversation_id="conv-isolation-2",
            user_id="user-isolation", 
            workspace_path=workspace2
        )
        
        await manager1.initialize()
        await manager2.initialize()
        
        # Create different files in each workspace
        file1_path = os.path.join(workspace1, "conv1_file.py")
        file2_path = os.path.join(workspace2, "conv2_file.py")
        
        with open(file1_path, 'w') as f:
            f.write("# Conversation 1 file")
        with open(file2_path, 'w') as f:
            f.write("# Conversation 2 file")
            
        await manager1.manual_sync()
        await manager2.manual_sync()
        
        # Verify files are stored in separate S3 paths
        conv1_s3_path = "conversations/user-isolation/conv-isolation-1/workspace/files/conv1_file.py"
        conv2_s3_path = "conversations/user-isolation/conv-isolation-2/workspace/files/conv2_file.py"
        
        assert conv1_s3_path in mock_storage.uploaded_files
        assert conv2_s3_path in mock_storage.uploaded_files
        assert mock_storage.uploaded_files[conv1_s3_path] == "# Conversation 1 file"
        assert mock_storage.uploaded_files[conv2_s3_path] == "# Conversation 2 file"
        
        # Verify no cross-contamination
        assert conv1_s3_path != conv2_s3_path
        assert "conv-isolation-2" not in conv1_s3_path
        assert "conv-isolation-1" not in conv2_s3_path
        
        await manager1.cleanup()
        await manager2.cleanup()


@pytest.mark.asyncio
async def test_error_handling_storage_failures(temp_workspace):
    """Test that workspace manager handles storage failures gracefully."""
    # Create a storage that fails operations
    failing_storage = Mock(spec=WorkspaceStorage)
    failing_storage.upload_file = AsyncMock(side_effect=Exception("S3 connection failed"))
    failing_storage.download_directory = AsyncMock(side_effect=Exception("Download failed"))
    failing_storage.list_files = AsyncMock(return_value=[])
    
    manager = WorkspaceManager(
        storage=failing_storage,
        conversation_id="conv-error",
        user_id="user-error",
        workspace_path=temp_workspace
    )
    
    # Initialization should handle download failures gracefully
    await manager.initialize()  # Should not raise exception
    
    # Create a test file
    test_file = os.path.join(temp_workspace, "test_error.py")
    with open(test_file, 'w') as f:
        f.write("# Test file")
    
    # Manual sync should handle upload failures gracefully
    await manager.manual_sync()  # Should not raise exception
    
    await manager.cleanup()


@pytest.mark.asyncio
async def test_large_file_handling(mock_storage, temp_workspace):
    """Test workspace manager handles large files correctly."""
    manager = WorkspaceManager(
        storage=mock_storage,
        conversation_id="conv-large",
        user_id="user-large", 
        workspace_path=temp_workspace
    )
    
    await manager.initialize()
    
    # Create a large file (simulated)
    large_file = os.path.join(temp_workspace, "large_data.txt")
    large_content = "x" * 10000  # 10KB file
    
    with open(large_file, 'w') as f:
        f.write(large_content)
    
    await manager.manual_sync()
    
    # Verify large file was uploaded correctly
    expected_path = "conversations/user-large/conv-large/workspace/files/large_data.txt"
    assert expected_path in mock_storage.uploaded_files
    assert len(mock_storage.uploaded_files[expected_path]) == 10000
    
    await manager.cleanup()


@pytest.mark.asyncio
async def test_file_watcher_integration(mock_storage, temp_workspace):
    """Test that file watcher integrates correctly with workspace manager."""
    manager = WorkspaceManager(
        storage=mock_storage,
        conversation_id="conv-watcher",
        user_id="user-watcher",
        workspace_path=temp_workspace
    )
    
    await manager.initialize()
    
    # File watcher should be created and started
    assert hasattr(manager, 'file_watcher')
    assert manager.file_watcher is not None
    
    # Clean up
    await manager.cleanup()


if __name__ == "__main__":
    pytest.main([__file__])