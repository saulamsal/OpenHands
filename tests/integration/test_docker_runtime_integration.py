"""Integration test for Docker runtime workspace integration - Container lifecycle integration."""

import pytest
import asyncio
import tempfile
import os
import shutil
import json
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch, MagicMock

from openhands.runtime.impl.docker.docker_runtime import DockerRuntime
from openhands.storage.workspace import WorkspaceManager, S3WorkspaceStorage
from openhands.core.config import OpenHandsConfig


class MockDockerStorage(S3WorkspaceStorage):
    """Mock storage for Docker runtime integration testing."""
    
    def __init__(self):
        # Skip boto3 initialization
        self.bucket_name = "docker-test-bucket"
        self.storage = {}  # {remote_path: content}
        self.operation_history = []  # Track all operations with timestamps
        
    async def upload_file(self, local_path: str, remote_path: str) -> None:
        """Mock file upload with operation tracking."""
        self.operation_history.append(('upload_file', local_path, remote_path))
        if os.path.exists(local_path):
            with open(local_path, 'rb') as f:
                self.storage[remote_path] = f.read()
                
    async def download_file(self, remote_path: str, local_path: str) -> None:
        """Mock file download with operation tracking."""
        self.operation_history.append(('download_file', remote_path, local_path))
        if remote_path in self.storage:
            self.ensure_local_directory(local_path)
            with open(local_path, 'wb') as f:
                f.write(self.storage[remote_path])
                
    async def upload_directory(self, local_dir: str, remote_dir: str) -> None:
        """Mock directory upload."""
        self.operation_history.append(('upload_directory', local_dir, remote_dir))
        for root, dirs, files in os.walk(local_dir):
            for file in files:
                local_file_path = os.path.join(root, file)
                rel_path = os.path.relpath(local_file_path, local_dir)
                remote_file_path = f"{remote_dir}/{rel_path}".replace("\\", "/")
                await self.upload_file(local_file_path, remote_file_path)
                
    async def download_directory(self, remote_dir: str, local_dir: str) -> None:
        """Mock directory download."""
        self.operation_history.append(('download_directory', remote_dir, local_dir))
        os.makedirs(local_dir, exist_ok=True)
        prefix = remote_dir.rstrip('/') + '/'
        
        for remote_path in self.storage:
            if remote_path.startswith(prefix):
                rel_path = remote_path[len(prefix):]
                local_path = os.path.join(local_dir, rel_path)
                await self.download_file(remote_path, local_path)
                
    async def delete_file(self, remote_path: str) -> None:
        """Mock file deletion."""
        self.operation_history.append(('delete_file', remote_path))
        if remote_path in self.storage:
            del self.storage[remote_path]
            
    async def delete_directory(self, remote_dir: str) -> None:
        """Mock directory deletion."""
        self.operation_history.append(('delete_directory', remote_dir))
        prefix = remote_dir.rstrip('/') + '/'
        keys_to_delete = [key for key in self.storage if key.startswith(prefix)]
        for key in keys_to_delete:
            del self.storage[key]
            
    async def list_files(self, prefix: str) -> list[str]:
        """Mock file listing."""
        self.operation_history.append(('list_files', prefix))
        return [key for key in self.storage if key.startswith(prefix)]
        
    async def exists(self, remote_path: str) -> bool:
        """Mock existence check."""
        self.operation_history.append(('exists', remote_path))
        return remote_path in self.storage
        
    async def get_file_size(self, remote_path: str) -> int | None:
        """Mock file size check."""
        self.operation_history.append(('get_file_size', remote_path))
        if remote_path in self.storage:
            return len(self.storage[remote_path])
        return None


@pytest.fixture
def mock_docker_storage():
    """Provide mock Docker storage."""
    return MockDockerStorage()


@pytest.fixture
def mock_docker_client():
    """Mock Docker client for container operations."""
    mock_client = MagicMock()
    
    # Mock container operations
    mock_container = MagicMock()
    mock_container.id = "test-container-123"
    mock_container.status = "running"
    mock_container.exec_run.return_value = MagicMock(exit_code=0, output=b"command output")
    
    mock_client.containers.run.return_value = mock_container
    mock_client.containers.get.return_value = mock_container
    
    return mock_client


@pytest.fixture
def mock_config():
    """Mock OpenHands configuration."""
    config = Mock(spec=OpenHandsConfig)
    config.workspace_storage_type = "s3"
    config.workspace_backup_interval = 300
    config.workspace_sync_debounce_min = 2.0
    config.workspace_sync_debounce_max = 30.0
    config.workspace_max_size_mb = 500
    return config


