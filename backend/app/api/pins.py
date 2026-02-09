from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2 import WKTElement

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.pin import LegacyPin
from app.models.inspiration import Inspiration
from app.models.echo import EchoTrigger
from app.services.s3 import upload_file
from app.schemas.pin import PinResponse

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
    from geoalchemy2 import to_shape
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
    from datetime import datetime, timezone, timedelta
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
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
    owner_result = await db.execute(select(User).where(User.id == pin.user_id))
    owner = owner_result.scalar_one()
    owner.total_inspiration_score = (owner.total_inspiration_score or 0) + 1

    # Star logic: top 1% (mock: top 10 users) get current_is_star
    from sqlalchemy import func, update
    count_result = await db.execute(select(func.count(User.id)))
    total_users = count_result.scalar() or 1
    top_n = max(1, min(10, int(total_users * 0.01) + 1))
    top_result = await db.execute(
        select(User.id).order_by(User.total_inspiration_score.desc()).limit(top_n)
    )
    top_ids = [r[0] for r in top_result.fetchall()]
    if top_ids:
        await db.execute(update(User).where(User.id.in_(top_ids)).values(current_is_star=True))
        await db.execute(update(User).where(User.id.notin_(top_ids)).values(current_is_star=False))
    return {"status": "inspired"}
