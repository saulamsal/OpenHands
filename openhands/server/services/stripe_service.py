"""Stripe service for payment processing and subscription management."""

import os
import stripe
from typing import Optional, Dict, Any
from datetime import datetime

from openhands.core.logger import openhands_logger as logger

# Initialize Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
stripe.api_version = '2023-10-16'


class StripeService:
    """Service for interacting with Stripe API"""
    
    def __init__(self):
        self.api_key = os.getenv('STRIPE_SECRET_KEY')
        if not self.api_key:
            raise ValueError("STRIPE_SECRET_KEY environment variable is not set")
        stripe.api_key = self.api_key
    
    async def create_customer(
        self,
        email: str,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> stripe.Customer:
        """Create a new Stripe customer"""
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata=metadata or {}
            )
            logger.info(f"Created Stripe customer {customer.id} for email {email}")
            return customer
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating customer: {str(e)}")
            raise
    
    async def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        payment_method_id: Optional[str] = None,
        trial_days: int = 0
    ) -> stripe.Subscription:
        """Create a new subscription"""
        try:
            params = {
                'customer': customer_id,
                'items': [{'price': price_id}],
                'expand': ['latest_invoice.payment_intent']
            }
            
            if payment_method_id:
                params['default_payment_method'] = payment_method_id
            
            if trial_days > 0:
                params['trial_period_days'] = trial_days
            
            subscription = stripe.Subscription.create(**params)
            logger.info(f"Created subscription {subscription.id} for customer {customer_id}")
            return subscription
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating subscription: {str(e)}")
            raise
    
    async def update_subscription(
        self,
        subscription_id: str,
        new_price_id: Optional[str] = None,
        cancel_at_period_end: Optional[bool] = None,
        prorate: bool = True
    ) -> stripe.Subscription:
        """Update an existing subscription"""
        try:
            params = {}
            
            if new_price_id:
                # Get current subscription
                subscription = stripe.Subscription.retrieve(subscription_id)
                
                # Cancel current items and add new one
                params['items'] = [{
                    'id': subscription['items']['data'][0].id,
                    'price': new_price_id
                }]
                params['proration_behavior'] = 'create_prorations' if prorate else 'none'
            
            if cancel_at_period_end is not None:
                params['cancel_at_period_end'] = cancel_at_period_end
            
            subscription = stripe.Subscription.modify(subscription_id, **params)
            logger.info(f"Updated subscription {subscription_id}")
            return subscription
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error updating subscription: {str(e)}")
            raise
    
    async def cancel_subscription(
        self,
        subscription_id: str,
        invoice_now: bool = False,
        prorate: bool = False
    ) -> stripe.Subscription:
        """Cancel a subscription immediately"""
        try:
            params = {}
            if invoice_now:
                params['invoice_now'] = True
            if prorate:
                params['prorate'] = True
            
            subscription = stripe.Subscription.delete(subscription_id, **params)
            logger.info(f"Cancelled subscription {subscription_id}")
            return subscription
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error cancelling subscription: {str(e)}")
            raise
    
    async def create_checkout_session(
        self,
        customer_id: str,
        mode: str,  # 'payment' or 'subscription'
        success_url: str,
        cancel_url: str,
        price_id: Optional[str] = None,
        line_items: Optional[list] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> stripe.checkout.Session:
        """Create a Stripe Checkout session"""
        try:
            params = {
                'customer': customer_id,
                'mode': mode,
                'success_url': success_url,
                'cancel_url': cancel_url,
                'metadata': metadata or {}
            }
            
            if price_id:
                params['line_items'] = [{
                    'price': price_id,
                    'quantity': 1
                }]
            elif line_items:
                params['line_items'] = line_items
            else:
                raise ValueError("Either price_id or line_items must be provided")
            
            session = stripe.checkout.Session.create(**params)
            logger.info(f"Created checkout session {session.id}")
            return session
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating checkout session: {str(e)}")
            raise
    
    async def create_portal_session(
        self,
        customer_id: str,
        return_url: str
    ) -> stripe.billing_portal.Session:
        """Create a customer portal session for managing subscriptions"""
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url
            )
            logger.info(f"Created portal session for customer {customer_id}")
            return session
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating portal session: {str(e)}")
            raise
    
    async def attach_payment_method(
        self,
        payment_method_id: str,
        customer_id: str
    ) -> stripe.PaymentMethod:
        """Attach a payment method to a customer"""
        try:
            payment_method = stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id
            )
            
            # Set as default payment method
            stripe.Customer.modify(
                customer_id,
                invoice_settings={'default_payment_method': payment_method_id}
            )
            
            logger.info(f"Attached payment method {payment_method_id} to customer {customer_id}")
            return payment_method
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error attaching payment method: {str(e)}")
            raise
    
    async def create_payment_intent(
        self,
        amount: int,  # Amount in cents
        currency: str = 'usd',
        customer_id: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> stripe.PaymentIntent:
        """Create a payment intent for one-time payments"""
        try:
            params = {
                'amount': amount,
                'currency': currency,
                'metadata': metadata or {}
            }
            
            if customer_id:
                params['customer'] = customer_id
            
            intent = stripe.PaymentIntent.create(**params)
            logger.info(f"Created payment intent {intent.id} for amount {amount}")
            return intent
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payment intent: {str(e)}")
            raise
    
    async def get_customer(self, customer_id: str) -> stripe.Customer:
        """Retrieve a customer"""
        try:
            return stripe.Customer.retrieve(customer_id)
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error retrieving customer: {str(e)}")
            raise
    
    async def get_subscription(self, subscription_id: str) -> stripe.Subscription:
        """Retrieve a subscription"""
        try:
            return stripe.Subscription.retrieve(subscription_id)
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error retrieving subscription: {str(e)}")
            raise
    
    async def list_prices(
        self,
        product_id: Optional[str] = None,
        active: bool = True,
        limit: int = 100
    ) -> list:
        """List prices, optionally filtered by product"""
        try:
            params = {
                'active': active,
                'limit': limit
            }
            
            if product_id:
                params['product'] = product_id
            
            prices = stripe.Price.list(**params)
            return prices.data
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error listing prices: {str(e)}")
            raise
    
    async def create_webhook_endpoint(
        self,
        url: str,
        events: list,
        description: Optional[str] = None
    ) -> stripe.WebhookEndpoint:
        """Create a webhook endpoint"""
        try:
            endpoint = stripe.WebhookEndpoint.create(
                url=url,
                enabled_events=events,
                description=description
            )
            logger.info(f"Created webhook endpoint {endpoint.id}")
            return endpoint
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating webhook endpoint: {str(e)}")
            raise
    
    @staticmethod
    def construct_webhook_event(
        payload: bytes,
        signature: str,
        webhook_secret: str
    ) -> stripe.Event:
        """Construct and verify a webhook event"""
        try:
            return stripe.Webhook.construct_event(
                payload, signature, webhook_secret
            )
        except ValueError as e:
            logger.error(f"Invalid webhook payload: {str(e)}")
            raise
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid webhook signature: {str(e)}")
            raise