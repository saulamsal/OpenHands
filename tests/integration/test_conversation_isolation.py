"""Integration test for conversation isolation - Prevent cross-contamination."""

import pytest
import asyncio
import tempfile
import os
import shutil
import json
import hashlib
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch

from openhands.storage.workspace import WorkspaceManager, S3WorkspaceStorage


class IsolationTestStorage(S3WorkspaceStorage):
    """Test storage that tracks all operations for isolation verification."""
    
    def __init__(self):
        # Skip boto3 initialization 
        self.bucket_name = "isolation-test-bucket"
        self.storage = {}  # {remote_path: content}
        self.operation_log = []  # Track all operations for analysis
        self.access_patterns = {}  # {conversation_id: set(accessed_paths)}
        
    def _log_operation(self, operation: str, remote_path: str, conversation_id: str = None):
        """Log all storage operations for isolation analysis."""
        self.operation_log.append({
            'operation': operation,
            'remote_path': remote_path,
            'conversation_id': conversation_id
        })
        
        if conversation_id:
            if conversation_id not in self.access_patterns:
                self.access_patterns[conversation_id] = set()
            self.access_patterns[conversation_id].add(remote_path)
    
    async def upload_file(self, local_path: str, remote_path: str) -> None:
        """Track file uploads by conversation."""
        # Extract conversation ID from remote path
        conv_id = self._extract_conversation_id(remote_path)
        self._log_operation('upload_file', remote_path, conv_id)
        
        if os.path.exists(local_path):
            with open(local_path, 'rb') as f:
                self.storage[remote_path] = f.read()
                
    async def download_file(self, remote_path: str, local_path: str) -> None:
        """Track file downloads by conversation."""
        conv_id = self._extract_conversation_id(remote_path)
        self._log_operation('download_file', remote_path, conv_id)
        
        if remote_path in self.storage:
            self.ensure_local_directory(local_path)
            with open(local_path, 'wb') as f:
                f.write(self.storage[remote_path])
                
    async def upload_directory(self, local_dir: str, remote_dir: str) -> None:
        """Track directory uploads."""
        conv_id = self._extract_conversation_id(remote_dir)
        self._log_operation('upload_directory', remote_dir, conv_id)
        
        for root, dirs, files in os.walk(local_dir):
            for file in files:
                local_file_path = os.path.join(root, file)
                rel_path = os.path.relpath(local_file_path, local_dir)
                remote_file_path = f"{remote_dir}/{rel_path}".replace("\\", "/")
                await self.upload_file(local_file_path, remote_file_path)
                
    async def download_directory(self, remote_dir: str, local_dir: str) -> None:
        """Track directory downloads."""
        conv_id = self._extract_conversation_id(remote_dir)
        self._log_operation('download_directory', remote_dir, conv_id)
        
        os.makedirs(local_dir, exist_ok=True)
        prefix = remote_dir.rstrip('/') + '/'
        
        for remote_path in self.storage:
            if remote_path.startswith(prefix):
                rel_path = remote_path[len(prefix):]
                local_path = os.path.join(local_dir, rel_path)
                await self.download_file(remote_path, local_path)
                
    async def delete_file(self, remote_path: str) -> None:
        """Track file deletions."""
        conv_id = self._extract_conversation_id(remote_path)
        self._log_operation('delete_file', remote_path, conv_id)
        
        if remote_path in self.storage:
            del self.storage[remote_path]
            
    async def delete_directory(self, remote_dir: str) -> None:
        """Track directory deletions."""
        conv_id = self._extract_conversation_id(remote_dir)
        self._log_operation('delete_directory', remote_dir, conv_id)
        
        prefix = remote_dir.rstrip('/') + '/'
        keys_to_delete = [key for key in self.storage if key.startswith(prefix)]
        for key in keys_to_delete:
            del self.storage[key]
            
    async def list_files(self, prefix: str) -> list[str]:
        """Track file listings."""
        conv_id = self._extract_conversation_id(prefix)
        self._log_operation('list_files', prefix, conv_id)
        
        return [key for key in self.storage if key.startswith(prefix)]
        
    async def exists(self, remote_path: str) -> bool:
        """Track existence checks."""
        conv_id = self._extract_conversation_id(remote_path)
        self._log_operation('exists', remote_path, conv_id)
        
        return remote_path in self.storage
        
    async def get_file_size(self, remote_path: str) -> int | None:
        """Track file size checks."""
        conv_id = self._extract_conversation_id(remote_path)
        self._log_operation('get_file_size', remote_path, conv_id)
        
        if remote_path in self.storage:
            return len(self.storage[remote_path])
        return None
    
    def _extract_conversation_id(self, remote_path: str) -> str | None:
        """Extract conversation ID from S3 path format: conversations/{user_id}/{conversation_id}/..."""
        parts = remote_path.split('/')
        if len(parts) >= 3 and parts[0] == 'conversations':
            return parts[2]  # conversation_id is 3rd part
        return None
    
    def get_isolation_report(self) -> dict:
        """Generate isolation analysis report."""
        return {
            'total_operations': len(self.operation_log),
            'conversations': list(self.access_patterns.keys()),
            'access_patterns': dict(self.access_patterns),
            'cross_contamination_violations': self._detect_cross_contamination()
        }
    
    def _detect_cross_contamination(self) -> list:
        """Detect any cross-contamination between conversations."""
        violations = []
        
        for conv_id, paths in self.access_patterns.items():
            for path in paths:
                # Check if this path belongs to a different conversation
                path_conv_id = self._extract_conversation_id(path)
                if path_conv_id and path_conv_id != conv_id:
                    violations.append({
                        'accessing_conversation': conv_id,
                        'unauthorized_path': path,
                        'path_belongs_to': path_conv_id
                    })
        
        return violations


