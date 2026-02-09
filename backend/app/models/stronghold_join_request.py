from enum import Enum as PyEnum

from sqlalchemy import Column, Integer, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class JoinRequestStatus(PyEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class StrongholdJoinRequest(Base):
    __tablename__ = "stronghold_join_requests"

    id = Column(Integer, primary_key=True, index=True)
    stronghold_id = Column(Integer, ForeignKey("strongholds.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(JoinRequestStatus), default=JoinRequestStatus.PENDING, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    stronghold = relationship("Stronghold", back_populates="join_requests")
