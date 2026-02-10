"""Add optional location to beacon_tiers (chapter on map)

Revision ID: 007
Revises: 006
Create Date: 2026-02-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geometry


revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "beacon_tiers",
        sa.Column("location", Geometry(geometry_type="POINT", srid=4326), nullable=True),
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_beacon_tiers_location ON beacon_tiers USING GIST (location)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_beacon_tiers_location")
    op.drop_column("beacon_tiers", "location")