@pytest.mark.asyncio
async def test_docker_runtime_workspace_initialization(mock_docker_storage, mock_docker_client, mock_config):
    """Test that Docker runtime properly initializes workspace manager."""
    
    with patch('docker.from_env', return_value=mock_docker_client), \
         patch('openhands.storage.workspace.get_workspace_storage', return_value=mock_docker_storage):
        
        # Create DockerRuntime with workspace storage enabled
        runtime = DockerRuntime(
            config=mock_config,
            conversation_id="docker-test-conv",
            user_id="docker-test-user"
        )
        
        # Mock workspace path inside container
        with tempfile.TemporaryDirectory() as temp_workspace:
            runtime.workspace_path = temp_workspace
            
            # Initialize runtime (should set up workspace manager)
            await runtime.initialize()
            
            # Verify workspace manager was created
            assert hasattr(runtime, 'workspace_manager')
            assert runtime.workspace_manager is not None
            assert runtime.workspace_manager.conversation_id == "docker-test-conv"
            assert runtime.workspace_manager.user_id == "docker-test-user"
            
            await runtime.cleanup()


@pytest.mark.asyncio
async def test_docker_container_workspace_download_on_start(mock_docker_storage, mock_docker_client, mock_config):
    """Test that existing workspace is downloaded when container starts."""
    
    # Pre-populate storage with existing workspace files
    existing_workspace = {
        "conversations/docker-user/docker-conv/workspace/files/main.py": b"print('existing workspace')",
        "conversations/docker-user/docker-conv/workspace/files/config.json": b'{"restored": true}',
        "conversations/docker-user/docker-conv/workspace/files/src/utils.py": b"def utility(): pass"
    }
    mock_docker_storage.storage.update(existing_workspace)
    
    with patch('docker.from_env', return_value=mock_docker_client), \
         patch('openhands.storage.workspace.get_workspace_storage', return_value=mock_docker_storage):
        
        runtime = DockerRuntime(
            config=mock_config,
            conversation_id="docker-conv",
            user_id="docker-user"
        )
        
        with tempfile.TemporaryDirectory() as temp_workspace:
            runtime.workspace_path = temp_workspace
            
            await runtime.initialize()
            
            # Check that download operations were triggered
            download_ops = [op for op in mock_docker_storage.operation_history if op[0] == 'download_directory']
            assert len(download_ops) > 0, "No download operations found during initialization"
            
            await runtime.cleanup()


@pytest.mark.asyncio
async def test_docker_container_workspace_sync_during_execution(mock_docker_storage, mock_docker_client, mock_config):
    """Test that workspace changes are synced during container execution."""
    
    with patch('docker.from_env', return_value=mock_docker_client), \
         patch('openhands.storage.workspace.get_workspace_storage', return_value=mock_docker_storage):
        
        runtime = DockerRuntime(
            config=mock_config,
            conversation_id="sync-test-conv",
            user_id="sync-test-user"
        )
        
        with tempfile.TemporaryDirectory() as temp_workspace:
            runtime.workspace_path = temp_workspace
            
            await runtime.initialize()
            
            # Simulate file creation during container execution
            test_files = {
                "created_file.py": "# File created during execution",
                "modified_config.json": json.dumps({"modified": True}),
                "new_directory/nested_file.py": "# Nested file"
            }
            
            for file_path, content in test_files.items():
                full_path = os.path.join(temp_workspace, file_path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, 'w') as f:
                    f.write(content)
            
            # Trigger manual sync (simulating what would happen after agent action)
            if hasattr(runtime, 'workspace_manager') and runtime.workspace_manager:
                await runtime.workspace_manager.manual_sync()
            
            # Verify files were uploaded to storage
            for file_path in test_files:
                expected_s3_path = f"conversations/sync-test-user/sync-test-conv/workspace/files/{file_path}"
                assert expected_s3_path in mock_docker_storage.storage
            
            await runtime.cleanup()


@pytest.mark.asyncio
async def test_docker_container_final_sync_on_shutdown(mock_docker_storage, mock_docker_client, mock_config):
    """Test that final sync occurs when Docker container shuts down."""
    
    with patch('docker.from_env', return_value=mock_docker_client), \
         patch('openhands.storage.workspace.get_workspace_storage', return_value=mock_docker_storage):
        
        runtime = DockerRuntime(
            config=mock_config,
            conversation_id="shutdown-test-conv",
            user_id="shutdown-test-user"
        )
        
        with tempfile.TemporaryDirectory() as temp_workspace:
            runtime.workspace_path = temp_workspace
            
            await runtime.initialize()
            
            # Create files that need final sync
            final_files = {
                "final_output.txt": "Final result of computation",
                "logs/execution.log": "Execution completed successfully",
                "results/data.csv": "id,result\n1,success\n2,success"
            }
            
            for file_path, content in final_files.items():
                full_path = os.path.join(temp_workspace, file_path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, 'w') as f:
                    f.write(content)
            
            # Record operations before cleanup
            ops_before_cleanup = len(mock_docker_storage.operation_history)
            
            # Cleanup should trigger final sync
            await runtime.cleanup()
            
            # Verify cleanup triggered additional storage operations
            ops_after_cleanup = len(mock_docker_storage.operation_history)
            assert ops_after_cleanup > ops_before_cleanup, "No storage operations during cleanup"
            
            # Verify final files were synced
            for file_path in final_files:
                expected_s3_path = f"conversations/shutdown-test-user/shutdown-test-conv/workspace/files/{file_path}"
                assert expected_s3_path in mock_docker_storage.storage


