"""Add started_at and ended_at to beacon_tiers for chapter timeline

Revision ID: 009
Revises: 008
Create Date: 2026-02-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "beacon_tiers",
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "beacon_tiers",
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Migrate existing data: started_at = created_at; last by order gets ended_at = null, others get ended_at = started_at of next
    op.execute("""
        WITH ordered AS (
            SELECT id, created_at, "order",
                   LEAD(created_at) OVER (PARTITION BY user_id ORDER BY "order") AS next_started
            FROM beacon_tiers
        )
        UPDATE beacon_tiers t
        SET started_at = o.created_at,
            ended_at = CASE WHEN o.next_started IS NULL THEN NULL ELSE o.next_started END
        FROM ordered o
        WHERE t.id = o.id
    """)


def downgrade() -> None:
    op.drop_column("beacon_tiers", "ended_at")
    op.drop_column("beacon_tiers", "started_at")
