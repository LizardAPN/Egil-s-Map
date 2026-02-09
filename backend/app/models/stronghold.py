from geoalchemy2 import Geometry
from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Stronghold(Base):
    __tablename__ = "strongholds"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    is_private = Column(Boolean, default=False)
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    leader_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    leader = relationship("User", back_populates="led_strongholds")
    members = relationship("StrongholdMember", back_populates="stronghold")


class StrongholdMember(Base):
    __tablename__ = "stronghold_members"

    id = Column(Integer, primary_key=True, index=True)
    stronghold_id = Column(Integer, ForeignKey("strongholds.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    stronghold = relationship("Stronghold", back_populates="members")
