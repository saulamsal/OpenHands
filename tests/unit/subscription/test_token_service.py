import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from openhands.server.services.token_service import TokenService
from openhands.storage.database.models.subscription_models import (
    TokenBalance,
    TokenTransaction,
    TokenUsageLog as UsageLog,
)


@pytest.fixture
def mock_db():
    """Create a mock database session."""
    db = AsyncMock(spec=AsyncSession)
    db.begin = MagicMock()
    db.begin.return_value.__aenter__ = AsyncMock()
    db.begin.return_value.__aexit__ = AsyncMock()
    return db


@pytest.fixture
def token_service(mock_db):
    """Create a TokenService instance with mock dependencies."""
    return TokenService(mock_db)


class TestTokenService:
    """Test cases for TokenService."""

    @pytest.mark.asyncio
    async def test_deduct_tokens_success(self, token_service, mock_db):
        """Test successful token deduction."""
        user_id = "test_user"
        tokens_to_deduct = 100
        model = "gpt-4"
        
        # Mock the balance query
        mock_balance = MagicMock(spec=TokenBalance)
        mock_balance.user_id = user_id
        mock_balance.subscription_tokens_available = 1000
        mock_balance.topup_tokens_available = 500
        mock_balance.last_reset_at = datetime.now(timezone.utc)
        mock_balance.version = 0
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_balance
        mock_db.execute.return_value = mock_result
        mock_db.add = MagicMock()
        mock_db.flush = AsyncMock()
        mock_db.commit = AsyncMock()
        
        # Mock the _get_user_team_id method to return None (no team)
        with patch.object(token_service, '_get_user_team_id', return_value=None):
            # Mock the _calculate_costs method
            with patch.object(token_service, '_calculate_costs', return_value=(10, 15)):
                # Call the method
                success, message, details = await token_service.deduct_tokens(
                    user_id=user_id,
                    tokens_to_deduct=tokens_to_deduct,
                    model=model,
                    input_tokens=50,
                    output_tokens=50,
                )
        
        # Assert results
        print(f"Success: {success}, Message: {message}, Details: {details}")
        assert success is True
        assert "deducted successfully" in message
        assert details is not None
        assert details["tokens_deducted"] == tokens_to_deduct
        assert details["remaining_total"] == 1400  # 1000 + 500 - 100
        
        # Verify database operations
        assert mock_db.execute.called
        assert mock_db.add.call_count == 1  # Only usage log is added

    @pytest.mark.asyncio
    async def test_deduct_tokens_insufficient_balance(self, token_service, mock_db):
        """Test token deduction with insufficient balance."""
        user_id = "test_user"
        tokens_to_deduct = 1000
        
        # Mock the balance query with insufficient tokens
        mock_balance = MagicMock(spec=TokenBalance)
        mock_balance.user_id = user_id
        mock_balance.subscription_tokens_available = 100
        mock_balance.topup_tokens_available = 50
        mock_balance.last_reset_at = datetime.now(timezone.utc)
        mock_balance.version = 0
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_balance
        mock_db.execute.return_value = mock_result
        
        # Mock the _get_user_team_id method to return None (no team)
        with patch.object(token_service, '_get_user_team_id', return_value=None):
            # Call the method
            success, message, details = await token_service.deduct_tokens(
                user_id=user_id,
                tokens_to_deduct=tokens_to_deduct,
                model="gpt-4",
            )
        
        # Assert results
        assert success is False
        assert "Insufficient tokens" in message
        assert details is None  # Code returns None for insufficient tokens

    @pytest.mark.asyncio
    async def test_deduct_tokens_retry_on_conflict(self, token_service, mock_db):
        """Test token deduction retry on database conflict."""
        user_id = "test_user"
        tokens_to_deduct = 100
        
        # Mock balance
        mock_balance = TokenBalance(
            user_id=user_id,
            subscription_tokens=1000,
            topup_tokens=0,
            free_tier_tokens=0,
            last_reset=datetime.now(timezone.utc),
        )
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_balance
        
        # First two attempts fail with IntegrityError, third succeeds
        mock_db.execute.return_value = mock_result
        mock_db.begin.return_value.__aexit__.side_effect = [
            IntegrityError("", "", ""),
            IntegrityError("", "", ""),
            None,
        ]
        mock_db.add = MagicMock()
        
        # Call the method
        success, message, details = await token_service.deduct_tokens(
            user_id=user_id,
            tokens_to_deduct=tokens_to_deduct,
            model="gpt-4",
            retry_attempts=3,
        )
        
        # Assert results
        assert success is True
        assert "Successfully deducted" in message
        
        # Verify retry attempts
        assert mock_db.begin.call_count == 3

    @pytest.mark.asyncio
    async def test_deduct_tokens_no_balance_record(self, token_service, mock_db):
        """Test token deduction when user has no balance record."""
        user_id = "new_user"
        tokens_to_deduct = 100
        
        # Mock no balance found
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        # Call the method
        success, message, details = await token_service.deduct_tokens(
            user_id=user_id,
            tokens_to_deduct=tokens_to_deduct,
            model="gpt-4",
        )
        
        # Assert results
        assert success is False
        assert "No token balance found" in message
        assert details is None

    @pytest.mark.asyncio
    async def test_grant_tokens_subscription(self, token_service, mock_db):
        """Test granting subscription tokens."""
        user_id = "test_user"
        tokens_to_grant = 5000000  # 5M tokens
        
        # Mock existing balance
        mock_balance = TokenBalance(
            user_id=user_id,
            subscription_tokens=1000000,
            topup_tokens=0,
            free_tier_tokens=0,
            last_reset=datetime.now(timezone.utc),
        )
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_balance
        mock_db.execute.return_value = mock_result
        mock_db.add = MagicMock()
        
        # Call the method
        success, new_balance = await token_service.grant_tokens(
            user_id=user_id,
            tokens=tokens_to_grant,
            token_type="subscription",
            reason="Monthly subscription renewal",
        )
        
        # Assert results
        assert success is True
        assert new_balance == 6000000  # 1M + 5M
        
        # Verify balance was updated
        assert mock_balance.subscription_tokens == 6000000

    @pytest.mark.asyncio
    async def test_grant_tokens_topup(self, token_service, mock_db):
        """Test granting top-up tokens."""
        user_id = "test_user"
        tokens_to_grant = 1000000  # 1M tokens
        
        # Mock existing balance
        mock_balance = TokenBalance(
            user_id=user_id,
            subscription_tokens=0,
            topup_tokens=500000,
            free_tier_tokens=0,
            last_reset=datetime.now(timezone.utc),
        )
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_balance
        mock_db.execute.return_value = mock_result
        mock_db.add = MagicMock()
        
        # Call the method
        success, new_balance = await token_service.grant_tokens(
            user_id=user_id,
            tokens=tokens_to_grant,
            token_type="topup",
            reason="Token purchase",
            stripe_payment_intent_id="pi_test123",
        )
        
        # Assert results
        assert success is True
        assert new_balance == 1500000  # 500k + 1M
        
        # Verify balance was updated
        assert mock_balance.topup_tokens == 1500000

    @pytest.mark.asyncio
    async def test_grant_tokens_creates_new_balance(self, token_service, mock_db):
        """Test granting tokens creates new balance record if none exists."""
        user_id = "new_user"
        tokens_to_grant = 50000  # 50k free tier tokens
        
        # Mock no existing balance
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        mock_db.add = MagicMock()
        
        # Call the method
        success, new_balance = await token_service.grant_tokens(
            user_id=user_id,
            tokens=tokens_to_grant,
            token_type="free_tier",
            reason="New user free tier",
        )
        
        # Assert results
        assert success is True
        assert new_balance == 50000
        
        # Verify new balance was created
        mock_db.add.assert_called()
        added_balance = mock_db.add.call_args[0][0]
        assert isinstance(added_balance, TokenBalance)
        assert added_balance.user_id == user_id
        assert added_balance.free_tier_tokens == 50000

    @pytest.mark.asyncio
    async def test_get_balance_existing_user(self, token_service, mock_db):
        """Test getting balance for existing user."""
        user_id = "test_user"
        
        # Mock existing balance
        mock_balance = TokenBalance(
            user_id=user_id,
            subscription_tokens=2000000,
            topup_tokens=500000,
            free_tier_tokens=0,
            last_reset=datetime.now(timezone.utc),
        )
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_balance
        mock_db.execute.return_value = mock_result
        
        # Call the method
        balance = await token_service.get_balance(user_id)
        
        # Assert results
        assert balance is not None
        assert balance["subscription_tokens_available"] == 2000000
        assert balance["topup_tokens_available"] == 500000
        assert balance["total_available"] == 2500000

    @pytest.mark.asyncio
    async def test_get_balance_new_user(self, token_service, mock_db):
        """Test getting balance for new user returns zero balance."""
        user_id = "new_user"
        
        # Mock no existing balance
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        # Call the method
        balance = await token_service.get_balance(user_id)
        
        # Assert results
        assert balance is not None
        assert balance["subscription_tokens_available"] == 0
        assert balance["topup_tokens_available"] == 0
        assert balance["total_available"] == 0

    @pytest.mark.asyncio
    async def test_reset_subscription_tokens(self, token_service, mock_db):
        """Test resetting subscription tokens."""
        user_id = "test_user"
        new_allocation = 5000000  # 5M tokens
        
        # Mock existing balance
        mock_balance = TokenBalance(
            user_id=user_id,
            subscription_tokens=100000,  # Low balance
            topup_tokens=0,
            free_tier_tokens=0,
            last_reset=datetime.now(timezone.utc),
        )
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_balance
        mock_db.execute.return_value = mock_result
        mock_db.add = MagicMock()
        
        # Call the method
        success = await token_service.reset_subscription_tokens(
            user_id=user_id,
            new_allocation=new_allocation,
        )
        
        # Assert results
        assert success is True
        assert mock_balance.subscription_tokens == new_allocation
        assert mock_balance.last_reset is not None

    @pytest.mark.asyncio
    async def test_get_usage_history(self, token_service, mock_db):
        """Test getting usage history."""
        user_id = "test_user"
        
        # Mock usage logs
        mock_logs = [
            UsageLog(
                user_id=user_id,
                timestamp=datetime.now(timezone.utc),
                model="gpt-4",
                input_tokens=100,
                output_tokens=50,
                tokens_deducted=150,
                cost_cents=30,
            ),
            UsageLog(
                user_id=user_id,
                timestamp=datetime.now(timezone.utc),
                model="gpt-3.5-turbo",
                input_tokens=200,
                output_tokens=100,
                tokens_deducted=300,
                cost_cents=15,
            ),
        ]
        
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = mock_logs
        mock_db.execute.return_value = mock_result
        
        # Call the method
        usage = await token_service.get_usage_history(
            user_id=user_id,
            limit=10,
        )
        
        # Assert results
        assert len(usage) == 2
        assert usage[0]["model"] == "gpt-4"
        assert usage[0]["tokens_deducted"] == 150
        assert usage[1]["model"] == "gpt-3.5-turbo"
        assert usage[1]["tokens_deducted"] == 300

    @pytest.mark.asyncio
    async def test_deduct_tokens_order(self, token_service, mock_db):
        """Test token deduction order: subscription -> free tier -> top-up."""
        user_id = "test_user"
        
        # Test 1: Deduct from subscription first
        mock_balance = TokenBalance(
            user_id=user_id,
            subscription_tokens=100,
            topup_tokens=200,
            free_tier_tokens=50,
            last_reset=datetime.now(timezone.utc),
        )
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_balance
        mock_db.execute.return_value = mock_result
        mock_db.add = MagicMock()
        
        # Deduct 80 tokens (should come from subscription)
        success, message, details = await token_service.deduct_tokens(
            user_id=user_id,
            tokens_to_deduct=80,
            model="gpt-4",
        )
        
        assert success is True
        assert mock_balance.subscription_tokens == 20
        assert mock_balance.free_tier_tokens == 50
        assert mock_balance.topup_tokens == 200
        
        # Test 2: Deduct more (should use remaining subscription + free tier)
        success, message, details = await token_service.deduct_tokens(
            user_id=user_id,
            tokens_to_deduct=60,
            model="gpt-4",
        )
        
        assert success is True
        assert mock_balance.subscription_tokens == 0
        assert mock_balance.free_tier_tokens == 10
        assert mock_balance.topup_tokens == 200
        
        # Test 3: Deduct more (should use remaining free tier + top-up)
        success, message, details = await token_service.deduct_tokens(
            user_id=user_id,
            tokens_to_deduct=50,
            model="gpt-4",
        )
        
        assert success is True
        assert mock_balance.subscription_tokens == 0
        assert mock_balance.free_tier_tokens == 0
        assert mock_balance.topup_tokens == 160