"""Integration test for complete workspace lifecycle - Create→modify→restore workflow."""

import pytest
import asyncio
import tempfile
import os
import shutil
import json
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch

from openhands.storage.workspace import WorkspaceManager, S3WorkspaceStorage


class MockMinIOStorage(S3WorkspaceStorage):
    """Mock MinIO storage that simulates real S3/MinIO behavior for integration testing."""
    
    def __init__(self):
        # Skip boto3 initialization for mock
        self.bucket_name = "test-bucket"
        self.storage = {}  # In-memory storage
        self.directory_contents = {}  # Track directory structures
        
    async def upload_file(self, local_path: str, remote_path: str) -> None:
        """Simulate file upload by storing content in memory."""
        if os.path.exists(local_path):
            with open(local_path, 'rb') as f:
                self.storage[remote_path] = f.read()
                
    async def download_file(self, remote_path: str, local_path: str) -> None:
        """Simulate file download by writing from memory to disk."""
        if remote_path in self.storage:
            self.ensure_local_directory(local_path)
            with open(local_path, 'wb') as f:
                f.write(self.storage[remote_path])
                
    async def upload_directory(self, local_dir: str, remote_dir: str) -> None:
        """Simulate directory upload by uploading all files."""
        for root, dirs, files in os.walk(local_dir):
            for file in files:
                local_file_path = os.path.join(root, file)
                rel_path = os.path.relpath(local_file_path, local_dir)
                remote_file_path = f"{remote_dir}/{rel_path}".replace("\\", "/")
                await self.upload_file(local_file_path, remote_file_path)
                
    async def download_directory(self, remote_dir: str, local_dir: str) -> None:
        """Simulate directory download by downloading all files with prefix."""
        os.makedirs(local_dir, exist_ok=True)
        prefix = remote_dir.rstrip('/') + '/'
        
        for remote_path in self.storage:
            if remote_path.startswith(prefix):
                rel_path = remote_path[len(prefix):]
                local_path = os.path.join(local_dir, rel_path)
                await self.download_file(remote_path, local_path)
                
    async def delete_file(self, remote_path: str) -> None:
        """Simulate file deletion."""
        if remote_path in self.storage:
            del self.storage[remote_path]
            
    async def delete_directory(self, remote_dir: str) -> None:
        """Simulate directory deletion."""
        prefix = remote_dir.rstrip('/') + '/'
        keys_to_delete = [key for key in self.storage if key.startswith(prefix)]
        for key in keys_to_delete:
            del self.storage[key]
            
    async def list_files(self, prefix: str) -> list[str]:
        """Simulate file listing."""
        return [key for key in self.storage if key.startswith(prefix)]
        
    async def exists(self, remote_path: str) -> bool:
        """Simulate existence check."""
        # Check for exact file match
        if remote_path in self.storage:
            return True
        # Check if it's a directory prefix (any files start with this path)
        prefix = remote_path.rstrip('/') + '/'
        for file_path in self.storage:
            if file_path.startswith(prefix):
                return True
        return False
        
    async def get_file_size(self, remote_path: str) -> int | None:
        """Simulate file size check."""
        if remote_path in self.storage:
            return len(self.storage[remote_path])
        return None


@pytest.fixture
def mock_storage():
    """Provide a mock MinIO storage for integration testing."""
    return MockMinIOStorage()


