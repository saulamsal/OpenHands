"""Database-backed secrets storage implementation."""

import json
from typing import Optional

from cryptography.fernet import Fernet
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from openhands.core.logger import openhands_logger as logger
from openhands.storage.data_models.user_secrets import UserSecrets as UserSecretsModel
from openhands.storage.database.models import User
from openhands.storage.secrets.secrets_store import SecretsStore


class DatabaseSecretsStore(SecretsStore):
    """Database-backed implementation of SecretsStore.
    
    This stores encrypted user secrets in the database,
    similar to how Laravel encrypts sensitive data.
    """
    
    # TODO: Get this from environment/config in production
    ENCRYPTION_KEY = Fernet.generate_key()
    
    def __init__(self, user_id: str | None, db_session: AsyncSession):
        """Initialize the database secrets store.
        
        Args:
            user_id: The user's ID (None for anonymous users)
            db_session: The database session to use
        """
        self.user_id = user_id
        self.db_session = db_session
        self.fernet = Fernet(self.ENCRYPTION_KEY)
    
    async def load(self) -> UserSecretsModel | None:
        """Load secrets from the database."""
        # Return empty secrets for anonymous users
        if self.user_id is None:
            return UserSecretsModel(
                provider_tokens={},
                custom_secrets={},
            )
            
        # For now, we'll store secrets in the user's settings
        # In a production system, you'd want a separate encrypted secrets table
        result = await self.db_session.execute(
            select(User).where(User.id == self.user_id)
        )
        user = result.scalar_one_or_none()
        
        if user is None:
            return None
        
        # TODO: Implement proper secrets storage
        # For now, return empty secrets
        return UserSecretsModel(
            provider_tokens={},
            custom_secrets={},
        )
    
    async def store(self, secrets: UserSecretsModel) -> None:
        """Store secrets in the database."""
        # TODO: Implement proper encrypted secrets storage
        # This would involve:
        # 1. Encrypting the secrets data
        # 2. Storing in a separate secrets table
        # 3. Proper key management
        logger.info(f"Storing secrets for user {self.user_id}")
    
    @classmethod
    async def get_instance(
        cls, 
        config, 
        user_id: str | None,
        db_session: AsyncSession | None = None
    ) -> "DatabaseSecretsStore":
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
            logger.warning("Creating new database session in SecretsStore - this should be injected in production")
            from openhands.storage.database.session import get_async_session_maker
            session_maker = get_async_session_maker()
            db_session = session_maker()
        
        # Create and return store instance
        return cls(user_id=user_id, db_session=db_session)