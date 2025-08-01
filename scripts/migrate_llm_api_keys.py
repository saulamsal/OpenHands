#!/usr/bin/env python3
"""
Script to migrate existing LLM API keys from user settings to the new llm_configurations table.

This script:
1. Loads all user settings
2. For each user with an API key set, creates an LLM configuration entry
3. Updates the user's settings to reference the new configuration
4. Marks the configuration as default
"""

import asyncio
import os
import sys
from typing import Optional

# Add parent directory to path to import OpenHands modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.ext.asyncio import AsyncSession

from openhands.core.logger import openhands_logger as logger
from openhands.storage.database.db_manager import get_db_session
from openhands.storage.database.stores.settings import SettingsDBStore
from openhands.storage.database.stores.llm_configurations import LLMConfigurationService
from openhands.storage.data_models.llm_configuration import LLMConfigurationCreate
from openhands.storage.data_models.settings import Settings
from openhands.storage.encryption import APIKeyEncryption


async def migrate_user_api_key(
    user_id: str,
    settings: Settings,
    config_service: LLMConfigurationService,
    encryption: APIKeyEncryption,
    db_session: AsyncSession
) -> Optional[str]:
    """Migrate a single user's API key to the configurations table."""
    
    # Skip if no API key is set
    if not settings.llm_api_key:
        logger.info(f"User {user_id} has no API key set, skipping")
        return None
    
    # Get the actual API key value
    api_key_value = settings.llm_api_key.get_secret_value()
    if not api_key_value or api_key_value.startswith("***"):
        logger.warning(f"User {user_id} has invalid API key (asterisks), skipping")
        return None
    
    # Extract provider and model from the full model name
    model_parts = settings.llm_model.split('/', 1)
    if len(model_parts) == 2:
        provider, model = model_parts
    else:
        # Default to openai if no provider specified
        provider = "openai"
        model = settings.llm_model
    
    # Check if a configuration already exists for this user with the same provider/model
    existing_configs = await config_service.list(user_id, include_inactive=True)
    for config in existing_configs:
        if config.provider == provider and config.model == model:
            # Decrypt and compare API keys
            existing_key = encryption.decrypt(config.api_key)
            if existing_key == api_key_value:
                logger.info(f"User {user_id} already has configuration for {provider}/{model}, using existing")
                return config.id
    
    # Create new configuration
    config_data = LLMConfigurationCreate(
        name=f"{provider.upper()} - {model} (Migrated)",
        provider=provider,
        model=model,
        api_key=api_key_value,  # Will be encrypted by the service
        base_url=settings.llm_base_url,
        is_default=True  # Mark as default since it's the current active key
    )
    
    try:
        new_config = await config_service.create(user_id, config_data)
        logger.info(f"Created configuration {new_config.id} for user {user_id}")
        return new_config.id
    except Exception as e:
        logger.error(f"Failed to create configuration for user {user_id}: {e}")
        return None


async def main():
    """Main migration function."""
    logger.info("Starting LLM API key migration...")
    
    encryption = APIKeyEncryption()
    migrated_count = 0
    error_count = 0
    
    async with get_db_session() as db_session:
        # Get all users with settings
        settings_store = SettingsDBStore(db_session)
        config_service = LLMConfigurationService(db_session)
        
        # Query all users with settings
        from sqlalchemy import select
        from openhands.storage.database.models import UserSettingsModel
        
        result = await db_session.execute(select(UserSettingsModel))
        user_settings_list = result.scalars().all()
        
        logger.info(f"Found {len(user_settings_list)} users with settings")
        
        for user_settings in user_settings_list:
            user_id = user_settings.user_id
            
            try:
                # Load settings
                settings = Settings.model_validate(user_settings.settings)
                
                # Migrate API key if present
                config_id = await migrate_user_api_key(
                    user_id, settings, config_service, encryption, db_session
                )
                
                if config_id:
                    # Update settings to reference the new configuration
                    settings.llm_configuration_id = config_id
                    # Clear the API key from settings (it's now in the configuration)
                    settings.llm_api_key = None
                    
                    # Save updated settings
                    settings_dict = settings.model_dump(
                        exclude_none=True,
                        context={'expose_secrets': True}
                    )
                    user_settings.settings = settings_dict
                    await db_session.commit()
                    
                    migrated_count += 1
                    logger.info(f"Successfully migrated user {user_id}")
                    
            except Exception as e:
                logger.error(f"Error migrating user {user_id}: {e}")
                error_count += 1
                await db_session.rollback()
    
    logger.info(f"Migration completed: {migrated_count} users migrated, {error_count} errors")


if __name__ == "__main__":
    asyncio.run(main())