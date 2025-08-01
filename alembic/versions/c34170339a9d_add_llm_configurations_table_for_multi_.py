"""add_llm_configurations_table_for_multi_llm_support

Revision ID: c34170339a9d
Revises: 9f5102b5b214
Create Date: 2025-07-31 22:00:53.702544

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c34170339a9d'
down_revision: Union[str, Sequence[str], None] = '9f5102b5b214'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Enable UUID extension if not already enabled
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    
    # Create llm_configurations table
    op.create_table(
        'llm_configurations',
        sa.Column('id', sa.UUID(), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('model', sa.String(length=255), nullable=False),
        sa.Column('api_key_encrypted', sa.Text(), nullable=False),
        sa.Column('base_url', sa.String(length=500), nullable=True),
        sa.Column('is_default', sa.Boolean(), server_default=sa.text('false'), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=True),
        sa.Column('last_used_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('test_status', sa.String(length=50), nullable=True),
        sa.Column('test_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_llm_configs_user_id', 'llm_configurations', ['user_id'], unique=False)
    op.create_index('idx_llm_configs_provider', 'llm_configurations', ['provider'], unique=False)
    
    # Create unique constraint for default configuration per user
    op.create_index(
        'unique_user_default',
        'llm_configurations',
        ['user_id', 'is_default'],
        unique=True,
        postgresql_where=sa.text('is_default = true')
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index('unique_user_default', table_name='llm_configurations')
    op.drop_index('idx_llm_configs_provider', table_name='llm_configurations')
    op.drop_index('idx_llm_configs_user_id', table_name='llm_configurations')
    
    # Drop table
    op.drop_table('llm_configurations')