@pytest.mark.asyncio
async def test_complete_workspace_lifecycle(mock_storage):
    """Test the complete workspace lifecycle: create, modify, persist, restore."""
    
    # PHASE 1: Create initial workspace
    with tempfile.TemporaryDirectory() as workspace1:
        manager1 = WorkspaceManager(
            storage=mock_storage,
            conversation_id="lifecycle-test",
            user_id="integration-user",
            workspace_path=workspace1
        )
        
        await manager1.initialize()
        
        # Create initial project structure
        project_files = {
            "main.py": "print('Hello World')",
            "config.json": json.dumps({"debug": True, "version": "1.0"}),
            "src/utils.py": "def utility_function():\n    return 'utility'",
            "src/models/user.py": "class User:\n    def __init__(self, name):\n        self.name = name",
            "tests/test_main.py": "def test_main():\n    assert True",
            "README.md": "# My Project\n\nThis is a test project.",
            ".gitignore": "__pycache__/\n*.pyc\n.env"
        }
        
        # Create all files
        for file_path, content in project_files.items():
            full_path = os.path.join(workspace1, file_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, 'w') as f:
                f.write(content)
        
        # Sync to storage
        await manager1.manual_sync()
        
        # Verify files were uploaded
        for file_path in project_files:
            expected_s3_path = f"conversations/integration-user/lifecycle-test/workspace/files/{file_path}"
            assert await mock_storage.exists(expected_s3_path)
        
        await manager1.cleanup()
        
    # PHASE 2: Simulate workspace modification in different session
    with tempfile.TemporaryDirectory() as workspace2:
        manager2 = WorkspaceManager(
            storage=mock_storage,
            conversation_id="lifecycle-test",  # Same conversation
            user_id="integration-user",
            workspace_path=workspace2
        )
        
        # Initialize should restore previous workspace
        await manager2.initialize()
        
        # Verify all original files were restored
        for file_path, expected_content in project_files.items():
            restored_file = os.path.join(workspace2, file_path)
            assert os.path.exists(restored_file), f"File {file_path} was not restored"
            
            with open(restored_file, 'r') as f:
                actual_content = f.read()
                assert actual_content == expected_content, f"Content mismatch in {file_path}"
        
        # Modify existing files and add new ones
        modifications = {
            "main.py": "print('Hello Modified World')\nprint('New line added')",
            "config.json": json.dumps({"debug": False, "version": "2.0", "new_feature": True}),
            "src/new_module.py": "def new_function():\n    return 'new functionality'",
            "docs/api.md": "# API Documentation\n\nNew documentation added."
        }
        
        for file_path, content in modifications.items():
            full_path = os.path.join(workspace2, file_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, 'w') as f:
                f.write(content)
        
        # Delete one file
        os.remove(os.path.join(workspace2, "tests/test_main.py"))
        
        # Sync modifications
        await manager2.manual_sync()
        
        await manager2.cleanup()
        
    # PHASE 3: Restore modified workspace in new session  
    with tempfile.TemporaryDirectory() as workspace3:
        manager3 = WorkspaceManager(
            storage=mock_storage,
            conversation_id="lifecycle-test",  # Same conversation
            user_id="integration-user", 
            workspace_path=workspace3
        )
        
        await manager3.initialize()
        
        # Verify modifications were persisted
        for file_path, expected_content in modifications.items():
            restored_file = os.path.join(workspace3, file_path)
            assert os.path.exists(restored_file), f"Modified file {file_path} was not restored"
            
            with open(restored_file, 'r') as f:
                actual_content = f.read()
                assert actual_content == expected_content, f"Modification not persisted in {file_path}"
        
        # Verify deleted file is gone
        deleted_file = os.path.join(workspace3, "tests/test_main.py")
        assert not os.path.exists(deleted_file), "Deleted file was incorrectly restored"
        
        # Verify unmodified files still exist with original content
        unmodified_files = {
            "src/utils.py": "def utility_function():\n    return 'utility'",
            "src/models/user.py": "class User:\n    def __init__(self, name):\n        self.name = name",
            "README.md": "# My Project\n\nThis is a test project.",
            ".gitignore": "__pycache__/\n*.pyc\n.env"
        }
        
        for file_path, expected_content in unmodified_files.items():
            unmodified_file = os.path.join(workspace3, file_path)
            assert os.path.exists(unmodified_file), f"Unmodified file {file_path} was lost"
            
            with open(unmodified_file, 'r') as f:
                actual_content = f.read()
                assert actual_content == expected_content, f"Unmodified file {file_path} was corrupted"
        
        await manager3.cleanup()


