"""CSRF protection middleware for cookie-based authentication.

Implements double-submit cookie pattern for CSRF protection.
"""

import os
import secrets
from typing import Callable, Optional, Set

from fastapi import HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

from openhands.core.logger import openhands_logger as logger


class CSRFMiddleware(BaseHTTPMiddleware):
    """CSRF protection middleware using double-submit cookie pattern.
    
    This middleware:
    1. Generates CSRF tokens and sets them as cookies
    2. Validates CSRF tokens on state-changing requests
    3. Exempts safe methods (GET, HEAD, OPTIONS) from checks
    """
    
    def __init__(
        self,
        app: ASGIApp,
        csrf_secret: Optional[str] = None,
        csrf_cookie_name: str = "csrf_token",
        csrf_header_name: str = "X-CSRF-Token",
        csrf_form_field: str = "csrf_token",
        exempt_paths: Optional[Set[str]] = None,
        safe_methods: Set[str] = {"GET", "HEAD", "OPTIONS"},
    ):
        """Initialize CSRF middleware.
        
        Args:
            app: The ASGI application
            csrf_secret: Secret for CSRF token generation (optional)
            csrf_cookie_name: Name of the CSRF cookie
            csrf_header_name: Name of the CSRF header
            csrf_form_field: Name of the CSRF form field
            exempt_paths: Set of paths to exempt from CSRF checks
            safe_methods: HTTP methods considered safe (no CSRF check)
        """
        super().__init__(app)
        self.csrf_secret = csrf_secret or os.getenv("CSRF_SECRET", secrets.token_urlsafe(32))
        self.csrf_cookie_name = csrf_cookie_name
        self.csrf_header_name = csrf_header_name
        self.csrf_form_field = csrf_form_field
        self.exempt_paths = exempt_paths or set()
        self.safe_methods = safe_methods
        
        # Add default exempt paths
        self.exempt_paths.update({
            "/health",
            "/api/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/api/auth/github/login",      # OAuth initiation
            "/api/auth/github/callback",   # OAuth callback
            "/api/auth/jwt/login",         # JWT login endpoint
            "/api/auth/jwt/logout",        # JWT logout endpoint
            "/api/auth/logout",            # Custom logout endpoint
            "/api/auth/register-with-team", # Registration endpoint
            "/api/auth/register",          # Standard registration endpoint
        })
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """Process the request and apply CSRF protection.
        
        Args:
            request: The incoming request
            call_next: The next middleware or route handler
            
        Returns:
            Response with CSRF cookie set if needed
        """
        # Check if path is exempt
        if self._is_exempt_path(request.url.path):
            return await call_next(request)
        
        # Check if method is safe
        if request.method in self.safe_methods:
            response = await call_next(request)
            # Ensure CSRF cookie is set for safe methods
            await self._ensure_csrf_cookie(request, response)
            return response
        
        # Validate CSRF token for state-changing requests
        if not await self._validate_csrf_token(request):
            logger.warning(f"CSRF validation failed for {request.url.path}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "CSRF validation failed"},
            )
        
        # Process request
        response = await call_next(request)
        
        # Rotate CSRF token after successful state-changing request
        await self._rotate_csrf_token(request, response)
        
        return response
    
    def _is_exempt_path(self, path: str) -> bool:
        """Check if a path is exempt from CSRF protection.
        
        Args:
            path: The request path
            
        Returns:
            True if path is exempt
        """
        # Check exact matches
        if path in self.exempt_paths:
            return True
        
        # Check prefixes (for paths like /api/auth/*)
        for exempt_path in self.exempt_paths:
            if exempt_path.endswith("*") and path.startswith(exempt_path[:-1]):
                return True
        
        return False
    
    async def _ensure_csrf_cookie(self, request: Request, response: Response) -> None:
        """Ensure CSRF cookie is set if not present.
        
        Args:
            request: The incoming request
            response: The outgoing response
        """
        csrf_token = request.cookies.get(self.csrf_cookie_name)
        
        if not csrf_token:
            # Generate new CSRF token
            csrf_token = secrets.token_urlsafe(32)
            
            # Set as cookie (not httpOnly so JavaScript can read it)
            response.set_cookie(
                key=self.csrf_cookie_name,
                value=csrf_token,
                max_age=3600,  # 1 hour
                path="/",
                secure=os.getenv("COOKIE_SECURE", "true").lower() == "true",
                httponly=False,  # JavaScript needs to read this
                samesite="lax",
            )
    
    async def _validate_csrf_token(self, request: Request) -> bool:
        """Validate CSRF token using double-submit cookie pattern.
        
        Args:
            request: The incoming request
            
        Returns:
            True if CSRF token is valid
        """
        # Get token from cookie
        cookie_token = request.cookies.get(self.csrf_cookie_name)
        if not cookie_token:
            return False
        
        # Get token from header or form
        header_token = request.headers.get(self.csrf_header_name)
        
        # Check form data if no header token (for form submissions)
        if not header_token and request.headers.get("content-type", "").startswith("application/x-www-form-urlencoded"):
            try:
                form_data = await request.form()
                header_token = form_data.get(self.csrf_form_field)
            except Exception:
                pass
        
        # Compare tokens
        if not header_token:
            return False
        
        # Constant-time comparison to prevent timing attacks
        return secrets.compare_digest(cookie_token, header_token)
    
    async def _rotate_csrf_token(self, request: Request, response: Response) -> None:
        """Rotate CSRF token after successful state-changing request.
        
        Args:
            request: The incoming request
            response: The outgoing response
        """
        # Generate new token
        new_token = secrets.token_urlsafe(32)
        
        # Set new cookie
        response.set_cookie(
            key=self.csrf_cookie_name,
            value=new_token,
            max_age=3600,  # 1 hour
            path="/",
            secure=os.getenv("COOKIE_SECURE", "true").lower() == "true",
            httponly=False,  # JavaScript needs to read this
            samesite="lax",
        )


def get_csrf_token(request: Request) -> Optional[str]:
    """Helper function to get CSRF token from request.
    
    Args:
        request: The incoming request
        
    Returns:
        CSRF token if present
    """
    return request.cookies.get("csrf_token")