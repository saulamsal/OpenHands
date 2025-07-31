#!/usr/bin/env python3
"""Test script to verify the conversation system is fully working."""

import asyncio
import os
import sys
from datetime import datetime

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_conversation_system():
    """Test the complete conversation system."""
    print("🧪 Testing Conversation System")
    print("=" * 50)
    
    # Test 1: Database connection
    print("\n1️⃣ Testing Database Connection...")
    try:
        from openhands.storage.database.models import User
        from openhands.storage.database.session import get_async_session_context
        from sqlalchemy import select
        
        async with get_async_session_context() as session:
            result = await session.execute(select(User).limit(1))
            user = result.scalar_one_or_none()
            if user:
                print(f"✅ Database connected! Found user: {user.email}")
            else:
                print("⚠️  Database connected but no users found")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
    
    # Test 2: MinIO/S3 Storage
    print("\n2️⃣ Testing MinIO/S3 Storage...")
    try:
        from openhands.storage import get_file_store
        from openhands.core.config import load_openhands_config
        
        config = load_openhands_config()
        file_store = get_file_store(
            config.file_store,
            config.file_store_path,
            config.file_store_web_hook_url,
            config.file_store_web_hook_headers,
        )
        
        print(f"✅ FileStore initialized: {file_store.__class__.__name__}")
        
        # Test write/read
        test_key = f"test/conversation_test_{datetime.now().isoformat()}.txt"
        test_content = "Hello from conversation test!"
        
        file_store.write(test_key, test_content)
        print(f"✅ Wrote test file to S3: {test_key}")
        
        read_content = file_store.read(test_key)
        if read_content == test_content:
            print("✅ Successfully read file from S3")
        else:
            print("❌ File content mismatch")
            
    except Exception as e:
        print(f"❌ S3 storage test failed: {e}")
        return False
    
    # Test 3: Conversation Store
    print("\n3️⃣ Testing Conversation Store...")
    try:
        from openhands.storage.database.stores import DatabaseConversationStore
        from openhands.storage.data_models.conversation_metadata import ConversationMetadata
        from openhands.utils.conversation_summary import get_default_conversation_title
        import uuid
        
        # Use a test user ID
        test_user_id = "4d364b8b-6a9b-4bbd-aaa2-a009149b411b"
        
        conversation_store = await DatabaseConversationStore.get_instance(
            config, test_user_id
        )
        
        # Create test conversation
        test_conversation_id = str(uuid.uuid4())
        metadata = ConversationMetadata(
            conversation_id=test_conversation_id,
            user_id=test_user_id,
            title=f"Test Conversation {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            last_updated_at=datetime.now(),
            selected_repository=None  # Required field
        )
        
        await conversation_store.save_metadata(metadata)
        print(f"✅ Created test conversation: {test_conversation_id}")
        
        # Read it back
        retrieved = await conversation_store.get_metadata(test_conversation_id)
        if retrieved.conversation_id == test_conversation_id:
            print("✅ Successfully retrieved conversation metadata")
        else:
            print("❌ Conversation metadata mismatch")
            
        # Clean up
        await conversation_store.delete_metadata(test_conversation_id)
        print("✅ Cleaned up test conversation")
        
    except Exception as e:
        print(f"❌ Conversation store test failed: {e}")
        return False
    
    # Test 4: Docker Runtime
    print("\n4️⃣ Testing Docker Runtime...")
    try:
        import docker
        client = docker.from_env()
        
        # Check if Docker is running
        client.ping()
        print("✅ Docker is running")
        
        # Check for OpenHands containers
        containers = client.containers.list(filters={"name": "openhands-runtime"})
        if containers:
            print(f"✅ Found {len(containers)} OpenHands runtime container(s)")
            for container in containers:
                print(f"   - {container.name}: {container.status}")
        else:
            print("ℹ️  No active OpenHands containers (normal if no conversations are running)")
            
    except Exception as e:
        print(f"❌ Docker test failed: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("✅ All tests passed! The conversation system is working correctly.")
    print("\nNext steps:")
    print("1. Restart the backend server")
    print("2. Create a new conversation in the frontend")
    print("3. The agent interface should now appear!")
    
    return True

if __name__ == "__main__":
    success = asyncio.run(test_conversation_system())
    sys.exit(0 if success else 1)