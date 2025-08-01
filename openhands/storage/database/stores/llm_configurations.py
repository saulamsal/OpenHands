"""LLM Configuration service for managing multiple LLM API keys."""

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from openhands.core.logger import openhands_logger as logger
from openhands.llm import LLM
from openhands.core.config.llm_config import LLMConfig
from openhands.storage.database.models import LLMConfiguration, User
from openhands.storage.encryption import APIKeyEncryption, mask_api_key


class LLMConfigurationService:
    """Service for managing LLM configurations with encrypted API keys."""
    
    def __init__(self, db_session: AsyncSession):
        """Initialize the service with a database session.
        
        Args:
            db_session: The async database session
        """
        self.db_session = db_session
        self.encryption = APIKeyEncryption()
    
    async def create_configuration(
        self,
        user_id: str,
        name: str,
        provider: str,
        model: str,
        api_key: str,
        base_url: Optional[str] = None,
        is_default: bool = False,
    ) -> LLMConfiguration:
        """Create a new LLM configuration for a user.
        
        Args:
            user_id: The user's ID
            name: Configuration name (e.g., "My GPT-4 Key")
            provider: Provider name (openai, anthropic, etc.)
            model: Model name (gpt-4o, claude-3.5-sonnet, etc.)
            api_key: The API key (will be encrypted)
            base_url: Optional custom endpoint URL
            is_default: Whether this should be the default configuration
            
        Returns:
            The created LLMConfiguration
        """
        # Encrypt the API key
        encrypted_key = self.encryption.encrypt(api_key)
        
        # If setting as default, clear other defaults for this user
        if is_default:
            await self.clear_default_for_user(user_id)
        
        # Create the configuration
        config = LLMConfiguration(
            user_id=user_id,
            name=name,
            provider=provider,
            model=model,
            api_key_encrypted=encrypted_key,
            base_url=base_url,
            is_default=is_default,
            test_status='untested',
        )
        
        self.db_session.add(config)
        await self.db_session.commit()
        await self.db_session.refresh(config)
        
        logger.info(f"Created LLM configuration '{name}' for user {user_id}")
        return config
    
    async def get_configuration(
        self, 
        config_id: str,
        user_id: str
    ) -> Optional[LLMConfiguration]:
        """Get a specific LLM configuration.
        
        Args:
            config_id: The configuration ID
            user_id: The user ID (for authorization)
            
        Returns:
            The LLMConfiguration if found and authorized, None otherwise
        """
        logger.info(f"get_configuration called with config_id={config_id}, user_id={user_id}")
        
        # First, let's check ALL configurations in the database
        all_configs_result = await self.db_session.execute(
            select(LLMConfiguration)
        )
        all_configs = all_configs_result.scalars().all()
        logger.info(f"Total configurations in database: {len(all_configs)}")
        for config in all_configs:
            logger.info(f"  - Config ID: {config.id}, User ID: {config.user_id}, Name: {config.name}")
        
        # Now check configurations for this specific user
        user_configs_result = await self.db_session.execute(
            select(LLMConfiguration).where(LLMConfiguration.user_id == user_id)
        )
        user_configs = user_configs_result.scalars().all()
        logger.info(f"Found {len(user_configs)} configurations for user {user_id}")
        for config in user_configs:
            logger.info(f"  - Config ID: {config.id}, Name: {config.name}, Active: {config.is_active}")
        
        # Now try to get the specific configuration
        result = await self.db_session.execute(
            select(LLMConfiguration).where(
                and_(
                    LLMConfiguration.id == config_id,
                    LLMConfiguration.user_id == user_id
                )
            )
        )
        config = result.scalar_one_or_none()
        
        if config:
            logger.info(f"Found configuration: {config.name} (ID: {config.id})")
        else:
            logger.warning(f"Configuration not found for config_id={config_id}, user_id={user_id}")
            
        return config
    
    async def list_configurations(
        self,
        user_id: str,
        include_inactive: bool = False
    ) -> List[LLMConfiguration]:
        """List all LLM configurations for a user.
        
        Args:
            user_id: The user's ID
            include_inactive: Whether to include inactive configurations
            
        Returns:
            List of LLMConfiguration objects
        """
        query = select(LLMConfiguration).where(
            LLMConfiguration.user_id == user_id
        )
        
        if not include_inactive:
            query = query.where(LLMConfiguration.is_active == True)
        
        query = query.order_by(
            LLMConfiguration.is_default.desc(),
            LLMConfiguration.created_at.desc()
        )
        
        result = await self.db_session.execute(query)
        return list(result.scalars().all())
    
    async def update_configuration(
        self,
        config_id: str,
        user_id: str,
        name: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> Optional[LLMConfiguration]:
        """Update an existing LLM configuration.
        
        Args:
            config_id: The configuration ID
            user_id: The user ID (for authorization)
            name: New name (optional)
            model: New model (optional)
            api_key: New API key (optional, will be encrypted)
            base_url: New base URL (optional)
            
        Returns:
            The updated LLMConfiguration if found and updated, None otherwise
        """
        config = await self.get_configuration(config_id, user_id)
        if not config:
            return None
        
        if name is not None:
            config.name = name
        if model is not None:
            config.model = model
        if api_key is not None:
            config.api_key_encrypted = self.encryption.encrypt(api_key)
            # Reset test status when API key changes
            config.test_status = 'untested'
            config.test_message = None
        if base_url is not None:
            config.base_url = base_url
        
        config.updated_at = datetime.now(timezone.utc)
        
        await self.db_session.commit()
        await self.db_session.refresh(config)
        
        logger.info(f"Updated LLM configuration {config_id} for user {user_id}")
        return config
    
    async def delete_configuration(
        self,
        config_id: str,
        user_id: str
    ) -> bool:
        """Delete an LLM configuration.
        
        Args:
            config_id: The configuration ID
            user_id: The user ID (for authorization)
            
        Returns:
            True if deleted, False if not found
        """
        config = await self.get_configuration(config_id, user_id)
        if not config:
            return False
        
        await self.db_session.delete(config)
        await self.db_session.commit()
        
        logger.info(f"Deleted LLM configuration {config_id} for user {user_id}")
        return True
    
    async def set_default(
        self,
        config_id: str,
        user_id: str
    ) -> bool:
        """Set a configuration as the default for a user.
        
        Args:
            config_id: The configuration ID
            user_id: The user ID (for authorization)
            
        Returns:
            True if set as default, False if not found
        """
        config = await self.get_configuration(config_id, user_id)
        if not config:
            return False
        
        # Clear other defaults
        await self.clear_default_for_user(user_id)
        
        # Set this as default
        config.is_default = True
        await self.db_session.commit()
        
        logger.info(f"Set LLM configuration {config_id} as default for user {user_id}")
        return True
    
    async def clear_default_for_user(self, user_id: str) -> None:
        """Clear the default configuration for a user.
        
        Args:
            user_id: The user's ID
        """
        result = await self.db_session.execute(
            select(LLMConfiguration).where(
                and_(
                    LLMConfiguration.user_id == user_id,
                    LLMConfiguration.is_default == True
                )
            )
        )
        
        for config in result.scalars():
            config.is_default = False
        
        await self.db_session.commit()
    
    async def test_configuration(
        self,
        config: LLMConfiguration
    ) -> dict:
        """Test an LLM configuration by making a simple API call.
        
        Args:
            config: The LLMConfiguration to test
            
        Returns:
            Dict with 'success', 'message', and optional 'latency' keys
        """
        try:
            # Decrypt the API key
            decrypted_key = self.encryption.decrypt(config.api_key_encrypted)
            
            # Create LLM instance
            llm_config = LLMConfig(
                model=config.model,
                api_key=decrypted_key,
                base_url=config.base_url,
            )
            llm = LLM(llm_config)
            
            # Test with a minimal prompt
            start_time = datetime.now(timezone.utc)
            response = await llm.acompletion(
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=5,
            )
            end_time = datetime.now(timezone.utc)
            
            # Calculate latency in milliseconds
            latency = int((end_time - start_time).total_seconds() * 1000)
            
            # Update test status
            config.test_status = 'success'
            config.test_message = f"LLM responding correctly ({latency}ms)"
            await self.db_session.commit()
            
            return {
                "success": True,
                "message": config.test_message,
                "latency": latency,
            }
            
        except Exception as e:
            error_message = str(e)
            
            # Categorize common errors
            if "Invalid API key" in error_message or "Incorrect API key" in error_message:
                config.test_message = "Invalid API key - please check your key"
            elif "rate limit" in error_message.lower():
                config.test_message = "Rate limit exceeded - try again later"
            elif "model not found" in error_message.lower():
                config.test_message = f"Model '{config.model}' not available"
            else:
                config.test_message = f"Connection failed: {error_message[:200]}"
            
            config.test_status = 'failed'
            await self.db_session.commit()
            
            logger.error(f"LLM configuration test failed: {error_message}")
            return {
                "success": False,
                "message": config.test_message,
            }
    
    async def get_default_configuration(
        self,
        user_id: str
    ) -> Optional[LLMConfiguration]:
        """Get the default LLM configuration for a user.
        
        Args:
            user_id: The user's ID
            
        Returns:
            The default LLMConfiguration if one exists, None otherwise
        """
        result = await self.db_session.execute(
            select(LLMConfiguration).where(
                and_(
                    LLMConfiguration.user_id == user_id,
                    LLMConfiguration.is_default == True,
                    LLMConfiguration.is_active == True
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def update_last_used(
        self,
        config_id: str
    ) -> None:
        """Update the last_used_at timestamp for a configuration.
        
        Args:
            config_id: The configuration ID
        """
        result = await self.db_session.execute(
            select(LLMConfiguration).where(
                LLMConfiguration.id == config_id
            )
        )
        config = result.scalar_one_or_none()
        
        if config:
            config.last_used_at = datetime.now(timezone.utc)
            await self.db_session.commit()
    
    def get_masked_api_key(self, config: LLMConfiguration) -> str:
        """Get a masked version of the API key for display.
        
        Args:
            config: The LLMConfiguration
            
        Returns:
            Masked API key string
        """
        try:
            decrypted_key = self.encryption.decrypt(config.api_key_encrypted)
            return mask_api_key(decrypted_key)
        except Exception:
            return "****"