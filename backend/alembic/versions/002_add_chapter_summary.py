"""Add chapter_summary to beacon_tiers

Revision ID: 002
Revises: 001
Create Date: 2026-02-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "beacon_tiers",
        sa.Column("chapter_summary", sa.String(2000), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("beacon_tiers", "chapter_summary")
