from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2 import WKTElement
from datetime import datetime, timezone, timedelta

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.redis import get_daily_inspiration_count, increment_daily_inspiration_count
from app.models.user import User
from app.models.pin import LegacyPin
from app.models.inspiration import Inspiration
from app.models.echo import EchoTrigger
from app.services.s3 import upload_file
from app.schemas.pin import PinResponse, FeedItem

router = APIRouter()

DAILY_INSPIRATION_LIMIT = 5


async def is_echo_locked(pin: LegacyPin, db: AsyncSession, viewer_lat: float | None = None, viewer_lng: float | None = None) -> bool:
    if not pin.is_echo:
        return False
    result = await db.execute(
        select(EchoTrigger).where(EchoTrigger.pin_id == pin.id)
    )
    trigger = result.scalar_one_or_none()
    if not trigger:
        return False
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    if trigger.unlock_date and now < trigger.unlock_date:
        return True
    if trigger.unlock_inspiration_count:
        insp_count = len(pin.inspirations)
        if insp_count < trigger.unlock_inspiration_count:
            return True
    # TODO: unlock_radius check with viewer location
    return False


@router.get("/feed", response_model=list[FeedItem])
async def get_feed(
    offset: int = Query(0, ge=0),
    limit: int = Query(24, ge=1, le=48),
    db: AsyncSession = Depends(get_db),
):
    """Public bulletin board feed: all public pins from all users."""
    result = await db.execute(
        select(LegacyPin, User.username, func.count(Inspiration.id).label("insp_count"))
        .join(User, User.id == LegacyPin.user_id)
        .outerjoin(Inspiration, Inspiration.to_pin_id == LegacyPin.id)
        .where(LegacyPin.is_private == False)
        .group_by(LegacyPin.id, User.username)
        .order_by(LegacyPin.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = result.all()
    items = []
    for pin, username, insp_count in rows:
        locked = await is_echo_locked(pin, db)
        content_url = pin.content_url if not locked else None
        items.append(
            FeedItem(
                id=pin.id,
                content_type=pin.content_type,
                content_url=content_url,
                text_content=pin.text_content,
                inspiration_count=insp_count or 0,
                username=username,
                created_at=pin.created_at.isoformat() if pin.created_at else "",
            )
        )
    return items


@router.post("", response_model=PinResponse)
async def create_pin(
    tier_id: int = Form(...),
    lat: float = Form(...),
    lng: float = Form(...),
    content_type: str = Form(...),
    text_content: str | None = Form(None),
    is_private: bool = Form(False),
    is_echo: bool = Form(False),
    file: UploadFile | None = File(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if user is muted
    if user.is_muted:
        raise HTTPException(
            status_code=403,
            detail="Your account has been muted. You cannot create content.",
        )
    
    content_url = None
    if file:
        content = await file.read()
        import io
        content_url = upload_file(io.BytesIO(content), file.content_type or "application/octet-stream")
    elif content_type == "text" and text_content:
        content_url = None
    else:
        raise HTTPException(status_code=400, detail="File or text_content required")

    point = WKTElement(f"POINT({lng} {lat})", srid=4326)
    pin = LegacyPin(
        tier_id=tier_id,
        user_id=user.id,
        location=point,
        content_type=content_type,
        content_url=content_url,
        text_content=text_content,
        is_private=is_private,
        is_echo=is_echo,
    )
    db.add(pin)
    await db.flush()
    await db.refresh(pin)
    return PinResponse(
        id=pin.id,
        tier_id=pin.tier_id,
        user_id=pin.user_id,
        lat=lat,
        lng=lng,
        content_type=pin.content_type,
        content_url=pin.content_url,
        text_content=pin.text_content,
        is_private=pin.is_private,
        is_echo=pin.is_echo,
        inspiration_count=0,
    )


@router.get("/{pin_id}", response_model=PinResponse)
async def get_pin(
    pin_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LegacyPin).where(LegacyPin.id == pin_id))
    pin = result.scalar_one_or_none()
    if not pin:
        raise HTTPException(status_code=404, detail="Pin not found")
    from geoalchemy2.shape import to_shape
    pt = to_shape(pin.location)
    locked = await is_echo_locked(pin, db)
    content_url = pin.content_url if not locked else None
    insp_result = await db.execute(
        select(func.count(Inspiration.id)).where(Inspiration.to_pin_id == pin_id)
    )
    insp_count = insp_result.scalar() or 0
    return PinResponse(
        id=pin.id,
        tier_id=pin.tier_id,
        user_id=pin.user_id,
        lat=pt.y,
        lng=pt.x,
        content_type=pin.content_type,
        content_url=content_url,
        text_content=pin.text_content,
        is_private=pin.is_private,
        is_echo=pin.is_echo,
        inspiration_count=insp_count,
    )


@router.post("/{pin_id}/inspire")
async def inspire_pin(
    pin_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if user is muted
    if user.is_muted:
        raise HTTPException(
            status_code=403,
            detail="Your account has been muted. You cannot interact with content.",
        )
    
    # Check daily inspiration limit using Redis cache with DB fallback
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)
    ttl_seconds = int((tomorrow_start - now).total_seconds())
    date_str = today_start.strftime("%Y-%m-%d")
    
    # Try Redis first (may fail if Redis is down)
    try:
        daily_count = await get_daily_inspiration_count(user.id, date_str)
    except Exception:
        daily_count = None

    # Fallback to DB if Redis miss
    if daily_count is None:
        count_result = await db.execute(
            select(func.count(Inspiration.id)).where(
                Inspiration.from_user_id == user.id,
                Inspiration.created_at >= today_start,
            )
        )
        daily_count = count_result.scalar() or 0
    
    if daily_count >= DAILY_INSPIRATION_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Go and build something worthy of your own journey.",
        )
    result = await db.execute(select(LegacyPin).where(LegacyPin.id == pin_id))
    pin = result.scalar_one_or_none()
    if not pin:
        raise HTTPException(status_code=404, detail="Pin not found")
    if pin.user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot inspire your own pin")
    existing = await db.execute(
        select(Inspiration).where(
            Inspiration.from_user_id == user.id,
            Inspiration.to_pin_id == pin_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already inspired")
    insp = Inspiration(from_user_id=user.id, to_pin_id=pin_id)
    db.add(insp)
    await db.flush()

    # Update Redis cache for daily count (non-blocking)
    try:
        await increment_daily_inspiration_count(user.id, date_str, ttl_seconds)
    except Exception:
        pass

    # Update owner inspiration score
    owner_result = await db.execute(select(User).where(User.id == pin.user_id))
    owner = owner_result.scalar_one_or_none()
    if owner:
        owner.total_inspiration_score = (owner.total_inspiration_score or 0) + 1

    return {"status": "inspired"}
