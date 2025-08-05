"""Webhook handlers for Stripe events."""

from fastapi import APIRouter, Request, HTTPException, Header, Depends
import stripe
import json
import os
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from openhands.core.logger import openhands_logger as logger
from openhands.storage.database.session import get_async_session_context
from openhands.storage.database.models.subscription_models import (
    StripeWebhookEvent, Subscription, SubscriptionPlan
)
from openhands.server.services.token_service import TokenService
from openhands.server.services.subscription_service import SubscriptionService
from openhands.server.services.stripe_service import StripeService

app = APIRouter(prefix='/api')


class WebhookService:
    """Service for handling webhook events"""
    
    def __init__(self, db_session: AsyncSession, token_service: TokenService, subscription_service: SubscriptionService):
        self.db = db_session
        self.tokens = token_service
        self.subscriptions = subscription_service
    
    async def get_event(self, event_id: str) -> StripeWebhookEvent:
        """Get webhook event by Stripe event ID"""
        result = await self.db.execute(
            select(StripeWebhookEvent).filter(StripeWebhookEvent.stripe_event_id == event_id)
        )
        return result.scalar_one_or_none()
    
    async def save_event(self, event: StripeWebhookEvent):
        """Save webhook event"""
        self.db.add(event)
        await self.db.commit()
    
    async def mark_processed(self, event_id: str):
        """Mark event as processed"""
        event = await self.get_event(event_id)
        if event:
            event.processed = True
            event.processed_at = datetime.utcnow()
            await self.db.commit()
    
    async def save_error(self, event_id: str, error: str):
        """Save error for event"""
        event = await self.get_event(event_id)
        if event:
            event.error = error
            event.retry_count += 1
            await self.db.commit()
    
    async def handle_checkout_completed(self, event: dict):
        """Handle successful checkout"""
        session = event['data']['object']
        metadata = session.get('metadata', {})
        
        if metadata.get('type') == 'topup':
            # Handle top-up purchase
            user_id = metadata['user_id']
            tokens = int(metadata['tokens'])
            
            await self.tokens.add_topup_tokens(
                user_id=user_id,
                amount=tokens,
                stripe_payment_intent_id=session.get('payment_intent'),
                stripe_event_id=event['id']
            )
            
            logger.info(f"Processed top-up for user {user_id}: {tokens} tokens")
        
        elif metadata.get('plan_id'):
            # Handle subscription creation
            await self.subscriptions.create_subscription(
                user_id=metadata['user_id'],
                plan_id=metadata['plan_id'],
                team_id=metadata.get('team_id') if metadata.get('team_id') else None,
                stripe_event_id=event['id']
            )
            
            logger.info(f"Processed subscription for user {metadata['user_id']}")
    
    async def handle_subscription_created(self, event: dict):
        """Handle subscription created event"""
        stripe_sub = event['data']['object']
        
        # Find local subscription by Stripe ID
        subscription = await self.subscriptions.get_subscription_by_stripe_id(stripe_sub['id'])
        
        if subscription:
            # Update subscription status
            await self.subscriptions.update_subscription_status(
                subscription_id=str(subscription.id),
                status=stripe_sub['status'],
                period_start=datetime.fromtimestamp(stripe_sub['current_period_start']),
                period_end=datetime.fromtimestamp(stripe_sub['current_period_end'])
            )
            
            logger.info(f"Updated subscription {subscription.id} status to {stripe_sub['status']}")
    
    async def handle_subscription_updated(self, event: dict):
        """Handle subscription updated event"""
        stripe_sub = event['data']['object']
        
        subscription = await self.subscriptions.get_subscription_by_stripe_id(stripe_sub['id'])
        
        if subscription:
            # Update subscription status and dates
            await self.subscriptions.update_subscription_status(
                subscription_id=str(subscription.id),
                status=stripe_sub['status'],
                period_start=datetime.fromtimestamp(stripe_sub['current_period_start']),
                period_end=datetime.fromtimestamp(stripe_sub['current_period_end'])
            )
            
            # Check if plan changed
            if 'items' in stripe_sub and stripe_sub['items']['data']:
                new_price_id = stripe_sub['items']['data'][0]['price']['id']
                
                # Find plan by Stripe price ID
                plan_result = await self.db.execute(
                    select(SubscriptionPlan).filter(SubscriptionPlan.stripe_price_id == new_price_id)
                )
                new_plan = plan_result.scalar_one_or_none()
                
                if new_plan and new_plan.id != subscription.plan_id:
                    # Plan changed - update tokens
                    subscription.plan_id = new_plan.id
                    await self.db.commit()
                    
                    logger.info(f"Updated subscription {subscription.id} to plan {new_plan.name}")
    
    async def handle_subscription_deleted(self, event: dict):
        """Handle subscription cancelled/deleted event"""
        stripe_sub = event['data']['object']
        
        subscription = await self.subscriptions.get_subscription_by_stripe_id(stripe_sub['id'])
        
        if subscription:
            subscription.status = 'cancelled'
            subscription.cancelled_at = datetime.utcnow()
            await self.db.commit()
            
            logger.info(f"Cancelled subscription {subscription.id}")
    
    async def handle_invoice_paid(self, event: dict):
        """Handle successful subscription renewal"""
        invoice = event['data']['object']
        
        if invoice['billing_reason'] in ['subscription_cycle', 'subscription_update']:
            # Find subscription
            subscription = await self.subscriptions.get_subscription_by_stripe_id(
                invoice['subscription']
            )
            
            if subscription:
                # Update period dates
                subscription.current_period_start = datetime.fromtimestamp(
                    invoice['period_start']
                )
                subscription.current_period_end = datetime.fromtimestamp(
                    invoice['period_end']
                )
                
                # Reset tokens for new period
                await self.tokens.reset_subscription_tokens_for_subscription(
                    subscription,
                    stripe_event_id=event['id']
                )
                
                await self.db.commit()
                
                logger.info(f"Processed renewal for subscription {subscription.id}")
    
    async def handle_invoice_failed(self, event: dict):
        """Handle failed payment"""
        invoice = event['data']['object']
        
        subscription = await self.subscriptions.get_subscription_by_stripe_id(
            invoice['subscription']
        )
        
        if subscription:
            subscription.status = 'past_due'
            await self.db.commit()
            
            logger.info(f"Marked subscription {subscription.id} as past due")
    
    async def handle_trial_ending(self, event: dict):
        """Handle trial ending notification"""
        stripe_sub = event['data']['object']
        
        subscription = await self.subscriptions.get_subscription_by_stripe_id(stripe_sub['id'])
        
        if subscription:
            # TODO: Send email notification about trial ending
            logger.info(f"Trial ending for subscription {subscription.id}")


