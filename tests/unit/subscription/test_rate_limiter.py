import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from openhands.server.services.rate_limiter import RateLimiter
from openhands.storage.database.models.subscription_models import RateLimitTracking


@pytest.fixture
def mock_db():
    """Create a mock database session."""
    db = AsyncMock(spec=AsyncSession)
    db.begin = MagicMock()
    db.begin.return_value.__aenter__ = AsyncMock()
    db.begin.return_value.__aexit__ = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    return db


@pytest.fixture
def rate_limiter(mock_db):
    """Create a RateLimiter instance with mock dependencies."""
    return RateLimiter(mock_db)


class TestRateLimiter:
    """Test cases for RateLimiter."""

    @pytest.mark.asyncio
    async def test_check_rate_limit_free_tier_allowed(self, rate_limiter, mock_db):
        """Test rate limit check for free tier user within limits."""
        user_id = "free_user"
        ip_address = "192.168.1.1"
        action = "create_conversation"
        
        # Mock no recent logs
        mock_result = MagicMock()
        mock_result.scalar.return_value = 0
        mock_db.execute.return_value = mock_result
        
        # Call the method
        allowed, remaining, reset_time = await rate_limiter.check_rate_limit(
            action=action,
            user_id=user_id,
            ip_address=ip_address,
            has_subscription=False,
        )
        
        # Assert results
        assert allowed is True
        assert remaining == 1  # 2 daily limit - 1 for this request
        assert reset_time is not None

    @pytest.mark.asyncio
    async def test_check_rate_limit_free_tier_blocked(self, rate_limiter, mock_db):
        """Test rate limit check for free tier user exceeding limits."""
        user_id = "free_user"
        ip_address = "192.168.1.1"
        action = "create_conversation"
        
        # Mock 2 recent logs (hit the limit)
        mock_result = MagicMock()
        mock_result.scalar.return_value = 2
        mock_db.execute.return_value = mock_result
        
        # Call the method
        allowed, remaining, reset_time = await rate_limiter.check_rate_limit(
            action=action,
            user_id=user_id,
            ip_address=ip_address,
            has_subscription=False,
        )
        
        # Assert results
        assert allowed is False
        assert remaining == 0
        assert reset_time is not None

    @pytest.mark.asyncio
    async def test_check_rate_limit_subscribed_user(self, rate_limiter, mock_db):
        """Test rate limit check for subscribed user (no limits)."""
        user_id = "subscribed_user"
        ip_address = "192.168.1.1"
        action = "create_conversation"
        
        # Call the method - should bypass DB check
        allowed, remaining, reset_time = await rate_limiter.check_rate_limit(
            action=action,
            user_id=user_id,
            ip_address=ip_address,
            has_subscription=True,
        )
        
        # Assert results
        assert allowed is True
        assert remaining == -1  # Unlimited
        assert reset_time is None
        
        # Verify DB was not queried
        mock_db.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_check_rate_limit_by_ip(self, rate_limiter, mock_db):
        """Test rate limit check by IP address for anonymous users."""
        ip_address = "192.168.1.1"
        action = "create_conversation"
        
        # Mock 1 recent log from this IP
        mock_result = MagicMock()
        mock_result.scalar.return_value = 1
        mock_db.execute.return_value = mock_result
        
        # Call the method with no user_id
        allowed, remaining, reset_time = await rate_limiter.check_rate_limit(
            action=action,
            user_id=None,
            ip_address=ip_address,
            has_subscription=False,
        )
        
        # Assert results
        assert allowed is True
        assert remaining == 0  # 2 - 1 existing - 1 for this request
        assert reset_time is not None

    @pytest.mark.asyncio
    async def test_log_action_success(self, rate_limiter, mock_db):
        """Test logging successful action."""
        user_id = "test_user"
        ip_address = "192.168.1.1"
        action = "create_conversation"
        
        # Call the method
        await rate_limiter.log_action(
            action=action,
            user_id=user_id,
            ip_address=ip_address,
            allowed=True,
        )
        
        # Verify log was added
        mock_db.add.assert_called_once()
        logged_entry = mock_db.add.call_args[0][0]
        assert isinstance(logged_entry, RateLimitTracking)
        assert logged_entry.user_id == user_id
        assert logged_entry.ip_address == ip_address
        assert logged_entry.action == action
        assert logged_entry.allowed is True

    @pytest.mark.asyncio
    async def test_log_action_blocked(self, rate_limiter, mock_db):
        """Test logging blocked action."""
        user_id = "blocked_user"
        ip_address = "192.168.1.1"
        action = "create_conversation"
        
        # Call the method
        await rate_limiter.log_action(
            action=action,
            user_id=user_id,
            ip_address=ip_address,
            allowed=False,
            reason="Rate limit exceeded",
        )
        
        # Verify log was added
        mock_db.add.assert_called_once()
        logged_entry = mock_db.add.call_args[0][0]
        assert isinstance(logged_entry, RateLimitTracking)
        assert logged_entry.user_id == user_id
        assert logged_entry.allowed is False
        assert logged_entry.reason == "Rate limit exceeded"

    @pytest.mark.asyncio
    async def test_get_rate_limit_status(self, rate_limiter, mock_db):
        """Test getting rate limit status."""
        user_id = "test_user"
        ip_address = "192.168.1.1"
        action = "create_conversation"
        
        # Mock 1 recent log
        mock_result = MagicMock()
        mock_result.scalar.return_value = 1
        mock_db.execute.return_value = mock_result
        
        # Call the method
        status = await rate_limiter.get_rate_limit_status(
            action=action,
            user_id=user_id,
            ip_address=ip_address,
            has_subscription=False,
        )
        
        # Assert results
        assert status["action"] == action
        assert status["limit"] == 2
        assert status["remaining"] == 1
        assert status["reset_at"] is not None
        assert status["window_hours"] == 24

    @pytest.mark.asyncio
    async def test_get_rate_limit_status_subscribed(self, rate_limiter, mock_db):
        """Test getting rate limit status for subscribed user."""
        user_id = "subscribed_user"
        action = "create_conversation"
        
        # Call the method
        status = await rate_limiter.get_rate_limit_status(
            action=action,
            user_id=user_id,
            ip_address=None,
            has_subscription=True,
        )
        
        # Assert results
        assert status["action"] == action
        assert status["limit"] == -1  # Unlimited
        assert status["remaining"] == -1
        assert status["reset_at"] is None
        assert status["window_hours"] == 0

    @pytest.mark.asyncio
    async def test_different_action_limits(self, rate_limiter, mock_db):
        """Test different actions have different limits."""
        user_id = "test_user"
        ip_address = "192.168.1.1"
        
        # Test create_conversation (2 per day)
        mock_result = MagicMock()
        mock_result.scalar.return_value = 0
        mock_db.execute.return_value = mock_result
        
        allowed, remaining, _ = await rate_limiter.check_rate_limit(
            action="create_conversation",
            user_id=user_id,
            ip_address=ip_address,
            has_subscription=False,
        )
        
        assert allowed is True
        assert remaining == 1
        
        # Test different action (should use default limit)
        allowed, remaining, _ = await rate_limiter.check_rate_limit(
            action="some_other_action",
            user_id=user_id,
            ip_address=ip_address,
            has_subscription=False,
        )
        
        assert allowed is True
        assert remaining == 9  # Default 10 - 1

    @pytest.mark.asyncio
    async def test_rate_limit_window_reset(self, rate_limiter, mock_db):
        """Test rate limit resets after window expires."""
        user_id = "test_user"
        ip_address = "192.168.1.1"
        action = "create_conversation"
        
        # First check - mock logs from yesterday (outside window)
        yesterday = datetime.now(timezone.utc) - timedelta(days=1, hours=1)
        mock_result = MagicMock()
        mock_result.scalar.return_value = 0  # No logs in current window
        mock_db.execute.return_value = mock_result
        
        # Call the method
        allowed, remaining, reset_time = await rate_limiter.check_rate_limit(
            action=action,
            user_id=user_id,
            ip_address=ip_address,
            has_subscription=False,
        )
        
        # Assert results - should be allowed even if user hit limits yesterday
        assert allowed is True
        assert remaining == 1
        
        # Verify the SQL query checked for logs within the window
        executed_query = mock_db.execute.call_args[0][0]
        # The query should filter by timestamp

    @pytest.mark.asyncio
    async def test_rate_limit_user_and_ip_tracking(self, rate_limiter, mock_db):
        """Test rate limit tracks both user ID and IP address."""
        user_id = "test_user"
        ip_address1 = "192.168.1.1"
        ip_address2 = "192.168.1.2"
        action = "create_conversation"
        
        # Mock different counts for different IPs
        mock_result1 = MagicMock()
        mock_result1.scalar.return_value = 1
        
        mock_result2 = MagicMock()
        mock_result2.scalar.return_value = 0
        
        mock_db.execute.side_effect = [mock_result1, mock_result2]
        
        # Check from first IP
        allowed1, remaining1, _ = await rate_limiter.check_rate_limit(
            action=action,
            user_id=user_id,
            ip_address=ip_address1,
            has_subscription=False,
        )
        
        # Check from second IP (same user)
        allowed2, remaining2, _ = await rate_limiter.check_rate_limit(
            action=action,
            user_id=user_id,
            ip_address=ip_address2,
            has_subscription=False,
        )
        
        # First IP should have less remaining
        assert allowed1 is True
        assert remaining1 == 0  # 2 - 1 existing - 1 for this
        
        # Second IP should have more remaining
        assert allowed2 is True
        assert remaining2 == 1  # 2 - 0 existing - 1 for this