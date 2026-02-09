from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Debug logging to track if request reaches backend
    logger.info(f"Registration request received for username: {user_data.username}")
    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists")
    if user_data.email:
        result = await db.execute(select(User).where(User.email == user_data.email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password or "") if user_data.password else None,
        provider="credentials",
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == form.username))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=token)


from pydantic import BaseModel


class OAuthSyncBody(BaseModel):
    email: str | None = None
    name: str | None = None
    provider: str = "google"


@router.post("/oauth-sync", response_model=Token)
async def oauth_sync(data: OAuthSyncBody = Body(...), db: AsyncSession = Depends(get_db)):
    """Create or find user from OAuth (Google/GitHub) and return token."""
    email = data.email
    name = data.name
    provider = data.provider
    if not email and not name:
        raise HTTPException(status_code=400, detail="email or name required")
    email = email or ""
    name = name or ""
    username = (email.split("@")[0] if email else name) or "oauth_user"
    if "@" in username:
        username = username.split("@")[0][:50]
    user = None
    if email:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
    if not user:
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
    if not user:
        base_username = username[:50]
        final_username = base_username
        for i in range(100):
            result = await db.execute(select(User).where(User.username == final_username))
            if not result.scalar_one_or_none():
                break
            final_username = f"{base_username}_{i}"[:50]
        user = User(username=final_username, email=email or None, provider=provider)
        db.add(user)
        await db.flush()
        await db.refresh(user)
    token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=token)


@router.post("/telegram")
async def telegram_auth(
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
):
    id = data.get("id")
    first_name = data.get("first_name", "")
    last_name = data.get("last_name")
    username = data.get("username")
    photo_url = data.get("photo_url")
    auth_date = data.get("auth_date", 0)
    auth_hash = data.get("hash", "")
    import hashlib
    import hmac
    import os

    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if bot_token and id and auth_hash:
        data_check = f"auth_date={auth_date}\nfirst_name={first_name}"
        if last_name:
            data_check += f"\nlast_name={last_name}"
        if username:
            data_check += f"\nusername={username}"
        if photo_url:
            data_check += f"\nphoto_url={photo_url}"
        data_check += f"\nid={id}"
        secret = hashlib.sha256(bot_token.encode()).digest()
        calculated = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()
        if calculated != auth_hash:
            raise HTTPException(status_code=401, detail="Invalid Telegram hash")

    if not id:
        raise HTTPException(status_code=400, detail="Missing id")
    telegram_username = username or f"tg_{id}"
    result = await db.execute(select(User).where(User.username == telegram_username))
    user = result.scalar_one_or_none()
    if not user:
        user = User(username=telegram_username, provider="telegram")
        db.add(user)
        await db.flush()
        await db.refresh(user)
    token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=token)
