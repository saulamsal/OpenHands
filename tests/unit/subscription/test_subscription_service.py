import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from openhands.server.services.subscription_service import SubscriptionService
from openhands.server.services.token_service import TokenService
from openhands.server.services.stripe_service import StripeService
from openhands.storage.database.models.subscription_models import (
    SubscriptionPlan,
    Subscription,
)


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
def mock_token_service():
    """Create a mock token service."""
    service = AsyncMock(spec=TokenService)
    return service


@pytest.fixture
def mock_stripe_service():
    """Create a mock Stripe service."""
    service = AsyncMock(spec=StripeService)
    return service


@pytest.fixture
def subscription_service(mock_db, mock_token_service, mock_stripe_service):
    """Create a SubscriptionService instance with mock dependencies."""
    return SubscriptionService(mock_db, mock_stripe_service, mock_token_service)


class TestSubscriptionService:
    """Test cases for SubscriptionService."""

    @pytest.mark.asyncio
    async def test_create_subscription_success(self, subscription_service, mock_db, mock_token_service, mock_stripe_service):
        """Test successful subscription creation."""
        user_id = "test_user"
        plan_id = "plan_basic"
        stripe_customer_id = "cus_test123"
        
        # Mock plan
        mock_plan = MagicMock(spec=SubscriptionPlan)
        mock_plan.id = plan_id
        mock_plan.name = "basic"
        mock_plan.display_name = "Basic Plan"
        mock_plan.price_cents = 1000
        mock_plan.tokens_per_month = 2000000
        mock_plan.type = "individual"
        mock_plan.billing_period = "monthly"
        mock_plan.stripe_price_id = "price_test123"
        
        # Mock plan query
        plan_result = MagicMock()
        plan_result.scalar_one_or_none.return_value = mock_plan
        
        # Mock existing subscription query (none exists)
        sub_result = MagicMock()
        sub_result.scalar_one_or_none.return_value = None
        
        mock_db.execute.side_effect = [plan_result, sub_result]
        
        # Mock Stripe subscription creation
        mock_stripe_sub = MagicMock()
        mock_stripe_sub.id = "sub_test123"
        mock_stripe_sub.status = "active"
        mock_stripe_sub.current_period_start = int(datetime.now(timezone.utc).timestamp())
        mock_stripe_sub.current_period_end = int((datetime.now(timezone.utc) + timedelta(days=30)).timestamp())
        mock_stripe_sub.cancel_at_period_end = False
        
        mock_stripe_service.create_subscription.return_value = mock_stripe_sub
        
        # Mock token grant
        mock_token_service.grant_subscription_tokens = AsyncMock(return_value=True)
        
        # Mock helper methods
        with patch.object(subscription_service, '_get_plan', return_value=mock_plan), \
             patch.object(subscription_service, '_ensure_stripe_customer', return_value=stripe_customer_id):
            
            # Call the method
            subscription = await subscription_service.create_subscription(
                user_id=user_id,
                plan_id=plan_id,
                payment_method_id="pm_test123",
            )
        
        # Assert results
        assert subscription is not None
        assert subscription["status"] == "active"
        assert subscription["plan"] == "Basic Plan"
        assert subscription["tokens_granted"] == 2000000
        assert "subscription_id" in subscription
        
        # Verify Stripe was called
        mock_stripe_service.create_subscription.assert_called_once_with(
            customer_id=stripe_customer_id,
            price_id="price_test123",
            payment_method_id="pm_test123",
        )
        
        # Verify tokens were granted
        mock_token_service.grant_subscription_tokens.assert_called_once_with(
            user_id=user_id,
            team_id=None,
            tokens=2000000,
            stripe_event_id=None,
        )

    @pytest.mark.asyncio
    async def test_create_subscription_service_initialization(self, mock_db, mock_token_service, mock_stripe_service):
        """Test SubscriptionService can be initialized properly."""
        service = SubscriptionService(mock_db, mock_stripe_service, mock_token_service)
        
        assert service.db == mock_db
        assert service.stripe == mock_stripe_service
        assert service.tokens == mock_token_service

    @pytest.mark.asyncio
    async def test_create_subscription_idempotency_check(self, subscription_service, mock_db):
        """Test subscription creation with stripe_event_id for idempotency."""
        user_id = "test_user"
        plan_id = "plan_basic"
        stripe_event_id = "evt_test123"
        
        # Mock existing subscription for this event ID
        existing_result = MagicMock()
        existing_result.scalar_one_or_none.return_value = MagicMock()  # Found existing
        
        mock_db.execute.return_value = existing_result
        
        # Call the method
        result = await subscription_service.create_subscription(
            user_id=user_id,
            plan_id=plan_id,
            stripe_event_id=stripe_event_id,
        )
        
        # Should return early with already_processed status
        assert result == {'status': 'already_processed'}