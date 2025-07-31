"""Authentication routes for OpenHands.

This module provides authentication endpoints similar to Laravel Jetstream,
including registration with automatic personal team creation.
"""

import os
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from fastapi_users.db import SQLAlchemyUserDatabase
from fastapi_users.jwt import generate_jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from openhands.core.logger import openhands_logger as logger

logger.info("Loading auth.py module...")
from openhands.server.auth import auth_backend, fastapi_users
from openhands.server.auth.github_oauth import (
    GITHUB_CLIENT_ID,
    github_oauth_client,
    get_github_user_info,
)
from openhands.server.auth.schemas import UserCreate, UserRead, UserUpdate
from openhands.server.auth.users import SECRET, UserManager
from openhands.storage.database import Team, TeamMember, User, get_async_session
from openhands.storage.database.models import TeamRole

# Create the authentication router
app = APIRouter(prefix="/api/auth", tags=["auth"])

# Create a separate router for OAuth endpoints that don't need auth protection
oauth_app = APIRouter(prefix="/api/auth", tags=["auth"])

# Include FastAPI-Users routes
app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/jwt",
)

app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
)

app.include_router(
    fastapi_users.get_reset_password_router(),
)

app.include_router(
    fastapi_users.get_verify_router(UserRead),
)

# Don't include FastAPI-Users user management routes for now
# We'll implement our own endpoints
# app.include_router(
#     fastapi_users.get_users_router(UserRead, UserUpdate),
#     prefix="/users",
# )

# Test endpoint to verify auth router is working
@app.get("/test")
async def test_endpoint():
    logger.info("Test endpoint in auth router called!")
    return {"message": "Auth router is working"}

# Another test at the exact path
@app.get("/users/me-test")
async def test_users_me():
    logger.info("/api/auth/users/me-test endpoint called!")
    return {"message": "This endpoint works"}

# Custom /users/me endpoint that works with our authentication
@app.get("/users/me")
async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
):
    """Get current user information."""
    logger.info("AUTH ROUTE: /api/auth/users/me endpoint called!")
    logger.info(f"Request path: {request.url.path}")
    logger.info(f"Request cookies: {dict(request.cookies)}")
    
    # Check for authentication cookie
    cookie_value = request.cookies.get("openhands_session")
    if not cookie_value:
        logger.warning("No openhands_session cookie found")
        logger.warning(f"Available cookies: {list(request.cookies.keys())}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - no session cookie",
        )
    
    logger.debug(f"Found session cookie, length={len(cookie_value)}")
    
    # Decode JWT token
    from fastapi_users.jwt import decode_jwt
    from openhands.server.auth.users import SECRET
    import uuid
    
    try:
        payload = decode_jwt(cookie_value, SECRET, audience=["fastapi-users:auth"])
        user_id_str = payload.get("sub")
        
        if not user_id_str:
            logger.error("No user ID in token payload")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
        
        # Convert to UUID
        user_id = uuid.UUID(user_id_str)
        logger.debug(f"Decoded user ID: {user_id}")
        
        # Get user from database
        user_db = SQLAlchemyUserDatabase(session, User)
        user = await user_db.get(user_id)
        
        if not user:
            logger.error(f"User not found: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        if not user.is_active:
            logger.error(f"User is inactive: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive user",
            )
        
        logger.info(f"Successfully returning user {user_id}")
        # Return UserRead schema
        from openhands.server.auth.schemas import UserRead
        return UserRead(
            id=user.id,
            email=user.email,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            is_verified=user.is_verified,
            name=user.name,
            github_username=user.github_username,
            avatar_url=user.avatar_url,
        )
        
    except Exception as e:
        logger.error(f"Error decoding token or getting user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
        )


# Custom registration endpoint that creates personal team
@app.post("/register-with-team", response_model=UserRead)
async def register_with_team(
    user_create: UserCreate,
    session: AsyncSession = Depends(get_async_session),
):
    """Register a new user and create their personal team.
    
    This endpoint follows the Laravel Jetstream pattern where each
    user gets a personal team upon registration.
    """
    try:
        # Check if user already exists
        result = await session.execute(
            select(User).where(User.email == user_create.email)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="REGISTER_USER_ALREADY_EXISTS",
            )
        
        # Create the user using FastAPI-Users
        from openhands.server.auth.users import get_user_db, get_user_manager
        
        user_db = SQLAlchemyUserDatabase(session, User)
        user_manager = UserManager(user_db)
        
        # Create user
        user = await user_manager.create(
            user_create,
            safe=True,  # This ensures password is hashed
        )
        
        # Refresh user to ensure we have the database instance
        await session.refresh(user)
        
        # Create personal team for the user
        team_name = f"{user.name.split()[0]}'s Team" if user.name else f"{user.email.split('@')[0]}'s Team"
        personal_team = Team(
            name=team_name,
            owner_id=user.id,
            is_personal=True,
        )
        session.add(personal_team)
        
        # Commit the team creation
        await session.commit()
        await session.refresh(personal_team)
        
        # Add user as owner of their personal team
        # TODO: Add team membership
        
        logger.info(f"Created user {user.id} with personal team {personal_team.id}")
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user with team: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating user account",
        )


# GitHub OAuth endpoints
@app.get("/github/login")
async def github_login(redirect_url: Optional[str] = Query(None)):
    """Initiate GitHub OAuth login flow.
    
    Args:
        redirect_url: Optional URL to redirect to after successful login
    """
    # Store redirect URL in state parameter
    state = secrets.token_urlsafe(32)
    if redirect_url:
        # In production, store this in Redis or database with the state as key
        # For now, we'll pass it through the OAuth flow
        state = f"{state}:{redirect_url}"
    
    # The redirect URI that GitHub will call after authorization
    redirect_uri = os.getenv("GITHUB_OAUTH_REDIRECT_URI", "http://localhost:3001/api/auth/github/callback")
    
    authorization_url = await github_oauth_client.get_authorization_url(
        redirect_uri,
        state=state,
        scope=["user:email", "read:user"],
    )
    
    return {"authorization_url": authorization_url}


