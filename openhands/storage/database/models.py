"""Database models for OpenHands SaaS functionality.

This module defines SQLAlchemy models for users, teams, and related entities,
following a pattern similar to Laravel Jetstream.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


def generate_uuid() -> str:
    """Generate a new UUID string."""
    return str(uuid.uuid4())


class TeamRole(str, Enum):
    """Team member roles following Jetstream pattern."""
    OWNER = 'owner'
    ADMIN = 'admin'
    DEVELOPER = 'developer'
    VIEWER = 'viewer'


class User(Base):
    """User model for authentication and authorization."""
    __tablename__ = 'users'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    
    # Profile information
    name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    github_username = Column(String(255), nullable=True, unique=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    owned_teams = relationship('Team', back_populates='owner', cascade='all, delete-orphan')
    team_memberships = relationship('TeamMember', back_populates='user', cascade='all, delete-orphan')
    conversations = relationship('ConversationDB', back_populates='user')
    api_keys = relationship('APIKey', back_populates='user', cascade='all, delete-orphan')
    settings = relationship('UserSettings', back_populates='user', uselist=False, cascade='all, delete-orphan')
    
    @property
    def teams(self) -> List['Team']:
        """Get all teams the user belongs to (as owner or member)."""
        owned = self.owned_teams
        member_of = [tm.team for tm in self.team_memberships if tm.team not in owned]
        return owned + member_of
    
    @property
    def personal_team(self) -> Optional['Team']:
        """Get the user's personal team."""
        for team in self.owned_teams:
            if team.is_personal:
                return team
        return None


class Team(Base):
    """Team model for multi-tenancy following Jetstream pattern."""
    __tablename__ = 'teams'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Team settings
    is_personal = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    owner = relationship('User', back_populates='owned_teams')
    members = relationship('TeamMember', back_populates='team', cascade='all, delete-orphan')
    conversations = relationship('ConversationDB', back_populates='team')
    
    def add_member(self, user: User, role: TeamRole = TeamRole.DEVELOPER) -> 'TeamMember':
        """Add a user to the team with the specified role."""
        member = TeamMember(
            team=self,
            user=user,
            role=role
        )
        return member
    
    def get_member(self, user: User) -> Optional['TeamMember']:
        """Get a user's membership in this team."""
        for member in self.members:
            if member.user_id == user.id:
                return member
        return None


class TeamMember(Base):
    """Team membership model linking users to teams with roles."""
    __tablename__ = 'team_members'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    role = Column(String(50), nullable=False, default=TeamRole.DEVELOPER.value)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    team = relationship('Team', back_populates='members')
    user = relationship('User', back_populates='team_memberships')
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('team_id', 'user_id', name='unique_team_member'),
        Index('idx_team_members_team_id', 'team_id'),
        Index('idx_team_members_user_id', 'user_id'),
    )
    
    @property
    def is_owner(self) -> bool:
        """Check if this member is the team owner."""
        return self.role == TeamRole.OWNER
    
    @property
    def is_admin(self) -> bool:
        """Check if this member has admin privileges."""
        return self.role in [TeamRole.OWNER, TeamRole.ADMIN]
    
    @property
    def can_write(self) -> bool:
        """Check if this member can write/modify resources."""
        return self.role in [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.DEVELOPER]
    
    @property
    def can_read(self) -> bool:
        """Check if this member can read resources."""
        return True  # All members can read


class ConversationDB(Base):
    """Database model for conversations with user and team associations."""
    __tablename__ = 'conversations'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(String(255), unique=True, nullable=False, index=True)  # Legacy ID
    
    # Ownership
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id'), nullable=True)
    
    # Conversation metadata
    title = Column(String(500), nullable=True)
    selected_repository = Column(String(500), nullable=True)
    selected_branch = Column(String(255), nullable=True)
    git_provider = Column(String(50), nullable=True)
    status = Column(String(50), nullable=True)
    trigger = Column(String(50), nullable=True)
    pr_number = Column(JSON, nullable=True, default=list)
    
    # Cost and usage metrics
    accumulated_cost = Column(Integer, default=0)  # Store as cents
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    llm_model = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship('User', back_populates='conversations')
    team = relationship('Team', back_populates='conversations')
    
    # Indexes
    __table_args__ = (
        Index('idx_conversations_user_id', 'user_id'),
        Index('idx_conversations_team_id', 'team_id'),
        Index('idx_conversations_created_at', 'created_at'),
    )


class UserSettings(Base):
    """User settings stored in the database."""
    __tablename__ = 'user_settings'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), unique=True, nullable=False)
    
    # Settings stored as JSON for flexibility
    settings = Column(JSON, nullable=False, default=dict)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship('User', back_populates='settings')


class APIKey(Base):
    """API keys for programmatic access (like Laravel Sanctum tokens)."""
    __tablename__ = 'api_keys'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    name = Column(String(255), nullable=False)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    
    # Permissions/abilities stored as JSON array
    abilities = Column(JSON, nullable=False, default=list)
    
    # Usage tracking
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship('User', back_populates='api_keys')
    
    @property
    def is_expired(self) -> bool:
        """Check if the API key has expired."""
        if self.expires_at is None:
            return False
        return datetime.now(timezone.utc) > self.expires_at
    
    @property
    def is_revoked(self) -> bool:
        """Check if the API key has been revoked."""
        return self.revoked_at is not None
    
    @property
    def is_valid(self) -> bool:
        """Check if the API key is valid for use."""
        return not self.is_expired and not self.is_revoked


class Session(Base):
    """Session model for cookie-based authentication."""
    __tablename__ = 'sessions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    
    # Session fingerprinting and security
    fingerprint = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)  # Supports IPv6
    user_agent = Column(Text, nullable=True)
    
    # Timestamps
    expires_at = Column(DateTime(timezone=True), nullable=False)
    last_activity = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    user = relationship('User', backref='sessions')
    csrf_tokens = relationship('CSRFToken', back_populates='session', cascade='all, delete-orphan')
    
    # Indexes
    __table_args__ = (
        Index('idx_sessions_user_id', 'user_id'),
        Index('idx_sessions_expires_at', 'expires_at'),
    )
    
    @property
    def is_expired(self) -> bool:
        """Check if the session has expired."""
        return datetime.now(timezone.utc) > self.expires_at
    
    @property
    def is_valid(self) -> bool:
        """Check if the session is valid for use."""
        return not self.is_expired
    
    def update_activity(self) -> None:
        """Update the last activity timestamp."""
        self.last_activity = datetime.now(timezone.utc)


class CSRFToken(Base):
    """CSRF token model for double-submit cookie pattern."""
    __tablename__ = 'csrf_tokens'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token = Column(String(255), unique=True, nullable=False, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey('sessions.id', ondelete='CASCADE'), nullable=False)
    
    # Token state
    used = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Relationships
    session = relationship('Session', back_populates='csrf_tokens')
    
    # Indexes
    __table_args__ = (
        Index('idx_csrf_tokens_session_id', 'session_id'),
    )
    
    @property
    def is_expired(self) -> bool:
        """Check if the CSRF token has expired."""
        return datetime.now(timezone.utc) > self.expires_at
    
    @property
    def is_valid(self) -> bool:
        """Check if the CSRF token is valid for use."""
        return not self.used and not self.is_expired