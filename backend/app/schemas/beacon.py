from pydantic import BaseModel
from typing import Optional


class BeaconTierCreate(BaseModel):
    title: str
    order: int = 0
    chapter_summary: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    started_at: Optional[str] = None  # ISO 8601
    ended_at: Optional[str] = None  # ISO 8601; omit = current chapter
    insert_before_id: Optional[int] = None  # Insert before this chapter id


class BeaconTierResponse(BaseModel):
    id: int
    title: str
    order: int
    chapter_summary: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    is_active: bool  # ended_at is null

    class Config:
        from_attributes = True


class PinInBeacon(BaseModel):
    id: int
    lat: float
    lng: float
    content_type: str
    content_url: Optional[str] = None
    text_content: Optional[str] = None
    is_private: bool

    class Config:
        from_attributes = True


class BeaconTierWithPins(BeaconTierResponse):
    pins: list["PinInBeacon"] = []


class BeaconResponse(BaseModel):
    username: str
    current_is_star: bool
    tiers: list[BeaconTierWithPins]
