"""Add sessions and csrf_tokens tables for cookie auth

Revision ID: 9f5102b5b214
Revises: 622358f54d5d
Create Date: 2025-07-30 23:37:18.810310

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f5102b5b214'
down_revision: Union[str, Sequence[str], None] = '622358f54d5d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create sessions table
    op.create_table('sessions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('token_hash', sa.String(length=255), nullable=False),
        sa.Column('fingerprint', sa.String(length=255), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),  # Supports IPv6
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_activity', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_sessions_user_id', 'sessions', ['user_id'], unique=False)
    op.create_index('idx_sessions_token_hash', 'sessions', ['token_hash'], unique=True)
    op.create_index('idx_sessions_expires_at', 'sessions', ['expires_at'], unique=False)
    
    # Create csrf_tokens table
    op.create_table('csrf_tokens',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('token', sa.String(length=255), nullable=False),
        sa.Column('session_id', sa.UUID(), nullable=False),
        sa.Column('used', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_csrf_tokens_token', 'csrf_tokens', ['token'], unique=True)
    op.create_index('idx_csrf_tokens_session_id', 'csrf_tokens', ['session_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop csrf_tokens table
    op.drop_index('idx_csrf_tokens_session_id', table_name='csrf_tokens')
    op.drop_index('idx_csrf_tokens_token', table_name='csrf_tokens')
    op.drop_table('csrf_tokens')
    
    # Drop sessions table
    op.drop_index('idx_sessions_expires_at', table_name='sessions')
    op.drop_index('idx_sessions_token_hash', table_name='sessions')
    op.drop_index('idx_sessions_user_id', table_name='sessions')
    op.drop_table('sessions')
