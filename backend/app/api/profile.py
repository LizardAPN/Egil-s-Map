from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2 import to_shape

from app.core.database import get_db
from app.models.user import User
from app.models.beacon import BeaconTier
from app.models.pin import LegacyPin
from app.schemas.beacon import BeaconResponse, BeaconTierWithPins, PinInBeacon

router = APIRouter()


@router.get("/{username}/beacon", response_model=BeaconResponse)
async def get_beacon(username: str, db: AsyncSession = Depends(get_db)):
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
        tier_responses.append(
            BeaconTierWithPins(id=tier.id, title=tier.title, order=tier.order, pins=pin_list)
        )
    return BeaconResponse(
        username=user.username,
        current_is_star=user.current_is_star or False,
        tiers=tier_responses,
    )
