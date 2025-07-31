"""Database session management for OpenHands."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine

from openhands.storage.database.config import db_config


# Engine creation functions to avoid creating at import time
def get_async_engine():
    """Get or create the async engine."""
    return create_async_engine(
        db_config.database_url,
        echo=False,  # Set to True for SQL debugging
        pool_size=db_config.db_pool_size,
        max_overflow=db_config.db_max_overflow,
        pool_timeout=db_config.db_pool_timeout,
        pool_pre_ping=True,  # Verify connections before using
    )

def get_sync_engine():
    """Get or create the sync engine."""
    return create_engine(
        db_config.sync_database_url,
        echo=False,
        pool_size=5,
        max_overflow=10,
    )

# Session factories (created lazily)
_async_session_maker = None
_sync_session_maker = None

def get_async_session_maker():
    """Get or create the async session maker."""
    global _async_session_maker
    if _async_session_maker is None:
        _async_session_maker = async_sessionmaker(
            get_async_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _async_session_maker

def get_sync_session_maker():
    """Get or create the sync session maker."""
    global _sync_session_maker
    if _sync_session_maker is None:
        _sync_session_maker = sessionmaker(
            get_sync_engine(),
            class_=Session,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _sync_session_maker


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Get an async database session.
    
    This is the primary way to get a database session in FastAPI endpoints.
    Use with Depends() in FastAPI routes.
    """
    async_session_maker = get_async_session_maker()
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


def get_db_session() -> Session:
    """Get a synchronous database session.
    
    This is mainly used for Alembic migrations and CLI tools.
    """
    session_maker = get_sync_session_maker()
    db = session_maker()
    try:
        return db
    finally:
        db.close()


@asynccontextmanager
async def get_async_session_context() -> AsyncGenerator[AsyncSession, None]:
    """Context manager for async database sessions.
    
    Use this when you need a database session outside of FastAPI endpoints.
    """
    async_session_maker = get_async_session_maker()
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


class DatabaseSessionMixin:
    """Mixin class to add database session to storage classes."""
    
    _session: Optional[AsyncSession] = None
    
    async def get_session(self) -> AsyncSession:
        """Get or create a database session."""
        if self._session is None:
            async_session_maker = get_async_session_maker()
            self._session = async_session_maker()
        return self._session
    
    async def close_session(self):
        """Close the database session if it exists."""
        if self._session is not None:
            await self._session.close()
            self._session = None