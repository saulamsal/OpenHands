"""Database-backed user authentication for OpenHands SaaS.

This implementation provides multi-tenant authentication with teams,
similar to Laravel Jetstream.
"""

from dataclasses import dataclass
from typing import Optional
import asyncio
import weakref

from fastapi import Depends, Request
from pydantic import SecretStr
from sqlalchemy.ext.asyncio import AsyncSession

from openhands.integrations.provider import PROVIDER_TOKEN_TYPE
from openhands.server import shared
from openhands.server.auth import current_active_user
from openhands.server.settings import Settings
from openhands.core.logger import openhands_logger as logger
from openhands.server.user_auth.user_auth import AuthType, UserAuth
from openhands.storage.data_models.user_secrets import UserSecrets
from openhands.storage.database import User, get_async_session
from openhands.storage.database.stores import (
    DatabaseSettingsStore,
    DatabaseSecretsStore,
)
from openhands.storage.secrets.secrets_store import SecretsStore
from openhands.storage.settings.settings_store import SettingsStore
from fastapi import HTTPException, status
import uuid


def _cleanup_session(session_ref):
    """Cleanup function for session when the UserAuth instance is garbage collected."""
    try:
        session = session_ref()
        if session and not session.is_closed:
            # Schedule session cleanup in the event loop
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(session.close())
                else:
                    # If no loop is running, we can't clean up asynchronously
                    logger.warning("Cannot clean up database session: no event loop running")
            except Exception as e:
                logger.warning(f"Error cleaning up database session: {e}")
    except Exception as e:
        logger.warning(f"Error in session cleanup finalizer: {e}")


@dataclass
class DatabaseUserAuth(UserAuth):
    """Database-backed user authentication mechanism.
    
    This provides multi-user support with team management,
    similar to Laravel Jetstream.
    """
    
    current_user: User
    db_session: AsyncSession
    auth_type: AuthType = AuthType.BEARER
    _settings: Settings | None = None
    _settings_store: SettingsStore | None = None
    _secrets_store: SecretsStore | None = None
    _user_secrets: UserSecrets | None = None
    
    def __post_init__(self):
        """Set up session cleanup using weakref finalizer."""
        if self.db_session:
            # Use weakref to ensure session is cleaned up when this instance is garbage collected
            self._finalizer = weakref.finalize(self, _cleanup_session, weakref.ref(self.db_session))
    
    async def close(self):
        """Manually close the database session."""
        if self.db_session and not self.db_session.is_closed:
            await self.db_session.close()
            # Disable the finalizer since we manually closed the session
            if hasattr(self, '_finalizer'):
                self._finalizer.detach()
    
    async def get_user_id(self) -> str | None:
        """Get the unique identifier for the current user."""
        return str(self.current_user.id)
    
    async def get_user_email(self) -> str | None:
        """Get the email for the current user."""
        return self.current_user.email
    
    async def get_access_token(self) -> SecretStr | None:
        """Get the access token for the current user.
        
        In database auth, we don't expose the raw JWT token.
        """
        return None
    
    async def get_provider_tokens(self) -> PROVIDER_TOKEN_TYPE | None:
        """Get the provider tokens for the current user."""
        user_secrets = await self.get_user_secrets()
        if user_secrets is None:
            return None
        return user_secrets.provider_tokens
    
    async def get_user_settings_store(self) -> SettingsStore:
        """Get the settings store for the current user."""
        if self._settings_store:
            return self._settings_store
            
        # Create database-backed settings store
        self._settings_store = DatabaseSettingsStore(
            user_id=str(self.current_user.id),
            db_session=self.db_session,
        )
        return self._settings_store
    
    async def get_user_settings(self) -> Settings | None:
        """Get the user settings for the current user."""
        if self._settings:
            return self._settings
            
        settings_store = await self.get_user_settings_store()
        settings = await settings_store.load()
        
        # Merge with config file settings if needed
        if settings:
            settings = settings.merge_with_config_settings()
            
        self._settings = settings
        return settings
    
    async def get_secrets_store(self) -> SecretsStore:
        """Get secrets store for the current user."""
        if self._secrets_store:
            return self._secrets_store
            
        # Create database-backed secrets store
        self._secrets_store = DatabaseSecretsStore(
            user_id=str(self.current_user.id),
            db_session=self.db_session,
        )
        return self._secrets_store
    
    async def get_user_secrets(self) -> UserSecrets | None:
        """Get the user's secrets."""
        if self._user_secrets:
            return self._user_secrets
            
        secrets_store = await self.get_secrets_store()
        user_secrets = await secrets_store.load()
        self._user_secrets = user_secrets
        return user_secrets
    
    def get_auth_type(self) -> AuthType | None:
        """Get the authentication type."""
        return self.auth_type
    
    @classmethod
    async def get_instance(cls, request: Request) -> "DatabaseUserAuth":
        """Get an instance of DatabaseUserAuth from the request.
        
        This method is called by the OpenHands framework to get the user auth instance.
        We need to handle both authenticated and unauthenticated requests.
        """
        from fastapi import HTTPException
        from openhands.storage.database.session import get_async_session_maker
        
        # Get database session using session maker - session will be managed by the request lifecycle
        async_session_maker = get_async_session_maker()
        db_session = async_session_maker()
        
        # Determine auth type from request
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            auth_type = AuthType.BEARER
        else:
            auth_type = AuthType.COOKIE
        
        # Try to get the current user if authenticated
        try:
            # Import here to avoid circular imports
            from openhands.server.auth.users import get_user_db
            from fastapi_users.jwt import decode_jwt
            
            token = None
            
            # Check if we have a bearer token
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
            else:
                # Check for cookie-based authentication
                cookie_value = request.cookies.get("openhands_session")
                if cookie_value:
                    token = cookie_value
                    auth_type = AuthType.COOKIE
            
            if token:
                # Decode and verify the token
                user_db = await anext(get_user_db(db_session))
                
                # Decode JWT to get user ID
                from openhands.server.auth.users import SECRET
                import uuid
                try:
                    payload = decode_jwt(token, SECRET, audience=["fastapi-users:auth"])
                    user_id_str = payload.get("sub")
                    
                    if user_id_str:
                        # Convert string user ID to UUID
                        try:
                            user_id = uuid.UUID(user_id_str)
                        except ValueError:
                            logger.error(f"Invalid user ID format: {user_id_str}")
                            raise
                        
                        user = await user_db.get(user_id)
                        if user and user.is_active:
                            logger.debug(f"User {user_id} authenticated via {auth_type}")
                            user_auth = cls(
                                current_user=user,
                                db_session=db_session,
                                auth_type=auth_type,
                            )
                            return user_auth
                except Exception as e:
                    logger.debug(f"Token validation failed: {e}")
                    pass
        except Exception as e:
            # If authentication fails, we'll return an anonymous auth
            logger.debug(f"Authentication failed: {e}")
        
        # Return anonymous auth for unauthenticated requests
        # This maintains compatibility with the existing system
        # Note: Protected endpoints should use the auth dependencies to enforce authentication
        return AnonymousDatabaseUserAuth(
            db_session=db_session,
            auth_type=auth_type,
        )


class AnonymousDatabaseUserAuth(DatabaseUserAuth):
    """Anonymous user authentication for unauthenticated requests.
    
    This maintains backward compatibility with the single-user mode.
    """
    
    def __init__(self, db_session: AsyncSession, auth_type: AuthType = AuthType.BEARER):
        """Initialize anonymous auth without a user."""
        self.current_user = None  # type: ignore
        self.db_session = db_session
        self.auth_type = auth_type
        self._settings = None
        self._settings_store = None
        self._secrets_store = None
        self._user_secrets = None
        # Set up session cleanup for anonymous auth too
        self.__post_init__()
    
    async def get_user_id(self) -> str | None:
        """Anonymous users have no ID."""
        return None
    
    async def get_user_email(self) -> str | None:
        """Anonymous users have no email."""
        return None


async def get_current_user_dependency(request: Request, db: AsyncSession = Depends(get_async_session)) -> User:
    """Dependency to get the current authenticated user.
    
    This is a bridge between our custom authentication and the teams route.
    """
    # Try to get the JWT token from cookie or bearer header
    token = None
    auth_header = request.headers.get("Authorization", "")
    
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        # Check for cookie-based authentication
        cookie_value = request.cookies.get("openhands_session")
        if cookie_value:
            token = cookie_value
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    
    # Decode and verify the token
    from openhands.server.auth.users import get_user_db, SECRET
    from fastapi_users.jwt import decode_jwt
    
    try:
        # Decode JWT to get user ID
        payload = decode_jwt(token, SECRET, audience=["fastapi-users:auth"])
        user_id_str = payload.get("sub")
        
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
        
        # Convert string user ID to UUID
        try:
            user_id = uuid.UUID(user_id_str)
        except ValueError:
            logger.error(f"Invalid user ID format: {user_id_str}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user ID format",
            )
        
        # Get user from database
        user_db = await anext(get_user_db(db))
        user = await user_db.get(user_id)
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
        )