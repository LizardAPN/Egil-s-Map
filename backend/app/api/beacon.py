from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.beacon import BeaconTier
from app.schemas.beacon import BeaconTierCreate, BeaconTierResponse

router = APIRouter()


@router.get("", response_model=list[BeaconTierResponse])
async def list_my_tiers(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BeaconTier).where(BeaconTier.user_id == user.id).order_by(BeaconTier.order)
    )
    return result.scalars().all()


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
    
    tier = BeaconTier(
        user_id=user.id,
        title=data.title,
        order=data.order,
    )
    db.add(tier)
    await db.flush()
    await db.refresh(tier)
    return tier


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
    await db.flush()
    await db.refresh(tier)
    return tier


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
