import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2 import WKTElement
from geoalchemy2.shape import to_shape
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.models.user import User
from app.models.stronghold import Stronghold, StrongholdMember

router = APIRouter()
logger = logging.getLogger(__name__)


class StrongholdCreate(BaseModel):
    name: str
    lat: float
    lng: float
    is_private: bool = False


@router.get("")
async def list_strongholds(
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    result = await db.execute(
        select(Stronghold).order_by(Stronghold.created_at.desc())
    )
    strongholds = result.scalars().all()
    out = []
    for s in strongholds:
        pt = to_shape(s.location)
        members_result = await db.execute(
            select(func.sum(User.total_inspiration_score)).select_from(StrongholdMember)
            .join(User, User.id == StrongholdMember.user_id)
            .where(StrongholdMember.stronghold_id == s.id)
        )
        brightness = members_result.scalar() or 0
        is_member = False
        if user:
            member_check = await db.execute(
                select(StrongholdMember).where(
                    StrongholdMember.stronghold_id == s.id,
                    StrongholdMember.user_id == user.id,
                )
            )
            is_member = member_check.scalar_one_or_none() is not None
        out.append({
            "id": s.id,
            "name": s.name,
            "lat": pt.y,
            "lng": pt.x,
            "is_private": s.is_private,
            "brightness": brightness,
            "is_member": is_member,
        })
    return out


@router.post("")
async def create_stronghold(
    data: StrongholdCreate,
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
        point = WKTElement(f"POINT({data.lng} {data.lat})", srid=4326)
        stronghold = Stronghold(
            name=data.name,
            is_private=data.is_private,
            location=point,
            leader_id=user.id,
        )
        db.add(stronghold)
        await db.flush()
        member = StrongholdMember(stronghold_id=stronghold.id, user_id=user.id)
        db.add(member)
        await db.flush()
        pt = to_shape(stronghold.location)
        return {
            "id": stronghold.id,
            "name": stronghold.name,
            "lat": pt.y,
            "lng": pt.x,
            "is_private": stronghold.is_private,
        }
    except Exception as e:
        logger.error("Stronghold persistence error: %s", e, exc_info=True)
        raise


@router.post("/{stronghold_id}/join")
async def join_stronghold(
    stronghold_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if user is muted
    if user.is_muted:
        raise HTTPException(
            status_code=403,
            detail="Your account has been muted. You cannot interact with content.",
        )
    
    result = await db.execute(select(Stronghold).where(Stronghold.id == stronghold_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Stronghold not found")
    existing = await db.execute(
        select(StrongholdMember).where(
            StrongholdMember.stronghold_id == stronghold_id,
            StrongholdMember.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already a member")
    try:
        member = StrongholdMember(stronghold_id=stronghold_id, user_id=user.id)
        db.add(member)
        await db.flush()
        return {"status": "joined"}
    except Exception as e:
        logger.error("Stronghold join persistence error: %s", e, exc_info=True)
        raise
