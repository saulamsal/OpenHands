"""Abstract base class for workspace storage providers."""

import os
from abc import ABC, abstractmethod
from typing import List, Optional


class WorkspaceStorage(ABC):
    """Abstract base class for workspace storage providers.
    
    Provides an interface for uploading, downloading, and managing workspace files
    in various cloud storage providers (S3, Azure Blob, etc.).
    """

    @abstractmethod
    async def upload_file(self, local_path: str, remote_path: str) -> None:
        """Upload a single file to storage.
        
        Args:
            local_path: Path to the local file
            remote_path: Destination path in storage
        """
        pass

    @abstractmethod
    async def download_file(self, remote_path: str, local_path: str) -> None:
        """Download a single file from storage.
        
        Args:
            remote_path: Source path in storage
            local_path: Destination path for downloaded file
        """
        pass

    @abstractmethod
    async def upload_directory(self, local_dir: str, remote_dir: str) -> None:
        """Upload entire directory to storage.
        
        Args:
            local_dir: Path to local directory
            remote_dir: Destination directory path in storage
        """
        pass

    @abstractmethod
    async def download_directory(self, remote_dir: str, local_dir: str) -> None:
        """Download entire directory from storage.
        
        Args:
            remote_dir: Source directory path in storage
            local_dir: Destination directory path for download
        """
        pass

    @abstractmethod
    async def delete_file(self, remote_path: str) -> None:
        """Delete a file from storage.
        
        Args:
            remote_path: Path to file in storage
        """
        pass

    @abstractmethod
    async def delete_directory(self, remote_dir: str) -> None:
        """Delete a directory and all its contents from storage.
        
        Args:
            remote_dir: Path to directory in storage
        """
        pass

    @abstractmethod
    async def list_files(self, prefix: str) -> List[str]:
        """List all files with given prefix.
        
        Args:
            prefix: Prefix to search for
            
        Returns:
            List of file paths
        """
        pass

    @abstractmethod
    async def exists(self, remote_path: str) -> bool:
        """Check if file or directory exists.
        
        Args:
            remote_path: Path to check in storage
            
        Returns:
            True if exists, False otherwise
        """
        pass

    @abstractmethod
    async def get_file_size(self, remote_path: str) -> Optional[int]:
        """Get the size of a file in bytes.
        
        Args:
            remote_path: Path to file in storage
            
        Returns:
            File size in bytes, or None if file doesn't exist
        """
        pass

    def ensure_local_directory(self, local_path: str) -> None:
        """Ensure the local directory exists for a file path.
        
        Args:
            local_path: Local file path
        """
        directory = os.path.dirname(local_path)
        if directory and not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)