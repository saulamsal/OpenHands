"""Database-backed settings storage implementation."""

import json
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from openhands.core.logger import openhands_logger as logger
from openhands.storage.data_models.settings import Settings
from openhands.storage.database.models import UserSettings, LLMConfiguration
from openhands.storage.settings.settings_store import SettingsStore


class DatabaseSettingsStore(SettingsStore):
    """Database-backed implementation of SettingsStore.
    
    This stores user settings in the database, similar to how
    Laravel stores user preferences.
    """
    
    def __init__(self, user_id: str | None, db_session: AsyncSession):
        """Initialize the database settings store.
        
        Args:
            user_id: The user's ID (None for anonymous users)
            db_session: The database session to use
        """
        self.user_id = user_id
        self.db_session = db_session
    
    async def load(self) -> Settings | None:
        """Load settings from the database."""
        # Return None for anonymous users (will use defaults from config)
        if self.user_id is None:
            return None
            
        # Query for user settings
        result = await self.db_session.execute(
            select(UserSettings).where(UserSettings.user_id == self.user_id)
        )
        user_settings = result.scalar_one_or_none()
        
        if user_settings is None or not user_settings.settings:
            # Return None if no settings exist
            return None
        
        # Convert JSON to Settings object
        try:
            settings_dict = user_settings.settings
            if isinstance(settings_dict, str):
                settings_dict = json.loads(settings_dict)
            settings = Settings(**settings_dict)
            
            # If no LLM configuration ID is set, try to use the default one
            if not settings.llm_configuration_id:
                logger.info(f"No LLM configuration ID set for user {self.user_id}, checking for default configuration")
                
                # Query for the user's default active LLM configuration
                result = await self.db_session.execute(
                    select(LLMConfiguration).where(
                        LLMConfiguration.user_id == self.user_id,
                        LLMConfiguration.is_default == True,
                        LLMConfiguration.is_active == True
                    )
                )
                default_config = result.scalar_one_or_none()
                
                if default_config:
                    logger.info(f"Found default LLM configuration '{default_config.name}' (ID: {default_config.id}) for user {self.user_id}")
                    settings.llm_configuration_id = str(default_config.id)
                else:
                    logger.info(f"No default LLM configuration found for user {self.user_id}")
            
            return settings
        except Exception as e:
            logger.error(f"Error loading settings for user {self.user_id}: {e}")
            return None
    
    async def store(self, settings: Settings) -> None:
        """Store settings in the database."""
        # Don't store settings for anonymous users
        if self.user_id is None:
            logger.warning("Cannot store settings for anonymous user")
            return
            
        # Check if settings already exist
        result = await self.db_session.execute(
            select(UserSettings).where(UserSettings.user_id == self.user_id)
        )
        user_settings = result.scalar_one_or_none()
        
        # Convert settings to dict
        settings_dict = settings.model_dump(
            exclude_none=True,
            context={'expose_secrets': True}  # Prevents SecretStr masking
        )
        
        if user_settings is None:
            # Create new settings record
            user_settings = UserSettings(
                user_id=self.user_id,
                settings=settings_dict,
            )
            self.db_session.add(user_settings)
        else:
            # Update existing settings
            user_settings.settings = settings_dict
        
        # Commit the changes
        await self.db_session.commit()
    
    @classmethod
    async def get_instance(
        cls, 
        config, 
        user_id: str | None,
        db_session: AsyncSession | None = None
    ) -> "DatabaseSettingsStore":
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
            logger.warning("Creating new database session in SettingsStore - this should be injected in production")
            from openhands.storage.database.session import get_async_session_maker
            session_maker = get_async_session_maker()
            db_session = session_maker()
        
        # Create and return store instance
        return cls(user_id=user_id, db_session=db_session)