from enum import Enum as PyEnum

from geoalchemy2 import Geometry
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, DateTime, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class StrongholdMemberRole(PyEnum):
    LEADER = "LEADER"
    OFFICER = "OFFICER"
    MEMBER = "MEMBER"


class Stronghold(Base):
    __tablename__ = "strongholds"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)  # fallback
    name_ru = Column(String(200), nullable=False)
    name_en = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)  # Manifesto
    is_private = Column(Boolean, default=False)
    avatar_url = Column(String(500), nullable=True)  # Seal/Emblem
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    leader_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    leader = relationship("User", back_populates="led_strongholds")
    members = relationship("StrongholdMember", back_populates="stronghold")
    media = relationship("StrongholdMedia", back_populates="stronghold", cascade="all, delete-orphan")
    join_requests = relationship("StrongholdJoinRequest", back_populates="stronghold", cascade="all, delete-orphan")
    messages = relationship("StrongholdMessage", back_populates="stronghold", cascade="all, delete-orphan")


class StrongholdMember(Base):
    __tablename__ = "stronghold_members"
    __table_args__ = (UniqueConstraint("stronghold_id", "user_id", name="uq_stronghold_member"),)

    id = Column(Integer, primary_key=True, index=True)
    stronghold_id = Column(Integer, ForeignKey("strongholds.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum(StrongholdMemberRole), default=StrongholdMemberRole.MEMBER, nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    stronghold = relationship("Stronghold", back_populates="members")
    user = relationship("User", back_populates="stronghold_memberships")
