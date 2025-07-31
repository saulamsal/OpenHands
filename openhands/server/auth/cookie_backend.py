"""Cookie-based authentication transport for FastAPI-Users.

This module implements secure cookie-based authentication
similar to Laravel's session-based auth.
"""

import secrets
from typing import Optional, Tuple, Any

from fastapi import HTTPException, Request, Response, status
from fastapi.security import APIKeyCookie
from fastapi_users.authentication import Transport
from fastapi_users.authentication.transport.base import TransportLogoutNotSupportedError
from fastapi_users.openapi import OpenAPIResponseType


class CookieTransport(Transport):
    """Cookie transport for session-based authentication.
    
    Implements secure httpOnly cookies for JWT token storage,
    preventing XSS attacks while maintaining CSRF protection.
    """
    
    def __init__(
        self,
        cookie_name: str = "openhands_session",
        cookie_max_age: Optional[int] = None,
        cookie_path: str = "/",
        cookie_domain: Optional[str] = None,
        cookie_secure: bool = True,
        cookie_httponly: bool = True,
        cookie_samesite: str = "lax",
    ):
        """Initialize cookie transport with security settings.
        
        Args:
            cookie_name: Name of the authentication cookie
            cookie_max_age: Cookie lifetime in seconds (None for session cookie)
            cookie_path: Cookie path scope
            cookie_domain: Cookie domain scope
            cookie_secure: Whether cookie requires HTTPS
            cookie_httponly: Whether cookie is inaccessible to JavaScript
            cookie_samesite: SameSite policy (strict, lax, or none)
        """
        self.cookie_name = cookie_name
        self.cookie_max_age = cookie_max_age
        self.cookie_path = cookie_path
        self.cookie_domain = cookie_domain
        self.cookie_secure = cookie_secure
        self.cookie_httponly = cookie_httponly
        self.cookie_samesite = cookie_samesite
        # Create the scheme for FastAPI
        self.scheme = APIKeyCookie(name=cookie_name, auto_error=False)
        
    async def get_login_response(
        self, token: str, response: Response
    ) -> Response:
        """Set authentication cookie after successful login.
        
        Args:
            token: JWT token to store in cookie
            response: FastAPI response object
            
        Returns:
            Response with authentication cookie set
        """
        response.set_cookie(
            key=self.cookie_name,
            value=token,
            max_age=self.cookie_max_age,
            path=self.cookie_path,
            domain=self.cookie_domain,
            secure=self.cookie_secure,
            httponly=self.cookie_httponly,
            samesite=self.cookie_samesite,
        )
        
        # Also set a CSRF token cookie (not httpOnly so JS can read it)
        csrf_token = secrets.token_urlsafe(32)
        response.set_cookie(
            key="csrf_token",
            value=csrf_token,
            max_age=self.cookie_max_age,
            path=self.cookie_path,
            domain=self.cookie_domain,
            secure=self.cookie_secure,
            httponly=False,  # JavaScript needs to read this
            samesite=self.cookie_samesite,
        )
        
        # Return success response
        response.status_code = status.HTTP_204_NO_CONTENT
        return response
    
    def get_openapi_logout_responses_success(self) -> OpenAPIResponseType:
        """OpenAPI schema for successful logout response."""
        return {
            status.HTTP_204_NO_CONTENT: {
                "description": "Logout successful",
            }
        }
    
    async def get_logout_response(
        self, response: Response, token: Optional[str] = None
    ) -> Response:
        """Remove authentication cookies on logout.
        
        Args:
            response: FastAPI response object
            token: Optional token (not used for cookies)
            
        Returns:
            Response with cookies cleared
        """
        # Clear authentication cookie
        response.delete_cookie(
            key=self.cookie_name,
            path=self.cookie_path,
            domain=self.cookie_domain,
        )
        
        # Clear CSRF token cookie
        response.delete_cookie(
            key="csrf_token",
            path=self.cookie_path,
            domain=self.cookie_domain,
        )
        
        response.status_code = status.HTTP_204_NO_CONTENT
        return response
    
    async def get_token(self, request: Request) -> Optional[str]:
        """Extract token from request cookies.
        
        Args:
            request: FastAPI request object
            
        Returns:
            JWT token from cookie or None if not present
        """
        from openhands.core.logger import openhands_logger as logger
        logger.debug(f"CookieTransport.get_token: All cookies: {dict(request.cookies)}")
        token = request.cookies.get(self.cookie_name)
        logger.debug(f"CookieTransport.get_token: Looking for cookie '{self.cookie_name}', found: {token is not None}")
        if token:
            logger.debug(f"CookieTransport.get_token: Token length: {len(token)}, first 20 chars: {token[:20]}...")
        return token
    
    @staticmethod
    def get_openapi_login_responses_success() -> OpenAPIResponseType:
        """OpenAPI schema for successful login response."""
        return {
            status.HTTP_204_NO_CONTENT: {
                "description": "Login successful, authentication cookie set",
                "headers": {
                    "Set-Cookie": {
                        "schema": {"type": "string"},
                        "description": "Authentication cookie",
                    }
                },
            }
        }
    
    @staticmethod
    def get_openapi_logout_responses_success() -> OpenAPIResponseType:
        """OpenAPI schema for successful logout response."""
        return {
            status.HTTP_204_NO_CONTENT: {
                "description": "Logout successful, authentication cookie cleared",
                "headers": {
                    "Set-Cookie": {
                        "schema": {"type": "string"},
                        "description": "Cookie deletion header",
                    }
                },
            }
        }


