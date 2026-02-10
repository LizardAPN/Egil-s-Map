import logging
from fastapi import APIRouter, Depends, HTTPException
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


def _tier_lat_lng(tier: BeaconTier) -> tuple[float | None, float | None]:
    if tier.location is None:
        return (None, None)
    try:
        pt = to_shape(tier.location)
        return (pt.y, pt.x)  # lat, lng
    except Exception:
        return (None, None)


@router.get("", response_model=list[BeaconTierResponse])
async def list_my_tiers(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BeaconTier).where(BeaconTier.user_id == user.id).order_by(BeaconTier.order)
    )
    tiers = result.scalars().all()
    return [
        BeaconTierResponse(
            id=t.id,
            title=t.title,
            order=t.order,
            chapter_summary=t.chapter_summary,
            lat=lat,
            lng=lng,
        )
        for t in tiers
        for lat, lng in [_tier_lat_lng(t)]
    ]


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

    try:
        tier = BeaconTier(
            user_id=user.id,
            title=data.title,
            order=data.order,
            chapter_summary=data.chapter_summary,
            location=WKTElement(f"POINT({data.lng} {data.lat})", srid=4326)
            if data.lat is not None and data.lng is not None
            else None,
        )
        db.add(tier)
        await db.flush()
        await db.refresh(tier)
        lat, lng = _tier_lat_lng(tier)
        return BeaconTierResponse(
            id=tier.id,
            title=tier.title,
            order=tier.order,
            chapter_summary=tier.chapter_summary,
            lat=lat,
            lng=lng,
        )
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
    tier.order = data.order
    tier.chapter_summary = data.chapter_summary
    if data.lat is not None and data.lng is not None:
        tier.location = WKTElement(f"POINT({data.lng} {data.lat})", srid=4326)
    elif data.lat is None and data.lng is None:
        tier.location = None
    await db.flush()
    await db.refresh(tier)
    lat, lng = _tier_lat_lng(tier)
    return BeaconTierResponse(
        id=tier.id,
        title=tier.title,
        order=tier.order,
        chapter_summary=tier.chapter_summary,
        lat=lat,
        lng=lng,
    )


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
    await db.delete(tier)
    await db.flush()
    return {"status": "deleted"}