async def get_webhook_service():
    """Get webhook service instance."""
    async with get_async_session_context() as db:
        stripe_service = StripeService()
        token_service = TokenService(db)
        subscription_service = SubscriptionService(db, stripe_service, token_service)
        yield WebhookService(db, token_service, subscription_service)


@app.post('/webhooks/stripe')
async def handle_stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    webhook_service: WebhookService = Depends(get_webhook_service)
):
    """Handle Stripe webhook events with idempotency"""
    payload = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, os.getenv('STRIPE_WEBHOOK_SECRET')
        )
    except ValueError:
        logger.error("Invalid webhook payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid webhook signature")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Log the event
    webhook_event = StripeWebhookEvent(
        stripe_event_id=event['id'],
        type=event['type'],
        payload=event
    )
    
    try:
        # Check if already processed
        existing = await webhook_service.get_event(event['id'])
        if existing and existing.processed:
            logger.info(f"Webhook {event['id']} already processed")
            return {"status": "already_processed"}
        
        # Save event if new
        if not existing:
            await webhook_service.save_event(webhook_event)
        
        # Process based on event type
        handlers = {
            'customer.subscription.created': webhook_service.handle_subscription_created,
            'customer.subscription.updated': webhook_service.handle_subscription_updated,
            'customer.subscription.deleted': webhook_service.handle_subscription_deleted,
            'invoice.payment_succeeded': webhook_service.handle_invoice_paid,
            'invoice.payment_failed': webhook_service.handle_invoice_failed,
            'checkout.session.completed': webhook_service.handle_checkout_completed,
            'customer.subscription.trial_will_end': webhook_service.handle_trial_ending,
        }
        
        handler = handlers.get(event['type'])
        if handler:
            await handler(event)
            
        # Mark as processed
        await webhook_service.mark_processed(event['id'])
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Webhook processing error: {str(e)}")
        # Save error for debugging
        await webhook_service.save_error(event['id'], str(e))
        # Return 200 to prevent Stripe retries for non-recoverable errors
        if "duplicate" in str(e).lower():
            return {"status": "duplicate_ignored"}
        # For other errors, return 500 to trigger Stripe retry
        raise HTTPException(status_code=500, detail="Processing failed")