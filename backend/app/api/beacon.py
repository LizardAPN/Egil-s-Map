import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2 import WKTElement
from geoalchemy2.shape import to_shape

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.beacon import BeaconTier
from app.schemas.beacon import BeaconTierCreate, BeaconTierResponse

router = APIRouter()
logger = logging.getLogger(__name__)


def _parse_iso(s: str | None) -> datetime | None:
    if not s or not s.strip():
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def _reject_future(dt: datetime | None, field: str) -> None:
    """Raise 400 if dt is in the future."""
    if dt is None:
        return
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    if dt > now:
        raise HTTPException(
            status_code=400,
            detail=f"{field} cannot be in the future",
        )


def _tier_lat_lng(tier: BeaconTier) -> tuple[float | None, float | None]:
    if tier.location is None:
        return (None, None)
    try:
        pt = to_shape(tier.location)
        return (pt.y, pt.x)  # lat, lng
    except Exception:
        return (None, None)


def _tier_title(t: "BeaconTier", locale: str | None) -> str:
    if locale == "en":
        return t.title_en or t.title_ru or t.title
    return t.title_ru or t.title_en or t.title


def _tier_to_response(t: BeaconTier, locale: str | None) -> BeaconTierResponse:
    lat, lng = _tier_lat_lng(t)
    return BeaconTierResponse(
        id=t.id,
        title=_tier_title(t, locale),
        order=t.order,
        chapter_summary=t.chapter_summary,
        lat=lat,
        lng=lng,
        started_at=t.started_at.isoformat() if t.started_at else None,
        ended_at=t.ended_at.isoformat() if t.ended_at else None,
        is_active=t.ended_at is None,
    )


@router.get("", response_model=list[BeaconTierResponse])
async def list_my_tiers(
    locale: Optional[str] = Query(None, description="Locale for title (ru, en)"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BeaconTier).where(BeaconTier.user_id == user.id).order_by(BeaconTier.order)
    )
    tiers = result.scalars().all()
    return [_tier_to_response(t, locale) for t in tiers]


@router.post("", response_model=BeaconTierResponse)
async def create_tier(
    data: BeaconTierCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if user is muted
    if user.is_muted:
        raise HTTPException(
            status_code=403,
            detail="Your account has been muted. You cannot create content.",
        )

    result = await db.execute(
        select(BeaconTier).where(BeaconTier.user_id == user.id).order_by(BeaconTier.order)
    )
    existing = list(result.scalars().all())
    now = datetime.now(timezone.utc)

    # Determine new chapter dates and order
    new_is_current = data.ended_at is None or (isinstance(data.ended_at, str) and not data.ended_at.strip())
    started_dt = _parse_iso(data.started_at) if data.started_at else None
    ended_dt = _parse_iso(data.ended_at) if data.ended_at else None

    _reject_future(started_dt, "started_at")
    _reject_future(ended_dt, "ended_at")

    if data.insert_before_id is not None:
        # Insert before chapter X
        idx = next((i for i, t in enumerate(existing) if t.id == data.insert_before_id), None)
        if idx is None:
            raise HTTPException(status_code=400, detail="insert_before_id: chapter not found")
        prev = existing[idx - 1] if idx > 0 else None
        nxt = existing[idx]
        nxt_start = nxt.started_at or nxt.created_at
        # New chapter: started_at = ended_at of prev (or user/data), ended_at = started_at of next
        if started_dt is not None:
            tier_started = started_dt
        elif prev and prev.ended_at is not None:
            tier_started = prev.ended_at
        else:
            tier_started = nxt_start
        tier_ended = ended_dt if ended_dt is not None else nxt_start
        new_order = idx
        # Shift order of subsequent tiers
        for i in range(idx, len(existing)):
            existing[i].order = i + 1
        # If prev was current (ended_at=None), close it
        if prev and prev.ended_at is None:
            prev.ended_at = tier_started
    else:
        # Append at end (default: new current chapter)
        new_order = len(existing)
        if new_is_current:
            # Close previous current chapter
            for t in existing:
                if t.ended_at is None:
                    t.ended_at = now
                    break
            tier_started = started_dt or (existing[-1].ended_at if existing else now)
            tier_ended = None
        else:
            tier_started = started_dt or (existing[-1].ended_at if existing else now)
            tier_ended = ended_dt or now

    try:
        tier = BeaconTier(
            user_id=user.id,
            title=data.title,
            title_ru=data.title,
            title_en=data.title,
            order=new_order,
            chapter_summary=data.chapter_summary,
            location=WKTElement(f"POINT({data.lng} {data.lat})", srid=4326)
            if data.lat is not None and data.lng is not None
            else None,
            started_at=tier_started,
            ended_at=tier_ended,
        )
        db.add(tier)
        await db.flush()
        await db.refresh(tier)
        return _tier_to_response(tier, None)
    except Exception as e:
        logger.error("Beacon tier persistence error: %s", e, exc_info=True)
        raise


@router.put("/{tier_id}", response_model=BeaconTierResponse)
async def update_tier(
    tier_id: int,
    data: BeaconTierCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if user is muted
    if user.is_muted:
        raise HTTPException(
            status_code=403,
            detail="Your account has been muted. You cannot modify content.",
        )

    result = await db.execute(
        select(BeaconTier).where(BeaconTier.id == tier_id, BeaconTier.user_id == user.id)
    )
    tier = result.scalar_one_or_none()
    if not tier:
        raise HTTPException(status_code=404, detail="Tier not found")
    tier.title = data.title
    tier.title_ru = data.title
    tier.title_en = data.title
    tier.order = data.order
    tier.chapter_summary = data.chapter_summary
    if data.lat is not None and data.lng is not None:
        tier.location = WKTElement(f"POINT({data.lng} {data.lat})", srid=4326)
    elif data.lat is None and data.lng is None:
        tier.location = None
    if data.started_at is not None:
        tier.started_at = _parse_iso(data.started_at)
        _reject_future(tier.started_at, "started_at")
    if data.ended_at is not None:
        tier.ended_at = _parse_iso(data.ended_at)
        _reject_future(tier.ended_at, "ended_at")
    await db.flush()
    await db.refresh(tier)
    return _tier_to_response(tier, None)


@router.delete("/{tier_id}")
async def delete_tier(
    tier_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if user is muted
    if user.is_muted:
        raise HTTPException(
            status_code=403,
            detail="Your account has been muted. You cannot delete content.",
        )

    result = await db.execute(
        select(BeaconTier).where(BeaconTier.id == tier_id, BeaconTier.user_id == user.id)
    )
    tier = result.scalar_one_or_none()
    if not tier:
        raise HTTPException(status_code=404, detail="Tier not found")
    # If deleting current chapter, make last completed chapter current
    if tier.ended_at is None:
        other_result = await db.execute(
            select(BeaconTier)
            .where(BeaconTier.user_id == user.id, BeaconTier.id != tier_id)
            .order_by(BeaconTier.order.desc())
        )
        others = other_result.scalars().all()
        if others:
            others[0].ended_at = None  # Make last completed chapter current
    await db.delete(tier)
    await db.flush()
    return {"status": "deleted"}
