"""Service to resolve LLM configuration from settings."""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from openhands.core.logger import openhands_logger as logger
from openhands.storage.data_models.settings import Settings
from openhands.storage.database.stores.llm_configurations import LLMConfigurationService
from openhands.storage.encryption import APIKeyEncryption


class LLMConfigurationResolver:
    """Resolves LLM configuration from settings, handling both legacy and new configuration methods."""
    
    @staticmethod
    async def resolve_llm_config(
        settings: Settings,
        user_id: str,
        db_session: Optional[AsyncSession] = None
    ) -> tuple[str | None, str | None, str | None]:
        """Resolve LLM configuration from settings.
        
        Returns:
            Tuple of (model, api_key, base_url)
        """
        # ONLY use configuration system - no fallback
        if not settings.llm_configuration_id or not db_session:
            logger.error(f"LLMConfigurationResolver: No configuration ID provided or no database session")
            return (None, None, None)
            
        logger.info(f"LLMConfigurationResolver: Using configuration ID {settings.llm_configuration_id}")
        logger.info(f"LLMConfigurationResolver: DB session type: {type(db_session)}")
        logger.info(f"LLMConfigurationResolver: DB session is closed: {db_session.is_closed if hasattr(db_session, 'is_closed') else 'N/A'}")
        
        try:
            config_service = LLMConfigurationService(db_session)
            logger.info(f"LLMConfigurationResolver: Created LLMConfigurationService")
            config = await config_service.get_configuration(settings.llm_configuration_id, user_id)
            
            if config:
                logger.info(f"LLMConfigurationResolver: Found configuration:")
                logger.info(f"  - name: {config.name}")
                logger.info(f"  - provider: {config.provider}")
                logger.info(f"  - model: {config.model}")
                logger.info(f"  - base_url: {config.base_url}")
                logger.info(f"  - encrypted API key length: {len(config.api_key_encrypted) if config.api_key_encrypted else 0}")
                
                # Decrypt the API key
                encryption = APIKeyEncryption()
                decrypted_key = encryption.decrypt(config.api_key_encrypted)
                logger.info(f"  - decrypted API key starts with: {decrypted_key[:10] if decrypted_key else 'None'}...")
                
                return (
                    f"{config.provider}/{config.model}",
                    decrypted_key,
                    config.base_url
                )
            else:
                logger.warning(f"LLMConfigurationResolver: Configuration {settings.llm_configuration_id} not found for user {user_id}")
                return (None, None, None)
        except Exception as e:
            logger.error(f"LLMConfigurationResolver: Error resolving configuration: {e}")
            return (None, None, None)
    
    @staticmethod
    async def get_default_configuration_id(
        user_id: str,
        db_session: AsyncSession
    ) -> Optional[str]:
        """Get the default LLM configuration ID for a user."""
        try:
            config_service = LLMConfigurationService(db_session)
            configs = await config_service.list(user_id, include_inactive=False)
            
            # Find default configuration
            for config in configs:
                if config.is_default:
                    return config.id
            
            # If no default, return the first active configuration
            if configs:
                return configs[0].id
                
        except Exception as e:
            logger.error(f"Error getting default LLM configuration: {e}")
        
        return None