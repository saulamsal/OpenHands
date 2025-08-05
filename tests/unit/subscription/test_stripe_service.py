import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import stripe
import os

from openhands.server.services.stripe_service import StripeService


@pytest.fixture
def mock_stripe():
    """Mock stripe module."""
    with patch("openhands.server.services.stripe_service.stripe") as mock:
        yield mock


@pytest.fixture
def stripe_service(mock_stripe):
    """Create a StripeService instance with mock dependencies."""
    # Mock stripe API key and environment variable
    mock_stripe.api_key = "sk_test_123"
    with patch.dict('os.environ', {'STRIPE_SECRET_KEY': 'sk_test_123'}):
        return StripeService()


class TestStripeService:
    """Test cases for StripeService."""

    @pytest.mark.asyncio
    async def test_create_customer_success(self, stripe_service, mock_stripe):
        """Test successful customer creation."""
        email = "test@example.com"
        name = "Test User"
        user_id = "user_123"
        
        # Mock Stripe customer creation
        mock_customer = MagicMock()
        mock_customer.id = "cus_test123"
        mock_customer.email = email
        mock_customer.name = name
        mock_customer.metadata = {"user_id": user_id}
        
        mock_stripe.Customer.create.return_value = mock_customer
        
        # Call the method
        customer = await stripe_service.create_customer(
            email=email,
            name=name,
            metadata={"user_id": user_id},
        )
        
        # Assert results - the method returns the customer object
        assert customer.id == "cus_test123"
        assert customer.email == email
        assert customer.name == name
        
        # Verify Stripe was called correctly
        mock_stripe.Customer.create.assert_called_once_with(
            email=email,
            name=name,
            metadata={"user_id": user_id},
        )

    @pytest.mark.asyncio
    async def test_create_customer_error(self, stripe_service, mock_stripe):
        """Test customer creation with Stripe error."""
        email = "test@example.com"
        
        # Mock Stripe error - use Exception since we're mocking
        mock_stripe.Customer.create.side_effect = Exception("Customer creation failed")
        
        # Call the method and expect error
        with pytest.raises(Exception):
            await stripe_service.create_customer(email=email)

    @pytest.mark.asyncio
    async def test_create_subscription_success(self, stripe_service, mock_stripe):
        """Test successful subscription creation."""
        customer_id = "cus_test123"
        price_id = "price_test123"
        
        # Mock Stripe subscription
        mock_subscription = MagicMock()
        mock_subscription.id = "sub_test123"
        mock_subscription.status = "active"
        mock_subscription.current_period_start = 1234567890
        mock_subscription.current_period_end = 1237159890
        mock_subscription.cancel_at_period_end = False
        
        mock_stripe.Subscription.create.return_value = mock_subscription
        
        # Call the method
        subscription = await stripe_service.create_subscription(
            customer_id=customer_id,
            price_id=price_id,
        )
        
        # Assert results - returns the subscription object
        assert subscription.id == "sub_test123"
        assert subscription.status == "active"
        assert subscription.current_period_start == 1234567890
        
        # Verify Stripe was called correctly
        mock_stripe.Subscription.create.assert_called_once_with(
            customer=customer_id,
            items=[{"price": price_id}],
            expand=["latest_invoice.payment_intent"],
        )

    @pytest.mark.asyncio
    async def test_create_subscription_with_trial(self, stripe_service, mock_stripe):
        """Test subscription creation with trial period."""
        customer_id = "cus_test123"
        price_id = "price_test123"
        trial_days = 14
        
        # Mock Stripe subscription
        mock_subscription = MagicMock()
        mock_subscription.id = "sub_test123"
        mock_subscription.status = "trialing"
        mock_subscription.trial_end = 1235863890
        
        mock_stripe.Subscription.create.return_value = mock_subscription
        
        # Call the method
        subscription = await stripe_service.create_subscription(
            customer_id=customer_id,
            price_id=price_id,
            trial_days=trial_days,
        )
        
        # Assert results
        assert subscription.status == "trialing"
        
        # Verify trial period was set
        call_args = mock_stripe.Subscription.create.call_args[1]
        assert call_args["trial_period_days"] == trial_days

    @pytest.mark.asyncio
    async def test_update_subscription_success(self, stripe_service, mock_stripe):
        """Test successful subscription update."""
        subscription_id = "sub_test123"
        new_price_id = "price_pro123"
        
        # Mock existing subscription
        mock_existing_sub = {
            'items': {
                'data': [MagicMock(id="si_test123")]
            }
        }
        
        # Mock updated subscription
        mock_updated_sub = MagicMock()
        mock_updated_sub.id = subscription_id
        mock_updated_sub.status = "active"
        
        mock_stripe.Subscription.retrieve.return_value = mock_existing_sub
        mock_stripe.Subscription.modify.return_value = mock_updated_sub
        
        # Call the method
        updated_sub = await stripe_service.update_subscription(
            subscription_id=subscription_id,
            new_price_id=new_price_id,
            prorate=True,
        )
        
        # Assert results
        assert updated_sub.id == subscription_id
        
        # Verify Stripe calls
        mock_stripe.Subscription.retrieve.assert_called_once_with(subscription_id)
        mock_stripe.Subscription.modify.assert_called_once()

    @pytest.mark.asyncio
    async def test_cancel_subscription_immediate(self, stripe_service, mock_stripe):
        """Test immediate subscription cancellation."""
        subscription_id = "sub_test123"
        
        # Mock Stripe subscription
        mock_subscription = MagicMock()
        mock_subscription.id = subscription_id
        mock_subscription.status = "canceled"
        mock_subscription.canceled_at = 1234567890
        
        mock_stripe.Subscription.delete.return_value = mock_subscription
        
        # Call the method
        canceled_sub = await stripe_service.cancel_subscription(
            subscription_id=subscription_id,
            invoice_now=True,
            prorate=False,
        )
        
        # Assert results
        assert canceled_sub.status == "canceled"
        assert canceled_sub.canceled_at == 1234567890
        
        # Verify Stripe was called
        mock_stripe.Subscription.delete.assert_called_once_with(
            subscription_id, 
            invoice_now=True
        )

    @pytest.mark.asyncio
    async def test_create_payment_intent_success(self, stripe_service, mock_stripe):
        """Test successful payment intent creation."""
        amount_cents = 1000
        customer_id = "cus_test123"
        
        # Mock Stripe payment intent
        mock_intent = MagicMock()
        mock_intent.id = "pi_test123"
        mock_intent.client_secret = "pi_test123_secret"
        mock_intent.status = "requires_payment_method"
        
        mock_stripe.PaymentIntent.create.return_value = mock_intent
        
        # Call the method
        intent = await stripe_service.create_payment_intent(
            amount=amount_cents,
            customer_id=customer_id,
            metadata={"type": "token_purchase"},
        )
        
        # Assert results
        assert intent.id == "pi_test123"
        assert intent.client_secret == "pi_test123_secret"
        
        # Verify Stripe was called
        mock_stripe.PaymentIntent.create.assert_called_once_with(
            amount=amount_cents,
            currency="usd",
            customer=customer_id,
            metadata={"type": "token_purchase"},
        )

    @pytest.mark.asyncio
    async def test_get_customer_success(self, stripe_service, mock_stripe):
        """Test successful customer retrieval."""
        customer_id = "cus_test123"
        
        # Mock Stripe customer
        mock_customer = MagicMock()
        mock_customer.id = customer_id
        mock_customer.email = "test@example.com"
        mock_customer.name = "Test User"
        
        mock_stripe.Customer.retrieve.return_value = mock_customer
        
        # Call the method
        customer = await stripe_service.get_customer(customer_id)
        
        # Assert results
        assert customer.id == customer_id
        assert customer.email == "test@example.com"
        assert customer.name == "Test User"
        
        # Verify Stripe was called
        mock_stripe.Customer.retrieve.assert_called_once_with(customer_id)

    @pytest.mark.asyncio
    async def test_get_subscription_success(self, stripe_service, mock_stripe):
        """Test successful subscription retrieval."""
        subscription_id = "sub_test123"
        
        # Mock Stripe subscription
        mock_subscription = MagicMock()
        mock_subscription.id = subscription_id
        mock_subscription.status = "active"
        
        mock_stripe.Subscription.retrieve.return_value = mock_subscription
        
        # Call the method
        subscription = await stripe_service.get_subscription(subscription_id)
        
        # Assert results
        assert subscription.id == subscription_id
        assert subscription.status == "active"
        
        # Verify Stripe was called
        mock_stripe.Subscription.retrieve.assert_called_once_with(subscription_id)

    @pytest.mark.asyncio
    async def test_construct_webhook_event(self, stripe_service, mock_stripe):
        """Test webhook event construction."""
        payload = b'{"id": "evt_test123"}'
        signature = "t=123,v1=abc123"
        webhook_secret = "whsec_test123"
        
        # Mock event
        mock_event = {"id": "evt_test123", "type": "payment_intent.succeeded"}
        mock_stripe.Webhook.construct_event.return_value = mock_event
        
        # Call the static method
        event = StripeService.construct_webhook_event(
            payload, signature, webhook_secret
        )
        
        # Assert results
        assert event["id"] == "evt_test123"
        assert event["type"] == "payment_intent.succeeded"
        
        # Verify Stripe was called
        mock_stripe.Webhook.construct_event.assert_called_once_with(
            payload, signature, webhook_secret
        )

    @pytest.mark.asyncio
    async def test_construct_webhook_event_invalid_signature(self, stripe_service, mock_stripe):
        """Test webhook event construction with invalid signature."""
        payload = b'{"id": "evt_test123"}'
        signature = "invalid"
        webhook_secret = "whsec_test123"
        
        # Mock signature verification error
        mock_stripe.Webhook.construct_event.side_effect = Exception("Invalid signature")
        
        # Call the method and expect error
        with pytest.raises(Exception):
            StripeService.construct_webhook_event(
                payload, signature, webhook_secret
            )