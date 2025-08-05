"""Add subscription system tables

Revision ID: subscription_system_001
Revises: e6399ae08c60
Create Date: 2025-08-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'subscription_system_001'
down_revision = 'e6399ae08c60'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create subscription_plans table
    op.create_table('subscription_plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('display_name', sa.String(100), nullable=False),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('billing_period', sa.String(20), nullable=False, server_default='monthly'),
        sa.Column('price_cents', sa.Integer(), nullable=False),
        sa.Column('tokens_per_month', sa.BigInteger(), nullable=False),
        sa.Column('features', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('stripe_price_id', sa.String(255), nullable=True),
        sa.Column('stripe_product_id', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('sort_order', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stripe_price_id'),
        sa.UniqueConstraint('name', 'type', 'billing_period')
    )

    # Create subscriptions table
    op.create_table('subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('team_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('plan_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('stripe_subscription_id', sa.String(255), nullable=True),
        sa.Column('stripe_customer_id', sa.String(255), nullable=True),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancel_at_period_end', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('trial_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=True),
        sa.CheckConstraint('(user_id IS NOT NULL AND team_id IS NULL) OR (user_id IS NULL AND team_id IS NOT NULL)', name='user_or_team'),
        sa.ForeignKeyConstraint(['plan_id'], ['subscription_plans.id'], ),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stripe_subscription_id')
    )

    # Create token_balances table
    op.create_table('token_balances',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('team_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('subscription_tokens_available', sa.BigInteger(), nullable=True, server_default='0'),
        sa.Column('subscription_tokens_total', sa.BigInteger(), nullable=True, server_default='0'),
        sa.Column('topup_tokens_available', sa.BigInteger(), nullable=True, server_default='0'),
        sa.Column('last_reset_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=True),
        sa.Column('version', sa.Integer(), nullable=True, server_default='0'),
        sa.CheckConstraint('(user_id IS NOT NULL AND team_id IS NULL) OR (user_id IS NULL AND team_id IS NOT NULL)', name='user_or_team'),
        sa.CheckConstraint('subscription_tokens_available >= 0', name='subscription_tokens_available_positive'),
        sa.CheckConstraint('topup_tokens_available >= 0', name='topup_tokens_available_positive'),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('team_id'),
        sa.UniqueConstraint('user_id')
    )

    # Create token_transactions table
    op.create_table('token_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('team_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('amount', sa.BigInteger(), nullable=False),
        sa.Column('balance_after_subscription', sa.BigInteger(), nullable=False),
        sa.Column('balance_after_topup', sa.BigInteger(), nullable=False),
        sa.Column('stripe_payment_intent_id', sa.String(255), nullable=True),
        sa.Column('stripe_invoice_id', sa.String(255), nullable=True),
        sa.Column('stripe_event_id', sa.String(255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=True),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stripe_event_id')
    )
    op.create_index('idx_stripe_event_id', 'token_transactions', ['stripe_event_id'], unique=False)

    # Create token_usage_logs table
    op.create_table('token_usage_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('team_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('model', sa.String(100), nullable=False),
        sa.Column('input_tokens', sa.Integer(), nullable=False),
        sa.Column('output_tokens', sa.Integer(), nullable=False),
        sa.Column('tokens_deducted', sa.BigInteger(), nullable=False),
        sa.Column('subscription_tokens_used', sa.BigInteger(), nullable=True, server_default='0'),
        sa.Column('topup_tokens_used', sa.BigInteger(), nullable=True, server_default='0'),
        sa.Column('raw_api_cost_cents', sa.Integer(), nullable=False),
        sa.Column('charged_cost_cents', sa.Integer(), nullable=False),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_token_usage_logs_user_created', 'token_usage_logs', ['user_id', 'created_at'], unique=False)
    op.create_index('idx_token_usage_logs_team_created', 'token_usage_logs', ['team_id', 'created_at'], unique=False)
    op.create_index('idx_token_usage_logs_conversation', 'token_usage_logs', ['conversation_id', 'created_at'], unique=False)

    # Create team_member_allocations table
    op.create_table('team_member_allocations',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('team_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('allocation_type', sa.String(50), nullable=True, server_default='unlimited'),
        sa.Column('allocation_value', sa.Integer(), nullable=True),
        sa.Column('tokens_used_current_period', sa.BigInteger(), nullable=True, server_default='0'),
        sa.Column('last_reset_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=True),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('team_id', 'user_id')
    )
    op.create_index('idx_team_member_allocations_team', 'team_member_allocations', ['team_id'], unique=False)

    # Create stripe_webhook_events table
    op.create_table('stripe_webhook_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('stripe_event_id', sa.String(255), nullable=False),
        sa.Column('type', sa.String(100), nullable=False),
        sa.Column('processed', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=True),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stripe_event_id')
    )
    op.create_index('idx_type_processed', 'stripe_webhook_events', ['type', 'processed'], unique=False)
    op.create_index('idx_created_at', 'stripe_webhook_events', ['created_at'], unique=False)

    # Create rate_limit_tracking table
    op.create_table('rate_limit_tracking',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('ip_address', postgresql.INET(), nullable=False),
        sa.Column('user_agent_hash', sa.String(64), nullable=True),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('count', sa.Integer(), nullable=True, server_default='1'),
        sa.Column('window_start', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_user_action_window', 'rate_limit_tracking', ['user_id', 'action', 'window_start'], unique=False)
    op.create_index('idx_ip_action_window', 'rate_limit_tracking', ['ip_address', 'action', 'window_start'], unique=False)

    # Create indexes for subscriptions table
    op.create_index('idx_subscriptions_user_status', 'subscriptions', ['user_id', 'status'], unique=False)
    op.create_index('idx_subscriptions_team_status', 'subscriptions', ['team_id', 'status'], unique=False)
    op.create_index('idx_subscriptions_period_end', 'subscriptions', ['current_period_end'], unique=False, postgresql_where=sa.text("status = 'active'"))

    # Create index for token_transactions
    op.create_index('idx_token_transactions_user_created', 'token_transactions', ['user_id', 'created_at'], unique=False)

    # Add columns to users table
    op.add_column('users', sa.Column('stripe_customer_id', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('default_payment_method_id', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('total_tokens_used', sa.BigInteger(), nullable=True, server_default='0'))
    op.create_unique_constraint('uq_users_stripe_customer_id', 'users', ['stripe_customer_id'])

    # Add columns to teams table
    op.add_column('teams', sa.Column('stripe_customer_id', sa.String(255), nullable=True))
    op.add_column('teams', sa.Column('billing_email', sa.String(255), nullable=True))
    op.add_column('teams', sa.Column('token_allocation_strategy', sa.String(50), nullable=True, server_default='unlimited'))
    op.add_column('teams', sa.Column('active_member_count', sa.Integer(), nullable=True, server_default='0'))
    op.create_unique_constraint('uq_teams_stripe_customer_id', 'teams', ['stripe_customer_id'])


def downgrade() -> None:
    # Drop constraints and columns from teams table
    op.drop_constraint('uq_teams_stripe_customer_id', 'teams', type_='unique')
    op.drop_column('teams', 'active_member_count')
    op.drop_column('teams', 'token_allocation_strategy')
    op.drop_column('teams', 'billing_email')
    op.drop_column('teams', 'stripe_customer_id')

    # Drop constraints and columns from users table
    op.drop_constraint('uq_users_stripe_customer_id', 'users', type_='unique')
    op.drop_column('users', 'total_tokens_used')
    op.drop_column('users', 'default_payment_method_id')
    op.drop_column('users', 'stripe_customer_id')

    # Drop indexes
    op.drop_index('idx_token_transactions_user_created', table_name='token_transactions')
    op.drop_index('idx_subscriptions_period_end', table_name='subscriptions')
    op.drop_index('idx_subscriptions_team_status', table_name='subscriptions')
    op.drop_index('idx_subscriptions_user_status', table_name='subscriptions')
    op.drop_index('idx_ip_action_window', table_name='rate_limit_tracking')
    op.drop_index('idx_user_action_window', table_name='rate_limit_tracking')
    op.drop_index('idx_created_at', table_name='stripe_webhook_events')
    op.drop_index('idx_type_processed', table_name='stripe_webhook_events')
    op.drop_index('idx_team_member_allocations_team', table_name='team_member_allocations')
    op.drop_index('idx_token_usage_logs_conversation', table_name='token_usage_logs')
    op.drop_index('idx_token_usage_logs_team_created', table_name='token_usage_logs')
    op.drop_index('idx_token_usage_logs_user_created', table_name='token_usage_logs')
    op.drop_index('idx_stripe_event_id', table_name='token_transactions')

    # Drop tables in reverse order
    op.drop_table('rate_limit_tracking')
    op.drop_table('stripe_webhook_events')
    op.drop_table('team_member_allocations')
    op.drop_table('token_usage_logs')
    op.drop_table('token_transactions')
    op.drop_table('token_balances')
    op.drop_table('subscriptions')
    op.drop_table('subscription_plans')