class DualTransport(Transport):
    """Dual transport supporting both cookies and bearer tokens.
    
    This allows gradual migration from bearer tokens to cookies
    while maintaining backward compatibility for API clients.
    """
    
    def __init__(
        self,
        cookie_transport: CookieTransport,
        bearer_transport: Transport,
    ):
        """Initialize dual transport.
        
        Args:
            cookie_transport: Cookie transport instance
            bearer_transport: Bearer token transport instance
        """
        self.cookie_transport = cookie_transport
        self.bearer_transport = bearer_transport
        # Use the bearer transport's scheme as the primary scheme
        self.scheme = getattr(bearer_transport, 'scheme', None)
    
    async def get_login_response(
        self, token: str, response: Response
    ) -> Any:
        """Set both cookie and return token in response.
        
        Args:
            token: JWT token
            response: FastAPI response object
            
        Returns:
            Response with cookie set and token in body
        """
        # Set cookie
        await self.cookie_transport.get_login_response(token, response)
        
        # Also return token in response body for API clients
        return {"access_token": token, "token_type": "bearer"}
    
    async def get_logout_response(
        self, response: Response, token: Optional[str] = None
    ) -> Response:
        """Clear cookies and invalidate bearer token.
        
        Args:
            response: FastAPI response object
            token: Optional bearer token to invalidate
            
        Returns:
            Response with cookies cleared
        """
        return await self.cookie_transport.get_logout_response(response, token)
    
    async def get_token(self, request: Request) -> Optional[str]:
        """Extract token from cookies first, then fall back to bearer.
        
        Args:
            request: FastAPI request object
            
        Returns:
            JWT token from cookie or Authorization header
        """
        from openhands.core.logger import openhands_logger as logger
        logger.debug(f"DualTransport.get_token: Checking for authentication")
        logger.debug(f"DualTransport.get_token: Request path: {request.url.path}")
        logger.debug(f"DualTransport.get_token: Request cookies: {list(request.cookies.keys())}")
        
        # Try cookie first
        token = await self.cookie_transport.get_token(request)
        if token:
            logger.debug(f"DualTransport.get_token: Found token in cookie")
            return token
        
        # Fall back to bearer token
        bearer_token = await self.bearer_transport.get_token(request)
        if bearer_token:
            logger.debug(f"DualTransport.get_token: Found token in Authorization header")
        else:
            logger.debug(f"DualTransport.get_token: No token found in cookie or header")
        return bearer_token
    
    def get_openapi_logout_responses_success(self) -> OpenAPIResponseType:
        """OpenAPI schema for successful logout response."""
        return self.cookie_transport.get_openapi_logout_responses_success()
    
    @staticmethod
    def get_openapi_login_responses_success() -> OpenAPIResponseType:
        """OpenAPI schema for successful login response."""
        return {
            status.HTTP_200_OK: {
                "description": "Login successful",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "properties": {
                                "access_token": {"type": "string"},
                                "token_type": {"type": "string"},
                            },
                            "required": ["access_token", "token_type"],
                        }
                    }
                },
                "headers": {
                    "Set-Cookie": {
                        "schema": {"type": "string"},
                        "description": "Authentication cookie",
                    }
                },
            }
        }
    
    @staticmethod
    def get_openapi_logout_responses_success() -> OpenAPIResponseType:
        """OpenAPI schema for successful logout response."""
        return {
            status.HTTP_204_NO_CONTENT: {
                "description": "Logout successful",
                "headers": {
                    "Set-Cookie": {
                        "schema": {"type": "string"},
                        "description": "Cookie deletion header",
                    }
                },
            }
        }