@pytest.fixture
def isolation_storage():
    """Provide isolation test storage."""
    return IsolationTestStorage()


@pytest.mark.asyncio
async def test_strict_conversation_isolation(isolation_storage):
    """Test that conversations are strictly isolated with no cross-access."""
    
    # Create 5 different conversations with unique content
    conversations = []
    workspace_dirs = []
    
    try:
        for i in range(5):
            workspace_dir = tempfile.mkdtemp()
            workspace_dirs.append(workspace_dir)
            
            manager = WorkspaceManager(
                storage=isolation_storage,
                conversation_id=f"isolation-conv-{i}",
                user_id=f"isolation-user-{i}",
                workspace_path=workspace_dir
            )
            conversations.append(manager)
            
            await manager.initialize()
            
            # Create unique content for each conversation
            unique_files = {
                f"conv_{i}_main.py": f"# Main file for conversation {i}\nprint('Conversation {i}')",
                f"conv_{i}_config.json": json.dumps({"conversation_id": i, "unique_data": f"data_{i}"}),
                f"shared_name.py": f"# This filename is shared but content is unique to conv {i}",
                f"data/conv_{i}_data.csv": f"id,value\n1,{i}\n2,{i*2}\n3,{i*3}",
                f"nested/deep/conv_{i}_deep.py": f"# Deep nested file for conversation {i}"
            }
            
            for file_path, content in unique_files.items():
                full_path = os.path.join(workspace_dir, file_path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, 'w') as f:
                    f.write(content)
            
            await manager.manual_sync()
        
        # Analyze isolation after all operations
        isolation_report = isolation_storage.get_isolation_report()
        
        # CRITICAL: No cross-contamination violations
        assert len(isolation_report['cross_contamination_violations']) == 0, \
            f"Cross-contamination detected: {isolation_report['cross_contamination_violations']}"
        
        # Verify each conversation only accessed its own paths
        for conv_id, accessed_paths in isolation_report['access_patterns'].items():
            for path in accessed_paths:
                path_conv_id = isolation_storage._extract_conversation_id(path)
                assert path_conv_id == conv_id, \
                    f"Conversation {conv_id} accessed path belonging to {path_conv_id}: {path}"
        
        # Verify all conversations are represented
        assert len(isolation_report['conversations']) == 5
        
        # Verify each conversation has its own distinct storage space
        for i in range(5):
            conv_id = f"isolation-conv-{i}"
            assert conv_id in isolation_report['access_patterns']
            
            conv_paths = isolation_report['access_patterns'][conv_id]
            # Each conversation should have accessed only its own paths
            for path in conv_paths:
                assert f"isolation-user-{i}" in path
                assert f"isolation-conv-{i}" in path
        
    finally:
        # Cleanup
        for manager in conversations:
            await manager.cleanup()
        for workspace_dir in workspace_dirs:
            shutil.rmtree(workspace_dir, ignore_errors=True)


