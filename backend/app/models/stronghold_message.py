from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class StrongholdMessage(Base):
    __tablename__ = "stronghold_messages"

    id = Column(Integer, primary_key=True, index=True)
    stronghold_id = Column(Integer, ForeignKey("strongholds.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    stronghold = relationship("Stronghold", back_populates="messages")
