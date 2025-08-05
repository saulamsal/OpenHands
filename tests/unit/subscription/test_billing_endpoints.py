import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from openhands.server.app import app
from openhands.server.services.subscription_service import SubscriptionService
from openhands.server.services.token_service import TokenService
from openhands.server.services.stripe_service import StripeService
from openhands.storage.database.models.subscription_models import (
    SubscriptionPlan,
    Subscription,
    TokenBalance,
)


@pytest.fixture
def test_client():
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def mock_services():
    """Mock all services used by billing endpoints."""
    with patch("openhands.server.routes.billing.get_db") as mock_get_db, \
         patch("openhands.server.routes.billing.SubscriptionService") as mock_sub_service, \
         patch("openhands.server.routes.billing.TokenService") as mock_token_service, \
         patch("openhands.server.routes.billing.StripeService") as mock_stripe_service:
        
        # Mock database session
        mock_db = AsyncMock(spec=AsyncSession)
        mock_get_db.return_value = mock_db
        
        # Mock service instances
        mock_sub_instance = AsyncMock(spec=SubscriptionService)
        mock_token_instance = AsyncMock(spec=TokenService)
        mock_stripe_instance = AsyncMock(spec=StripeService)
        
        mock_sub_service.return_value = mock_sub_instance
        mock_token_service.return_value = mock_token_instance
        mock_stripe_service.return_value = mock_stripe_instance
        
        yield {
            "db": mock_db,
            "subscription": mock_sub_instance,
            "token": mock_token_instance,
            "stripe": mock_stripe_instance,
        }


@pytest.fixture
def auth_headers():
    """Mock authentication headers."""
    return {"Authorization": "Bearer test_token"}


