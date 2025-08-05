"""Data models for subscription system."""

from datetime import datetime
from typing import Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class SubscriptionPlan(BaseModel):
    """Represents a subscription plan."""
    id: str
    name: str  # 'basic', 'pro', 'max', 'ultra'
    display_name: str  # 'Basic', 'Pro', 'Max', 'Ultra'
    type: Literal['individual', 'team']
    billing_period: Literal['monthly', 'yearly'] = 'monthly'
    price_cents: int
    tokens_per_month: int
    features: Dict[str, Any] = Field(default_factory=dict)
    stripe_price_id: Optional[str] = None
    stripe_product_id: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Subscription(BaseModel):
    """Represents a user or team subscription."""
    id: str
    user_id: Optional[str] = None
    team_id: Optional[str] = None
    plan_id: str
    stripe_subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    status: Literal['trialing', 'active', 'cancelled', 'past_due', 'unpaid']
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    cancelled_at: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def is_active(self) -> bool:
        """Check if subscription is currently active."""
        return self.status == 'active' and not self.cancel_at_period_end

    @property
    def is_team_subscription(self) -> bool:
        """Check if this is a team subscription."""
        return self.team_id is not None


class TokenBalance(BaseModel):
    """Represents token balance for a user or team."""
    id: str
    user_id: Optional[str] = None
    team_id: Optional[str] = None
    subscription_tokens_available: int = 0
    subscription_tokens_total: int = 0
    topup_tokens_available: int = 0
    last_reset_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = 0  # For optimistic locking

    @property
    def total_available(self) -> int:
        """Get total available tokens."""
        return self.subscription_tokens_available + self.topup_tokens_available


class TokenTransaction(BaseModel):
    """Represents a token transaction (credit or debit)."""
    id: str
    user_id: Optional[str] = None
    team_id: Optional[str] = None
    type: Literal['subscription_grant', 'topup_purchase', 'subscription_reset', 'proration_adjustment']
    amount: int  # positive for credits, negative for debits
    balance_after_subscription: int
    balance_after_topup: int
    stripe_payment_intent_id: Optional[str] = None
    stripe_invoice_id: Optional[str] = None
    stripe_event_id: Optional[str] = None  # For webhook idempotency
    description: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TokenUsageLog(BaseModel):
    """Represents token usage for analytics."""
    id: str
    user_id: str
    team_id: Optional[str] = None
    conversation_id: Optional[str] = None
    model: str
    input_tokens: int
    output_tokens: int
    tokens_deducted: int
    subscription_tokens_used: int = 0
    topup_tokens_used: int = 0
    raw_api_cost_cents: int  # Actual API cost before markup
    charged_cost_cents: int  # Cost after markup
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TeamMemberAllocation(BaseModel):
    """Represents token allocation for a team member."""
    id: str
    team_id: str
    user_id: str
    allocation_type: Literal['unlimited', 'percentage', 'fixed', 'equal'] = 'unlimited'
    allocation_value: Optional[int] = None  # percentage (0-100) or fixed token amount
    tokens_used_current_period: int = 0
    last_reset_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class StripeWebhookEvent(BaseModel):
    """Represents a Stripe webhook event for tracking and idempotency."""
    id: str
    stripe_event_id: str
    type: str
    processed: bool = False
    payload: Dict[str, Any]
    error: Optional[str] = None
    retry_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None


class RateLimitTracking(BaseModel):
    """Represents rate limit tracking for free tier."""
    id: str
    user_id: Optional[str] = None
    ip_address: str
    user_agent_hash: Optional[str] = None
    action: str = 'free_prompt'
    count: int = 1
    window_start: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Request/Response models for API endpoints
class CreateSubscriptionRequest(BaseModel):
    """Request model for creating a subscription."""
    plan_id: str
    team_id: Optional[str] = None
    payment_method_id: Optional[str] = None


class UpdateSubscriptionRequest(BaseModel):
    """Request model for updating a subscription."""
    new_plan_id: str
    proration_mode: Literal['immediate_credit', 'next_cycle', 'no_proration'] = 'immediate_credit'


class CancelSubscriptionRequest(BaseModel):
    """Request model for cancelling a subscription."""
    immediate: bool = False  # If true, cancel immediately; if false, cancel at period end


class CreateTopupRequest(BaseModel):
    """Request model for creating a token top-up."""
    amount: int  # Amount in dollars (minimum $10, maximum $10,000)


class UpdateTeamMemberAllocationRequest(BaseModel):
    """Request model for updating team member token allocation."""
    user_id: str
    allocation_type: Literal['unlimited', 'percentage', 'fixed', 'equal']
    allocation_value: Optional[int] = None


# Response models
class SubscriptionResponse(BaseModel):
    """Response model for subscription details."""
    id: str
    plan_name: str
    status: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    tokens_per_month: int


class TokenBalanceResponse(BaseModel):
    """Response model for token balance."""
    subscription_tokens_available: int
    subscription_tokens_total: int
    topup_tokens_available: int
    total_available: int
    last_reset: Optional[datetime]


class UsageHistoryItem(BaseModel):
    """Single item in usage history."""
    id: str
    timestamp: datetime
    model: str
    input_tokens: int
    output_tokens: int
    tokens_deducted: int
    cost_cents: int
    conversation_id: Optional[str]