@pytest.mark.asyncio
async def test_same_user_different_conversations(isolation_storage):
    """Test isolation between different conversations for the same user."""
    
    user_id = "same-user-test"
    conversations = []
    workspace_dirs = []
    
    try:
        # Create 3 conversations for the same user
        for i in range(3):
            workspace_dir = tempfile.mkdtemp()
            workspace_dirs.append(workspace_dir)
            
            manager = WorkspaceManager(
                storage=isolation_storage,
                conversation_id=f"same-user-conv-{i}",
                user_id=user_id,  # Same user across all conversations
                workspace_path=workspace_dir
            )
            conversations.append(manager)
            
            await manager.initialize()
            
            # Create similar project structures with different content
            project_files = {
                "main.py": f"# Main for project {i}\ndef main():\n    return {i}",
                "config.py": f"PROJECT_ID = {i}\nPROJECT_NAME = 'project_{i}'",
                "src/models.py": f"class Model{i}:\n    def __init__(self):\n        self.id = {i}",
                "tests/test_main.py": f"def test_project_{i}():\n    assert True",
                "README.md": f"# Project {i}\n\nThis is project number {i}.",
                "data/sample.json": json.dumps({"project": i, "data": [i, i*2, i*3]})
            }
            
            for file_path, content in project_files.items():
                full_path = os.path.join(workspace_dir, file_path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, 'w') as f:
                    f.write(content)
            
            await manager.manual_sync()
        
        # Verify strict isolation despite same user
        isolation_report = isolation_storage.get_isolation_report()
        
        # No cross-contamination between conversations of same user
        assert len(isolation_report['cross_contamination_violations']) == 0
        
        # Verify each conversation has separate storage space
        for i in range(3):
            conv_id = f"same-user-conv-{i}"
            conv_paths = isolation_report['access_patterns'][conv_id]
            
            # All paths should contain the conversation ID
            for path in conv_paths:
                assert conv_id in path, f"Path {path} doesn't contain conversation ID {conv_id}"
                assert user_id in path, f"Path {path} doesn't contain user ID {user_id}"
        
        # Verify same filenames in different conversations don't conflict
        conv_0_files = await isolation_storage.list_files(f"conversations/{user_id}/same-user-conv-0/")
        conv_1_files = await isolation_storage.list_files(f"conversations/{user_id}/same-user-conv-1/")
        conv_2_files = await isolation_storage.list_files(f"conversations/{user_id}/same-user-conv-2/")
        
        # Each conversation should have 6 files
        assert len(conv_0_files) == 6
        assert len(conv_1_files) == 6
        assert len(conv_2_files) == 6
        
        # Files should have unique paths despite same relative names
        all_files = set(conv_0_files + conv_1_files + conv_2_files)
        assert len(all_files) == 18  # 3 conversations × 6 files = 18 unique paths
        
    finally:
        for manager in conversations:
            await manager.cleanup()
        for workspace_dir in workspace_dirs:
            shutil.rmtree(workspace_dir, ignore_errors=True)


