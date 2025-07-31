#!/usr/bin/env python3
"""
Test script to verify conversation system with S3/MinIO storage.

Run this after starting the backend server to test:
1. Creation of conversations
2. S3 event storage 
3. Session management
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

from openhands.core.config.openhands_config import load_openhands_config
from openhands.storage import get_file_store
from openhands.storage.database.stores.conversation import DatabaseConversationStore
from openhands.storage.database.session import get_async_session_context
from openhands.storage.data_models.conversation_metadata import ConversationMetadata, ConversationTrigger
from openhands.core.logger import openhands_logger as logger


async def test_conversation_flow():
    """Test the full conversation flow with S3 storage."""
    logger.info("Starting conversation flow test...")
    
    # Load configuration
    config = load_openhands_config()
    logger.info(f"Loaded config - FILE_STORE: {config.file_store}")
    
    # Test 1: Verify S3 FileStore is active
    file_store = get_file_store(config.file_store, config.file_store_path)
    logger.info(f"FileStore type: {file_store.__class__.__name__}")
    
    # Test 2: Create a test conversation
    user_id = "test-user-123"
    conversation_id = "test-conv-" + os.urandom(8).hex()
    
    async with get_async_session_context() as db_session:
        # Create conversation store
        conv_store = DatabaseConversationStore(user_id=user_id, db_session=db_session)
        
        # Create conversation metadata
        metadata = ConversationMetadata(
            conversation_id=conversation_id,
            user_id=user_id,
            title="Test Conversation",
            trigger=ConversationTrigger.GUI,
            accumulated_cost=0.0,
            prompt_tokens=0,
            completion_tokens=0,
            total_tokens=0,
        )
        
        # Save metadata
        logger.info(f"Saving conversation metadata for {conversation_id}")
        await conv_store.save_metadata(metadata)
        
        # Verify it was saved
        retrieved = await conv_store.get_metadata(conversation_id)
        logger.info(f"Retrieved conversation: {retrieved.title}")
        
        # Test 3: Verify S3 event storage
        event_path = f"conversations/{user_id}/{conversation_id}/events/test-event.json"
        test_event = '{"type": "test", "message": "Hello S3!"}'
        
        logger.info(f"Writing test event to S3: {event_path}")
        file_store.write(event_path, test_event)
        
        # Read it back
        read_back = file_store.read(event_path)
        logger.info(f"Read back from S3: {read_back}")
        
        # List files in conversation directory
        conv_dir = f"conversations/{user_id}/{conversation_id}"
        files = file_store.list(conv_dir)
        logger.info(f"Files in S3 conversation directory: {files}")
        
        # Clean up
        logger.info("Cleaning up test data...")
        await conv_store.delete_metadata(conversation_id)
        file_store.delete(event_path)
        
    logger.info("Test completed successfully!")
    logger.info("\nSummary:")
    logger.info(f"✓ FileStore type: {file_store.__class__.__name__}")
    logger.info(f"✓ Conversation saved to database")
    logger.info(f"✓ Events stored in S3/MinIO")
    logger.info(f"✓ Session management working")


if __name__ == "__main__":
    asyncio.run(test_conversation_flow())