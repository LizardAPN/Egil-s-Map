from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class StrongholdMedia(Base):
    __tablename__ = "stronghold_media"

    id = Column(Integer, primary_key=True, index=True)
    stronghold_id = Column(Integer, ForeignKey("strongholds.id", ondelete="CASCADE"), nullable=False)
    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    media_url = Column(String(500), nullable=False)
    media_type = Column(String(20), nullable=False)  # photo, video
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    stronghold = relationship("Stronghold", back_populates="media")