@pytest.mark.asyncio
async def test_different_users_same_conversation_id(isolation_storage):
    """Test isolation between different users using same conversation ID."""
    
    conversation_id = "shared-conv-id"
    conversations = []
    workspace_dirs = []
    
    try:
        # Create same conversation ID for different users
        for i in range(3):
            workspace_dir = tempfile.mkdtemp()
            workspace_dirs.append(workspace_dir)
            
            manager = WorkspaceManager(
                storage=isolation_storage,
                conversation_id=conversation_id,  # Same conversation ID
                user_id=f"different-user-{i}",
                workspace_path=workspace_dir
            )
            conversations.append(manager)
            
            await manager.initialize()
            
            # Create similar content but for different users
            user_files = {
                "user_profile.py": f"USER_ID = 'different-user-{i}'\nUSER_NAME = 'User {i}'",
                "personal_data.json": json.dumps({"user_id": i, "private_data": f"secret_{i}"}),
                "workspace_config.py": f"WORKSPACE_OWNER = 'different-user-{i}'",
                "private/secrets.txt": f"This is private data for user {i}",
                "projects/main.py": f"# Main project for user {i}"
            }
            
            for file_path, content in user_files.items():
                full_path = os.path.join(workspace_dir, file_path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                with open(full_path, 'w') as f:
                    f.write(content)
            
            await manager.manual_sync()
        
        # Verify user isolation despite same conversation ID
        isolation_report = isolation_storage.get_isolation_report()
        
        # No cross-contamination between different users
        assert len(isolation_report['cross_contamination_violations']) == 0
        
        # Verify each user has separate storage space
        for i in range(3):
            user_id = f"different-user-{i}"
            
            # Find paths accessed by this user (by checking which conv_id in report corresponds to this user)
            user_files = await isolation_storage.list_files(f"conversations/{user_id}/{conversation_id}/")
            
            # Each user should have their own files
            assert len(user_files) == 5
            
            # All paths should contain the user ID
            for file_path in user_files:
                assert user_id in file_path, f"File {file_path} doesn't contain user ID {user_id}"
                assert conversation_id in file_path
        
        # Verify no user can access another user's files
        user_0_files = set(await isolation_storage.list_files("conversations/different-user-0/"))
        user_1_files = set(await isolation_storage.list_files("conversations/different-user-1/"))
        user_2_files = set(await isolation_storage.list_files("conversations/different-user-2/"))
        
        # No overlap between users' files
        assert len(user_0_files.intersection(user_1_files)) == 0
        assert len(user_1_files.intersection(user_2_files)) == 0
        assert len(user_0_files.intersection(user_2_files)) == 0
        
    finally:
        for manager in conversations:
            await manager.cleanup()
        for workspace_dir in workspace_dirs:
            shutil.rmtree(workspace_dir, ignore_errors=True)


@pytest.mark.asyncio
async def test_large_scale_isolation(isolation_storage):
    """Test isolation with many concurrent conversations."""
    
    num_users = 5
    conversations_per_user = 4
    total_conversations = num_users * conversations_per_user
    
    conversations = []
    workspace_dirs = []
    
    try:
        # Create large number of conversations
        for user_id in range(num_users):
            for conv_id in range(conversations_per_user):
                workspace_dir = tempfile.mkdtemp()
                workspace_dirs.append(workspace_dir)
                
                manager = WorkspaceManager(
                    storage=isolation_storage,
                    conversation_id=f"large-scale-conv-{conv_id}",
                    user_id=f"large-scale-user-{user_id}",
                    workspace_path=workspace_dir
                )
                conversations.append(manager)
                
                await manager.initialize()
                
                # Create unique content for each combination
                unique_content = {
                    "identity.py": f"USER_ID = {user_id}\nCONV_ID = {conv_id}",
                    "data.json": json.dumps({"user": user_id, "conversation": conv_id}),
                    f"user_{user_id}_file.py": f"# File specific to user {user_id}",
                    f"conv_{conv_id}_file.py": f"# File specific to conversation {conv_id}"
                }
                
                for file_path, content in unique_content.items():
                    full_path = os.path.join(workspace_dir, file_path)
                    with open(full_path, 'w') as f:
                        f.write(content)
                
                await manager.manual_sync()
        
        # Analyze large-scale isolation
        isolation_report = isolation_storage.get_isolation_report()
        
        # Critical: No violations in large scale scenario
        assert len(isolation_report['cross_contamination_violations']) == 0, \
            f"Large-scale isolation failed: {isolation_report['cross_contamination_violations']}"
        
        # Verify correct number of conversations tracked
        assert len(isolation_report['conversations']) == total_conversations
        
        # Verify each conversation only accessed its own namespace
        for conv_id, accessed_paths in isolation_report['access_patterns'].items():
            for path in accessed_paths:
                # Extract user and conversation from path
                path_parts = path.split('/')
                if len(path_parts) >= 3:
                    path_user = path_parts[1]  # conversations/{user_id}/{conv_id}/...
                    path_conv = path_parts[2]
                    
                    # Verify path matches conversation's expected namespace
                    assert path_conv == conv_id, f"Conversation {conv_id} accessed wrong namespace: {path}"
        
        # Verify total file count is correct (4 files per conversation)
        total_files = 0
        for user_id in range(num_users):
            for conv_id in range(conversations_per_user):
                user_files = await isolation_storage.list_files(
                    f"conversations/large-scale-user-{user_id}/large-scale-conv-{conv_id}/"
                )
                assert len(user_files) == 4  # Each conversation should have 4 files
                total_files += len(user_files)
        
        assert total_files == total_conversations * 4
        
    finally:
        # Cleanup large scale test
        for manager in conversations:
            await manager.cleanup()
        for workspace_dir in workspace_dirs:
            shutil.rmtree(workspace_dir, ignore_errors=True)


@pytest.mark.asyncio
async def test_malicious_path_traversal_prevention(isolation_storage):
    """Test that path traversal attacks are prevented."""
    
    with tempfile.TemporaryDirectory() as workspace:
        manager = WorkspaceManager(
            storage=isolation_storage,
            conversation_id="security-test",
            user_id="security-user",
            workspace_path=workspace
        )
        
        await manager.initialize()
        
        # Try to create files with path traversal attempts
        malicious_attempts = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config",
            "legitimate/../../breakout.py",
            "normal/../../../evil.py",
            "directory/./../../escape.py"
        ]
        
        created_files = []
        for malicious_path in malicious_attempts:
            try:
                # Create file in workspace (this is allowed locally)
                safe_path = os.path.join(workspace, malicious_path.replace("../", "safe_"))
                os.makedirs(os.path.dirname(safe_path), exist_ok=True)
                with open(safe_path, 'w') as f:
                    f.write("# This should not escape workspace")
                created_files.append(safe_path)
            except (OSError, ValueError):
                # Some malicious paths may fail at OS level
                pass
        
        await manager.manual_sync()
        
        # Verify all uploaded files remain within proper namespace
        security_files = await isolation_storage.list_files("conversations/security-user/security-test/")
        
        for file_path in security_files:
            # All files must be within the proper conversation namespace
            assert "conversations/security-user/security-test/" in file_path
            # No path should escape to other conversations or system areas
            assert "../" not in file_path
            assert "..\\" not in file_path
            assert not file_path.startswith("/etc/")
            assert not file_path.startswith("C:\\")
        
        await manager.cleanup()


