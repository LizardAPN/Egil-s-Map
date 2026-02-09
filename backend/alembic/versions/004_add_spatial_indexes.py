"""Add spatial indexes for PostGIS optimization

Revision ID: 004
Revises: 003
Create Date: 2026-02-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create GIST spatial indexes for better spatial query performance
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_legacy_pins_location ON legacy_pins USING GIST (location)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_strongholds_location ON strongholds USING GIST (location)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_legacy_pins_location")
    op.execute("DROP INDEX IF EXISTS idx_strongholds_location")
