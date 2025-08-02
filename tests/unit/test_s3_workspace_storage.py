"""Test suite for S3WorkspaceStorage - S3/MinIO integration."""

import pytest
import asyncio
import tempfile
import os
import shutil
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from pathlib import Path

from openhands.storage.workspace.s3 import S3WorkspaceStorage


@pytest.fixture
def mock_s3_client():
    """Mock boto3 S3 client."""
    mock_client = MagicMock()
    
    # Mock successful responses
    mock_client.head_object.return_value = {'ContentLength': 1024}
    mock_client.upload_file.return_value = None
    mock_client.download_file.return_value = None
    mock_client.delete_object.return_value = None
    mock_client.list_objects_v2.return_value = {
        'Contents': [
            {'Key': 'test/file1.py', 'Size': 100},
            {'Key': 'test/file2.py', 'Size': 200}
        ]
    }
    
    return mock_client


@pytest.fixture  
def s3_storage(mock_s3_client):
    """Create S3WorkspaceStorage instance with mocked S3 client."""
    with patch('boto3.client', return_value=mock_s3_client):
        storage = S3WorkspaceStorage(
            bucket="test-bucket",
            access_key="test-key",
            secret_key="test-secret",
            region="us-east-1",
            endpoint_url="http://localhost:9000",
            verify_ssl=False
        )
        storage.s3_client = mock_s3_client
        return storage


@pytest.fixture
def temp_files():
    """Create temporary files for testing."""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create test files
        test_files = {
            'test.py': 'print("hello world")',
            'config.json': '{"debug": true}',
            'subdir/nested.py': 'def nested_func(): pass'
        }
        
        file_paths = {}
        for rel_path, content in test_files.items():
            full_path = os.path.join(temp_dir, rel_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, 'w') as f:
                f.write(content)
            file_paths[rel_path] = full_path
            
        yield temp_dir, file_paths, test_files


def test_s3_storage_initialization():
    """Test S3WorkspaceStorage initializes with correct configuration."""
    with patch('boto3.client') as mock_boto:
        storage = S3WorkspaceStorage(
            bucket="my-bucket",
            access_key="access-key",
            secret_key="secret-key", 
            region="us-west-2",
            endpoint_url="https://minio.example.com",
            verify_ssl=True
        )
        
        # Verify boto3 client was created with correct parameters
        mock_boto.assert_called_once_with(
            's3',
            aws_access_key_id="access-key",
            aws_secret_access_key="secret-key",
            endpoint_url="https://minio.example.com",
            region_name="us-west-2",
            use_ssl=True,
            verify=True,
            config=storage.transfer_config
        )
        
        assert storage.bucket == "my-bucket"


@pytest.mark.asyncio
async def test_upload_file(s3_storage, temp_files):
    """Test single file upload to S3."""
    temp_dir, file_paths, test_files = temp_files
    
    local_path = file_paths['test.py']
    remote_path = "workspace/files/test.py"
    
    await s3_storage.upload_file(local_path, remote_path)
    
    # Verify S3 upload was called correctly
    s3_storage.s3_client.upload_file.assert_called_once_with(
        local_path, "test-bucket", remote_path
    )


@pytest.mark.asyncio
async def test_download_file(s3_storage, temp_files):
    """Test single file download from S3."""
    temp_dir, file_paths, test_files = temp_files
    
    remote_path = "workspace/files/downloaded.py"
    local_path = os.path.join(temp_dir, "downloaded.py")
    
    await s3_storage.download_file(remote_path, local_path)
    
    # Verify S3 download was called correctly
    s3_storage.s3_client.download_file.assert_called_once_with(
        "test-bucket", remote_path, local_path
    )


@pytest.mark.asyncio
async def test_upload_directory(s3_storage, temp_files):
    """Test directory upload to S3."""
    temp_dir, file_paths, test_files = temp_files
    
    local_dir = temp_dir
    remote_dir = "workspace/files"
    
    await s3_storage.upload_directory(local_dir, remote_dir)
    
    # Verify all files in directory were uploaded
    upload_calls = s3_storage.s3_client.upload_file.call_args_list
    assert len(upload_calls) == len(test_files)
    
    # Check that each file was uploaded with correct remote path
    uploaded_remote_paths = [call[0][2] for call in upload_calls]
    
    for rel_path in test_files.keys():
        expected_remote_path = f"{remote_dir}/{rel_path}"
        assert expected_remote_path in uploaded_remote_paths


