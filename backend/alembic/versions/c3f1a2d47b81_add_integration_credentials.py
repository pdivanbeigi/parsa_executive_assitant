"""add integration_credentials

Revision ID: c3f1a2d47b81
Revises: b205a73dd9ea
Create Date: 2026-07-26 15:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3f1a2d47b81'
down_revision: Union[str, None] = 'b205a73dd9ea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('integration_credentials',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('provider', sa.String(length=32), nullable=False),
    sa.Column('access_token', sa.Text(), nullable=False),
    sa.Column('refresh_token', sa.Text(), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('scopes', sa.Text(), nullable=True),
    sa.Column('cloud_id', sa.String(length=64), nullable=True),
    sa.Column('site_url', sa.String(length=512), nullable=True),
    sa.Column('site_name', sa.String(length=255), nullable=True),
    sa.Column('account_id', sa.String(length=128), nullable=True),
    sa.Column('account_email', sa.String(length=255), nullable=True),
    sa.Column('account_name', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('provider')
    )
    op.create_index(op.f('ix_integration_credentials_provider'), 'integration_credentials', ['provider'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_integration_credentials_provider'), table_name='integration_credentials')
    op.drop_table('integration_credentials')
