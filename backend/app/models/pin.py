from geoalchemy2 import Geometry
from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class LegacyPin(Base):
    __tablename__ = "legacy_pins"

    id = Column(Integer, primary_key=True, index=True)
    tier_id = Column(Integer, ForeignKey("beacon_tiers.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    content_type = Column(String(20), nullable=False)  # video, photo, text
    content_url = Column(String(500), nullable=True)
    text_content = Column(String(2000), nullable=True)
    is_private = Column(Boolean, default=False)
    is_echo = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tier = relationship("BeaconTier", back_populates="pins")
    user = relationship("User", back_populates="pins")
    inspirations = relationship("Inspiration", back_populates="pin", lazy="selectin")
    echo_trigger = relationship("EchoTrigger", back_populates="pin", uselist=False)
    reports = relationship("Report", back_populates="reported_pin")
