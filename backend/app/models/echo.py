from sqlalchemy import Column, Integer, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class EchoTrigger(Base):
    __tablename__ = "echo_triggers"

    id = Column(Integer, primary_key=True, index=True)
    pin_id = Column(Integer, ForeignKey("legacy_pins.id", ondelete="CASCADE"), nullable=False)
    unlock_date = Column(DateTime(timezone=True), nullable=True)
    unlock_radius = Column(Float, nullable=True)  # meters
    unlock_inspiration_count = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pin = relationship("LegacyPin", back_populates="echo_trigger")
