from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2.shape import to_shape

from app.core.database import get_db
from app.core.deps import get_current_user_optional, get_current_user
from app.models.user import User
from app.models.beacon import BeaconTier
from app.models.pin import LegacyPin
from app.schemas.beacon import BeaconResponse, BeaconTierWithPins, PinInBeacon
from app.schemas.user import UserSettingsUpdate, UserSettingsResponse

router = APIRouter()


def _tier_title(tier, locale: str | None) -> str:
    if locale == "en":
        return (tier.title_en or tier.title_ru or tier.title)
    return (tier.title_ru or tier.title_en or tier.title)


@router.get("/{username}/beacon", response_model=BeaconResponse)
async def get_beacon(
    username: str,
    locale: Optional[str] = Query(None, description="Locale for tier titles (ru, en)"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    tiers_result = await db.execute(
        select(BeaconTier).where(BeaconTier.user_id == user.id).order_by(BeaconTier.order)
    )
    tiers = tiers_result.scalars().all()
    tier_responses = []
    for tier in tiers:
        pins_result = await db.execute(
            select(LegacyPin).where(LegacyPin.tier_id == tier.id)
        )
        pins = pins_result.scalars().all()
        pin_list = []
        for p in pins:
            pt = to_shape(p.location)
            pin_list.append(
                PinInBeacon(
                    id=p.id,
                    lat=pt.y,
                    lng=pt.x,
                    content_type=p.content_type,
                    content_url=p.content_url,
                    text_content=p.text_content,
                    is_private=p.is_private,
                )
            )
        lat, lng = (None, None)
        if tier.location is not None:
            try:
                pt = to_shape(tier.location)
                lat, lng = pt.y, pt.x
            except Exception:
                pass
        tier_responses.append(
            BeaconTierWithPins(
                id=tier.id,
                title=_tier_title(tier, locale),
                order=tier.order,
                chapter_summary=tier.chapter_summary,
                lat=lat,
                lng=lng,
                started_at=tier.started_at.isoformat() if tier.started_at else None,
                ended_at=tier.ended_at.isoformat() if tier.ended_at else None,
                is_active=tier.ended_at is None,
                pins=pin_list,
            )
        )
    return BeaconResponse(
        username=user.username,
        current_is_star=user.current_is_star or False,
        tiers=tier_responses,
    )


@router.get("/{username}")
async def get_profile(
    username: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Get user profile including role (if viewing own profile or admin)."""
    import logging
    logger = logging.getLogger(__name__)
    
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Debug logging
    logger.info(f"Profile request for username={username}, user_id={user.id}, user_role={user.role.value}")
    if current_user:
        logger.info(f"Current user: id={current_user.id}, username={current_user.username}, role={current_user.role.value}")
    else:
        logger.info("Current user is None (not authenticated)")
    
    # Only return role if viewing own profile or if current user is admin
    can_see_role = (
        current_user is not None
        and (current_user.id == user.id or current_user.role.value == "ADMIN")
    )
    
    logger.info(f"can_see_role={can_see_role}, returning role={user.role.value if can_see_role else 'USER'}")
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role.value if can_see_role else "USER",
        "total_inspiration_score": user.total_inspiration_score,
        "current_is_star": user.current_is_star,
    }


@router.patch("/user/settings", response_model=UserSettingsResponse)
async def update_user_settings(
    settings: UserSettingsUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user privacy settings."""
    user.is_profile_private = settings.is_profile_private
    await db.flush()
    await db.refresh(user)
    return UserSettingsResponse(is_profile_private=user.is_profile_private)


@router.get("/user/settings", response_model=UserSettingsResponse)
async def get_user_settings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's privacy settings."""
    return UserSettingsResponse(is_profile_private=user.is_profile_private)
