"""Rate limiting service for free tier users."""

from datetime import datetime, timedelta
from typing import Tuple, Optional
import hashlib
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from openhands.core.logger import openhands_logger as logger
from openhands.storage.database.models.subscription_models import RateLimitTracking


class RateLimiter:
    """Rate limiting for free tier users"""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        
    async def check_rate_limit(
        self,
        user_id: str,
        ip_address: str,
        user_agent: str,
        action: str = 'free_prompt',
        limit: int = 2,
        window_hours: int = 24
    ) -> Tuple[bool, int, datetime]:
        """
        Check if user is within rate limit
        Returns: (allowed, remaining_count, reset_time)
        """
        # Hash user agent for privacy
        ua_hash = hashlib.sha256(user_agent.encode()).hexdigest()
        
        window_start = datetime.utcnow() - timedelta(hours=window_hours)
        
        # Check both user and IP limits
        user_count = await self._get_usage_count(
            user_id=user_id,
            action=action,
            window_start=window_start
        )
        
        ip_count = await self._get_usage_count(
            ip_address=ip_address,
            action=action,
            window_start=window_start
        )
        
        # Use the higher of the two counts (more restrictive)
        current_count = max(user_count, ip_count)
        
        if current_count >= limit:
            reset_time = window_start + timedelta(hours=window_hours)
            return False, 0, reset_time
        
        # Record the usage
        tracking = RateLimitTracking(
            user_id=user_id,
            ip_address=ip_address,
            user_agent_hash=ua_hash,
            action=action,
            window_start=datetime.utcnow()
        )
        self.db.add(tracking)
        await self.db.commit()
        
        remaining = limit - current_count - 1
        reset_time = datetime.utcnow() + timedelta(hours=window_hours)
        
        return True, remaining, reset_time
    
    async def _get_usage_count(
        self,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        action: str = 'free_prompt',
        window_start: datetime = None
    ) -> int:
        """Get usage count for user or IP"""
        query = select(func.count(RateLimitTracking.id)).filter(
            RateLimitTracking.action == action,
            RateLimitTracking.window_start >= window_start
        )
        
        if user_id:
            query = query.filter(RateLimitTracking.user_id == user_id)
        if ip_address:
            query = query.filter(RateLimitTracking.ip_address == ip_address)
        
        result = await self.db.execute(query)
        return result.scalar() or 0
    
    async def get_user_limits(
        self,
        user_id: str,
        action: str = 'free_prompt',
        limit: int = 2,
        window_hours: int = 24
    ) -> dict:
        """Get current rate limit status for a user"""
        window_start = datetime.utcnow() - timedelta(hours=window_hours)
        
        count = await self._get_usage_count(
            user_id=user_id,
            action=action,
            window_start=window_start
        )
        
        remaining = max(0, limit - count)
        reset_time = datetime.utcnow() + timedelta(hours=window_hours)
        
        if count > 0:
            # Get the oldest usage in the window to calculate actual reset time
            query = select(RateLimitTracking.window_start).filter(
                RateLimitTracking.user_id == user_id,
                RateLimitTracking.action == action,
                RateLimitTracking.window_start >= window_start
            ).order_by(RateLimitTracking.window_start.asc()).limit(1)
            
            result = await self.db.execute(query)
            oldest = result.scalar_one_or_none()
            
            if oldest:
                reset_time = oldest + timedelta(hours=window_hours)
        
        return {
            'action': action,
            'limit': limit,
            'remaining': remaining,
            'reset_at': reset_time,
            'window_hours': window_hours
        }
    
    async def cleanup_old_records(self, days_to_keep: int = 7):
        """Clean up old rate limit records"""
        cutoff = datetime.utcnow() - timedelta(days=days_to_keep)
        
        result = await self.db.execute(
            select(RateLimitTracking).filter(
                RateLimitTracking.created_at < cutoff
            )
        )
        old_records = result.scalars().all()
        
        for record in old_records:
            await self.db.delete(record)
        
        await self.db.commit()
        
        logger.info(f"Cleaned up {len(old_records)} old rate limit records")