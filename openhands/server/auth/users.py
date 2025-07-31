"""FastAPI-Users configuration for OpenHands authentication.

This module sets up FastAPI-Users with dual authentication support:
cookie-based (for web) and JWT bearer tokens (for API).
"""

import os
import uuid
from typing import Optional

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy,
)
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession

from openhands.core.logger import openhands_logger as logger
from openhands.server.auth.cookie_backend import CookieTransport, DualTransport
from openhands.storage.database import User, get_async_session


# Secret key for JWT tokens - from environment
SECRET = os.getenv("JWT_SECRET", "SECRET_KEY_CHANGE_THIS_IN_PRODUCTION")
SESSION_LIFETIME = int(os.getenv("SESSION_LIFETIME", "3600"))  # 1 hour default
REMEMBER_ME_LIFETIME = int(os.getenv("REMEMBER_ME_LIFETIME", "2592000"))  # 30 days default


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    """User manager for handling user lifecycle events.
    
    Similar to Laravel's User model events and observers.
    """
    
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        """Called after a user registers.
        
        This is where we create the user's personal team,
        following the Jetstream pattern.
        """
        logger.info(f"User {user.id} has registered with email {user.email}")
        
        # Create personal team (will be done in the registration endpoint)
        # as we need the database session
        
    async def on_after_forgot_password(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        """Called after password reset is requested."""
        logger.info(f"User {user.id} has forgotten their password. Reset token: {token}")
        # TODO: Send email with reset token

    async def on_after_request_verify(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        """Called after email verification is requested."""
        logger.info(f"Verification requested for user {user.id}. Verification token: {token}")
        # TODO: Send verification email

    async def on_after_update(
        self, user: User, update_dict: dict, request: Optional[Request] = None
    ):
        """Called after a user is updated."""
        logger.info(f"User {user.id} has been updated with {update_dict}")


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    """Get the user database adapter."""
    yield SQLAlchemyUserDatabase(session, User)


async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    """Get the user manager instance."""
    yield UserManager(user_db)


# Authentication transports
bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

cookie_transport = CookieTransport(
    cookie_name="openhands_session",
    cookie_max_age=SESSION_LIFETIME,
    cookie_path="/",
    cookie_domain=os.getenv("COOKIE_DOMAIN"),
    cookie_secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
    cookie_httponly=True,
    cookie_samesite="lax",
)

# Dual transport for backward compatibility
dual_transport = DualTransport(
    cookie_transport=cookie_transport,
    bearer_transport=bearer_transport,
)


class LoggingJWTStrategy(JWTStrategy):
    """JWT Strategy with debug logging."""
    
    async def read_token(self, token: Optional[str], user_manager: BaseUserManager) -> Optional[User]:
        """Read and verify JWT token."""
        logger.debug(f"LoggingJWTStrategy.read_token: token={'present' if token else 'missing'}")
        if token:
            logger.debug(f"LoggingJWTStrategy.read_token: token length={len(token)}")
        result = await super().read_token(token, user_manager)
        logger.debug(f"LoggingJWTStrategy.read_token: result={'user found' if result else 'no user'}")
        return result

def get_jwt_strategy() -> JWTStrategy:
    """Get JWT strategy for authentication."""
    return LoggingJWTStrategy(secret=SECRET, lifetime_seconds=SESSION_LIFETIME)


# Primary authentication backend with cookies
auth_backend = AuthenticationBackend(
    name="jwt",
    transport=dual_transport,
    get_strategy=get_jwt_strategy,
)

# API-only authentication backend for bearer tokens
api_auth_backend = AuthenticationBackend(
    name="jwt-api",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

# Create the FastAPIUsers instance with both auth backends
fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager,
    [auth_backend, api_auth_backend],
)

# Dependency to get current authenticated user (supports both cookie and bearer)
current_active_user = fastapi_users.current_user(active=True)

# For API-only endpoints, we'll need to create a custom dependency
# that only checks bearer tokens
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

async def current_active_api_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user_manager: UserManager = Depends(get_user_manager),
) -> User:
    """Get current user from bearer token only (for API endpoints)."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        user = await fastapi_users.authenticator.backends[1].get_strategy().read_token(
            credentials.credentials, user_manager
        )
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )