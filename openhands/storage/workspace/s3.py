"""S3-based workspace storage implementation."""

import asyncio
import os
import tempfile
from typing import List, Optional
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from openhands.core.logger import openhands_logger as logger
from openhands.utils.async_utils import call_sync_from_async
from .base import WorkspaceStorage


class S3WorkspaceStorage(WorkspaceStorage):
    """S3-based implementation of workspace storage.
    
    Supports both AWS S3 and MinIO with async operations, parallel transfers,
    and retry logic for improved reliability and performance.
    """

    def __init__(
        self,
        bucket: Optional[str] = None,
        region: Optional[str] = None,
        endpoint_url: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        secure: Optional[bool] = None,
        verify_ssl: Optional[bool] = None,
    ):
        """Initialize S3WorkspaceStorage.
        
        Args:
            bucket: S3 bucket name (defaults to AWS_S3_BUCKET env var)
            region: AWS region (defaults to AWS_DEFAULT_REGION env var)
            endpoint_url: Custom endpoint for MinIO/S3-compatible storage
            access_key: AWS access key (defaults to AWS_ACCESS_KEY_ID env var)
            secret_key: AWS secret key (defaults to AWS_SECRET_ACCESS_KEY env var)
            secure: Use HTTPS (defaults to AWS_S3_SECURE env var)
            verify_ssl: Verify SSL certificates (defaults to AWS_S3_VERIFY_SSL env var)
        """
        # Use environment variables as fallbacks
        self.bucket = bucket or os.getenv('AWS_S3_BUCKET')
        if not self.bucket:
            raise ValueError('S3 bucket name must be provided or set in AWS_S3_BUCKET')
        
        self.region = region or os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
        self.endpoint_url = endpoint_url or os.getenv('AWS_S3_ENDPOINT')
        self.access_key = access_key or os.getenv('AWS_ACCESS_KEY_ID')
        self.secret_key = secret_key or os.getenv('AWS_SECRET_ACCESS_KEY')
        
        # SSL/Security settings
        if secure is None:
            secure = os.getenv('AWS_S3_SECURE', 'true').lower() == 'true'
        if verify_ssl is None:
            verify_ssl = os.getenv('AWS_S3_VERIFY_SSL', 'true').lower() == 'true'
        
        self.secure = secure
        self.verify_ssl = verify_ssl
        
        # Ensure endpoint URL has proper scheme
        if self.endpoint_url:
            self.endpoint_url = self._ensure_url_scheme(secure, self.endpoint_url)
        
        # Configure transfer settings for performance
        self.transfer_config = Config(
            retries={'max_attempts': 3, 'mode': 'adaptive'},
            max_pool_connections=50,
        )
        
        # Create sync S3 client
        self.client = boto3.client(
            's3',
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            endpoint_url=self.endpoint_url,
            region_name=self.region,
            use_ssl=self.secure,
            verify=self.verify_ssl,
            config=self.transfer_config,
        )

    def _ensure_url_scheme(self, secure: bool, url: str) -> str:
        """Ensure URL has proper HTTP/HTTPS scheme."""
        if secure:
            if not url.startswith('https://'):
                url = 'https://' + url.removeprefix('http://')
        else:
            if not url.startswith('http://'):
                url = 'http://' + url.removeprefix('https://')
        return url

    def _put_object(self, key: str, body: bytes) -> None:
        """Sync wrapper for S3 put_object."""
        return self.client.put_object(Bucket=self.bucket, Key=key, Body=body)
    
    def _get_object(self, key: str) -> dict:
        """Sync wrapper for S3 get_object."""
        return self.client.get_object(Bucket=self.bucket, Key=key)
    
    def _delete_object(self, key: str) -> None:
        """Sync wrapper for S3 delete_object."""
        return self.client.delete_object(Bucket=self.bucket, Key=key)
    
    def _head_object(self, key: str) -> dict:
        """Sync wrapper for S3 head_object."""
        return self.client.head_object(Bucket=self.bucket, Key=key)
    
    def _list_objects_v2(self, prefix: str = '', **kwargs) -> dict:
        """Sync wrapper for S3 list_objects_v2."""
        return self.client.list_objects_v2(Bucket=self.bucket, Prefix=prefix, **kwargs)
    
    def _delete_objects(self, objects: list) -> dict:
        """Sync wrapper for S3 delete_objects."""
        return self.client.delete_objects(
            Bucket=self.bucket, 
            Delete={'Objects': objects, 'Quiet': True}
        )

    async def upload_file(self, local_path: str, remote_path: str) -> None:
        """Upload a single file to S3."""
        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Local file not found: {local_path}")
        
        try:
            # Read file content
            with open(local_path, 'rb') as f:
                content = f.read()
            
            # Upload using async wrapper
            await call_sync_from_async(self._put_object, remote_path, content)
            logger.debug(f"Uploaded file {local_path} to s3://{self.bucket}/{remote_path}")
                
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'AccessDenied':
                raise PermissionError(f"Access denied to bucket '{self.bucket}'")
            elif error_code == 'NoSuchBucket':
                raise FileNotFoundError(f"Bucket '{self.bucket}' does not exist")
            else:
                raise RuntimeError(f"Failed to upload {local_path}: {e}")

    async def download_file(self, remote_path: str, local_path: str) -> None:
        """Download a single file from S3."""
        self.ensure_local_directory(local_path)
        
        try:
            # Download using async wrapper
            response = await call_sync_from_async(self._get_object, remote_path)
            
            # Write file content
            with open(local_path, 'wb') as f:
                f.write(response['Body'].read())
                        
            logger.debug(f"Downloaded s3://{self.bucket}/{remote_path} to {local_path}")
                        
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchBucket':
                raise FileNotFoundError(f"Bucket '{self.bucket}' does not exist")
            elif error_code == 'NoSuchKey':
                raise FileNotFoundError(f"File '{remote_path}' not found in bucket '{self.bucket}'")
            else:
                raise RuntimeError(f"Failed to download {remote_path}: {e}")

    async def upload_directory(self, local_dir: str, remote_dir: str) -> None:
        """Upload entire directory to S3 with parallel transfers."""
        if not os.path.exists(local_dir):
            raise FileNotFoundError(f"Local directory not found: {local_dir}")
        
        # Collect all files to upload
        upload_tasks = []
        for root, dirs, files in os.walk(local_dir):
            for file in files:
                local_file_path = os.path.join(root, file)
                relative_path = os.path.relpath(local_file_path, local_dir)
                remote_file_path = f"{remote_dir.rstrip('/')}/{relative_path}".replace('\\', '/')
                
                upload_tasks.append(self.upload_file(local_file_path, remote_file_path))
        
        if upload_tasks:
            # Upload files in parallel (max 10 concurrent uploads)
            semaphore = asyncio.Semaphore(10)
            
            async def limited_upload(task):
                async with semaphore:
                    await task
            
            await asyncio.gather(*[limited_upload(task) for task in upload_tasks])
            logger.info(f"Uploaded directory {local_dir} to s3://{self.bucket}/{remote_dir} ({len(upload_tasks)} files)")

    async def download_directory(self, remote_dir: str, local_dir: str) -> None:
        """Download entire directory from S3 with parallel transfers."""
        os.makedirs(local_dir, exist_ok=True)
        
        # List all files in the remote directory
        files = await self.list_files(remote_dir)
        
        if not files:
            logger.debug(f"No files found in s3://{self.bucket}/{remote_dir}")
            return
        
        # Create download tasks
        download_tasks = []
        for remote_file in files:
            if remote_file.endswith('/'):  # Skip directory entries
                continue
                
            relative_path = os.path.relpath(remote_file, remote_dir)
            local_file_path = os.path.join(local_dir, relative_path).replace('/', os.sep)
            
            download_tasks.append(self.download_file(remote_file, local_file_path))
        
        if download_tasks:
            # Download files in parallel (max 10 concurrent downloads)
            semaphore = asyncio.Semaphore(10)
            
            async def limited_download(task):
                async with semaphore:
                    await task
            
            await asyncio.gather(*[limited_download(task) for task in download_tasks])
            logger.info(f"Downloaded directory s3://{self.bucket}/{remote_dir} to {local_dir} ({len(download_tasks)} files)")

    async def delete_file(self, remote_path: str) -> None:
        """Delete a file from S3."""
        try:
            await call_sync_from_async(self._delete_object, remote_path)
            logger.debug(f"Deleted s3://{self.bucket}/{remote_path}")
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchBucket':
                raise FileNotFoundError(f"Bucket '{self.bucket}' does not exist")
            # NoSuchKey is not an error for delete operations
            elif error_code != 'NoSuchKey':
                raise RuntimeError(f"Failed to delete {remote_path}: {e}")

    async def delete_directory(self, remote_dir: str) -> None:
        """Delete a directory and all its contents from S3."""
        files = await self.list_files(remote_dir)
        
        if not files:
            return
        
        try:
            # Delete in batches for efficiency
            batch_size = 1000
            for i in range(0, len(files), batch_size):
                batch = files[i:i + batch_size]
                delete_objects = [{'Key': file} for file in batch]
                
                await call_sync_from_async(self._delete_objects, delete_objects)
                    
            logger.info(f"Deleted directory s3://{self.bucket}/{remote_dir} ({len(files)} files)")
            
        except ClientError as e:
            raise RuntimeError(f"Failed to delete directory {remote_dir}: {e}")

    async def list_files(self, prefix: str) -> List[str]:
        """List all files with given prefix."""
        if not prefix.endswith('/') and prefix:
            prefix += '/'
        
        files = []
        try:
            # Use pagination for large directories
            continuation_token = None
            while True:
                kwargs = {'Prefix': prefix}
                if continuation_token:
                    kwargs['ContinuationToken'] = continuation_token
                    
                response = await call_sync_from_async(self._list_objects_v2, **kwargs)
                
                contents = response.get('Contents', [])
                files.extend([obj['Key'] for obj in contents])
                
                if not response.get('IsTruncated'):
                    break
                continuation_token = response.get('NextContinuationToken')
                    
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchBucket':
                raise FileNotFoundError(f"Bucket '{self.bucket}' does not exist")
            else:
                raise RuntimeError(f"Failed to list files with prefix {prefix}: {e}")
        
        return files

    async def exists(self, remote_path: str) -> bool:
        """Check if file or directory exists in S3."""
        try:
            await call_sync_from_async(self._head_object, remote_path)
            return True
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code in ['NoSuchKey', '404']:
                # Also check if it's a directory (prefix)
                files = await self.list_files(remote_path)
                return len(files) > 0
            else:
                raise RuntimeError(f"Failed to check existence of {remote_path}: {e}")

    async def get_file_size(self, remote_path: str) -> Optional[int]:
        """Get the size of a file in bytes."""
        try:
            response = await call_sync_from_async(self._head_object, remote_path)
            return response['ContentLength']
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code in ['NoSuchKey', '404']:
                return None
            else:
                raise RuntimeError(f"Failed to get file size for {remote_path}: {e}")

    async def create_backup_archive(self, local_dir: str, remote_archive_path: str) -> None:
        """Create a compressed backup archive of a directory."""
        import tarfile
        
        with tempfile.NamedTemporaryFile(suffix='.tar.gz', delete=False) as tmp_file:
            try:
                # Create tar.gz archive
                with tarfile.open(tmp_file.name, 'w:gz') as tar:
                    tar.add(
                        local_dir,
                        arcname='.',
                        filter=lambda x: None if any(
                            pattern in x.name for pattern in [
                                'node_modules', '__pycache__', '.pytest_cache',
                                '.git/objects', '.git/refs', '.git/logs'
                            ]
                        ) else x
                    )
                
                # Upload archive
                await self.upload_file(tmp_file.name, remote_archive_path)
                logger.info(f"Created backup archive at s3://{self.bucket}/{remote_archive_path}")
                
            finally:
                # Clean up temporary file
                if os.path.exists(tmp_file.name):
                    os.unlink(tmp_file.name)