@app.get("/github/callback")
async def github_callback(
    code: str,
    state: Optional[str] = None,
    response: Response = None,
    session: AsyncSession = Depends(get_async_session),
):
    """Handle GitHub OAuth callback.
    
    This endpoint is called by GitHub after user authorizes the app.
    """
    try:
        # Exchange code for access token
        redirect_uri = os.getenv("GITHUB_OAUTH_REDIRECT_URI", "http://localhost:3001/api/auth/github/callback")
        token = await github_oauth_client.get_access_token(code, redirect_uri)
        
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get access token from GitHub",
            )
        
        # Get user info from GitHub
        github_user = await get_github_user_info(token["access_token"])
        
        if not github_user or not github_user.get("email"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user information from GitHub",
            )
        
        # Check if user exists
        result = await session.execute(
            select(User).where(User.email == github_user["email"])
        )
        user = result.scalar_one_or_none()
        
        # If user doesn't exist, create them
        if not user:
            # For OAuth users, we need to set a dummy hashed password since it's required
            # This password cannot be used for login (only OAuth works)
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            dummy_password = pwd_context.hash(f"oauth_{secrets.token_urlsafe(32)}")
            
            # Create user
            user = User(
                email=github_user["email"],
                hashed_password=dummy_password,  # Required field, but not used for OAuth
                name=github_user.get("name") or github_user.get("login", ""),
                github_username=github_user.get("login"),
                avatar_url=github_user.get("avatar_url"),
                is_active=True,
                is_verified=True,  # GitHub emails are pre-verified
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            
            # Create personal team
            team_name = f"{user.name.split()[0]}'s Team" if user.name else f"{user.email.split('@')[0]}'s Team"
            personal_team = Team(
                name=team_name,
                owner_id=user.id,
                is_personal=True,
            )
            session.add(personal_team)
            await session.commit()
            
            logger.info(f"Created new user {user.id} via GitHub OAuth")
        else:
            # Update GitHub username and avatar if changed
            if github_user.get("login"):
                user.github_username = github_user["login"]
            if github_user.get("avatar_url"):
                user.avatar_url = github_user["avatar_url"]
            await session.commit()
            
            logger.info(f"User {user.id} logged in via GitHub OAuth")
        
        # Generate JWT token for the user
        token_data = {
            "sub": str(user.id),
            "aud": ["fastapi-users:auth"],
        }
        jwt_token = generate_jwt(
            data=token_data,
            secret=SECRET,
            lifetime_seconds=int(os.getenv("SESSION_LIFETIME", "3600")),
        )
        
        # Extract redirect URL from state if present
        redirect_url = "/"
        if state and ":" in state:
            _, redirect_url = state.split(":", 1)
        
        # Create redirect response
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3001')
        frontend_callback_url = f"{frontend_url}/auth/callback?redirect={redirect_url}"
        
        # Create response with redirect
        redirect_response = RedirectResponse(url=frontend_callback_url)
        
        # Set authentication cookie
        cookie_domain = os.getenv("COOKIE_DOMAIN")
        cookie_secure = os.getenv("COOKIE_SECURE", "false").lower() == "true"
        logger.info(f"Setting cookie with domain='{cookie_domain}', secure={cookie_secure}, token_length={len(jwt_token)}")
        
        redirect_response.set_cookie(
            key="openhands_session",
            value=jwt_token,
            max_age=int(os.getenv("SESSION_LIFETIME", "3600")),
            path="/",
            domain=cookie_domain,
            secure=cookie_secure,
            httponly=True,
            samesite="lax",
        )
        
        # Also set CSRF token cookie
        csrf_token = secrets.token_urlsafe(32)
        redirect_response.set_cookie(
            key="csrf_token",
            value=csrf_token,
            max_age=int(os.getenv("SESSION_LIFETIME", "3600")),
            path="/",
            domain=os.getenv("COOKIE_DOMAIN"),
            secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
            httponly=False,  # JavaScript needs to read this
            samesite="lax",
        )
        
        logger.info(f"User {user.id} authenticated via GitHub OAuth, setting secure cookie")
        return redirect_response
        
    except HTTPException as e:
        logger.error(f"GitHub OAuth HTTP error: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"GitHub OAuth error: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        # Redirect to login page with error
        return RedirectResponse(url="/login?error=github_auth_failed")


# Custom logout endpoint that doesn't require authentication
@app.post("/logout")
async def logout(response: Response):
    """Custom logout endpoint that clears cookies without requiring authentication.
    
    This is needed because FastAPI-Users logout endpoint requires authentication,
    but if the token is invalid/expired, it returns 401, preventing logout.
    """
    logger.info("Custom logout endpoint called")
    
    # Clear authentication cookie
    cookie_domain = os.getenv("COOKIE_DOMAIN")
    cookie_secure = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    
    response.delete_cookie(
        key="openhands_session",
        path="/",
        domain=cookie_domain,
    )
    
    # Clear CSRF token cookie
    response.delete_cookie(
        key="csrf_token",
        path="/",
        domain=cookie_domain,
    )
    
    response.status_code = status.HTTP_204_NO_CONTENT
    return response

# Log all routes registered on this router
logger.info(f"Auth router routes: {[(route.path, route.methods) for route in app.routes]}")
logger.info("Auth router initialization complete - /users/me endpoint should be available at /api/auth/users/me")