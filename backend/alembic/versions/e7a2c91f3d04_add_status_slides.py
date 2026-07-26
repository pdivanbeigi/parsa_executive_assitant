"""add status_slides

Revision ID: e7a2c91f3d04
Revises: d4e8b19c2a05
Create Date: 2026-07-26 16:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e7a2c91f3d04'
down_revision: Union[str, None] = 'd4e8b19c2a05'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'status_slides',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('period_label', sa.String(length=255), nullable=True),
        sa.Column('author', sa.String(length=255), nullable=True),
        sa.Column('done_items', sa.JSON(), nullable=False),
        sa.Column('will_do_items', sa.JSON(), nullable=False),
        sa.Column('comments', sa.JSON(), nullable=False),
        sa.Column('theme', sa.JSON(), nullable=False),
        sa.Column('pdf_path', sa.String(length=512), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('status_slides')