@pytest.mark.asyncio
async def test_docker_runtime_trigger_workspace_sync(mock_docker_storage, mock_docker_client, mock_config):
    """Test manual workspace sync trigger functionality."""
    
    with patch('docker.from_env', return_value=mock_docker_client), \
         patch('openhands.storage.workspace.get_workspace_storage', return_value=mock_docker_storage):
        
        runtime = DockerRuntime(
            config=mock_config,
            conversation_id="trigger-test-conv",
            user_id="trigger-test-user"
        )
        
        with tempfile.TemporaryDirectory() as temp_workspace:
            runtime.workspace_path = temp_workspace
            
            await runtime.initialize()
            
            # Create test file
            test_file = os.path.join(temp_workspace, "trigger_test.py")
            with open(test_file, 'w') as f:
                f.write("# Test file for manual sync trigger")
            
            # Record operations before trigger
            ops_before_trigger = len(mock_docker_storage.operation_history)
            
            # Trigger workspace sync manually
            if hasattr(runtime, 'trigger_workspace_sync'):
                await runtime.trigger_workspace_sync()
            elif hasattr(runtime, 'workspace_manager'):
                await runtime.workspace_manager.manual_sync()
            
            # Verify trigger caused sync operations
            ops_after_trigger = len(mock_docker_storage.operation_history)
            assert ops_after_trigger > ops_before_trigger, "Manual trigger did not cause sync operations"
            
            # Verify file was synced
            expected_s3_path = "conversations/trigger-test-user/trigger-test-conv/workspace/files/trigger_test.py"
            assert expected_s3_path in mock_docker_storage.storage
            
            await runtime.cleanup()


@pytest.mark.asyncio
async def test_docker_runtime_multiple_conversations(mock_docker_storage, mock_docker_client, mock_config):
    """Test Docker runtime handling multiple conversations with isolated workspaces."""
    
    conversations = []
    workspace_dirs = []
    
    try:
        with patch('docker.from_env', return_value=mock_docker_client), \
             patch('openhands.storage.workspace.get_workspace_storage', return_value=mock_docker_storage):
            
            # Create multiple Docker runtime instances
            for i in range(3):
                runtime = DockerRuntime(
                    config=mock_config,
                    conversation_id=f"multi-conv-{i}",
                    user_id=f"multi-user-{i}"
                )
                conversations.append(runtime)
                
                workspace_dir = tempfile.mkdtemp()
                workspace_dirs.append(workspace_dir)
                runtime.workspace_path = workspace_dir
                
                await runtime.initialize()
                
                # Create unique files for each conversation
                conv_files = {
                    f"conversation_{i}.py": f"# Conversation {i} main file",
                    f"config_{i}.json": json.dumps({"conversation_id": i}),
                    "shared_name.txt": f"Content from conversation {i}"
                }
                
                for file_path, content in conv_files.items():
                    full_path = os.path.join(workspace_dir, file_path)
                    with open(full_path, 'w') as f:
                        f.write(content)
                
                # Sync each conversation
                if hasattr(runtime, 'workspace_manager'):
                    await runtime.workspace_manager.manual_sync()
            
            # Verify each conversation has isolated storage
            for i in range(3):
                conv_files = [key for key in mock_docker_storage.storage.keys() 
                             if f"multi-user-{i}/multi-conv-{i}" in key]
                assert len(conv_files) == 3, f"Conversation {i} should have 3 files"
                
                # Verify no cross-contamination
                for file_key in conv_files:
                    assert f"multi-user-{i}" in file_key
                    assert f"multi-conv-{i}" in file_key
            
            # Cleanup all conversations
            for runtime in conversations:
                await runtime.cleanup()
                
    finally:
        for workspace_dir in workspace_dirs:
            shutil.rmtree(workspace_dir, ignore_errors=True)