class TestBillingEndpoints:
    """Test cases for billing API endpoints."""

    def test_get_subscription_plans(self, test_client, mock_services):
        """Test getting available subscription plans."""
        # Mock plans
        mock_plans = [
            SubscriptionPlan(
                id="plan_basic",
                name="basic",
                display_name="Basic Plan",
                price_cents=1000,
                tokens_per_month=2000000,
                plan_type="individual",
                billing_period="monthly",
            ),
            SubscriptionPlan(
                id="plan_pro",
                name="pro",
                display_name="Pro Plan",
                price_cents=2000,
                tokens_per_month=5000000,
                plan_type="individual",
                billing_period="monthly",
            ),
        ]
        
        mock_services["subscription"].get_available_plans.return_value = mock_plans
        
        # Make request
        response = test_client.get(
            "/api/billing/plans?type=individual&period=monthly"
        )
        
        # Assert response
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] == "basic"
        assert data[1]["name"] == "pro"

    def test_get_subscription_status_authenticated(
        self, test_client, mock_services, auth_headers
    ):
        """Test getting subscription status for authenticated user."""
        # Mock user ID extraction
        with patch("openhands.server.routes.billing.get_user_id") as mock_get_user:
            mock_get_user.return_value = "user_123"
            
            # Mock subscription
            mock_subscription = Subscription(
                id="sub_123",
                user_id="user_123",
                plan_id="plan_pro",
                status="active",
                current_period_start=datetime.now(timezone.utc),
                current_period_end=datetime.now(timezone.utc),
            )
            mock_subscription.plan = SubscriptionPlan(
                id="plan_pro",
                name="pro",
                display_name="Pro Plan",
                price_cents=2000,
                tokens_per_month=5000000,
            )
            
            mock_services["subscription"].get_subscription_by_user.return_value = (
                mock_subscription
            )
            
            # Make request
            response = test_client.get(
                "/api/billing/subscription",
                headers=auth_headers,
            )
            
            # Assert response
            assert response.status_code == 200
            data = response.json()
            assert data["subscription"]["status"] == "active"
            assert data["subscription"]["plan"]["name"] == "pro"

    def test_get_subscription_status_no_subscription(
        self, test_client, mock_services, auth_headers
    ):
        """Test getting subscription status when user has no subscription."""
        with patch("openhands.server.routes.billing.get_user_id") as mock_get_user:
            mock_get_user.return_value = "user_123"
            
            mock_services["subscription"].get_subscription_by_user.return_value = None
            
            # Make request
            response = test_client.get(
                "/api/billing/subscription",
                headers=auth_headers,
            )
            
            # Assert response
            assert response.status_code == 200
            data = response.json()
            assert data["subscription"] is None

    def test_create_subscription(self, test_client, mock_services, auth_headers):
        """Test creating a new subscription."""
        with patch("openhands.server.routes.billing.get_user_id") as mock_get_user:
            mock_get_user.return_value = "user_123"
            
            # Mock Stripe customer creation
            mock_services["stripe"].create_customer.return_value = "cus_test123"
            
            # Mock subscription creation
            mock_subscription = Subscription(
                id="sub_new",
                user_id="user_123",
                plan_id="plan_basic",
                stripe_subscription_id="sub_stripe123",
                status="active",
            )
            
            mock_services["subscription"].create_subscription.return_value = (
                mock_subscription
            )
            
            # Make request
            response = test_client.post(
                "/api/billing/subscription",
                json={"plan_id": "plan_basic"},
                headers=auth_headers,
            )
            
            # Assert response
            assert response.status_code == 200
            data = response.json()
            assert data["subscription_id"] == "sub_new"
            assert data["status"] == "active"

    def test_update_subscription(self, test_client, mock_services, auth_headers):
        """Test updating existing subscription."""
        with patch("openhands.server.routes.billing.get_user_id") as mock_get_user:
            mock_get_user.return_value = "user_123"
            
            # Mock subscription update
            mock_updated_sub = Subscription(
                id="sub_123",
                user_id="user_123",
                plan_id="plan_pro",
                status="active",
            )
            
            mock_services["subscription"].update_subscription.return_value = (
                mock_updated_sub
            )
            
            # Make request
            response = test_client.put(
                "/api/billing/subscription/sub_123",
                json={
                    "new_plan_id": "plan_pro",
                    "proration_mode": "immediate_credit",
                },
                headers=auth_headers,
            )
            
            # Assert response
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Subscription updated successfully"

    def test_cancel_subscription(self, test_client, mock_services, auth_headers):
        """Test canceling subscription."""
        with patch("openhands.server.routes.billing.get_user_id") as mock_get_user:
            mock_get_user.return_value = "user_123"
            
            # Mock subscription cancellation
            mock_canceled_sub = Subscription(
                id="sub_123",
                user_id="user_123",
                status="active",
                cancel_at_period_end=True,
            )
            
            mock_services["subscription"].cancel_subscription.return_value = (
                mock_canceled_sub
            )
            
            # Make request
            response = test_client.post(
                "/api/billing/subscription/sub_123/cancel",
                json={"immediate": False},
                headers=auth_headers,
            )
            
            # Assert response
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Subscription cancelled successfully"

    def test_get_token_balance(self, test_client, mock_services, auth_headers):
        """Test getting token balance."""
        with patch("openhands.server.routes.billing.get_user_id") as mock_get_user:
            mock_get_user.return_value = "user_123"
            
            # Mock token balance
            mock_balance = {
                "subscription_tokens_available": 2000000,
                "topup_tokens_available": 500000,
                "free_tier_tokens_available": 0,
                "total_available": 2500000,
                "last_reset": datetime.now(timezone.utc).isoformat(),
            }
            
            mock_services["token"].get_balance.return_value = mock_balance
            
            # Make request
            response = test_client.get(
                "/api/billing/tokens/balance",
                headers=auth_headers,
            )
            
            # Assert response
            assert response.status_code == 200
            data = response.json()
            assert data["total_available"] == 2500000
            assert data["subscription_tokens_available"] == 2000000

    def test_purchase_tokens(self, test_client, mock_services, auth_headers):
        """Test purchasing additional tokens."""
        with patch("openhands.server.routes.billing.get_user_id") as mock_get_user:
            mock_get_user.return_value = "user_123"
            
            # Mock payment intent creation
            mock_services["stripe"].create_payment_intent.return_value = {
                "id": "pi_test123",
                "client_secret": "pi_test123_secret",
                "status": "requires_payment_method",
            }
            
            # Make request
            response = test_client.post(
                "/api/billing/tokens/purchase",
                json={
                    "amount": 1000000,  # 1M tokens
                    "payment_method_id": "pm_test123",
                },
                headers=auth_headers,
            )
            
            # Assert response
            assert response.status_code == 200
            data = response.json()
            assert data["payment_intent_id"] == "pi_test123"
            assert data["client_secret"] == "pi_test123_secret"

    def test_get_usage_history(self, test_client, mock_services, auth_headers):
        """Test getting token usage history."""
        with patch("openhands.server.routes.billing.get_user_id") as mock_get_user:
            mock_get_user.return_value = "user_123"
            
            # Mock usage history
            mock_usage = [
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "model": "gpt-4",
                    "tokens_deducted": 150,
                    "cost_cents": 30,
                },
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "model": "gpt-3.5-turbo",
                    "tokens_deducted": 300,
                    "cost_cents": 15,
                },
            ]
            
            mock_services["token"].get_usage_history.return_value = mock_usage
            
            # Make request
            response = test_client.get(
                "/api/billing/tokens/usage?limit=10&offset=0",
                headers=auth_headers,
            )
            
            # Assert response
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["model"] == "gpt-4"
            assert data[1]["model"] == "gpt-3.5-turbo"

    def test_create_checkout_session(self, test_client, mock_services, auth_headers):
        """Test creating Stripe checkout session."""
        with patch("openhands.server.routes.billing.get_user_id") as mock_get_user:
            mock_get_user.return_value = "user_123"
            
            # Mock checkout session creation
            mock_services["stripe"].create_checkout_session.return_value = {
                "id": "cs_test123",
                "url": "https://checkout.stripe.com/test123",
            }
            
            # Make request
            response = test_client.post(
                "/api/billing/checkout/session",
                json={
                    "plan_id": "plan_pro",
                    "success_url": "https://example.com/success",
                    "cancel_url": "https://example.com/cancel",
                },
                headers=auth_headers,
            )
            
            # Assert response
            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == "cs_test123"
            assert data["checkout_url"] == "https://checkout.stripe.com/test123"

    def test_create_billing_portal_session(
        self, test_client, mock_services, auth_headers
    ):
        """Test creating Stripe billing portal session."""
        with patch("openhands.server.routes.billing.get_user_id") as mock_get_user:
            mock_get_user.return_value = "user_123"
            
            # Mock getting subscription
            mock_sub = Subscription(
                stripe_customer_id="cus_test123"
            )
            mock_services["subscription"].get_subscription_by_user.return_value = (
                mock_sub
            )
            
            # Mock portal session creation
            mock_services["stripe"].create_billing_portal_session.return_value = {
                "id": "bps_test123",
                "url": "https://billing.stripe.com/test123",
            }
            
            # Make request
            response = test_client.post(
                "/api/billing/portal/session",
                json={"return_url": "https://example.com/account"},
                headers=auth_headers,
            )
            
            # Assert response
            assert response.status_code == 200
            data = response.json()
            assert data["portal_url"] == "https://billing.stripe.com/test123"

    def test_get_payment_methods(self, test_client, mock_services, auth_headers):
        """Test getting user's payment methods."""
        with patch("openhands.server.routes.billing.get_user_id") as mock_get_user:
            mock_get_user.return_value = "user_123"
            
            # Mock subscription
            mock_sub = Subscription(
                stripe_customer_id="cus_test123"
            )
            mock_services["subscription"].get_subscription_by_user.return_value = (
                mock_sub
            )
            
            # Mock payment methods
            mock_payment_methods = [
                {
                    "id": "pm_test1",
                    "type": "card",
                    "card": {
                        "brand": "visa",
                        "last4": "4242",
                    },
                },
                {
                    "id": "pm_test2",
                    "type": "card",
                    "card": {
                        "brand": "mastercard",
                        "last4": "5555",
                    },
                },
            ]
            
            mock_services["stripe"].list_payment_methods.return_value = (
                mock_payment_methods
            )
            
            # Make request
            response = test_client.get(
                "/api/billing/payment-methods",
                headers=auth_headers,
            )
            
            # Assert response
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["card"]["last4"] == "4242"
            assert data[1]["card"]["last4"] == "5555"

    def test_rate_limit_check(self, test_client, auth_headers):
        """Test rate limit checking endpoint."""
        with patch("openhands.server.routes.billing.get_user_id") as mock_get_user, \
             patch("openhands.server.routes.billing.RateLimiter") as mock_rate_limiter:
            
            mock_get_user.return_value = "user_123"
            
            # Mock rate limiter
            mock_limiter_instance = AsyncMock()
            mock_rate_limiter.return_value = mock_limiter_instance
            
            mock_limiter_instance.get_rate_limit_status.return_value = {
                "action": "create_conversation",
                "limit": 2,
                "remaining": 1,
                "reset_at": datetime.now(timezone.utc).isoformat(),
                "window_hours": 24,
            }
            
            # Make request
            response = test_client.get(
                "/api/billing/rate-limit?action=create_conversation",
                headers=auth_headers,
            )
            
            # Assert response
            assert response.status_code == 200
            data = response.json()
            assert data["limit"] == 2
            assert data["remaining"] == 1

    def test_unauthorized_access(self, test_client):
        """Test endpoints return 401 without authentication."""
        endpoints = [
            ("/api/billing/subscription", "GET"),
            ("/api/billing/tokens/balance", "GET"),
            ("/api/billing/tokens/usage", "GET"),
            ("/api/billing/payment-methods", "GET"),
        ]
        
        for endpoint, method in endpoints:
            if method == "GET":
                response = test_client.get(endpoint)
            elif method == "POST":
                response = test_client.post(endpoint, json={})
            
            assert response.status_code == 401

    def test_error_handling(self, test_client, mock_services, auth_headers):
        """Test error handling in endpoints."""
        with patch("openhands.server.routes.billing.get_user_id") as mock_get_user:
            mock_get_user.return_value = "user_123"
            
            # Mock service error
            mock_services["subscription"].get_subscription_by_user.side_effect = (
                Exception("Database error")
            )
            
            # Make request
            response = test_client.get(
                "/api/billing/subscription",
                headers=auth_headers,
            )
            
            # Assert error response
            assert response.status_code == 500
            data = response.json()
            assert "error" in data or "detail" in data