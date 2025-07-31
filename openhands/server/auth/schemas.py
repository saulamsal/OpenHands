"""Pydantic schemas for authentication.

These are similar to Laravel's Form Requests for validation.
"""

import uuid
from typing import Optional

from fastapi_users import schemas
from pydantic import BaseModel, EmailStr, Field


class UserRead(schemas.BaseUser[uuid.UUID]):
    """Schema for reading user data."""
    id: uuid.UUID
    email: EmailStr
    is_active: bool = True
    is_verified: bool = False
    is_superuser: bool = False
    name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(schemas.BaseUserCreate):
    """Schema for creating a new user."""
    email: EmailStr
    password: str
    name: Optional[str] = None
    is_active: Optional[bool] = True
    is_verified: Optional[bool] = False
    is_superuser: Optional[bool] = False


class UserUpdate(schemas.BaseUserUpdate):
    """Schema for updating user data."""
    password: Optional[str] = None
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    is_superuser: Optional[bool] = None


class TeamCreate(BaseModel):
    """Schema for creating a new team."""
    name: str = Field(..., min_length=1, max_length=255)


class TeamUpdate(BaseModel):
    """Schema for updating team data."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)


class TeamMemberInvite(BaseModel):
    """Schema for inviting a user to a team."""
    email: EmailStr
    role: str = Field(default="developer", pattern="^(admin|developer|viewer)$")