@pytest.mark.asyncio
async def test_docker_runtime_workspace_storage_configuration(mock_docker_storage, mock_docker_client):
    """Test Docker runtime respects workspace storage configuration."""
    
    # Test with workspace storage enabled
    config_enabled = Mock(spec=OpenHandsConfig)
    config_enabled.workspace_storage_type = "s3"
    config_enabled.workspace_backup_interval = 300
    
    with patch('docker.from_env', return_value=mock_docker_client), \
         patch('openhands.storage.workspace.get_workspace_storage', return_value=mock_docker_storage):
        
        runtime_enabled = DockerRuntime(
            config=config_enabled,
            conversation_id="config-test-enabled",
            user_id="config-test-user"
        )
        
        with tempfile.TemporaryDirectory() as temp_workspace:
            runtime_enabled.workspace_path = temp_workspace
            await runtime_enabled.initialize()
            
            # Should have workspace manager when enabled
            assert hasattr(runtime_enabled, 'workspace_manager')
            assert runtime_enabled.workspace_manager is not None
            
            await runtime_enabled.cleanup()
    
    # Test with workspace storage disabled
    config_disabled = Mock(spec=OpenHandsConfig)
    config_disabled.workspace_storage_type = None
    
    with patch('docker.from_env', return_value=mock_docker_client):
        runtime_disabled = DockerRuntime(
            config=config_disabled,
            conversation_id="config-test-disabled",
            user_id="config-test-user"
        )
        
        with tempfile.TemporaryDirectory() as temp_workspace:
            runtime_disabled.workspace_path = temp_workspace
            await runtime_disabled.initialize()
            
            # Should not have workspace manager when disabled
            assert not hasattr(runtime_disabled, 'workspace_manager') or \
                   runtime_disabled.workspace_manager is None
            
            await runtime_disabled.cleanup()


@pytest.mark.asyncio
async def test_docker_runtime_error_handling(mock_docker_storage, mock_docker_client, mock_config):
    """Test Docker runtime handles workspace storage errors gracefully."""
    
    # Create storage that fails operations
    failing_storage = Mock(spec=S3WorkspaceStorage)
    failing_storage.download_directory = AsyncMock(side_effect=Exception("Storage connection failed"))
    failing_storage.upload_file = AsyncMock(side_effect=Exception("Upload failed"))
    
    with patch('docker.from_env', return_value=mock_docker_client), \
         patch('openhands.storage.workspace.get_workspace_storage', return_value=failing_storage):
        
        runtime = DockerRuntime(
            config=mock_config,
            conversation_id="error-test-conv",
            user_id="error-test-user"
        )
        
        with tempfile.TemporaryDirectory() as temp_workspace:
            runtime.workspace_path = temp_workspace
            
            # Initialization should handle storage errors gracefully
            await runtime.initialize()  # Should not raise exception
            
            # Create test file
            test_file = os.path.join(temp_workspace, "error_test.py")
            with open(test_file, 'w') as f:
                f.write("# Test file for error handling")
            
            # Manual sync should handle errors gracefully
            if hasattr(runtime, 'workspace_manager'):
                await runtime.workspace_manager.manual_sync()  # Should not raise exception
            
            # Cleanup should handle errors gracefully
            await runtime.cleanup()  # Should not raise exception


@pytest.mark.asyncio
async def test_docker_runtime_workspace_backup_integration(mock_docker_storage, mock_docker_client, mock_config):
    """Test Docker runtime integrates with workspace backup system."""
    
    with patch('docker.from_env', return_value=mock_docker_client), \
         patch('openhands.storage.workspace.get_workspace_storage', return_value=mock_docker_storage):
        
        runtime = DockerRuntime(
            config=mock_config,
            conversation_id="backup-test-conv",
            user_id="backup-test-user"
        )
        
        with tempfile.TemporaryDirectory() as temp_workspace:
            runtime.workspace_path = temp_workspace
            
            await runtime.initialize()
            
            # Create substantial workspace content
            backup_files = {
                "application/main.py": "# Main application code",
                "application/models/user.py": "class User: pass",
                "application/config/settings.py": "DEBUG = True",
                "data/sample.json": json.dumps({"sample": "data"}),
                "docs/README.md": "# Project Documentation"
            }
            
            for file_path, content in backup_files.items():
                full_path = os.path.join(temp_workspace, file_path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, 'w') as f:
                    f.write(content)
            
            # Trigger backup creation through workspace manager
            if hasattr(runtime, 'workspace_manager'):
                await runtime.workspace_manager._create_compressed_backup()
            
            # Verify backup operations occurred
            backup_ops = [op for op in mock_docker_storage.operation_history 
                         if 'compressed' in str(op) or 'backup' in str(op)]
            assert len(backup_ops) > 0, "No backup operations detected"
            
            await runtime.cleanup()


if __name__ == "__main__":
    pytest.main([__file__])