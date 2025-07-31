#!/usr/bin/env python3
"""
Debug script to verify storage configuration without boto3.
"""

import os
import sys
from pathlib import Path

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

from openhands.core.config.openhands_config import load_openhands_config
from openhands.storage import get_file_store
from openhands.core.logger import openhands_logger as logger


def debug_storage_config():
    """Debug the current storage configuration."""
    print("=" * 80)
    print("Storage Configuration Debug")
    print("=" * 80)
    
    # Check environment variables
    print("\n1. Environment Variables:")
    print(f"   FILE_STORE: {os.getenv('FILE_STORE', 'NOT SET')}")
    print(f"   FILE_STORE_PATH: {os.getenv('FILE_STORE_PATH', 'NOT SET')}")
    print(f"   AWS_ACCESS_KEY_ID: {os.getenv('AWS_ACCESS_KEY_ID', 'NOT SET')}")
    print(f"   AWS_SECRET_ACCESS_KEY: {'SET' if os.getenv('AWS_SECRET_ACCESS_KEY') else 'NOT SET'}")
    print(f"   AWS_S3_BUCKET: {os.getenv('AWS_S3_BUCKET', 'NOT SET')}")
    print(f"   AWS_S3_ENDPOINT: {os.getenv('AWS_S3_ENDPOINT', 'NOT SET')}")
    
    # Load config
    print("\n2. Loading OpenHands Config:")
    try:
        config = load_openhands_config()
        print(f"   file_store: {config.file_store}")
        print(f"   file_store_path: {config.file_store_path}")
    except Exception as e:
        print(f"   ERROR loading config: {e}")
        return
    
    # Get file store
    print("\n3. Initializing FileStore:")
    try:
        file_store = get_file_store(config.file_store, config.file_store_path)
        print(f"   FileStore type: {file_store.__class__.__name__}")
        print(f"   FileStore module: {file_store.__class__.__module__}")
    except Exception as e:
        print(f"   ERROR creating FileStore: {e}")
        return
    
    # Test write/read
    print("\n4. Testing FileStore Operations:")
    test_path = "test-debug/test-file.txt"
    test_content = "Hello from debug script!"
    
    try:
        print(f"   Writing to: {test_path}")
        file_store.write(test_path, test_content)
        print("   Write successful!")
        
        print(f"   Reading from: {test_path}")
        read_content = file_store.read(test_path)
        print(f"   Read successful! Content: {read_content}")
        
        # Clean up
        file_store.delete(test_path)
        print("   Cleanup successful!")
        
    except Exception as e:
        print(f"   ERROR during test: {e}")
    
    # If S3, show additional info
    if file_store.__class__.__name__ == 'S3FileStore':
        print("\n5. S3FileStore Details:")
        try:
            print(f"   Bucket: {file_store.bucket}")
            if hasattr(file_store, '_s3_client'):
                print(f"   S3 Client configured: Yes")
                print(f"   Endpoint URL: {file_store._s3_client._client_config.__dict__.get('endpoint_url', 'Default')}")
            else:
                print(f"   S3 Client configured: No")
        except Exception as e:
            print(f"   ERROR getting S3 details: {e}")
    
    print("\n" + "=" * 80)
    print("SUMMARY:")
    if config.file_store == 's3' and file_store.__class__.__name__ == 'S3FileStore':
        print("✅ S3FileStore is configured and active")
        print("✅ Events should be stored in MinIO")
        print("\nCheck MinIO at: https://minio.herd.test")
        print(f"Bucket: {os.getenv('AWS_S3_BUCKET')}")
    else:
        print("❌ S3FileStore is NOT active")
        print(f"❌ Using {file_store.__class__.__name__} instead")
        print("\nEvents are being stored locally, not in MinIO")


if __name__ == "__main__":
    debug_storage_config()