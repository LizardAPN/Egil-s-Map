from sqlalchemy import Column, String, Boolean

from app.core.database import Base


class GlobalSetting(Base):
    __tablename__ = "global_settings"

    key = Column(String(100), primary_key=True)
    value = Column(String(500), nullable=False)
    is_boolean = Column(Boolean, default=False, nullable=False)
