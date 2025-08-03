"""Database-backed secrets storage implementation."""

import json
import uuid
from typing import Optional

from cryptography.fernet import Fernet
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import UUID

from openhands.core.logger import openhands_logger as logger
from openhands.storage.data_models.user_secrets import UserSecrets as UserSecretsModel
from openhands.storage.database.models import User, UserSettings
from openhands.storage.secrets.secrets_store import SecretsStore


class DatabaseSecretsStore(SecretsStore):
    """Database-backed implementation of SecretsStore.
    
    This stores encrypted user secrets in the database,
    similar to how Laravel encrypts sensitive data.
    """
    
    # TODO: Get this from environment/config in production
    # For now, use a consistent key (in production, this should be from environment)
    ENCRYPTION_KEY = b'ZmDfcTF7_60GrrY167zsiPd67pEvs0aGOv2oasOM1Pg='
    
    def __init__(self, user_id: str | None, db_session: AsyncSession):
        """Initialize the database secrets store.
        
        Args:
            user_id: The user's ID (None for anonymous users)
            db_session: The database session to use
        """
        self.user_id = user_id
        self.db_session = db_session
        self.fernet = Fernet(self.ENCRYPTION_KEY)
        self._session_owned = False  # Track if we own the session
    
    async def close(self):
        """Close the database session if we own it."""
        if self._session_owned and self.db_session:
            await self.db_session.close()
    
    async def load(self) -> UserSecretsModel | None:
        """Load secrets from the database."""
        # Return empty secrets for anonymous users
        if self.user_id is None:
            return UserSecretsModel(
                provider_tokens={},
                custom_secrets={},
            )
            
        try:
            # Load secrets from the user_settings table
            user_uuid = uuid.UUID(self.user_id)
            
            result = await self.db_session.execute(
                select(UserSettings).where(UserSettings.user_id == user_uuid)
            )
            user_settings = result.scalar_one_or_none()
            
            if user_settings is None:
                return UserSecretsModel(
                    provider_tokens={},
                    custom_secrets={},
                )
            
            # Extract secrets from the settings JSON
            settings_data = user_settings.settings or {}
            encrypted_secrets = settings_data.get('encrypted_secrets')
            
            logger.debug(f"Loading secrets for user {self.user_id}: settings_data keys = {list(settings_data.keys())}")
            
            if not encrypted_secrets:
                logger.debug(f"No encrypted_secrets found for user {self.user_id}")
                return UserSecretsModel(
                    provider_tokens={},
                    custom_secrets={},
                )
            
            # Decrypt and deserialize the secrets
            try:
                logger.debug(f"Attempting to decrypt secrets for user {self.user_id}")
                decrypted_data = self.fernet.decrypt(encrypted_secrets.encode())
                simple_secrets = json.loads(decrypted_data.decode())
                
                logger.debug(f"Successfully decrypted secrets for user {self.user_id}: {list(simple_secrets.keys())}")
                
                # Convert simple format back to UserSecretsModel format
                from openhands.integrations.provider import ProviderToken, CustomSecret
                from openhands.integrations.service_types import ProviderType
                from pydantic import SecretStr
                
                reconstructed_secrets = {
                    'provider_tokens': {},
                    'custom_secrets': {}
                }
                
                # Reconstruct provider tokens
                provider_tokens_data = simple_secrets.get('provider_tokens', {})
                for provider_key, token_data in provider_tokens_data.items():
                    try:
                        provider_type = ProviderType(provider_key)
                        reconstructed_secrets['provider_tokens'][provider_type] = ProviderToken(
                            token=SecretStr(token_data['token']),
                            host=token_data.get('host'),
                            user_id=token_data.get('user_id')
                        )
                    except ValueError as e:
                        logger.warning(f"Failed to reconstruct provider token for {provider_key}: {e}")
                
                # Reconstruct custom secrets
                custom_secrets_data = simple_secrets.get('custom_secrets', {})
                for secret_name, secret_data in custom_secrets_data.items():
                    try:
                        reconstructed_secrets['custom_secrets'][secret_name] = CustomSecret(
                            secret=SecretStr(secret_data['secret']),
                            description=secret_data.get('description', '')
                        )
                    except ValueError as e:
                        logger.warning(f"Failed to reconstruct custom secret {secret_name}: {e}")
                
                user_secrets = UserSecretsModel(**reconstructed_secrets)
                logger.debug(f"Loaded provider tokens: {list(user_secrets.provider_tokens.keys()) if user_secrets.provider_tokens else 'None'}")
                return user_secrets
            except Exception as e:
                logger.warning(f"Failed to decrypt secrets for user {self.user_id}: {e}")
                return UserSecretsModel(
                    provider_tokens={},
                    custom_secrets={},
                )
                
        except Exception as e:
            logger.error(f"Failed to load secrets for user {self.user_id}: {e}")
            return UserSecretsModel(
                provider_tokens={},
                custom_secrets={},
            )
    
    async def store(self, secrets: UserSecretsModel) -> None:
        """Store secrets in the database."""
        if self.user_id is None:
            logger.warning("Cannot store secrets for anonymous user")
            return
            
        try:
            # Convert to a simpler format for reliable round-trip serialization
            simple_secrets = {
                'provider_tokens': {},
                'custom_secrets': {}
            }
            
            # Manually serialize provider tokens to a simple format
            for provider_type, token_obj in secrets.provider_tokens.items():
                if token_obj and token_obj.token:
                    provider_key = provider_type.value if hasattr(provider_type, 'value') else str(provider_type)
                    simple_secrets['provider_tokens'][provider_key] = {
                        'token': token_obj.token.get_secret_value(),
                        'host': token_obj.host,
                        'user_id': token_obj.user_id
                    }
            
            # Manually serialize custom secrets
            for secret_name, secret_obj in secrets.custom_secrets.items():
                if secret_obj and secret_obj.secret:
                    simple_secrets['custom_secrets'][secret_name] = {
                        'secret': secret_obj.secret.get_secret_value(),
                        'description': secret_obj.description
                    }
            
            secrets_json = json.dumps(simple_secrets)
            encrypted_secrets = self.fernet.encrypt(secrets_json.encode()).decode()
            
            logger.debug(f"Storing secrets for user {self.user_id}: provider_tokens={list(simple_secrets['provider_tokens'].keys())}")
            
            # Load or create user settings
            user_uuid = uuid.UUID(self.user_id)
            
            result = await self.db_session.execute(
                select(UserSettings).where(UserSettings.user_id == user_uuid)
            )
            user_settings = result.scalar_one_or_none()
            
            if user_settings is None:
                # Create new user settings
                user_settings = UserSettings(
                    user_id=user_uuid,
                    settings={
                        'encrypted_secrets': encrypted_secrets
                    }
                )
                self.db_session.add(user_settings)
            else:
                # Update existing settings - create new dict to ensure SQLAlchemy detects the change
                settings_data = dict(user_settings.settings) if user_settings.settings else {}
                settings_data['encrypted_secrets'] = encrypted_secrets
                user_settings.settings = settings_data
                
                # Explicitly mark the field as modified for SQLAlchemy
                from sqlalchemy.orm import attributes
                attributes.flag_modified(user_settings, 'settings')
            
            await self.db_session.commit()
            logger.info(f"Successfully stored secrets for user {self.user_id}")
            
        except Exception as e:
            logger.error(f"Failed to store secrets for user {self.user_id}: {e}")
            await self.db_session.rollback()
            raise
    
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
        session_owned = False
        if db_session is None:
            # This should only happen in tests or special cases
            # In production, the session should be injected
            logger.warning("Creating new database session in SecretsStore - this should be injected in production")
            from openhands.storage.database.session import get_async_session_maker
            session_maker = get_async_session_maker()
            db_session = session_maker()
            session_owned = True
        
        # Create and return store instance
        store = cls(user_id=user_id, db_session=db_session)
        store._session_owned = session_owned
        return store