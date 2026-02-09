from enum import Enum as PyEnum
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class UserRole(PyEnum):
    USER = "USER"
    MODERATOR = "MODERATOR"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    total_inspiration_score = Column(Integer, default=0)
    current_is_star = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Auth provider
    provider = Column(String(50), nullable=True)  # google, github, telegram, credentials

    # RBAC fields
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False, index=True)
    is_shadow_banned = Column(Boolean, default=False, nullable=False)
    is_muted = Column(Boolean, default=False, nullable=False)
    
    # Privacy settings
    is_profile_private = Column(Boolean, default=False, nullable=False)

    beacon_tiers = relationship("BeaconTier", back_populates="user")
    pins = relationship("LegacyPin", back_populates="user")
    inspirations_sent = relationship("Inspiration", foreign_keys="Inspiration.from_user_id", back_populates="from_user")
    led_strongholds = relationship("Stronghold", back_populates="leader")
    stronghold_memberships = relationship("StrongholdMember", back_populates="user")
    reports_made = relationship("Report", foreign_keys="Report.reporter_id", back_populates="reporter")
    reports_received = relationship("Report", foreign_keys="Report.reported_user_id", back_populates="reported_user")
