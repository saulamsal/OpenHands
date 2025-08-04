"""Database-backed conversation storage implementation."""

from datetime import datetime, timezone
from typing import List, Tuple

from sqlalchemy import select, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from openhands.core.config.openhands_config import OpenHandsConfig
from openhands.core.logger import openhands_logger as logger
from openhands.integrations.service_types import ProviderType
from openhands.storage.conversation.conversation_store import ConversationStore
from openhands.storage.data_models.conversation_metadata import (
    ConversationMetadata,
    ConversationTrigger,
)
from openhands.storage.data_models.conversation_metadata_result_set import (
    ConversationMetadataResultSet,
)
from openhands.storage.database.models import ConversationDB
from openhands.storage.database.session import get_async_session


class DatabaseConversationStore(ConversationStore):
    """Database-backed implementation of ConversationStore.
    
    This stores conversation metadata in the database while
    keeping the actual events in file storage (S3/MinIO) for
    cost efficiency.
    """
    
    def __init__(self, user_id: str | None, db_session: AsyncSession):
        """Initialize the database conversation store.
        
        Args:
            user_id: The user's ID (None for anonymous users)
            db_session: The database session to use
        """
        self.user_id = user_id
        self.db_session = db_session
    
    async def save_metadata(self, metadata: ConversationMetadata) -> None:
        """Save conversation metadata to the database."""
        # Check if conversation already exists
        result = await self.db_session.execute(
            select(ConversationDB).where(
                ConversationDB.conversation_id == metadata.conversation_id
            )
        )
        conversation = result.scalar_one_or_none()
        
        if conversation is None:
            # Create new conversation
            conversation = ConversationDB(
                conversation_id=metadata.conversation_id,
                user_id=self.user_id,
                title=metadata.title,
                selected_repository=metadata.selected_repository,
                selected_branch=metadata.selected_branch,
                git_provider=metadata.git_provider.value if metadata.git_provider else None,
                status=metadata.status.value if hasattr(metadata, 'status') and metadata.status else None,
                trigger=metadata.trigger.value if metadata.trigger else None,
                pr_number=metadata.pr_number,
                accumulated_cost=int(metadata.accumulated_cost * 100),  # Store as cents
                prompt_tokens=metadata.prompt_tokens,
                completion_tokens=metadata.completion_tokens,
                total_tokens=metadata.total_tokens,
                llm_model=metadata.llm_model,
                project_type=metadata.project_type,
                project_detection_confidence=metadata.project_detection_confidence,
                created_at=metadata.created_at or datetime.now(timezone.utc),
                last_updated_at=metadata.last_updated_at or datetime.now(timezone.utc),
            )
            self.db_session.add(conversation)
        else:
            # Update existing conversation
            conversation.title = metadata.title
            conversation.selected_repository = metadata.selected_repository
            conversation.selected_branch = metadata.selected_branch
            conversation.git_provider = metadata.git_provider.value if metadata.git_provider else None
            conversation.status = metadata.status.value if hasattr(metadata, 'status') and metadata.status else None
            conversation.trigger = metadata.trigger.value if metadata.trigger else None
            conversation.pr_number = metadata.pr_number
            conversation.accumulated_cost = int(metadata.accumulated_cost * 100)
            conversation.prompt_tokens = metadata.prompt_tokens
            conversation.completion_tokens = metadata.completion_tokens
            conversation.total_tokens = metadata.total_tokens
            conversation.llm_model = metadata.llm_model
            conversation.project_type = metadata.project_type
            conversation.project_detection_confidence = metadata.project_detection_confidence
            conversation.last_updated_at = metadata.last_updated_at or datetime.now(timezone.utc)
        
        await self.db_session.commit()
    
    async def get_metadata(self, conversation_id: str) -> ConversationMetadata:
        """Get conversation metadata from the database."""
        result = await self.db_session.execute(
            select(ConversationDB).where(
                and_(
                    ConversationDB.conversation_id == conversation_id,
                    ConversationDB.user_id == self.user_id,
                )
            )
        )
        conversation = result.scalar_one_or_none()
        
        if conversation is None:
            raise FileNotFoundError(f"Conversation {conversation_id} not found")
        
        return self._db_to_metadata(conversation)
    
    async def delete_metadata(self, conversation_id: str) -> None:
        """Delete conversation metadata from the database."""
        result = await self.db_session.execute(
            select(ConversationDB).where(
                and_(
                    ConversationDB.conversation_id == conversation_id,
                    ConversationDB.user_id == self.user_id,
                )
            )
        )
        conversation = result.scalar_one_or_none()
        
        if conversation:
            await self.db_session.delete(conversation)
            await self.db_session.commit()
    
    async def search(
        self,
        page_id: str | None = None,
        limit: int = 20,
    ) -> ConversationMetadataResultSet:
        """Search for conversations in the database."""
        query = select(ConversationDB).where(
            ConversationDB.user_id == self.user_id
        ).order_by(desc(ConversationDB.last_updated_at))
        
        # Apply pagination if page_id is provided
        if page_id:
            # page_id is the last_updated_at timestamp of the last item
            try:
                last_updated = datetime.fromisoformat(page_id)
                query = query.where(ConversationDB.last_updated_at < last_updated)
            except ValueError:
                logger.warning(f"Invalid page_id format: {page_id}")
        
        # Limit results
        query = query.limit(limit + 1)  # Get one extra to check if there's a next page
        
        result = await self.db_session.execute(query)
        conversations = result.scalars().all()
        
        # Check if there's a next page
        has_next_page = len(conversations) > limit
        if has_next_page:
            conversations = conversations[:limit]
            next_page_id = conversations[-1].last_updated_at.isoformat()
        else:
            next_page_id = None
        
        # Convert to metadata objects
        results = [self._db_to_metadata(conv) for conv in conversations]
        
        return ConversationMetadataResultSet(
            results=results,
            next_page_id=next_page_id,
        )
    
    async def exists(self, conversation_id: str) -> bool:
        """Check if a conversation exists."""
        result = await self.db_session.execute(
            select(ConversationDB.id).where(
                and_(
                    ConversationDB.conversation_id == conversation_id,
                    ConversationDB.user_id == self.user_id,
                )
            )
        )
        return result.scalar_one_or_none() is not None
    
    def _db_to_metadata(self, conversation: ConversationDB) -> ConversationMetadata:
        """Convert database model to metadata object."""
        return ConversationMetadata(
            conversation_id=conversation.conversation_id,
            user_id=str(conversation.user_id),
            title=conversation.title,
            selected_repository=conversation.selected_repository,
            selected_branch=conversation.selected_branch,
            git_provider=ProviderType(conversation.git_provider) if conversation.git_provider else None,
            trigger=ConversationTrigger(conversation.trigger) if conversation.trigger else None,
            pr_number=conversation.pr_number or [],
            accumulated_cost=conversation.accumulated_cost / 100.0,  # Convert from cents
            prompt_tokens=conversation.prompt_tokens,
            completion_tokens=conversation.completion_tokens,
            total_tokens=conversation.total_tokens,
            llm_model=conversation.llm_model,
            project_type=conversation.project_type,
            project_detection_confidence=conversation.project_detection_confidence,
            created_at=conversation.created_at,
            last_updated_at=conversation.last_updated_at,
        )
    
    @classmethod
    async def get_instance(
        cls, 
        config: OpenHandsConfig, 
        user_id: str | None,
        db_session: AsyncSession | None = None
    ) -> "DatabaseConversationStore":
        """Create a new instance with database connection.
        
        This method is called by the framework to instantiate the store
        for each request. 
        
        Args:
            config: OpenHands configuration
            user_id: User ID for the store
            db_session: Optional database session. If not provided, creates a new one.
        """
        if db_session is None:
            # This should only happen in tests or special cases
            # In production, the session should be injected
            logger.warning("Creating new database session in ConversationStore - this should be injected in production")
            # We can't use the context manager here because it would close when we return
            # This is a temporary workaround
            from openhands.storage.database.session import get_async_session_maker
            session_maker = get_async_session_maker()
            db_session = session_maker()
        
        # Create and return store instance
        return cls(user_id=user_id, db_session=db_session)