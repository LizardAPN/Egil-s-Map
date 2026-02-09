from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User, UserRole
from app.models.report import Report, ReportStatus
from app.models.settings import GlobalSetting

router = APIRouter()


class ReportResponse(BaseModel):
    id: int
    reporter_id: int
    reporter_username: str
    reported_user_id: int | None
    reported_user_username: str | None
    reported_pin_id: int | None
    reason: str
    status: str
    created_at: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str | None
    role: str
    is_shadow_banned: bool
    is_muted: bool
    total_inspiration_score: int
    created_at: str


class StarMapSettingsResponse(BaseModel):
    visible: bool


@router.get("/reports", response_model=list[ReportResponse])
async def list_reports(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all reports."""
    result = await db.execute(
        select(Report).order_by(Report.created_at.desc())
    )
    reports = result.scalars().all()
    
    out = []
    for report in reports:
        reporter_result = await db.execute(select(User).where(User.id == report.reporter_id))
        reporter = reporter_result.scalar_one()
        
        reported_user = None
        if report.reported_user_id:
            reported_user_result = await db.execute(select(User).where(User.id == report.reported_user_id))
            reported_user = reported_user_result.scalar_one_or_none()
        
        out.append(ReportResponse(
            id=report.id,
            reporter_id=report.reporter_id,
            reporter_username=reporter.username,
            reported_user_id=report.reported_user_id,
            reported_user_username=reported_user.username if reported_user else None,
            reported_pin_id=report.reported_pin_id,
            reason=report.reason,
            status=report.status,
            created_at=report.created_at.isoformat(),
        ))
    
    return out


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    
    return [
        UserResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            role=u.role.value,
            is_shadow_banned=u.is_shadow_banned,
            is_muted=u.is_muted,
            total_inspiration_score=u.total_inspiration_score,
            created_at=u.created_at.isoformat(),
        )
        for u in users
    ]


@router.post("/users/{user_id}/shadow-ban")
async def toggle_shadow_ban(
    user_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Toggle shadow ban status for a user."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot shadow ban yourself")
    
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    target_user.is_shadow_banned = not target_user.is_shadow_banned
    await db.flush()
    
    return {"status": "success", "is_shadow_banned": target_user.is_shadow_banned}


@router.post("/users/{user_id}/mute")
async def toggle_mute(
    user_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Toggle mute status for a user."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot mute yourself")
    
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    target_user.is_muted = not target_user.is_muted
    await db.flush()
    
    return {"status": "success", "is_muted": target_user.is_muted}


@router.get("/settings/star-map", response_model=StarMapSettingsResponse)
async def get_star_map_visibility(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get star map visibility setting."""
    result = await db.execute(select(GlobalSetting).where(GlobalSetting.key == "star_map_visible"))
    setting = result.scalar_one_or_none()
    
    if not setting:
        # Default to visible if not set
        return StarMapSettingsResponse(visible=True)
    
    if setting.is_boolean:
        return StarMapSettingsResponse(visible=setting.value.lower() == "true")
    return StarMapSettingsResponse(visible=True)


@router.post("/settings/star-map")
async def toggle_star_map_visibility(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Toggle star map visibility."""
    result = await db.execute(select(GlobalSetting).where(GlobalSetting.key == "star_map_visible"))
    setting = result.scalar_one_or_none()
    
    if not setting:
        setting = GlobalSetting(key="star_map_visible", value="true", is_boolean=True)
        db.add(setting)
    else:
        current_value = setting.value.lower() == "true"
        setting.value = "false" if current_value else "true"
    
    await db.flush()
    
    return {"status": "success", "visible": setting.value.lower() == "true"}
