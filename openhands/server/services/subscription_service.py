"""Subscription service for managing subscription lifecycle with proper proration."""

from enum import Enum
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from openhands.core.logger import openhands_logger as logger
from openhands.storage.database.models.subscription_models import (
    Subscription, SubscriptionPlan, TokenBalance, TokenTransaction
)
from openhands.storage.database.models import User, Team
from openhands.server.services.token_service import TokenService


class ProrationMode(Enum):
    IMMEDIATE_CREDIT = "immediate_credit"
    NEXT_CYCLE = "next_cycle"
    NO_PRORATION = "no_proration"


class SubscriptionService:
    """Manages subscription lifecycle with proper proration"""
    
    def __init__(self, db_session: AsyncSession, stripe_service, token_service: TokenService):
        self.db = db_session
        self.stripe = stripe_service
        self.tokens = token_service
    
    async def create_subscription(
        self,
        user_id: str,
        plan_id: str,
        payment_method_id: Optional[str] = None,
        team_id: Optional[str] = None,
        stripe_event_id: Optional[str] = None
    ) -> dict:
        """Create a new subscription with idempotency"""
        # Check for duplicate
        if stripe_event_id:
            existing_result = await self.db.execute(
                select(Subscription)
                .join(TokenTransaction)
                .filter(TokenTransaction.stripe_event_id == stripe_event_id)
            )
            if existing_result.scalar_one_or_none():
                return {'status': 'already_processed'}
        
        # Get plan details
        plan = await self._get_plan(plan_id)
        
        # Get or create Stripe customer
        customer_id = await self._ensure_stripe_customer(user_id, team_id)
        
        # Create Stripe subscription
        stripe_sub = await self.stripe.create_subscription(
            customer_id=customer_id,
            price_id=plan.stripe_price_id,
            payment_method_id=payment_method_id
        )
        
        # Create local subscription record
        subscription = Subscription(
            user_id=user_id if not team_id else None,
            team_id=team_id,
            plan_id=plan_id,
            stripe_subscription_id=stripe_sub.id,
            stripe_customer_id=customer_id,
            status=stripe_sub.status,
            current_period_start=datetime.fromtimestamp(stripe_sub.current_period_start),
            current_period_end=datetime.fromtimestamp(stripe_sub.current_period_end)
        )
        
        self.db.add(subscription)
        
        # Grant initial tokens
        await self.tokens.grant_subscription_tokens(
            user_id=user_id,
            team_id=team_id,
            tokens=plan.tokens_per_month,
            stripe_event_id=stripe_event_id
        )
        
        await self.db.commit()
        
        return {
            'subscription_id': str(subscription.id),
            'status': subscription.status,
            'plan': plan.display_name,
            'tokens_granted': plan.tokens_per_month
        }
    
    async def update_subscription(
        self,
        subscription_id: str,
        new_plan_id: str,
        proration_mode: ProrationMode = ProrationMode.IMMEDIATE_CREDIT
    ) -> dict:
        """
        Update subscription with proper token handling
        
        Proration modes:
        - IMMEDIATE_CREDIT: Adjust tokens immediately based on time remaining
        - NEXT_CYCLE: Change takes effect next billing cycle
        - NO_PRORATION: Change immediately, no token adjustment
        """
        async with self.db.begin():
            # Get current subscription with lock
            result = await self.db.execute(
                select(Subscription)
                .options(selectinload(Subscription.plan))
                .filter(Subscription.id == subscription_id)
                .with_for_update()
            )
            subscription = result.scalar_one()
            
            old_plan = subscription.plan
            new_plan = await self._get_plan(new_plan_id)
            
            token_adjustment = 0
            
            if proration_mode == ProrationMode.IMMEDIATE_CREDIT:
                # Calculate proration
                days_remaining = (subscription.current_period_end - datetime.utcnow()).days
                days_in_period = (subscription.current_period_end - subscription.current_period_start).days
                proration_factor = days_remaining / days_in_period if days_in_period > 0 else 0
                
                # Calculate token adjustment
                old_tokens_remaining = int(old_plan.tokens_per_month * proration_factor)
                new_tokens_remaining = int(new_plan.tokens_per_month * proration_factor)
                token_adjustment = new_tokens_remaining - old_tokens_remaining
                
                if token_adjustment != 0:
                    # Adjust tokens
                    await self._adjust_subscription_tokens(
                        subscription,
                        token_adjustment,
                        f"Plan change from {old_plan.display_name} to {new_plan.display_name}"
                    )
            
            # Update Stripe subscription
            stripe_sub = await self.stripe.update_subscription(
                subscription.stripe_subscription_id,
                new_price_id=new_plan.stripe_price_id,
                prorate=(proration_mode == ProrationMode.IMMEDIATE_CREDIT)
            )
            
            # Update local record
            subscription.plan_id = new_plan_id
            
            await self.db.commit()
            
            return {
                'status': 'updated',
                'old_plan': old_plan.display_name,
                'new_plan': new_plan.display_name,
                'proration_mode': proration_mode.value,
                'token_adjustment': token_adjustment
            }
    
    async def cancel_subscription(
        self,
        user_id: str,
        immediate: bool = False
    ) -> dict:
        """Cancel subscription"""
        subscription = await self.get_user_subscription(user_id)
        
        if not subscription:
            raise ValueError("No active subscription found")
        
        if immediate:
            # Cancel immediately
            await self.stripe.cancel_subscription(subscription.stripe_subscription_id)
            subscription.status = 'cancelled'
            subscription.cancelled_at = datetime.utcnow()
        else:
            # Cancel at period end
            await self.stripe.update_subscription(
                subscription.stripe_subscription_id,
                cancel_at_period_end=True
            )
            subscription.cancel_at_period_end = True
        
        await self.db.commit()
        
        return {
            'status': 'cancelled' if immediate else 'scheduled_for_cancellation',
            'effective_date': datetime.utcnow() if immediate else subscription.current_period_end
        }
    
    async def get_user_subscription(self, user_id: str) -> Optional[Subscription]:
        """Get user's active subscription"""
        result = await self.db.execute(
            select(Subscription)
            .options(selectinload(Subscription.plan))
            .filter(
                Subscription.user_id == user_id,
                Subscription.status.in_(['active', 'trialing'])
            )
        )
        return result.scalar_one_or_none()
    
    async def get_team_subscription(self, team_id: str) -> Optional[Subscription]:
        """Get team's active subscription"""
        result = await self.db.execute(
            select(Subscription)
            .options(selectinload(Subscription.plan))
            .filter(
                Subscription.team_id == team_id,
                Subscription.status.in_(['active', 'trialing'])
            )
        )
        return result.scalar_one_or_none()
    
    async def _get_plan(self, plan_id: str) -> SubscriptionPlan:
        """Get subscription plan by ID"""
        result = await self.db.execute(
            select(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id)
        )
        plan = result.scalar_one_or_none()
        if not plan:
            raise ValueError(f"Plan {plan_id} not found")
        return plan
    
    async def _ensure_stripe_customer(self, user_id: str, team_id: Optional[str] = None) -> str:
        """Ensure user/team has a Stripe customer ID"""
        if team_id:
            # Get team
            result = await self.db.execute(
                select(Team).filter(Team.id == team_id)
            )
            team = result.scalar_one()
            
            if team.stripe_customer_id:
                return team.stripe_customer_id
            
            # Create Stripe customer for team
            customer = await self.stripe.create_customer(
                email=team.billing_email,
                metadata={
                    'team_id': str(team_id),
                    'team_name': team.name
                }
            )
            
            team.stripe_customer_id = customer.id
            await self.db.commit()
            
            return customer.id
        else:
            # Get user
            result = await self.db.execute(
                select(User).filter(User.id == user_id)
            )
            user = result.scalar_one()
            
            if user.stripe_customer_id:
                return user.stripe_customer_id
            
            # Create Stripe customer for user
            customer = await self.stripe.create_customer(
                email=user.email,
                name=user.name,
                metadata={
                    'user_id': str(user_id)
                }
            )
            
            user.stripe_customer_id = customer.id
            await self.db.commit()
            
            return customer.id
    
    async def _adjust_subscription_tokens(
        self,
        subscription: Subscription,
        adjustment: int,
        description: str
    ):
        """Adjust subscription tokens (can be positive or negative)"""
        if subscription.team_id:
            result = await self.db.execute(
                select(TokenBalance)
                .filter(TokenBalance.team_id == subscription.team_id)
                .with_for_update()
            )
        else:
            result = await self.db.execute(
                select(TokenBalance)
                .filter(TokenBalance.user_id == subscription.user_id)
                .with_for_update()
            )
        
        balance = result.scalar_one()
        
        # Apply adjustment
        new_available = max(0, balance.subscription_tokens_available + adjustment)
        balance.subscription_tokens_available = new_available
        
        if adjustment > 0:
            balance.subscription_tokens_total += adjustment
        
        # Log transaction
        transaction = TokenTransaction(
            user_id=subscription.user_id,
            team_id=subscription.team_id,
            type='proration_adjustment',
            amount=adjustment,
            balance_after_subscription=balance.subscription_tokens_available,
            balance_after_topup=balance.topup_tokens_available,
            description=description
        )
        self.db.add(transaction)
    
    async def get_subscription_by_stripe_id(self, stripe_subscription_id: str) -> Optional[Subscription]:
        """Get subscription by Stripe ID"""
        result = await self.db.execute(
            select(Subscription)
            .options(selectinload(Subscription.plan))
            .filter(Subscription.stripe_subscription_id == stripe_subscription_id)
        )
        return result.scalar_one_or_none()
    
    async def update_subscription_status(
        self,
        subscription_id: str,
        status: str,
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None
    ):
        """Update subscription status and period dates"""
        updates = {'status': status}
        
        if period_start:
            updates['current_period_start'] = period_start
        if period_end:
            updates['current_period_end'] = period_end
        
        await self.db.execute(
            update(Subscription)
            .where(Subscription.id == subscription_id)
            .values(**updates)
        )
        await self.db.commit()
    
    async def get_available_plans(
        self, 
        plan_type: str = 'individual',
        billing_period: str = 'monthly'
    ) -> list:
        """Get available subscription plans"""
        result = await self.db.execute(
            select(SubscriptionPlan)
            .filter(
                SubscriptionPlan.type == plan_type,
                SubscriptionPlan.billing_period == billing_period,
                SubscriptionPlan.is_active == True
            )
            .order_by(SubscriptionPlan.sort_order, SubscriptionPlan.price_cents)
        )
        return result.scalars().all()