@pytest.mark.asyncio
async def test_concurrent_workspace_sessions(mock_storage):
    """Test multiple concurrent workspace sessions for different conversations."""
    
    # Create multiple temporary workspaces
    workspace_dirs = []
    managers = []
    
    try:
        # Create 3 concurrent conversations
        for i in range(3):
            workspace_dir = tempfile.mkdtemp()
            workspace_dirs.append(workspace_dir)
            
            manager = WorkspaceManager(
                storage=mock_storage,
                conversation_id=f"concurrent-conv-{i}",
                user_id="concurrent-user",
                workspace_path=workspace_dir
            )
            managers.append(manager)
            
            await manager.initialize()
            
            # Create unique files for each conversation
            test_file = os.path.join(workspace_dir, f"conversation_{i}.py")
            with open(test_file, 'w') as f:
                f.write(f"# This is conversation {i}")
            
            # Create shared filename with different content
            shared_file = os.path.join(workspace_dir, "shared.py")
            with open(shared_file, 'w') as f:
                f.write(f"# Shared file from conversation {i}")
        
        # Sync all workspaces concurrently
        sync_tasks = [manager.manual_sync() for manager in managers]
        await asyncio.gather(*sync_tasks)
        
        # Verify each conversation has its own isolated storage
        for i in range(3):
            # Check conversation-specific file
            conv_file_path = f"conversations/concurrent-user/concurrent-conv-{i}/workspace/files/conversation_{i}.py"
            assert await mock_storage.exists(conv_file_path)
            
            # Check shared filename is isolated per conversation
            shared_file_path = f"conversations/concurrent-user/concurrent-conv-{i}/workspace/files/shared.py"
            assert await mock_storage.exists(shared_file_path)
        
        # Verify no cross-contamination between conversations
        conv0_files = await mock_storage.list_files("conversations/concurrent-user/concurrent-conv-0/")
        conv1_files = await mock_storage.list_files("conversations/concurrent-user/concurrent-conv-1/")
        conv2_files = await mock_storage.list_files("conversations/concurrent-user/concurrent-conv-2/")
        
        # Each conversation should have exactly 2 files
        assert len(conv0_files) == 2
        assert len(conv1_files) == 2  
        assert len(conv2_files) == 2
        
        # No file should appear in multiple conversations
        all_files = set(conv0_files + conv1_files + conv2_files)
        assert len(all_files) == 6  # 3 conversations × 2 files each
        
    finally:
        # Cleanup
        for manager in managers:
            await manager.cleanup()
        for workspace_dir in workspace_dirs:
            shutil.rmtree(workspace_dir, ignore_errors=True)


@pytest.mark.asyncio
async def test_workspace_persistence_across_container_restarts(mock_storage):
    """Test workspace persistence when containers are stopped and restarted."""
    
    # SIMULATION 1: Create workspace, add files, stop container
    with tempfile.TemporaryDirectory() as workspace1:
        manager1 = WorkspaceManager(
            storage=mock_storage,
            conversation_id="restart-test",
            user_id="restart-user", 
            workspace_path=workspace1
        )
        
        await manager1.initialize()
        
        # Simulate active development session
        development_files = {
            "app.py": "from flask import Flask\napp = Flask(__name__)",
            "requirements.txt": "flask==2.0.1\nrequests==2.26.0",
            "Dockerfile": "FROM python:3.9\nCOPY . /app\nWORKDIR /app",
            "docker-compose.yml": "version: '3'\nservices:\n  app:\n    build: .",
            "src/database.py": "import sqlite3\n\ndef get_connection():\n    return sqlite3.connect('app.db')",
            "tests/test_app.py": "import pytest\nfrom app import app\n\ndef test_app():\n    assert app is not None"
        }
        
        for file_path, content in development_files.items():
            full_path = os.path.join(workspace1, file_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, 'w') as f:
                f.write(content)
        
        # Simulate container shutdown with final sync
        await manager1.cleanup()
        
    # SIMULATION 2: Container restart - new workspace should restore everything
    with tempfile.TemporaryDirectory() as workspace2:
        manager2 = WorkspaceManager(
            storage=mock_storage,
            conversation_id="restart-test",  # Same conversation
            user_id="restart-user",
            workspace_path=workspace2
        )
        
        # Initialize should restore complete workspace
        await manager2.initialize()
        
        # Verify all files were restored exactly
        for file_path, expected_content in development_files.items():
            restored_file = os.path.join(workspace2, file_path)
            assert os.path.exists(restored_file), f"File {file_path} not restored after restart"
            
            with open(restored_file, 'r') as f:
                actual_content = f.read()
                assert actual_content == expected_content, f"Content corrupted in {file_path}"
        
        # Continue development - modify existing files and add new ones
        continued_work = {
            "app.py": "from flask import Flask, request\napp = Flask(__name__)\n\n@app.route('/')\ndef home():\n    return 'Hello World'",
            "config.py": "DEBUG = True\nSECRET_KEY = 'dev-key'",
            "static/style.css": "body { font-family: Arial; }",
            "templates/index.html": "<html><body><h1>Welcome</h1></body></html>"
        }
        
        for file_path, content in continued_work.items():
            full_path = os.path.join(workspace2, file_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, 'w') as f:
                f.write(content)
        
        await manager2.cleanup()
        
    # SIMULATION 3: Another restart to verify continued work persisted
    with tempfile.TemporaryDirectory() as workspace3:
        manager3 = WorkspaceManager(
            storage=mock_storage,
            conversation_id="restart-test",  # Same conversation
            user_id="restart-user",
            workspace_path=workspace3
        )
        
        await manager3.initialize()
        
        # Verify both original and continued work files exist
        all_expected_files = {**development_files, **continued_work}
        
        for file_path, expected_content in all_expected_files.items():
            final_file = os.path.join(workspace3, file_path)
            assert os.path.exists(final_file), f"File {file_path} lost after multiple restarts"
            
            with open(final_file, 'r') as f:
                actual_content = f.read()
                assert actual_content == expected_content, f"Content corrupted in {file_path} after restarts"
        
        await manager3.cleanup()


