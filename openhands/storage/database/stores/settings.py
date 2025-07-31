"""Database-backed settings storage implementation."""

import json
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from openhands.core.logger import openhands_logger as logger
from openhands.storage.data_models.settings import Settings
from openhands.storage.database.models import UserSettings
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
            return Settings(**settings_dict)
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
        settings_dict = settings.model_dump(exclude_none=True)
        
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
    
    async def get_instance(self, *args, **kwargs) -> "DatabaseSettingsStore":
        """Get an instance of the settings store."""
        return self