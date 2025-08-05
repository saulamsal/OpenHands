"""SQLAlchemy models for subscription system."""

from datetime import datetime
from sqlalchemy import (
    Boolean, Column, String, Integer, BigInteger, Text, DateTime, 
    ForeignKey, CheckConstraint, UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from openhands.storage.database.db_models import Base


class SubscriptionPlan(Base):
    """Subscription plan model."""
    __tablename__ = 'subscription_plans'

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text('uuid_generate_v4()'))
    name = Column(String(50), nullable=False)
    display_name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)  # 'individual', 'team'
    billing_period = Column(String(20), nullable=False, server_default='monthly')
    price_cents = Column(Integer, nullable=False)
    tokens_per_month = Column(BigInteger, nullable=False)
    features = Column(JSONB, nullable=False, server_default='{}')
    stripe_price_id = Column(String(255), unique=True)
    stripe_product_id = Column(String(255))
    is_active = Column(Boolean, server_default='true')
    sort_order = Column(Integer, server_default='0')
    created_at = Column(DateTime(timezone=True), server_default=text('NOW()'))
    updated_at = Column(DateTime(timezone=True), server_default=text('NOW()'))

    # Relationships
    subscriptions = relationship('Subscription', back_populates='plan')

    __table_args__ = (
        UniqueConstraint('name', 'type', 'billing_period'),
    )


class Subscription(Base):
    """User or team subscription model."""
    __tablename__ = 'subscriptions'

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text('uuid_generate_v4()'))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'))
    team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id', ondelete='CASCADE'))
    plan_id = Column(UUID(as_uuid=True), ForeignKey('subscription_plans.id'))
    stripe_subscription_id = Column(String(255), unique=True)
    stripe_customer_id = Column(String(255))
    status = Column(String(50), nullable=False)
    current_period_start = Column(DateTime(timezone=True))
    current_period_end = Column(DateTime(timezone=True))
    cancel_at_period_end = Column(Boolean, server_default='false')
    cancelled_at = Column(DateTime(timezone=True))
    trial_end = Column(DateTime(timezone=True))
    extra_metadata = Column('metadata', JSONB, server_default='{}')
    created_at = Column(DateTime(timezone=True), server_default=text('NOW()'))
    updated_at = Column(DateTime(timezone=True), server_default=text('NOW()'))

    # Relationships
    user = relationship('User', back_populates='subscription')
    team = relationship('Team', back_populates='subscription')
    plan = relationship('SubscriptionPlan', back_populates='subscriptions')

    __table_args__ = (
        CheckConstraint(
            '(user_id IS NOT NULL AND team_id IS NULL) OR (user_id IS NULL AND team_id IS NOT NULL)',
            name='user_or_team'
        ),
        Index('idx_subscriptions_user_status', 'user_id', 'status'),
        Index('idx_subscriptions_team_status', 'team_id', 'status'),
        Index('idx_subscriptions_period_end', 'current_period_end', postgresql_where=text("status = 'active'")),
    )


class TokenBalance(Base):
    """Token balance for users and teams."""
    __tablename__ = 'token_balances'

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text('uuid_generate_v4()'))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), unique=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id', ondelete='CASCADE'), unique=True)
    subscription_tokens_available = Column(BigInteger, default=0, nullable=False)
    subscription_tokens_total = Column(BigInteger, default=0)
    topup_tokens_available = Column(BigInteger, default=0, nullable=False)
    last_reset_at = Column(DateTime(timezone=True), server_default=text('NOW()'))
    created_at = Column(DateTime(timezone=True), server_default=text('NOW()'))
    updated_at = Column(DateTime(timezone=True), server_default=text('NOW()'))
    version = Column(Integer, default=0)  # For optimistic locking

    # Relationships
    user = relationship('User', back_populates='token_balance')
    team = relationship('Team', back_populates='token_balance')

    __table_args__ = (
        CheckConstraint('subscription_tokens_available >= 0', name='subscription_tokens_available_positive'),
        CheckConstraint('topup_tokens_available >= 0', name='topup_tokens_available_positive'),
        CheckConstraint(
            '(user_id IS NOT NULL AND team_id IS NULL) OR (user_id IS NULL AND team_id IS NOT NULL)',
            name='user_or_team'
        ),
    )


