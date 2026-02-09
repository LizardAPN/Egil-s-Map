from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Inspiration(Base):
    __tablename__ = "inspirations"
    __table_args__ = (UniqueConstraint("from_user_id", "to_pin_id", name="uq_inspiration_user_pin"),)

    id = Column(Integer, primary_key=True, index=True)
    from_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    to_pin_id = Column(Integer, ForeignKey("legacy_pins.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    from_user = relationship("User", foreign_keys=[from_user_id], back_populates="inspirations_sent")
    pin = relationship("LegacyPin", back_populates="inspirations")
