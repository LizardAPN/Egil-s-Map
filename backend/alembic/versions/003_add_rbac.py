"""Add RBAC fields to users and create reports table

Revision ID: 003
Revises: 002
Create Date: 2026-02-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create UserRole enum type
    op.execute("CREATE TYPE userrole AS ENUM ('USER', 'MODERATOR', 'ADMIN')")
    
    # Add RBAC fields to users table
    op.add_column(
        "users",
        sa.Column("role", sa.Enum("USER", "MODERATOR", "ADMIN", name="userrole"), server_default="USER", nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("is_shadow_banned", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("is_muted", sa.Boolean(), server_default="false", nullable=False),
    )
    
    # Create index on role for faster queries
    op.create_index("ix_users_role", "users", ["role"])
    
    # Create reports table
    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("reporter_id", sa.Integer(), nullable=False),
        sa.Column("reported_user_id", sa.Integer(), nullable=True),
        sa.Column("reported_pin_id", sa.Integer(), nullable=True),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.Column("status", sa.String(20), server_default="PENDING", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["reporter_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reported_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reported_pin_id"], ["legacy_pins.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_reports_id"), "reports", ["id"])
    
    # Create global_settings table
    op.create_table(
        "global_settings",
        sa.Column("key", sa.String(100), nullable=False),
        sa.Column("value", sa.String(500), nullable=False),
        sa.Column("is_boolean", sa.Boolean(), server_default="false", nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )


def downgrade() -> None:
    op.drop_table("global_settings")
    op.drop_index("ix_users_role", table_name="users")
    op.drop_table("reports")
    op.drop_column("users", "is_muted")
    op.drop_column("users", "is_shadow_banned")
    op.drop_column("users", "role")
    op.execute("DROP TYPE userrole")
