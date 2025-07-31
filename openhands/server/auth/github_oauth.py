"""GitHub OAuth configuration for FastAPI-Users.

This module sets up GitHub OAuth authentication strategy.
"""

import os
from typing import Optional, cast

from fastapi import Depends, Request
from fastapi_users.authentication import AuthenticationBackend, BearerTransport
from httpx_oauth.clients.github import GitHubOAuth2

from openhands.core.logger import openhands_logger as logger
from openhands.storage.database import User


# GitHub OAuth configuration
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")

# The redirect URI should be: http://localhost:3001/auth/github/callback
# For production, replace localhost:3001 with your domain
# Get the base URL from environment or default
BASE_URL = os.getenv("FRONTEND_URL", "http://localhost:3001")

github_oauth_client = GitHubOAuth2(
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
)


async def get_github_user_email(access_token: str) -> Optional[str]:
    """Get the primary verified email from GitHub user data."""
    async with github_oauth_client.get_httpx_client() as client:
        # Get user emails
        response = await client.get(
            "https://api.github.com/user/emails",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )
        
        if response.status_code == 200:
            emails = response.json()
            # Find the primary verified email
            for email in emails:
                if email.get("primary") and email.get("verified"):
                    return email.get("email")
            
            # If no primary email, return the first verified email
            for email in emails:
                if email.get("verified"):
                    return email.get("email")
        
        logger.warning(f"Failed to get GitHub user emails: {response.status_code}")
        return None


async def get_github_user_info(access_token: str) -> dict:
    """Get user information from GitHub."""
    async with github_oauth_client.get_httpx_client() as client:
        # Get basic user info
        response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )
        
        if response.status_code == 200:
            user_data = response.json()
            
            # Get the verified email
            email = await get_github_user_email(access_token)
            if email:
                user_data["email"] = email
            
            return user_data
        
        logger.error(f"Failed to get GitHub user info: {response.status_code}")
        return {}