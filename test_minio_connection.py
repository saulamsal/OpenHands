#!/usr/bin/env python3
"""
Test MinIO connection and verify S3FileStore is working properly.
Run with: poetry run python test_minio_connection.py
"""

import os
import sys
from pathlib import Path

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

from openhands.core.config.openhands_config import load_openhands_config
from openhands.storage import get_file_store
from openhands.storage.s3 import S3FileStore
from openhands.core.logger import openhands_logger as logger
import json
from datetime import datetime


def test_minio_connection():
    """Test MinIO connection and S3FileStore functionality."""
    print("=" * 80)
    print("MinIO Connection Test")
    print("=" * 80)
    
    # Load configuration
    print("\n1. Loading configuration...")
    try:
        config = load_openhands_config()
        print(f"   FILE_STORE: {config.file_store}")
        print(f"   FILE_STORE_PATH: {config.file_store_path}")
    except Exception as e:
        print(f"   ERROR loading config: {e}")
        return
    
    # Check environment
    print("\n2. Checking S3 environment variables...")
    env_vars = {
        'AWS_ACCESS_KEY_ID': os.getenv('AWS_ACCESS_KEY_ID'),
        'AWS_SECRET_ACCESS_KEY': 'SET' if os.getenv('AWS_SECRET_ACCESS_KEY') else 'NOT SET',
        'AWS_S3_BUCKET': os.getenv('AWS_S3_BUCKET'),
        'AWS_S3_ENDPOINT': os.getenv('AWS_S3_ENDPOINT'),
        'AWS_S3_SECURE': os.getenv('AWS_S3_SECURE'),
        'AWS_S3_VERIFY_SSL': os.getenv('AWS_S3_VERIFY_SSL'),
    }
    for key, value in env_vars.items():
        print(f"   {key}: {value}")
    
    # Initialize file store
    print("\n3. Initializing FileStore...")
    try:
        file_store = get_file_store(config.file_store, config.file_store_path)
        print(f"   FileStore type: {file_store.__class__.__name__}")
        print(f"   Is S3FileStore: {isinstance(file_store, S3FileStore)}")
    except Exception as e:
        print(f"   ERROR creating FileStore: {e}")
        import traceback
        traceback.print_exc()
        return
    
    if not isinstance(file_store, S3FileStore):
        print("\n❌ ERROR: FileStore is not S3FileStore!")
        print("   Check your FILE_STORE setting in .env")
        return
    
    # Test write operation
    print("\n4. Testing write to MinIO...")
    test_path = f"test-events/test-{datetime.now().timestamp()}.json"
    test_data = {
        "test": "MinIO connection test",
        "timestamp": datetime.now().isoformat(),
        "message": "If you see this in MinIO, the connection works!"
    }
    
    try:
        print(f"   Writing to: {test_path}")
        file_store.write(test_path, json.dumps(test_data, indent=2))
        print("   ✅ Write successful!")
    except Exception as e:
        print(f"   ❌ Write failed: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Test read operation
    print("\n5. Testing read from MinIO...")
    try:
        content = file_store.read(test_path)
        print(f"   ✅ Read successful!")
        print(f"   Content: {content[:100]}...")
    except Exception as e:
        print(f"   ❌ Read failed: {e}")
    
    # List files
    print("\n6. Listing files in MinIO...")
    try:
        # Try to list the test-events directory
        files = file_store.list("test-events/")
        print(f"   Found {len(files)} files in test-events/")
        for f in files[:5]:  # Show first 5
            print(f"   - {f}")
    except Exception as e:
        print(f"   List operation note: {e}")
    
    # Test conversation event path
    print("\n7. Testing conversation event path...")
    user_id = "test-user-123"
    conversation_id = "test-conv-456"
    event_path = f"users/{user_id}/conversations/{conversation_id}/events/test-event.json"
    
    try:
        print(f"   Writing to: {event_path}")
        file_store.write(event_path, json.dumps({"event": "test"}))
        print("   ✅ Conversation event write successful!")
        
        # Try to read it back
        content = file_store.read(event_path)
        print("   ✅ Conversation event read successful!")
        
        # Clean up
        file_store.delete(event_path)
        print("   ✅ Cleanup successful!")
    except Exception as e:
        print(f"   ❌ Conversation event test failed: {e}")
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY:")
    if isinstance(file_store, S3FileStore):
        print("✅ S3FileStore is active")
        print(f"✅ MinIO endpoint: {os.getenv('AWS_S3_ENDPOINT')}")
        print(f"✅ Bucket: {os.getenv('AWS_S3_BUCKET')}")
        print("\nCheck MinIO dashboard for test files:")
        print(f"  - {test_path}")
        print("\nIf you don't see files in MinIO, check:")
        print("  1. MinIO credentials are correct")
        print("  2. Bucket exists and is accessible")
        print("  3. No network/firewall issues")
    else:
        print("❌ S3FileStore is NOT active")
        print("❌ Events are being stored locally")
    print("=" * 80)


if __name__ == "__main__":
    # Suppress SSL warnings
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    test_minio_connection()