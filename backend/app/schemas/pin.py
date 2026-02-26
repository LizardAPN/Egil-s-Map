from pydantic import BaseModel
from typing import Optional


class PinCreate(BaseModel):
    tier_id: int
    lat: float
    lng: float
    content_type: str  # video, photo, text
    text_content: Optional[str] = None
    is_private: bool = False
    is_echo: bool = False


class PinResponse(BaseModel):
    id: int
    tier_id: int
    user_id: int
    lat: float
    lng: float
    content_type: str
    content_url: Optional[str] = None
    text_content: Optional[str] = None
    is_private: bool
    is_echo: bool
    inspiration_count: int = 0

    class Config:
        from_attributes = True


class FeedItem(BaseModel):
    """Pin with author info for the bulletin board feed."""
    id: int
    content_type: str
    content_url: Optional[str] = None
    text_content: Optional[str] = None
    inspiration_count: int = 0
    username: str
    created_at: str
