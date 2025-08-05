"""Token service for managing token balances and consumption with concurrency safety."""

import os
import asyncio
from typing import Optional, Tuple, Dict, Any
from datetime import datetime
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from openhands.core.logger import openhands_logger as logger
from openhands.storage.database.models.subscription_models import (
    TokenBalance, TokenUsageLog, TokenTransaction, TeamMemberAllocation,
    Subscription, SubscriptionPlan
)
from openhands.storage.database.models import User, Team


# Configuration from environment
SUBSCRIPTION_TOKEN_PRICE = float(os.getenv('SUBSCRIPTION_TOKEN_PRICE', '0.000005'))  # $5/M tokens
TOPUP_TOKEN_PRICE = float(os.getenv('TOPUP_TOKEN_PRICE', '0.000008'))  # $8/M tokens
PROFIT_MARKUP = float(os.getenv('PROFIT_MARKUP', '3.0'))  # 3x markup

# Base costs (per million tokens) - store in database for easy updates
MODEL_COSTS = {
    'claude-3-5-sonnet-20241022': {
        'input': 3.00,   # $3/M input tokens
        'output': 15.00  # $15/M output tokens
    },
    'gpt-4-turbo': {
        'input': 10.00,
        'output': 30.00
    },
    'gpt-3.5-turbo': {
        'input': 0.50,
        'output': 1.50
    },
    'gpt-4o': {
        'input': 5.00,
        'output': 15.00
    },
    'o1-preview': {
        'input': 15.00,
        'output': 60.00
    },
    'o1': {
        'input': 15.00,
        'output': 60.00
    },
    'o3': {
        'input': 20.00,
        'output': 80.00
    },
    'o3-mini': {
        'input': 5.00,
        'output': 20.00
    }
}


def calculate_tokens_to_deduct(
    model: str, 
    input_tokens: int, 
    output_tokens: int,
    is_topup: bool = False
) -> Tuple[int, float]:
    """
    Calculate tokens to deduct from user balance
    Returns: (tokens_to_deduct, actual_api_cost_cents)
    """
    if model not in MODEL_COSTS:
        # Default to a reasonable cost for unknown models
        base_cost = {'input': 5.00, 'output': 15.00}
    else:
        base_cost = MODEL_COSTS[model]
    
    # Calculate actual API cost in dollars
    api_cost = (
        input_tokens * base_cost['input'] / 1_000_000 + 
        output_tokens * base_cost['output'] / 1_000_000
    )
    
    # Apply markup
    charged_cost = api_cost * PROFIT_MARKUP
    
    # Convert to tokens based on token type
    token_price = TOPUP_TOKEN_PRICE if is_topup else SUBSCRIPTION_TOKEN_PRICE
    tokens_to_deduct = int(charged_cost / token_price)
    
    # Always deduct at least 1 token to prevent free usage
    tokens_to_deduct = max(1, tokens_to_deduct)
    
    # Return tokens and actual cost in cents for analytics
    return tokens_to_deduct, int(api_cost * 100)