class TokenTransaction(Base):
    """Token transaction log for audit trail."""
    __tablename__ = 'token_transactions'

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text('uuid_generate_v4()'))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id'))
    type = Column(String(50), nullable=False)
    amount = Column(BigInteger, nullable=False)
    balance_after_subscription = Column(BigInteger, nullable=False)
    balance_after_topup = Column(BigInteger, nullable=False)
    stripe_payment_intent_id = Column(String(255))
    stripe_invoice_id = Column(String(255))
    stripe_event_id = Column(String(255), unique=True)
    description = Column(Text)
    extra_metadata = Column('metadata', JSONB, server_default='{}')
    created_at = Column(DateTime(timezone=True), server_default=text('NOW()'))

    # Relationships
    user = relationship('User')
    team = relationship('Team')

    __table_args__ = (
        Index('idx_stripe_event_id', 'stripe_event_id'),
        Index('idx_token_transactions_user_created', 'user_id', 'created_at'),
    )


class TokenUsageLog(Base):
    """Detailed token usage tracking."""
    __tablename__ = 'token_usage_logs'

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text('uuid_generate_v4()'))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id'))
    conversation_id = Column(UUID(as_uuid=True), ForeignKey('conversations.id'))
    model = Column(String(100), nullable=False)
    input_tokens = Column(Integer, nullable=False)
    output_tokens = Column(Integer, nullable=False)
    tokens_deducted = Column(BigInteger, nullable=False)
    subscription_tokens_used = Column(BigInteger, default=0)
    topup_tokens_used = Column(BigInteger, default=0)
    raw_api_cost_cents = Column(Integer, nullable=False)
    charged_cost_cents = Column(Integer, nullable=False)
    extra_metadata = Column('metadata', JSONB, server_default='{}')
    created_at = Column(DateTime(timezone=True), server_default=text('NOW()'))

    # Relationships
    user = relationship('User')
    team = relationship('Team')
    conversation = relationship('ConversationDB')

    __table_args__ = (
        Index('idx_token_usage_logs_user_created', 'user_id', 'created_at'),
        Index('idx_token_usage_logs_team_created', 'team_id', 'created_at'),
        Index('idx_token_usage_logs_conversation', 'conversation_id', 'created_at'),
    )


class TeamMemberAllocation(Base):
    """Token allocation settings for team members."""
    __tablename__ = 'team_member_allocations'

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text('uuid_generate_v4()'))
    team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    allocation_type = Column(String(50), server_default='unlimited')
    allocation_value = Column(Integer)
    tokens_used_current_period = Column(BigInteger, server_default='0')
    last_reset_at = Column(DateTime(timezone=True), server_default=text('NOW()'))
    created_at = Column(DateTime(timezone=True), server_default=text('NOW()'))
    updated_at = Column(DateTime(timezone=True), server_default=text('NOW()'))

    # Relationships
    team = relationship('Team')
    user = relationship('User')

    __table_args__ = (
        UniqueConstraint('team_id', 'user_id'),
        Index('idx_team_member_allocations_team', 'team_id'),
    )


class StripeWebhookEvent(Base):
    """Stripe webhook event tracking for idempotency."""
    __tablename__ = 'stripe_webhook_events'

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text('uuid_generate_v4()'))
    stripe_event_id = Column(String(255), unique=True, nullable=False)
    type = Column(String(100), nullable=False)
    processed = Column(Boolean, server_default='false')
    payload = Column(JSONB, nullable=False)
    error = Column(Text)
    retry_count = Column(Integer, server_default='0')
    created_at = Column(DateTime(timezone=True), server_default=text('NOW()'))
    processed_at = Column(DateTime(timezone=True))

    __table_args__ = (
        Index('idx_type_processed', 'type', 'processed'),
        Index('idx_created_at', 'created_at'),
    )


class RateLimitTracking(Base):
    """Rate limit tracking for free tier users."""
    __tablename__ = 'rate_limit_tracking'

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text('uuid_generate_v4()'))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    ip_address = Column(INET, nullable=False)
    user_agent_hash = Column(String(64))
    action = Column(String(50), nullable=False)
    count = Column(Integer, server_default='1')
    window_start = Column(DateTime(timezone=True), server_default=text('NOW()'))
    created_at = Column(DateTime(timezone=True), server_default=text('NOW()'))

    # Relationships
    user = relationship('User')

    __table_args__ = (
        Index('idx_user_action_window', 'user_id', 'action', 'window_start'),
        Index('idx_ip_action_window', 'ip_address', 'action', 'window_start'),
    )