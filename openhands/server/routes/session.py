"""Session management endpoints for cookie-based authentication.

This module provides endpoints for users to manage their active sessions,
similar to Laravel's session management features.
"""

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from openhands.server.auth.session_manager import session_manager
from openhands.server.auth.users import current_active_user
from openhands.server.middleware_auth.csrf import get_csrf_token
from openhands.storage.database import Session, User, get_async_session

app = APIRouter(prefix="/api/auth", tags=["sessions"])


class SessionInfo(BaseModel):
    """Session information for API responses."""
    id: str = Field(..., description="Session ID")
    ip_address: str | None = Field(None, description="IP address")
    user_agent: str | None = Field(None, description="User agent")
    last_activity: str = Field(..., description="Last activity timestamp")
    created_at: str = Field(..., description="Creation timestamp")
    is_current: bool = Field(False, description="Whether this is the current session")


class SessionListResponse(BaseModel):
    """Response for session list endpoint."""
    sessions: List[SessionInfo]
    count: int


class CSRFTokenResponse(BaseModel):
    """Response for CSRF token endpoint."""
    csrf_token: str


@app.get("/csrf-token", response_model=CSRFTokenResponse)
async def get_csrf_token_endpoint(request: Request):
    """Get the current CSRF token from cookies.
    
    This endpoint allows the frontend to retrieve the CSRF token
    that should be included in state-changing requests.
    """
    token = get_csrf_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSRF token not found. Please refresh the page.",
        )
    
    return CSRFTokenResponse(csrf_token=token)


@app.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    request: Request,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session),
):
    """List all active sessions for the current user.
    
    Returns a list of all active sessions with details about
    when and where they were created.
    """
    # Get current session token from cookie
    current_token = request.cookies.get("openhands_session")
    current_session = None
    
    if current_token:
        current_session = await session_manager.validate_session(
            db, current_token, update_activity=False
        )
    
    # Get all user sessions
    sessions = await session_manager.get_user_sessions(db, user.id)
    
    # Convert to response format
    session_list = []
    for session in sessions:
        session_info = SessionInfo(
            id=str(session.id),
            ip_address=session.ip_address,
            user_agent=session.user_agent,
            last_activity=session.last_activity.isoformat(),
            created_at=session.created_at.isoformat(),
            is_current=current_session and session.id == current_session.id,
        )
        session_list.append(session_info)
    
    # Sort by last activity (most recent first)
    session_list.sort(key=lambda s: s.last_activity, reverse=True)
    
    return SessionListResponse(
        sessions=session_list,
        count=len(session_list),
    )


@app.delete("/sessions/{session_id}")
async def invalidate_session(
    session_id: uuid.UUID,
    request: Request,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Invalidate a specific session.
    
    Users can use this to log out from a specific device/browser.
    """
    # Verify the session belongs to the user
    sessions = await session_manager.get_user_sessions(db, user.id)
    session_ids = {s.id for s in sessions}
    
    if session_id not in session_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    
    # Check if trying to invalidate current session
    current_token = request.cookies.get("openhands_session")
    if current_token:
        current_session = await session_manager.validate_session(
            db, current_token, update_activity=False
        )
        if current_session and current_session.id == session_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot invalidate current session. Use logout instead.",
            )
    
    # Invalidate the session
    success = await session_manager.invalidate_session(db, session_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to invalidate session",
        )
    
    return {"message": "Session invalidated successfully"}


@app.post("/sessions/invalidate-all")
async def invalidate_all_sessions(
    request: Request,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Invalidate all sessions except the current one.
    
    This is the "logout everywhere else" functionality.
    """
    # Get current session
    current_token = request.cookies.get("openhands_session")
    current_session = None
    
    if current_token:
        current_session = await session_manager.validate_session(
            db, current_token, update_activity=False
        )
    
    # Invalidate all other sessions
    count = await session_manager.invalidate_user_sessions(
        db,
        user.id,
        except_session_id=current_session.id if current_session else None,
    )
    
    return {
        "message": f"Invalidated {count} session(s)",
        "count": count,
    }