class TokenService:
    """Manages token balances and consumption with concurrency safety"""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        
    async def deduct_tokens(
        self, 
        user_id: str, 
        tokens_to_deduct: int,
        model: str,
        conversation_id: Optional[str] = None,
        input_tokens: int = 0,
        output_tokens: int = 0,
        retry_attempts: int = 3
    ) -> Tuple[bool, str, Optional[dict]]:
        """
        Deduct tokens from user balance with retry logic for concurrent access
        Returns (success, message, usage_details)
        """
        for attempt in range(retry_attempts):
            try:
                async with self.db.begin():
                    # Get user's team if any
                    team_id = await self._get_user_team_id(user_id)
                    
                    # Lock the balance row for update
                    if team_id:
                        balance_result = await self.db.execute(
                            select(TokenBalance)
                            .filter(TokenBalance.team_id == team_id)
                            .with_for_update()
                        )
                    else:
                        balance_result = await self.db.execute(
                            select(TokenBalance)
                            .filter(TokenBalance.user_id == user_id)
                            .with_for_update()
                        )
                    
                    balance = balance_result.scalar_one_or_none()
                    
                    if not balance:
                        # Create balance if doesn't exist
                        balance = TokenBalance(
                            user_id=user_id if not team_id else None,
                            team_id=team_id
                        )
                        self.db.add(balance)
                        await self.db.flush()
                    
                    # Check team member limits if applicable
                    if team_id:
                        can_use, limit_msg = await self._check_team_member_limit(
                            team_id, user_id, tokens_to_deduct
                        )
                        if not can_use:
                            return False, limit_msg, None
                    
                    # Calculate available tokens
                    total_available = (
                        balance.subscription_tokens_available +
                        balance.topup_tokens_available
                    )
                    
                    if total_available < tokens_to_deduct:
                        return False, f"Insufficient tokens. Required: {tokens_to_deduct:,}, Available: {total_available:,}", None
                    
                    # Deduct from subscription tokens first
                    subscription_deduction = min(
                        tokens_to_deduct,
                        balance.subscription_tokens_available
                    )
                    
                    topup_deduction = tokens_to_deduct - subscription_deduction
                    
                    # Update balance atomically
                    balance.subscription_tokens_available -= subscription_deduction
                    balance.topup_tokens_available -= topup_deduction
                    balance.version += 1  # Increment version for optimistic locking
                    
                    # Calculate costs
                    raw_cost_cents, charged_cost_cents = self._calculate_costs(
                        model, input_tokens, output_tokens
                    )
                    
                    # Log usage
                    usage_log = TokenUsageLog(
                        user_id=user_id,
                        team_id=team_id,
                        conversation_id=conversation_id,
                        model=model,
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                        tokens_deducted=tokens_to_deduct,
                        subscription_tokens_used=subscription_deduction,
                        topup_tokens_used=topup_deduction,
                        raw_api_cost_cents=raw_cost_cents,
                        charged_cost_cents=charged_cost_cents
                    )
                    self.db.add(usage_log)
                    
                    # Update team member usage if applicable
                    if team_id:
                        await self._update_team_member_usage(
                            team_id, user_id, tokens_to_deduct
                        )
                    
                    # Commit the transaction
                    await self.db.commit()
                    
                    usage_details = {
                        'tokens_deducted': tokens_to_deduct,
                        'subscription_used': subscription_deduction,
                        'topup_used': topup_deduction,
                        'remaining_total': total_available - tokens_to_deduct,
                        'raw_cost_cents': raw_cost_cents,
                        'charged_cost_cents': charged_cost_cents
                    }
                    
                    return True, "Tokens deducted successfully", usage_details
                    
            except IntegrityError:
                # Optimistic locking conflict - retry
                if attempt < retry_attempts - 1:
                    await asyncio.sleep(0.1 * (attempt + 1))  # Exponential backoff
                    continue
                else:
                    return False, "Token deduction failed due to concurrent access", None
            except Exception as e:
                logger.error(f"Token deduction error: {str(e)}")
                return False, f"Token deduction error: {str(e)}", None
        
        return False, "Token deduction failed after retries", None
    
    def _calculate_costs(self, model: str, input_tokens: int, output_tokens: int) -> Tuple[int, int]:
        """Calculate raw API cost and charged cost in cents"""
        tokens_to_deduct, raw_cost_cents = calculate_tokens_to_deduct(
            model, input_tokens, output_tokens
        )
        charged_cost_cents = int(raw_cost_cents * PROFIT_MARKUP)
        return raw_cost_cents, charged_cost_cents
    
    async def _get_user_team_id(self, user_id: str) -> Optional[str]:
        """Get the user's active team ID if any"""
        # TODO: Implement logic to get user's active team
        # For now, return None (individual subscription)
        return None
    
    async def _check_team_member_limit(
        self, team_id: str, user_id: str, tokens_needed: int
    ) -> Tuple[bool, str]:
        """Check if team member can use the requested tokens"""
        allocation_result = await self.db.execute(
            select(TeamMemberAllocation)
            .filter(
                TeamMemberAllocation.team_id == team_id,
                TeamMemberAllocation.user_id == user_id
            )
        )
        allocation = allocation_result.scalar_one_or_none()
        
        if not allocation or allocation.allocation_type == 'unlimited':
            return True, ""
        
        # Get team balance
        balance_result = await self.db.execute(
            select(TokenBalance).filter(TokenBalance.team_id == team_id)
        )
        balance = balance_result.scalar_one()
        
        total_available = balance.subscription_tokens_available + balance.topup_tokens_available
        
        if allocation.allocation_type == 'equal':
            # Get active member count
            team_result = await self.db.execute(
                select(Team).filter(Team.id == team_id)
            )
            team = team_result.scalar_one()
            member_limit = total_available // max(team.active_member_count, 1)
        elif allocation.allocation_type == 'percentage':
            member_limit = int(total_available * allocation.allocation_value / 100)
        elif allocation.allocation_type == 'fixed':
            member_limit = allocation.allocation_value
        else:
            return False, "Invalid allocation type"
        
        if allocation.tokens_used_current_period + tokens_needed > member_limit:
            return False, f"Token limit exceeded. Used: {allocation.tokens_used_current_period:,}, Limit: {member_limit:,}"
        
        return True, ""
    
    async def _update_team_member_usage(
        self, team_id: str, user_id: str, tokens_used: int
    ):
        """Update team member's token usage tracking"""
        await self.db.execute(
            update(TeamMemberAllocation)
            .where(
                TeamMemberAllocation.team_id == team_id,
                TeamMemberAllocation.user_id == user_id
            )
            .values(
                tokens_used_current_period=TeamMemberAllocation.tokens_used_current_period + tokens_used,
                updated_at=datetime.utcnow()
            )
        )
    
    async def get_balance(self, user_id: str) -> dict:
        """Get user's current token balance"""
        team_id = await self._get_user_team_id(user_id)
        
        if team_id:
            balance_result = await self.db.execute(
                select(TokenBalance).filter(TokenBalance.team_id == team_id)
            )
        else:
            balance_result = await self.db.execute(
                select(TokenBalance).filter(TokenBalance.user_id == user_id)
            )
        
        balance = balance_result.scalar_one_or_none()
        
        if not balance:
            return {
                'subscription_tokens_available': 0,
                'topup_tokens_available': 0,
                'total_available': 0,
                'subscription_tokens_total': 0,
                'last_reset': None
            }
        
        return {
            'subscription_tokens_available': balance.subscription_tokens_available,
            'topup_tokens_available': balance.topup_tokens_available,
            'total_available': (
                balance.subscription_tokens_available + 
                balance.topup_tokens_available
            ),
            'subscription_tokens_total': balance.subscription_tokens_total,
            'last_reset': balance.last_reset_at
        }
    
    async def add_topup_tokens(
        self, 
        user_id: str, 
        amount: int,
        stripe_payment_intent_id: Optional[str] = None,
        stripe_event_id: Optional[str] = None
    ) -> bool:
        """Add top-up tokens to user balance with idempotency check"""
        # Check for duplicate event
        if stripe_event_id:
            existing_result = await self.db.execute(
                select(TokenTransaction)
                .filter(TokenTransaction.stripe_event_id == stripe_event_id)
            )
            if existing_result.scalar_one_or_none():
                logger.info(f"Skipping duplicate token grant for event {stripe_event_id}")
                return True
        
        async with self.db.begin():
            team_id = await self._get_user_team_id(user_id)
            
            # Lock and update balance
            if team_id:
                balance_result = await self.db.execute(
                    select(TokenBalance)
                    .filter(TokenBalance.team_id == team_id)
                    .with_for_update()
                )
            else:
                balance_result = await self.db.execute(
                    select(TokenBalance)
                    .filter(TokenBalance.user_id == user_id)
                    .with_for_update()
                )
            
            balance = balance_result.scalar_one_or_none()
            
            if not balance:
                balance = TokenBalance(
                    user_id=user_id if not team_id else None,
                    team_id=team_id,
                    topup_tokens_available=amount
                )
                self.db.add(balance)
            else:
                balance.topup_tokens_available += amount
            
            # Log transaction
            transaction = TokenTransaction(
                user_id=user_id,
                team_id=team_id,
                type='topup_purchase',
                amount=amount,
                balance_after_subscription=balance.subscription_tokens_available,
                balance_after_topup=balance.topup_tokens_available,
                stripe_payment_intent_id=stripe_payment_intent_id,
                stripe_event_id=stripe_event_id,
                description=f"Top-up purchase: {amount:,} tokens"
            )
            self.db.add(transaction)
            
            await self.db.commit()
            return True
    
    async def grant_subscription_tokens(
        self,
        user_id: Optional[str],
        team_id: Optional[str],
        tokens: int,
        stripe_event_id: Optional[str] = None
    ) -> bool:
        """Grant subscription tokens with idempotency check"""
        # Check for duplicate event
        if stripe_event_id:
            existing_result = await self.db.execute(
                select(TokenTransaction)
                .filter(TokenTransaction.stripe_event_id == stripe_event_id)
            )
            if existing_result.scalar_one_or_none():
                logger.info(f"Skipping duplicate subscription grant for event {stripe_event_id}")
                return True
        
        async with self.db.begin():
            # Lock and update balance
            if team_id:
                balance_result = await self.db.execute(
                    select(TokenBalance)
                    .filter(TokenBalance.team_id == team_id)
                    .with_for_update()
                )
            else:
                balance_result = await self.db.execute(
                    select(TokenBalance)
                    .filter(TokenBalance.user_id == user_id)
                    .with_for_update()
                )
            
            balance = balance_result.scalar_one_or_none()
            
            if not balance:
                balance = TokenBalance(
                    user_id=user_id,
                    team_id=team_id,
                    subscription_tokens_available=tokens,
                    subscription_tokens_total=tokens
                )
                self.db.add(balance)
            else:
                balance.subscription_tokens_available = tokens
                balance.subscription_tokens_total = tokens
                balance.last_reset_at = datetime.utcnow()
            
            # Log transaction
            transaction = TokenTransaction(
                user_id=user_id,
                team_id=team_id,
                type='subscription_grant',
                amount=tokens,
                balance_after_subscription=balance.subscription_tokens_available,
                balance_after_topup=balance.topup_tokens_available,
                stripe_event_id=stripe_event_id,
                description=f"Subscription tokens granted: {tokens:,}"
            )
            self.db.add(transaction)
            
            await self.db.commit()
            return True
    
    async def reset_subscription_tokens(self, batch_size: int = 100):
        """
        Reset subscription tokens for all active subscriptions
        Designed to be idempotent and resumable
        """
        last_processed_id = None
        total_processed = 0
        
        while True:
            async with self.db.begin():
                # Get batch of subscriptions needing reset
                query = (
                    select(Subscription)
                    .options(selectinload(Subscription.plan))
                    .filter(
                        Subscription.status == 'active',
                        Subscription.current_period_end <= datetime.utcnow()
                    )
                    .order_by(Subscription.id)
                    .limit(batch_size)
                )
                
                if last_processed_id:
                    query = query.filter(Subscription.id > last_processed_id)
                
                result = await self.db.execute(query)
                subscriptions = result.scalars().all()
                
                if not subscriptions:
                    break
                
                for sub in subscriptions:
                    # Get balance with lock
                    if sub.team_id:
                        balance_result = await self.db.execute(
                            select(TokenBalance)
                            .filter(TokenBalance.team_id == sub.team_id)
                            .with_for_update()
                        )
                    else:
                        balance_result = await self.db.execute(
                            select(TokenBalance)
                            .filter(TokenBalance.user_id == sub.user_id)
                            .with_for_update()
                        )
                    
                    balance = balance_result.scalar_one_or_none()
                    
                    if not balance:
                        balance = TokenBalance(
                            user_id=sub.user_id,
                            team_id=sub.team_id,
                            subscription_tokens_available=sub.plan.tokens_per_month,
                            subscription_tokens_total=sub.plan.tokens_per_month
                        )
                        self.db.add(balance)
                    else:
                        # Only reset if it hasn't been reset for this period
                        if balance.last_reset_at < sub.current_period_start:
                            old_available = balance.subscription_tokens_available
                            balance.subscription_tokens_available = sub.plan.tokens_per_month
                            balance.subscription_tokens_total = sub.plan.tokens_per_month
                            balance.last_reset_at = datetime.utcnow()
                            
                            # Log the reset
                            transaction = TokenTransaction(
                                user_id=sub.user_id,
                                team_id=sub.team_id,
                                type='subscription_reset',
                                amount=sub.plan.tokens_per_month - old_available,
                                balance_after_subscription=balance.subscription_tokens_available,
                                balance_after_topup=balance.topup_tokens_available,
                                description=f"Monthly subscription reset for {sub.plan.display_name}"
                            )
                            self.db.add(transaction)
                    
                    # Reset team member usage counters
                    if sub.team_id:
                        await self.db.execute(
                            update(TeamMemberAllocation)
                            .where(TeamMemberAllocation.team_id == sub.team_id)
                            .values(
                                tokens_used_current_period=0,
                                last_reset_at=datetime.utcnow()
                            )
                        )
                    
                    last_processed_id = sub.id
                    total_processed += 1
                
                await self.db.commit()
                
                logger.info(f"Reset tokens for {len(subscriptions)} subscriptions")
        
        logger.info(f"Token reset complete. Total processed: {total_processed}")
    
    async def get_usage_history(
        self, user_id: str, limit: int = 100, offset: int = 0
    ) -> list:
        """Get token usage history for a user"""
        team_id = await self._get_user_team_id(user_id)
        
        query = (
            select(TokenUsageLog)
            .filter(TokenUsageLog.user_id == user_id)
            .order_by(TokenUsageLog.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        
        if team_id:
            query = query.filter(TokenUsageLog.team_id == team_id)
        
        result = await self.db.execute(query)
        usage_logs = result.scalars().all()
        
        return [
            {
                'id': str(log.id),
                'timestamp': log.created_at,
                'model': log.model,
                'input_tokens': log.input_tokens,
                'output_tokens': log.output_tokens,
                'tokens_deducted': log.tokens_deducted,
                'cost_cents': log.charged_cost_cents,
                'conversation_id': str(log.conversation_id) if log.conversation_id else None
            }
            for log in usage_logs
        ]
    
    async def reset_subscription_tokens_for_subscription(
        self, subscription: Subscription, stripe_event_id: Optional[str] = None
    ):
        """Reset tokens for a specific subscription"""
        # Check for duplicate event
        if stripe_event_id:
            existing_result = await self.db.execute(
                select(TokenTransaction)
                .filter(TokenTransaction.stripe_event_id == stripe_event_id)
            )
            if existing_result.scalar_one_or_none():
                logger.info(f"Skipping duplicate token reset for event {stripe_event_id}")
                return True
        
        await self.grant_subscription_tokens(
            user_id=subscription.user_id,
            team_id=subscription.team_id,
            tokens=subscription.plan.tokens_per_month,
            stripe_event_id=stripe_event_id
        )