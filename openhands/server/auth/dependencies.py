"""Authentication dependencies for protecting API endpoints."""

from typing import Optional

from fastapi import Depends, HTTPException, Request, status

from openhands.core.logger import openhands_logger as logger
from openhands.server.user_auth import get_user_id
from openhands.storage.database import User


async def optional_user(request: Request) -> Optional[str]:
    """Get current user ID if authenticated, None otherwise.
    
    This dependency doesn't enforce authentication but returns the user ID
    if the user is authenticated.
    """
    try:
        user_id = await get_user_id(request)
        return user_id
    except Exception:
        return None


async def require_auth(request: Request) -> str:
    """Require authentication for the current request.
    
    This dependency enforces authentication and returns the user ID.
    Raises HTTPException if the user is not authenticated.
    """
    user_id = await optional_user(request)
    if not user_id:
        logger.warning(f"Unauthorized access attempt to {request.url.path}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id


# Always import current_active_user since database is the only mode
from openhands.server.auth.users import current_active_user

async def get_current_user(
    user: User = Depends(current_active_user)
) -> User:
    """Get the current authenticated user."""
    return user