@pytest.mark.asyncio
async def test_download_directory(s3_storage, temp_files):
    """Test directory download from S3."""
    temp_dir, file_paths, test_files = temp_files
    
    # Create a separate download directory
    download_dir = os.path.join(temp_dir, "download")
    remote_dir = "workspace/files"
    
    # Mock list_objects to return file list
    s3_storage.s3_client.list_objects_v2.return_value = {
        'Contents': [
            {'Key': f"{remote_dir}/test.py", 'Size': 100},
            {'Key': f"{remote_dir}/config.json", 'Size': 50},
            {'Key': f"{remote_dir}/subdir/nested.py", 'Size': 75}
        ]
    }
    
    await s3_storage.download_directory(remote_dir, download_dir)
    
    # Verify directory was created
    assert os.path.exists(download_dir)
    
    # Verify download was called for each file
    download_calls = s3_storage.s3_client.download_file.call_args_list
    assert len(download_calls) == 3


@pytest.mark.asyncio
async def test_delete_file(s3_storage):
    """Test file deletion from S3."""
    remote_path = "workspace/files/to_delete.py"
    
    await s3_storage.delete_file(remote_path)
    
    # Verify S3 delete was called correctly
    s3_storage.s3_client.delete_object.assert_called_once_with(
        Bucket="test-bucket",
        Key=remote_path
    )


@pytest.mark.asyncio
async def test_delete_directory(s3_storage):
    """Test directory deletion from S3."""
    remote_dir = "workspace/files/to_delete"
    
    # Mock list_objects to return files in directory
    s3_storage.s3_client.list_objects_v2.return_value = {
        'Contents': [
            {'Key': f"{remote_dir}/file1.py", 'Size': 100},
            {'Key': f"{remote_dir}/file2.py", 'Size': 200}, 
            {'Key': f"{remote_dir}/subdir/file3.py", 'Size': 150}
        ]
    }
    
    await s3_storage.delete_directory(remote_dir)
    
    # Verify all files in directory were deleted
    delete_calls = s3_storage.s3_client.delete_object.call_args_list
    assert len(delete_calls) == 3
    
    # Check that correct files were deleted
    deleted_keys = [call[1]['Key'] for call in delete_calls]
    expected_keys = [
        f"{remote_dir}/file1.py",
        f"{remote_dir}/file2.py",
        f"{remote_dir}/subdir/file3.py"
    ]
    for key in expected_keys:
        assert key in deleted_keys


@pytest.mark.asyncio
async def test_list_files(s3_storage):
    """Test file listing from S3."""
    prefix = "workspace/files"
    
    # Mock S3 response
    s3_storage.s3_client.list_objects_v2.return_value = {
        'Contents': [
            {'Key': f"{prefix}/file1.py", 'Size': 100},
            {'Key': f"{prefix}/file2.py", 'Size': 200},
            {'Key': f"{prefix}/subdir/file3.py", 'Size': 150}
        ]
    }
    
    files = await s3_storage.list_files(prefix)
    
    expected_files = [
        f"{prefix}/file1.py",
        f"{prefix}/file2.py", 
        f"{prefix}/subdir/file3.py"
    ]
    
    assert files == expected_files
    
    # Verify S3 list was called correctly
    s3_storage.s3_client.list_objects_v2.assert_called_once_with(
        Bucket="test-bucket",
        Prefix=prefix
    )


@pytest.mark.asyncio
async def test_exists_file_exists(s3_storage):
    """Test existence check for existing file."""
    remote_path = "workspace/files/existing.py"
    
    # Mock successful head_object (file exists)
    s3_storage.s3_client.head_object.return_value = {'ContentLength': 1024}
    
    exists = await s3_storage.exists(remote_path)
    
    assert exists is True
    s3_storage.s3_client.head_object.assert_called_once_with(
        Bucket="test-bucket",
        Key=remote_path
    )


@pytest.mark.asyncio
async def test_exists_file_not_exists(s3_storage):
    """Test existence check for non-existing file."""
    remote_path = "workspace/files/nonexistent.py"
    
    # Mock 404 error (file doesn't exist)
    from botocore.exceptions import ClientError
    s3_storage.s3_client.head_object.side_effect = ClientError(
        {'Error': {'Code': '404'}}, 'HeadObject'
    )
    
    exists = await s3_storage.exists(remote_path)
    
    assert exists is False


@pytest.mark.asyncio
async def test_get_file_size(s3_storage):
    """Test file size retrieval."""
    remote_path = "workspace/files/sized_file.py"
    
    # Mock head_object response with size
    s3_storage.s3_client.head_object.return_value = {'ContentLength': 2048}
    
    size = await s3_storage.get_file_size(remote_path)
    
    assert size == 2048
    s3_storage.s3_client.head_object.assert_called_once_with(
        Bucket="test-bucket",
        Key=remote_path
    )


@pytest.mark.asyncio
async def test_get_file_size_nonexistent(s3_storage):
    """Test file size retrieval for non-existent file."""
    remote_path = "workspace/files/nonexistent.py"
    
    # Mock 404 error (file doesn't exist)
    from botocore.exceptions import ClientError
    s3_storage.s3_client.head_object.side_effect = ClientError(
        {'Error': {'Code': '404'}}, 'HeadObject'
    )
    
    size = await s3_storage.get_file_size(remote_path)
    
    assert size is None


@pytest.mark.asyncio
async def test_parallel_uploads(s3_storage, temp_files):
    """Test parallel file uploads work correctly."""
    temp_dir, file_paths, test_files = temp_files
    
    # Create multiple files for parallel upload
    parallel_files = []
    for i in range(5):
        file_path = os.path.join(temp_dir, f"parallel_{i}.py")
        with open(file_path, 'w') as f:
            f.write(f"# Parallel file {i}")
        parallel_files.append((file_path, f"workspace/parallel_{i}.py"))
    
    # Upload all files in parallel
    upload_tasks = [
        s3_storage.upload_file(local_path, remote_path) 
        for local_path, remote_path in parallel_files
    ]
    
    await asyncio.gather(*upload_tasks)
    
    # Verify all uploads were called
    assert s3_storage.s3_client.upload_file.call_count == len(parallel_files)


@pytest.mark.asyncio
async def test_error_handling_network_failure(s3_storage, temp_files):
    """Test error handling for network failures."""
    temp_dir, file_paths, test_files = temp_files
    
    local_path = file_paths['test.py'] 
    remote_path = "workspace/files/test.py"
    
    # Mock network error
    from botocore.exceptions import BotoCoreError
    s3_storage.s3_client.upload_file.side_effect = BotoCoreError()
    
    # Upload should raise the network error
    with pytest.raises(BotoCoreError):
        await s3_storage.upload_file(local_path, remote_path)


@pytest.mark.asyncio
async def test_retry_logic_with_exponential_backoff(s3_storage, temp_files):
    """Test retry logic with exponential backoff for transient failures."""
    temp_dir, file_paths, test_files = temp_files
    
    local_path = file_paths['test.py']
    remote_path = "workspace/files/test.py"
    
    # Mock transient failure then success
    from botocore.exceptions import ClientError
    transient_error = ClientError(
        {'Error': {'Code': 'ServiceUnavailable'}}, 'PutObject'
    )
    
    # Fail twice, then succeed
    s3_storage.s3_client.upload_file.side_effect = [
        transient_error, transient_error, None
    ]
    
    # Should succeed after retries
    await s3_storage.upload_file(local_path, remote_path)
    
    # Verify retry attempts were made
    assert s3_storage.s3_client.upload_file.call_count == 3


@pytest.mark.asyncio
async def test_large_directory_upload_performance(s3_storage):
    """Test performance with large directory structures."""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create many files to test performance
        num_files = 50
        for i in range(num_files):
            subdir = os.path.join(temp_dir, f"subdir_{i // 10}")
            os.makedirs(subdir, exist_ok=True)
            
            file_path = os.path.join(subdir, f"file_{i}.py")
            with open(file_path, 'w') as f:
                f.write(f"# File {i} content")
        
        # Upload entire directory
        remote_dir = "workspace/large_test"
        
        await s3_storage.upload_directory(temp_dir, remote_dir)
        
        # Verify all files were uploaded
        assert s3_storage.s3_client.upload_file.call_count == num_files


@pytest.mark.asyncio
async def test_minio_specific_configuration():
    """Test MinIO-specific configuration options."""
    with patch('boto3.client') as mock_boto:
        storage = S3WorkspaceStorage(
            bucket="minio-bucket",
            access_key="minio-access",
            secret_key="minio-secret",
            region="us-east-1",
            endpoint_url="https://minio.example.com:9000",
            verify_ssl=False  # Common for self-hosted MinIO
        )
        
        # Verify MinIO-specific configuration
        mock_boto.assert_called_once_with(
            's3',
            aws_access_key_id="minio-access",
            aws_secret_access_key="minio-secret", 
            endpoint_url="https://minio.example.com:9000",
            region_name="us-east-1",
            use_ssl=False,
            verify=False,  # SSL verification disabled for self-signed certs
            config=storage.transfer_config
        )


@pytest.mark.asyncio 
async def test_compressed_backup_upload(s3_storage, temp_files):
    """Test uploading compressed backup files."""
    temp_dir, file_paths, test_files = temp_files
    
    # Create a mock compressed backup file
    backup_file = os.path.join(temp_dir, "backup.tar.gz")
    with open(backup_file, 'wb') as f:
        f.write(b"mock compressed data")
    
    remote_backup_path = "workspace/compressed/backup-2024-01-01-12-00-00.tar.gz"
    
    await s3_storage.upload_file(backup_file, remote_backup_path)
    
    # Verify backup was uploaded correctly
    s3_storage.s3_client.upload_file.assert_called_once_with(
        backup_file, "test-bucket", remote_backup_path
    )


if __name__ == "__main__":
    pytest.main([__file__])