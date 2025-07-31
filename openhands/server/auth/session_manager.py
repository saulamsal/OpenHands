"""Server-side session management for cookie-based authentication.

This module handles session creation, validation, and lifecycle management,
similar to Laravel's session handling.
"""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy import and_, delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from openhands.core.logger import openhands_logger as logger
from openhands.storage.database import CSRFToken, Session, User


class SessionManager:
    """Manages server-side sessions for authenticated users.
    
    Handles session creation, validation, invalidation, and
    cleanup of expired sessions.
    """
    
    def __init__(
        self,
        session_lifetime: int = 3600,  # 1 hour default
        remember_lifetime: int = 2592000,  # 30 days for "remember me"
        max_sessions_per_user: int = 10,
        fingerprint_required: bool = False,
    ):
        """Initialize session manager with configuration.
        
        Args:
            session_lifetime: Default session lifetime in seconds
            remember_lifetime: Extended lifetime for "remember me" sessions
            max_sessions_per_user: Maximum concurrent sessions per user
            fingerprint_required: Whether to enforce session fingerprinting
        """
        self.session_lifetime = session_lifetime
        self.remember_lifetime = remember_lifetime
        self.max_sessions_per_user = max_sessions_per_user
        self.fingerprint_required = fingerprint_required
    
    def _hash_token(self, token: str) -> str:
        """Hash a session token for secure storage.
        
        Args:
            token: Plain text token
            
        Returns:
            SHA256 hash of the token
        """
        return hashlib.sha256(token.encode()).hexdigest()
    
    def _generate_fingerprint(
        self,
        user_agent: Optional[str],
        ip_address: Optional[str],
    ) -> str:
        """Generate a session fingerprint for additional security.
        
        Args:
            user_agent: User's browser user agent
            ip_address: User's IP address
            
        Returns:
            Hashed fingerprint string
        """
        data = f"{user_agent or ''}{ip_address or ''}"
        return hashlib.sha256(data.encode()).hexdigest()
    
    async def create_session(
        self,
        db: AsyncSession,
        user: User,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        remember: bool = False,
    ) -> tuple[str, Session]:
        """Create a new session for a user.
        
        Args:
            db: Database session
            user: User to create session for
            user_agent: User's browser user agent
            ip_address: User's IP address
            remember: Whether to create extended "remember me" session
            
        Returns:
            Tuple of (plain_token, session_object)
        """
        # Clean up old sessions if at limit
        await self._cleanup_user_sessions(db, user.id)
        
        # Generate session token
        plain_token = secrets.token_urlsafe(32)
        token_hash = self._hash_token(plain_token)
        
        # Calculate expiration
        lifetime = self.remember_lifetime if remember else self.session_lifetime
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=lifetime)
        
        # Generate fingerprint
        fingerprint = None
        if self.fingerprint_required or (user_agent and ip_address):
            fingerprint = self._generate_fingerprint(user_agent, ip_address)
        
        # Create session
        session = Session(
            user_id=user.id,
            token_hash=token_hash,
            fingerprint=fingerprint,
            user_agent=user_agent,
            ip_address=ip_address,
            expires_at=expires_at,
        )
        
        db.add(session)
        await db.commit()
        await db.refresh(session)
        
        logger.info(f"Created session {session.id} for user {user.id}")
        
        return plain_token, session
    
    async def validate_session(
        self,
        db: AsyncSession,
        token: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        update_activity: bool = True,
    ) -> Optional[Session]:
        """Validate a session token and return the session.
        
        Args:
            db: Database session
            token: Plain text session token
            user_agent: User's browser user agent (for fingerprint validation)
            ip_address: User's IP address (for fingerprint validation)
            update_activity: Whether to update last activity timestamp
            
        Returns:
            Session object if valid, None otherwise
        """
        token_hash = self._hash_token(token)
        
        # Find session
        result = await db.execute(
            select(Session).where(Session.token_hash == token_hash)
        )
        session = result.scalar_one_or_none()
        
        if not session:
            return None
        
        # Check expiration
        if session.is_expired:
            logger.warning(f"Session {session.id} has expired")
            await self.invalidate_session(db, session.id)
            return None
        
        # Validate fingerprint if required
        if self.fingerprint_required and session.fingerprint:
            current_fingerprint = self._generate_fingerprint(user_agent, ip_address)
            if session.fingerprint != current_fingerprint:
                logger.warning(f"Session {session.id} fingerprint mismatch")
                return None
        
        # Update activity
        if update_activity:
            session.update_activity()
            await db.commit()
        
        return session
    
    async def invalidate_session(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
    ) -> bool:
        """Invalidate a specific session.
        
        Args:
            db: Database session
            session_id: Session ID to invalidate
            
        Returns:
            True if session was invalidated, False if not found
        """
        result = await db.execute(
            delete(Session).where(Session.id == session_id)
        )
        await db.commit()
        
        deleted = result.rowcount > 0
        if deleted:
            logger.info(f"Invalidated session {session_id}")
        
        return deleted
    
    async def invalidate_user_sessions(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        except_session_id: Optional[uuid.UUID] = None,
    ) -> int:
        """Invalidate all sessions for a user.
        
        Args:
            db: Database session
            user_id: User ID whose sessions to invalidate
            except_session_id: Optional session ID to keep (e.g., current session)
            
        Returns:
            Number of sessions invalidated
        """
        query = delete(Session).where(Session.user_id == user_id)
        
        if except_session_id:
            query = query.where(Session.id != except_session_id)
        
        result = await db.execute(query)
        await db.commit()
        
        count = result.rowcount
        logger.info(f"Invalidated {count} sessions for user {user_id}")
        
        return count
    
    async def get_user_sessions(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> List[Session]:
        """Get all active sessions for a user.
        
        Args:
            db: Database session
            user_id: User ID to get sessions for
            
        Returns:
            List of active sessions
        """
        result = await db.execute(
            select(Session)
            .where(
                and_(
                    Session.user_id == user_id,
                    Session.expires_at > datetime.now(timezone.utc),
                )
            )
            .order_by(Session.last_activity.desc())
        )
        
        return list(result.scalars().all())
    
    async def cleanup_expired_sessions(self, db: AsyncSession) -> int:
        """Remove expired sessions from the database.
        
        Args:
            db: Database session
            
        Returns:
            Number of sessions cleaned up
        """
        result = await db.execute(
            delete(Session).where(
                Session.expires_at <= datetime.now(timezone.utc)
            )
        )
        await db.commit()
        
        count = result.rowcount
        if count > 0:
            logger.info(f"Cleaned up {count} expired sessions")
        
        return count
    
    async def _cleanup_user_sessions(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> None:
        """Clean up old sessions if user has too many.
        
        Args:
            db: Database session
            user_id: User ID to check
        """
        # Get session count
        result = await db.execute(
            select(Session.id)
            .where(Session.user_id == user_id)
            .order_by(Session.last_activity.desc())
            .offset(self.max_sessions_per_user - 1)
        )
        
        old_session_ids = [row[0] for row in result.fetchall()]
        
        if old_session_ids:
            await db.execute(
                delete(Session).where(Session.id.in_(old_session_ids))
            )
            logger.info(f"Cleaned up {len(old_session_ids)} old sessions for user {user_id}")
    
    async def create_csrf_token(
        self,
        db: AsyncSession,
        session: Session,
        lifetime: int = 3600,
    ) -> str:
        """Create a CSRF token for a session.
        
        Args:
            db: Database session
            session: Session to create CSRF token for
            lifetime: Token lifetime in seconds
            
        Returns:
            Plain text CSRF token
        """
        # Generate token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=lifetime)
        
        # Store in database
        csrf_token = CSRFToken(
            token=token,
            session_id=session.id,
            expires_at=expires_at,
        )
        
        db.add(csrf_token)
        await db.commit()
        
        logger.debug(f"Created CSRF token for session {session.id}")
        
        return token
    
    async def validate_csrf_token(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        token: str,
        mark_used: bool = False,
    ) -> bool:
        """Validate a CSRF token for a session.
        
        Args:
            db: Database session
            session_id: Session ID the token should belong to
            token: CSRF token to validate
            mark_used: Whether to mark token as used (one-time tokens)
            
        Returns:
            True if valid, False otherwise
        """
        result = await db.execute(
            select(CSRFToken).where(
                and_(
                    CSRFToken.token == token,
                    CSRFToken.session_id == session_id,
                    CSRFToken.used == False,
                    CSRFToken.expires_at > datetime.now(timezone.utc),
                )
            )
        )
        
        csrf_token = result.scalar_one_or_none()
        
        if not csrf_token:
            logger.warning(f"Invalid CSRF token for session {session_id}")
            return False
        
        if mark_used:
            csrf_token.used = True
            await db.commit()
        
        return True
    
    async def cleanup_expired_csrf_tokens(self, db: AsyncSession) -> int:
        """Remove expired CSRF tokens from the database.
        
        Args:
            db: Database session
            
        Returns:
            Number of tokens cleaned up
        """
        result = await db.execute(
            delete(CSRFToken).where(
                CSRFToken.expires_at <= datetime.now(timezone.utc)
            )
        )
        await db.commit()
        
        return result.rowcount


# Global session manager instance
session_manager = SessionManager()