import pytest
import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from openhands.server.app import app
from openhands.server.services.subscription_service import SubscriptionService
from openhands.server.services.token_service import TokenService
from openhands.server.services.stripe_service import StripeService
from openhands.storage.database.models.subscription_models import StripeWebhookEvent


@pytest.fixture
def test_client():
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def mock_services():
    """Mock all services used by webhook handler."""
    with patch("openhands.server.routes.webhooks.get_db") as mock_get_db, \
         patch("openhands.server.routes.webhooks.SubscriptionService") as mock_sub_service, \
         patch("openhands.server.routes.webhooks.TokenService") as mock_token_service, \
         patch("openhands.server.routes.webhooks.StripeService") as mock_stripe_service, \
         patch("openhands.server.routes.webhooks.STRIPE_WEBHOOK_SECRET", "whsec_test123"):
        
        # Mock database session
        mock_db = AsyncMock(spec=AsyncSession)
        mock_db.begin = MagicMock()
        mock_db.begin.return_value.__aenter__ = AsyncMock()
        mock_db.begin.return_value.__aexit__ = AsyncMock()
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
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


class TestWebhookHandler:
    """Test cases for Stripe webhook handler."""

    def test_webhook_invalid_signature(self, test_client, mock_services):
        """Test webhook with invalid signature."""
        # Mock invalid signature validation
        mock_services["stripe"].validate_webhook_signature.return_value = None
        
        # Create webhook payload
        payload = {"id": "evt_test123", "type": "payment_intent.succeeded"}
        
        # Make request
        response = test_client.post(
            "/api/webhooks/stripe",
            content=json.dumps(payload),
            headers={
                "stripe-signature": "invalid_signature",
                "content-type": "application/json",
            },
        )
        
        # Assert response
        assert response.status_code == 400
        assert response.json()["error"] == "Invalid signature"

    def test_webhook_subscription_created(self, test_client, mock_services):
        """Test handling subscription.created webhook."""
        # Create webhook event
        event = {
            "id": "evt_test123",
            "type": "customer.subscription.created",
            "data": {
                "object": {
                    "id": "sub_stripe123",
                    "customer": "cus_test123",
                    "status": "active",
                    "items": {
                        "data": [
                            {
                                "price": {
                                    "id": "price_test123",
                                    "product": "prod_test123",
                                }
                            }
                        ]
                    },
                    "current_period_start": 1234567890,
                    "current_period_end": 1237159890,
                    "cancel_at_period_end": False,
                }
            },
        }
        
        # Mock signature validation
        mock_services["stripe"].validate_webhook_signature.return_value = event
        
        # Mock customer lookup
        mock_services["stripe"].get_customer.return_value = {
            "id": "cus_test123",
            "metadata": {"user_id": "user_123"},
        }
        
        # Mock plan lookup
        mock_plan_result = MagicMock()
        mock_plan_result.scalar_one_or_none.return_value = MagicMock(
            id="plan_basic",
            tokens_per_month=2000000,
        )
        mock_services["db"].execute.return_value = mock_plan_result
        
        # Mock subscription creation
        mock_services["subscription"].create_subscription.return_value = MagicMock(
            id="sub_123"
        )
        
        # Make request
        response = test_client.post(
            "/api/webhooks/stripe",
            content=json.dumps(event),
            headers={
                "stripe-signature": "t=123,v1=abc123",
                "content-type": "application/json",
            },
        )
        
        # Assert response
        assert response.status_code == 200
        assert response.json()["received"] is True
        
        # Verify webhook was logged
        assert mock_services["db"].add.called
        logged_webhook = mock_services["db"].add.call_args[0][0]
        assert isinstance(logged_webhook, StripeWebhookEvent)
        assert logged_webhook.event_id == "evt_test123"
        assert logged_webhook.event_type == "customer.subscription.created"

    def test_webhook_subscription_updated(self, test_client, mock_services):
        """Test handling subscription.updated webhook."""
        event = {
            "id": "evt_test124",
            "type": "customer.subscription.updated",
            "data": {
                "object": {
                    "id": "sub_stripe123",
                    "status": "active",
                    "current_period_start": 1234567890,
                    "current_period_end": 1237159890,
                    "cancel_at_period_end": False,
                },
                "previous_attributes": {
                    "current_period_start": 1231975890,
                    "current_period_end": 1234567890,
                },
            },
        }
        
        # Mock signature validation
        mock_services["stripe"].validate_webhook_signature.return_value = event
        
        # Mock subscription lookup
        mock_sub_result = MagicMock()
        mock_sub_result.scalar_one_or_none.return_value = MagicMock(
            id="sub_123",
            user_id="user_123",
        )
        mock_services["db"].execute.return_value = mock_sub_result
        
        # Mock subscription renewal
        mock_services["subscription"].handle_subscription_renewal.return_value = (
            MagicMock(id="sub_123")
        )
        
        # Make request
        response = test_client.post(
            "/api/webhooks/stripe",
            content=json.dumps(event),
            headers={
                "stripe-signature": "t=123,v1=abc123",
                "content-type": "application/json",
            },
        )
        
        # Assert response
        assert response.status_code == 200
        
        # Verify renewal was handled
        mock_services["subscription"].handle_subscription_renewal.assert_called_once()

    def test_webhook_subscription_deleted(self, test_client, mock_services):
        """Test handling subscription.deleted webhook."""
        event = {
            "id": "evt_test125",
            "type": "customer.subscription.deleted",
            "data": {
                "object": {
                    "id": "sub_stripe123",
                    "status": "canceled",
                    "canceled_at": 1234567890,
                }
            },
        }
        
        # Mock signature validation
        mock_services["stripe"].validate_webhook_signature.return_value = event
        
        # Mock subscription lookup and update
        mock_sub = MagicMock(
            id="sub_123",
            status="active",
        )
        mock_sub_result = MagicMock()
        mock_sub_result.scalar_one_or_none.return_value = mock_sub
        mock_services["db"].execute.return_value = mock_sub_result
        
        # Make request
        response = test_client.post(
            "/api/webhooks/stripe",
            content=json.dumps(event),
            headers={
                "stripe-signature": "t=123,v1=abc123",
                "content-type": "application/json",
            },
        )
        
        # Assert response
        assert response.status_code == 200
        
        # Verify subscription was cancelled
        assert mock_sub.status == "cancelled"
        assert mock_sub.cancelled_at is not None

    def test_webhook_payment_intent_succeeded(self, test_client, mock_services):
        """Test handling payment_intent.succeeded webhook."""
        event = {
            "id": "evt_test126",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_test123",
                    "amount": 800,  # $8.00 = 1M tokens
                    "customer": "cus_test123",
                    "metadata": {
                        "type": "token_purchase",
                        "tokens": "1000000",
                        "user_id": "user_123",
                    },
                }
            },
        }
        
        # Mock signature validation
        mock_services["stripe"].validate_webhook_signature.return_value = event
        
        # Mock existing webhook check
        mock_webhook_result = MagicMock()
        mock_webhook_result.scalar_one_or_none.return_value = None
        mock_services["db"].execute.return_value = mock_webhook_result
        
        # Mock token grant
        mock_services["token"].grant_tokens.return_value = (True, 1000000)
        
        # Make request
        response = test_client.post(
            "/api/webhooks/stripe",
            content=json.dumps(event),
            headers={
                "stripe-signature": "t=123,v1=abc123",
                "content-type": "application/json",
            },
        )
        
        # Assert response
        assert response.status_code == 200
        
        # Verify tokens were granted
        mock_services["token"].grant_tokens.assert_called_once_with(
            user_id="user_123",
            tokens=1000000,
            token_type="topup",
            reason="Token purchase - 1000000 tokens",
            stripe_payment_intent_id="pi_test123",
        )

    def test_webhook_idempotency(self, test_client, mock_services):
        """Test webhook idempotency (duplicate handling)."""
        event = {
            "id": "evt_duplicate",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_duplicate",
                    "metadata": {
                        "type": "token_purchase",
                        "user_id": "user_123",
                    },
                }
            },
        }
        
        # Mock signature validation
        mock_services["stripe"].validate_webhook_signature.return_value = event
        
        # Mock existing webhook (duplicate)
        mock_webhook_result = MagicMock()
        mock_webhook_result.scalar_one_or_none.return_value = StripeWebhookEvent(
            event_id="evt_duplicate",
            processed=True,
        )
        mock_services["db"].execute.return_value = mock_webhook_result
        
        # Make request
        response = test_client.post(
            "/api/webhooks/stripe",
            content=json.dumps(event),
            headers={
                "stripe-signature": "t=123,v1=abc123",
                "content-type": "application/json",
            },
        )
        
        # Assert response
        assert response.status_code == 200
        assert response.json()["message"] == "Event already processed"
        
        # Verify no token grant was attempted
        mock_services["token"].grant_tokens.assert_not_called()

    def test_webhook_checkout_session_completed(self, test_client, mock_services):
        """Test handling checkout.session.completed webhook."""
        event = {
            "id": "evt_test127",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test123",
                    "customer": "cus_test123",
                    "subscription": "sub_stripe123",
                    "metadata": {
                        "user_id": "user_123",
                        "plan_id": "plan_pro",
                    },
                }
            },
        }
        
        # Mock signature validation
        mock_services["stripe"].validate_webhook_signature.return_value = event
        
        # Make request
        response = test_client.post(
            "/api/webhooks/stripe",
            content=json.dumps(event),
            headers={
                "stripe-signature": "t=123,v1=abc123",
                "content-type": "application/json",
            },
        )
        
        # Assert response
        assert response.status_code == 200

    def test_webhook_invoice_payment_succeeded(self, test_client, mock_services):
        """Test handling invoice.payment_succeeded webhook."""
        event = {
            "id": "evt_test128",
            "type": "invoice.payment_succeeded",
            "data": {
                "object": {
                    "id": "in_test123",
                    "customer": "cus_test123",
                    "subscription": "sub_stripe123",
                    "billing_reason": "subscription_cycle",
                    "lines": {
                        "data": [
                            {
                                "price": {
                                    "id": "price_test123",
                                    "product": "prod_test123",
                                }
                            }
                        ]
                    },
                }
            },
        }
        
        # Mock signature validation
        mock_services["stripe"].validate_webhook_signature.return_value = event
        
        # Make request
        response = test_client.post(
            "/api/webhooks/stripe",
            content=json.dumps(event),
            headers={
                "stripe-signature": "t=123,v1=abc123",
                "content-type": "application/json",
            },
        )
        
        # Assert response
        assert response.status_code == 200

    def test_webhook_unknown_event_type(self, test_client, mock_services):
        """Test handling unknown webhook event type."""
        event = {
            "id": "evt_test129",
            "type": "unknown.event.type",
            "data": {"object": {}},
        }
        
        # Mock signature validation
        mock_services["stripe"].validate_webhook_signature.return_value = event
        
        # Make request
        response = test_client.post(
            "/api/webhooks/stripe",
            content=json.dumps(event),
            headers={
                "stripe-signature": "t=123,v1=abc123",
                "content-type": "application/json",
            },
        )
        
        # Assert response
        assert response.status_code == 200
        assert response.json()["message"] == "Unhandled event type: unknown.event.type"

    def test_webhook_error_handling(self, test_client, mock_services):
        """Test webhook error handling."""
        event = {
            "id": "evt_error",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_error",
                    "metadata": {"user_id": "user_123"},
                }
            },
        }
        
        # Mock signature validation
        mock_services["stripe"].validate_webhook_signature.return_value = event
        
        # Mock database error
        mock_services["db"].execute.side_effect = Exception("Database error")
        
        # Make request
        response = test_client.post(
            "/api/webhooks/stripe",
            content=json.dumps(event),
            headers={
                "stripe-signature": "t=123,v1=abc123",
                "content-type": "application/json",
            },
        )
        
        # Assert error response
        assert response.status_code == 500
        assert "Database error" in response.json()["error"]

    def test_webhook_retry_logic(self, test_client, mock_services):
        """Test webhook retry behavior on transient errors."""
        event = {
            "id": "evt_retry",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_retry",
                    "metadata": {
                        "type": "token_purchase",
                        "tokens": "500000",
                        "user_id": "user_123",
                    },
                }
            },
        }
        
        # Mock signature validation
        mock_services["stripe"].validate_webhook_signature.return_value = event
        
        # Mock no existing webhook
        mock_webhook_result = MagicMock()
        mock_webhook_result.scalar_one_or_none.return_value = None
        mock_services["db"].execute.return_value = mock_webhook_result
        
        # Mock token grant fails first time, succeeds on retry
        mock_services["token"].grant_tokens.side_effect = [
            Exception("Temporary error"),
            (True, 500000),
        ]
        
        # Make first request (should fail)
        response1 = test_client.post(
            "/api/webhooks/stripe",
            content=json.dumps(event),
            headers={
                "stripe-signature": "t=123,v1=abc123",
                "content-type": "application/json",
            },
        )
        
        # Assert first response failed
        assert response1.status_code == 500
        
        # Reset mock for second attempt
        mock_services["token"].grant_tokens.side_effect = None
        mock_services["token"].grant_tokens.return_value = (True, 500000)
        
        # Make second request (should succeed)
        response2 = test_client.post(
            "/api/webhooks/stripe",
            content=json.dumps(event),
            headers={
                "stripe-signature": "t=123,v1=abc123",
                "content-type": "application/json",
            },
        )
        
        # Assert second response succeeded
        assert response2.status_code == 200

    def test_webhook_missing_metadata(self, test_client, mock_services):
        """Test webhook handling with missing metadata."""
        event = {
            "id": "evt_test130",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_no_metadata",
                    "amount": 800,
                    "customer": "cus_test123",
                    "metadata": {},  # Empty metadata
                }
            },
        }
        
        # Mock signature validation
        mock_services["stripe"].validate_webhook_signature.return_value = event
        
        # Make request
        response = test_client.post(
            "/api/webhooks/stripe",
            content=json.dumps(event),
            headers={
                "stripe-signature": "t=123,v1=abc123",
                "content-type": "application/json",
            },
        )
        
        # Assert response - should handle gracefully
        assert response.status_code == 200
        
        # Verify no token grant was attempted (missing metadata)
        mock_services["token"].grant_tokens.assert_not_called()