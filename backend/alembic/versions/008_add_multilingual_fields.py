"""Add multilingual name/title fields for i18n

Revision ID: 008
Revises: 007
Create Date: 2026-02-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # strongholds: add name_ru, name_en; backfill from name
    op.add_column("strongholds", sa.Column("name_ru", sa.String(200), nullable=True))
    op.add_column("strongholds", sa.Column("name_en", sa.String(200), nullable=True))
    op.execute(
        "UPDATE strongholds SET name_ru = name, name_en = name WHERE name_ru IS NULL"
    )
    op.alter_column(
        "strongholds",
        "name_ru",
        existing_type=sa.String(200),
        nullable=False,
    )
    op.alter_column(
        "strongholds",
        "name_en",
        existing_type=sa.String(200),
        nullable=False,
    )

    # beacon_tiers: add title_ru, title_en; backfill from title
    op.add_column("beacon_tiers", sa.Column("title_ru", sa.String(200), nullable=True))
    op.add_column("beacon_tiers", sa.Column("title_en", sa.String(200), nullable=True))
    op.execute(
        "UPDATE beacon_tiers SET title_ru = title, title_en = title WHERE title_ru IS NULL"
    )
    op.alter_column(
        "beacon_tiers",
        "title_ru",
        existing_type=sa.String(200),
        nullable=False,
    )
    op.alter_column(
        "beacon_tiers",
        "title_en",
        existing_type=sa.String(200),
        nullable=False,
    )


def downgrade() -> None:
    op.drop_column("beacon_tiers", "title_en")
    op.drop_column("beacon_tiers", "title_ru")
    op.drop_column("strongholds", "name_en")
    op.drop_column("strongholds", "name_ru")