@pytest.mark.asyncio  
async def test_workspace_backup_and_recovery(mock_storage):
    """Test workspace backup creation and recovery scenarios."""
    
    with tempfile.TemporaryDirectory() as workspace:
        manager = WorkspaceManager(
            storage=mock_storage,
            conversation_id="backup-test",
            user_id="backup-user",
            workspace_path=workspace
        )
        
        await manager.initialize()
        
        # Create substantial workspace content
        workspace_content = {
            "large_project/main.py": "# Main application\n" + "# Comment line\n" * 100,
            "large_project/data/dataset.csv": "id,name,value\n" + "1,test,100\n" * 1000,
            "large_project/models/neural_net.py": "import torch\n" + "# Model code\n" * 50,
            "large_project/utils/helpers.py": "def helper():\n    pass\n" * 20,
            "docs/manual.md": "# User Manual\n" + "## Section\n" * 30
        }
        
        for file_path, content in workspace_content.items():
            full_path = os.path.join(workspace, file_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, 'w') as f:
                f.write(content)
        
        # Create backup
        await manager._create_compressed_backup()
        
        # Verify backup exists in storage
        backup_prefix = "conversations/backup-user/backup-test/workspace/compressed/"
        backup_files = await mock_storage.list_files(backup_prefix)
        assert len(backup_files) > 0, "No backup files created"
        
        # Backup filename should contain timestamp
        backup_file = backup_files[0]
        assert "backup-" in backup_file
        assert backup_file.endswith(".tar.gz")
        
        # Verify backup file has content
        backup_size = await mock_storage.get_file_size(backup_file)
        assert backup_size > 0, "Backup file is empty"
        
        await manager.cleanup()


@pytest.mark.asyncio
async def test_git_state_preservation(mock_storage):
    """Test that git repository state is preserved across workspace sessions."""
    
    with tempfile.TemporaryDirectory() as workspace1:
        # Initialize git repository
        os.system(f"cd {workspace1} && git init")
        os.system(f"cd {workspace1} && git config user.email 'test@example.com'")
        os.system(f"cd {workspace1} && git config user.name 'Test User'")
        
        # Create initial commit
        initial_file = os.path.join(workspace1, "initial.py")
        with open(initial_file, 'w') as f:
            f.write("# Initial commit")
        
        os.system(f"cd {workspace1} && git add initial.py")
        os.system(f"cd {workspace1} && git commit -m 'Initial commit'")
        
        # Create uncommitted changes
        work_file = os.path.join(workspace1, "work_in_progress.py")
        with open(work_file, 'w') as f:
            f.write("# Work in progress - not committed")
        
        manager1 = WorkspaceManager(
            storage=mock_storage,
            conversation_id="git-test",
            user_id="git-user",
            workspace_path=workspace1
        )
        
        await manager1.initialize()
        await manager1.cleanup()  # This should preserve git state
        
    # Restore in new workspace
    with tempfile.TemporaryDirectory() as workspace2:
        manager2 = WorkspaceManager(
            storage=mock_storage,
            conversation_id="git-test",  # Same conversation
            user_id="git-user",
            workspace_path=workspace2
        )
        
        await manager2.initialize()
        
        # Verify git repository was restored
        assert os.path.exists(os.path.join(workspace2, ".git"))
        
        # Verify committed files exist
        assert os.path.exists(os.path.join(workspace2, "initial.py"))
        
        # Verify uncommitted work was preserved
        assert os.path.exists(os.path.join(workspace2, "work_in_progress.py"))
        
        # Verify git history
        git_log_result = os.system(f"cd {workspace2} && git log --oneline")
        assert git_log_result == 0  # Git log should work
        
        await manager2.cleanup()


if __name__ == "__main__":
    pytest.main([__file__])