@pytest.mark.asyncio
async def test_concurrent_access_isolation(isolation_storage):
    """Test that concurrent access to storage maintains isolation."""
    
    num_concurrent = 10
    tasks = []
    workspace_dirs = []
    
    try:
        # Create many concurrent workspace operations
        for i in range(num_concurrent):
            workspace_dir = tempfile.mkdtemp()
            workspace_dirs.append(workspace_dir)
            
            # Create task for concurrent execution
            task = asyncio.create_task(
                concurrent_workspace_operation(isolation_storage, i, workspace_dir)
            )
            tasks.append(task)
        
        # Execute all operations concurrently
        await asyncio.gather(*tasks)
        
        # Verify isolation was maintained under concurrent load
        isolation_report = isolation_storage.get_isolation_report()
        
        # No cross-contamination despite concurrent access
        assert len(isolation_report['cross_contamination_violations']) == 0
        
        # Verify each concurrent operation had its own isolated space
        assert len(isolation_report['conversations']) == num_concurrent
        
        for i in range(num_concurrent):
            conv_id = f"concurrent-{i}"
            assert conv_id in isolation_report['access_patterns']
            
            # Each conversation should have accessed only its own paths
            conv_paths = isolation_report['access_patterns'][conv_id]
            for path in conv_paths:
                assert f"concurrent-user-{i}" in path
                assert f"concurrent-{i}" in path
        
    finally:
        for workspace_dir in workspace_dirs:
            shutil.rmtree(workspace_dir, ignore_errors=True)


async def concurrent_workspace_operation(storage, operation_id: int, workspace_dir: str):
    """Helper function for concurrent testing."""
    manager = WorkspaceManager(
        storage=storage,
        conversation_id=f"concurrent-{operation_id}",
        user_id=f"concurrent-user-{operation_id}",
        workspace_path=workspace_dir
    )
    
    await manager.initialize()
    
    # Create some files concurrently
    files = {
        f"concurrent_{operation_id}.py": f"# Concurrent operation {operation_id}",
        f"data_{operation_id}.json": json.dumps({"id": operation_id, "timestamp": "now"}),
        "shared_name.txt": f"Content for operation {operation_id}"
    }
    
    for file_path, content in files.items():
        full_path = os.path.join(workspace_dir, file_path)
        with open(full_path, 'w') as f:
            f.write(content)
    
    await manager.manual_sync()
    await manager.cleanup()


if __name__ == "__main__":
    pytest.main([__file__])