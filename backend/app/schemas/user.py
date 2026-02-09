from pydantic import BaseModel
from typing import Optional


class UserCreate(BaseModel):
    email: Optional[str] = None
    username: str
    password: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: Optional[str] = None
    username: str
    total_inspiration_score: int
    current_is_star: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserSettingsUpdate(BaseModel):
    is_profile_private: bool


class UserSettingsResponse(BaseModel):
    is_profile_private: bool
