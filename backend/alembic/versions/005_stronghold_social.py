"""Stronghold social hub: description, avatar, roles, media, join requests, messages

Revision ID: 005
Revises: 004
Create Date: 2026-02-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(conn, table: str, column: str) -> bool:
    r = conn.execute(sa.text("""
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = :t AND column_name = :c
    """), {"t": table, "c": column})
    return r.fetchone() is not None


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(sa.text("""
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = :t
    """), {"t": table})
    return r.fetchone() is not None


def _constraint_exists(conn, name: str) -> bool:
    r = conn.execute(sa.text("""
        SELECT 1 FROM pg_constraint WHERE conname = :n
    """), {"n": name})
    return r.fetchone() is not None


def upgrade() -> None:
    conn = op.get_bind()

    # Stronghold: add description, avatar_url
    if not _column_exists(conn, "strongholds", "description"):
        op.add_column("strongholds", sa.Column("description", sa.Text(), nullable=True))
    if not _column_exists(conn, "strongholds", "avatar_url"):
        op.add_column("strongholds", sa.Column("avatar_url", sa.String(500), nullable=True))

    # StrongholdMember: add role enum and column (idempotent: skip if type exists)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE strongholdmemberrole AS ENUM ('LEADER', 'OFFICER', 'MEMBER');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)
    if not _column_exists(conn, "stronghold_members", "role"):
        op.add_column(
            "stronghold_members",
            sa.Column("role", sa.Enum("LEADER", "OFFICER", "MEMBER", name="strongholdmemberrole", create_type=False), nullable=True),
        )
        # Backfill: leader gets LEADER, others get MEMBER
        op.execute("""
            UPDATE stronghold_members sm
            SET role = CASE
                WHEN sm.user_id = s.leader_id THEN 'LEADER'::strongholdmemberrole
                ELSE 'MEMBER'::strongholdmemberrole
            END
            FROM strongholds s
            WHERE sm.stronghold_id = s.id
        """)
        op.alter_column(
            "stronghold_members",
            "role",
            existing_type=sa.Enum("LEADER", "OFFICER", "MEMBER", name="strongholdmemberrole", create_type=False),
            nullable=False,
            server_default=sa.text("'MEMBER'::strongholdmemberrole"),
        )

    # Unique constraint on (stronghold_id, user_id)
    if not _constraint_exists(conn, "uq_stronghold_member"):
        op.create_unique_constraint("uq_stronghold_member", "stronghold_members", ["stronghold_id", "user_id"])

    # StrongholdMedia
    if not _table_exists(conn, "stronghold_media"):
        op.create_table(
            "stronghold_media",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("stronghold_id", sa.Integer(), nullable=False),
            sa.Column("uploaded_by_id", sa.Integer(), nullable=True),
            sa.Column("media_url", sa.String(500), nullable=False),
            sa.Column("media_type", sa.String(20), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["stronghold_id"], ["strongholds.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["uploaded_by_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_stronghold_media_id", "stronghold_media", ["id"])

    # StrongholdJoinRequest (idempotent: skip if type exists)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE joinrequeststatus AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)
    if not _table_exists(conn, "stronghold_join_requests"):
        # Create table via raw SQL to avoid SQLAlchemy's Enum trying to CREATE TYPE again
        op.execute("""
            CREATE TABLE stronghold_join_requests (
                id SERIAL PRIMARY KEY,
                stronghold_id INTEGER NOT NULL REFERENCES strongholds(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status joinrequeststatus NOT NULL DEFAULT 'PENDING'::joinrequeststatus,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                reviewed_at TIMESTAMP WITH TIME ZONE,
                reviewed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL
            )
        """)
        op.create_index("ix_stronghold_join_requests_id", "stronghold_join_requests", ["id"])

    # StrongholdMessage
    if not _table_exists(conn, "stronghold_messages"):
        op.create_table(
            "stronghold_messages",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("stronghold_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["stronghold_id"], ["strongholds.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_stronghold_messages_id", "stronghold_messages", ["id"])
        op.create_index("ix_stronghold_messages_stronghold_created", "stronghold_messages", ["stronghold_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_stronghold_messages_stronghold_created", "stronghold_messages")
    op.drop_table("stronghold_messages")
    op.drop_index("ix_stronghold_join_requests_id", "stronghold_join_requests")
    op.drop_table("stronghold_join_requests")
    op.execute("DROP TYPE IF EXISTS joinrequeststatus")
    op.drop_index("ix_stronghold_media_id", "stronghold_media")
    op.drop_table("stronghold_media")
    op.drop_constraint("uq_stronghold_member", "stronghold_members", type_="unique")
    op.drop_column("stronghold_members", "role")
    op.execute("DROP TYPE IF EXISTS strongholdmemberrole")
    op.drop_column("strongholds", "avatar_url")
    op.drop_column("strongholds", "description")
