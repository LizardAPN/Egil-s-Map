import io
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2 import WKTElement
from geoalchemy2.shape import to_shape
from pydantic import BaseModel

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.models.user import User
from app.models.stronghold import Stronghold, StrongholdMember, StrongholdMemberRole
from app.models.stronghold_media import StrongholdMedia
from app.models.stronghold_join_request import StrongholdJoinRequest, JoinRequestStatus
from app.models.stronghold_message import StrongholdMessage
from app.services.s3 import upload_file
from app.core.security import decode_access_token

router = APIRouter()
logger = logging.getLogger(__name__)


class StrongholdCreate(BaseModel):
    name: str
    lat: float
    lng: float
    is_private: bool = False
    description: Optional[str] = None


class StrongholdUpdate(BaseModel):
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    is_private: Optional[bool] = None


async def _get_brightness(db: AsyncSession, stronghold_id: int) -> int:
    result = await db.execute(
        select(func.coalesce(func.sum(User.total_inspiration_score), 0)).select_from(StrongholdMember)
        .join(User, User.id == StrongholdMember.user_id)
        .where(StrongholdMember.stronghold_id == stronghold_id)
    )
    return int(result.scalar() or 0)


async def _is_member(db: AsyncSession, stronghold_id: int, user_id: int) -> bool:
    result = await db.execute(
        select(StrongholdMember).where(
            StrongholdMember.stronghold_id == stronghold_id,
            StrongholdMember.user_id == user_id,
        )
    )
    return result.scalar_one_or_none() is not None


async def _get_member_role(db: AsyncSession, stronghold_id: int, user_id: int) -> Optional[str]:
    result = await db.execute(
        select(StrongholdMember.role).where(
            StrongholdMember.stronghold_id == stronghold_id,
            StrongholdMember.user_id == user_id,
        )
    )
    role_enum = result.scalar_one_or_none()
    return role_enum.value if role_enum else None


async def _is_leader_or_officer(db: AsyncSession, stronghold_id: int, user_id: int) -> bool:
    role = await _get_member_role(db, stronghold_id, user_id)
    return role in ("LEADER", "OFFICER")


def _stronghold_name(s: "Stronghold", locale: str | None) -> str:
    if locale == "en":
        return s.name_en or s.name_ru or s.name
    return s.name_ru or s.name_en or s.name


@router.get("")
async def list_strongholds(
    locale: Optional[str] = Query(None, description="Locale for name (ru, en)"),
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
        brightness = await _get_brightness(db, s.id)
        is_member = (await _is_member(db, s.id, user.id)) if user else False
        name = _stronghold_name(s, locale)
        out.append({
            "id": s.id,
            "name": name,
            "lat": pt.y,
            "lng": pt.x,
            "is_private": s.is_private,
            "brightness": brightness,
            "is_member": is_member,
        })
    return out


@router.get("/{stronghold_id}")
async def get_stronghold(
    stronghold_id: int,
    locale: Optional[str] = Query(None, description="Locale for name (ru, en)"),
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    result = await db.execute(select(Stronghold).where(Stronghold.id == stronghold_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Stronghold not found")

    pt = to_shape(s.location)
    brightness = await _get_brightness(db, s.id)
    is_member = await _get_member_role(db, s.id, user.id) if user else None
    member_role = is_member  # LEADER, OFFICER, MEMBER or None

    # Load members with username
    members_result = await db.execute(
        select(StrongholdMember, User.username)
        .join(User, User.id == StrongholdMember.user_id)
        .where(StrongholdMember.stronghold_id == stronghold_id)
    )
    members = [
        {"user_id": m.user_id, "username": u, "role": m.role.value}
        for m, u in members_result.all()
    ]

    # Load media
    media_result = await db.execute(
        select(StrongholdMedia).where(StrongholdMedia.stronghold_id == stronghold_id).order_by(StrongholdMedia.created_at.desc())
    )
    media_list = [
        {"id": m.id, "media_url": m.media_url, "media_type": m.media_type, "created_at": m.created_at.isoformat() if m.created_at else None}
        for m in media_result.scalars().all()
    ]

    return {
        "id": s.id,
        "name": _stronghold_name(s, locale),
        "description": s.description,
        "avatar_url": s.avatar_url,
        "is_private": s.is_private,
        "lat": pt.y,
        "lng": pt.x,
        "brightness": brightness,
        "member_count": len(members),
        "members": members,
        "media": media_list,
        "my_role": member_role,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


@router.post("")
async def create_stronghold(
    data: StrongholdCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.is_muted:
        raise HTTPException(
            status_code=403,
            detail="Your account has been muted. You cannot create content.",
        )

    try:
        point = WKTElement(f"POINT({data.lng} {data.lat})", srid=4326)
        stronghold = Stronghold(
            name=data.name,
            name_ru=data.name,
            name_en=data.name,
            description=data.description,
            is_private=data.is_private,
            location=point,
            leader_id=user.id,
        )
        db.add(stronghold)
        await db.flush()
        member = StrongholdMember(
            stronghold_id=stronghold.id,
            user_id=user.id,
            role=StrongholdMemberRole.LEADER,
        )
        db.add(member)
        await db.flush()
        pt = to_shape(stronghold.location)
        return {
            "id": stronghold.id,
            "name": stronghold.name,
            "description": stronghold.description,
            "is_private": stronghold.is_private,
            "lat": pt.y,
            "lng": pt.x,
        }
    except Exception as e:
        logger.error("Stronghold persistence error: %s", e, exc_info=True)
        raise


@router.patch("/{stronghold_id}")
async def update_stronghold(
    stronghold_id: int,
    data: StrongholdUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.is_muted:
        raise HTTPException(status_code=403, detail="Your account has been muted.")

    result = await db.execute(select(Stronghold).where(Stronghold.id == stronghold_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Stronghold not found")

    can_edit = await _is_leader_or_officer(db, stronghold_id, user.id)
    if not can_edit:
        raise HTTPException(status_code=403, detail="Only leaders and officers can edit the stronghold.")

    if data.description is not None:
        s.description = data.description
    if data.avatar_url is not None:
        s.avatar_url = data.avatar_url
    if data.is_private is not None:
        s.is_private = data.is_private
    await db.flush()
    pt = to_shape(s.location)
    return {
        "id": s.id,
        "name": s.name,
        "description": s.description,
        "avatar_url": s.avatar_url,
        "is_private": s.is_private,
        "lat": pt.y,
        "lng": pt.x,
    }


@router.post("/{stronghold_id}/join")
async def join_stronghold(
    stronghold_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.is_muted:
        raise HTTPException(
            status_code=403,
            detail="Your account has been muted. You cannot interact with content.",
        )

    result = await db.execute(select(Stronghold).where(Stronghold.id == stronghold_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Stronghold not found")

    if s.is_private:
        raise HTTPException(
            status_code=403,
            detail="This stronghold is private. Use request-entry to ask for access.",
        )

    existing = await db.execute(
        select(StrongholdMember).where(
            StrongholdMember.stronghold_id == stronghold_id,
            StrongholdMember.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already a member")

    try:
        member = StrongholdMember(stronghold_id=stronghold_id, user_id=user.id, role=StrongholdMemberRole.MEMBER)
        db.add(member)
        await db.flush()
        return {"status": "joined"}
    except Exception as e:
        logger.error("Stronghold join persistence error: %s", e, exc_info=True)
        raise


@router.post("/{stronghold_id}/request-entry")
async def request_entry(
    stronghold_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.is_muted:
        raise HTTPException(status_code=403, detail="Your account has been muted.")

    result = await db.execute(select(Stronghold).where(Stronghold.id == stronghold_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Stronghold not found")

    if not s.is_private:
        raise HTTPException(status_code=400, detail="This stronghold is public. Use join instead.")

    if await _is_member(db, stronghold_id, user.id):
        raise HTTPException(status_code=400, detail="Already a member")

    # Check for existing pending request
    existing = await db.execute(
        select(StrongholdJoinRequest).where(
            StrongholdJoinRequest.stronghold_id == stronghold_id,
            StrongholdJoinRequest.user_id == user.id,
            StrongholdJoinRequest.status == JoinRequestStatus.PENDING,
        )
    )
    if existing.scalar_one_or_none():
        return {"status": "already_requested", "message": "Request already pending"}

    req = StrongholdJoinRequest(
        stronghold_id=stronghold_id,
        user_id=user.id,
        status=JoinRequestStatus.PENDING,
    )
    db.add(req)
    await db.flush()
    return {"status": "requested", "id": req.id}


@router.get("/{stronghold_id}/join-requests")
async def list_join_requests(
    stronghold_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.is_muted:
        raise HTTPException(status_code=403, detail="Your account has been muted.")

    can_view = await _is_leader_or_officer(db, stronghold_id, user.id)
    if not can_view:
        raise HTTPException(status_code=403, detail="Only leaders and officers can view join requests.")

    result = await db.execute(
        select(StrongholdJoinRequest, User.username)
        .join(User, User.id == StrongholdJoinRequest.user_id)
        .where(
            StrongholdJoinRequest.stronghold_id == stronghold_id,
            StrongholdJoinRequest.status == JoinRequestStatus.PENDING,
        )
        .order_by(StrongholdJoinRequest.created_at.desc())
    )
    requests = [
        {
            "id": r.id,
            "user_id": r.user_id,
            "username": u,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r, u in result.all()
    ]
    return {"requests": requests}


@router.post("/{stronghold_id}/join-requests/{request_id}/approve")
async def approve_join_request(
    stronghold_id: int,
    request_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.is_muted:
        raise HTTPException(status_code=403, detail="Your account has been muted.")

    can_approve = await _is_leader_or_officer(db, stronghold_id, user.id)
    if not can_approve:
        raise HTTPException(status_code=403, detail="Only leaders and officers can approve requests.")

    result = await db.execute(
        select(StrongholdJoinRequest).where(
            StrongholdJoinRequest.id == request_id,
            StrongholdJoinRequest.stronghold_id == stronghold_id,
            StrongholdJoinRequest.status == JoinRequestStatus.PENDING,
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Join request not found or already processed")

    from datetime import datetime, timezone
    req.status = JoinRequestStatus.APPROVED
    req.reviewed_at = datetime.now(timezone.utc)
    req.reviewed_by_id = user.id

    member = StrongholdMember(stronghold_id=stronghold_id, user_id=req.user_id, role=StrongholdMemberRole.MEMBER)
    db.add(member)
    await db.flush()
    return {"status": "approved"}


@router.post("/{stronghold_id}/join-requests/{request_id}/reject")
async def reject_join_request(
    stronghold_id: int,
    request_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.is_muted:
        raise HTTPException(status_code=403, detail="Your account has been muted.")

    can_reject = await _is_leader_or_officer(db, stronghold_id, user.id)
    if not can_reject:
        raise HTTPException(status_code=403, detail="Only leaders and officers can reject requests.")

    result = await db.execute(
        select(StrongholdJoinRequest).where(
            StrongholdJoinRequest.id == request_id,
            StrongholdJoinRequest.stronghold_id == stronghold_id,
            StrongholdJoinRequest.status == JoinRequestStatus.PENDING,
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Join request not found or already processed")

    from datetime import datetime, timezone
    req.status = JoinRequestStatus.REJECTED
    req.reviewed_at = datetime.now(timezone.utc)
    req.reviewed_by_id = user.id
    await db.flush()
    return {"status": "rejected"}


@router.post("/{stronghold_id}/media")
async def upload_stronghold_media(
    stronghold_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.is_muted:
        raise HTTPException(status_code=403, detail="Your account has been muted.")

    if not await _is_member(db, stronghold_id, user.id):
        raise HTTPException(status_code=403, detail="Only members can upload media.")

    content_type = file.content_type or "application/octet-stream"
    if "image" not in content_type and "video" not in content_type:
        raise HTTPException(status_code=400, detail="File must be an image or video.")

    media_type = "photo" if "image" in content_type else "video"
    try:
        content = await file.read()
        url = upload_file(io.BytesIO(content), content_type, key_prefix="strongholds")
    except Exception as e:
        logger.error("Stronghold media upload error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Upload failed")

    media = StrongholdMedia(
        stronghold_id=stronghold_id,
        uploaded_by_id=user.id,
        media_url=url,
        media_type=media_type,
    )
    db.add(media)
    await db.flush()
    return {
        "id": media.id,
        "media_url": media.media_url,
        "media_type": media.media_type,
        "created_at": media.created_at.isoformat() if media.created_at else None,
    }


# --- Council Chat ---

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, stronghold_id: int):
        await websocket.accept()
        if stronghold_id not in self.active_connections:
            self.active_connections[stronghold_id] = []
        self.active_connections[stronghold_id].append(websocket)

    def disconnect(self, websocket: WebSocket, stronghold_id: int):
        if stronghold_id in self.active_connections:
            self.active_connections[stronghold_id] = [
                ws for ws in self.active_connections[stronghold_id] if ws != websocket
            ]
            if not self.active_connections[stronghold_id]:
                del self.active_connections[stronghold_id]

    async def broadcast(self, stronghold_id: int, message: dict):
        if stronghold_id not in self.active_connections:
            return
        dead = []
        for ws in self.active_connections[stronghold_id]:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, stronghold_id)


chat_manager = ConnectionManager()


@router.get("/{stronghold_id}/messages")
async def get_messages(
    stronghold_id: int,
    limit: int = Query(50, ge=1, le=100),
    before: Optional[int] = Query(None, description="Message ID - return messages before this"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await _is_member(db, stronghold_id, user.id):
        raise HTTPException(status_code=403, detail="Only members can view messages.")

    q = (
        select(StrongholdMessage, User.username)
        .join(User, User.id == StrongholdMessage.user_id)
        .where(StrongholdMessage.stronghold_id == stronghold_id)
        .order_by(StrongholdMessage.created_at.desc())
    )
    if before:
        q = q.where(StrongholdMessage.id < before)
    result = await db.execute(q.limit(limit + 1))
    rows = result.all()
    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]
    messages = [
        {
            "id": m.id,
            "user_id": m.user_id,
            "username": u,
            "content": m.content,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m, u in reversed(rows)
    ]
    return {"messages": messages, "has_more": has_more}


@router.websocket("/{stronghold_id}/chat")
async def websocket_chat(websocket: WebSocket, stronghold_id: int):
    from app.core.database import AsyncSessionLocal

    token = websocket.query_params.get("token")
    if not token or token.strip() in ("", "undefined", "null"):
        await websocket.close(code=4001)
        return

    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        await websocket.close(code=4001)
        return

    try:
        user_id = int(payload.get("sub"))
    except (ValueError, TypeError):
        await websocket.close(code=4001)
        return
    async with AsyncSessionLocal() as db_session:
        if not await _is_member(db_session, stronghold_id, user_id):
            await websocket.close(code=4003)
            return

        result = await db_session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        username = user.username if user else "?"

    await chat_manager.connect(websocket, stronghold_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                content = (msg.get("content") or "").strip()
                if not content or len(content) > 2000:
                    continue
            except (json.JSONDecodeError, TypeError):
                continue

            async with AsyncSessionLocal() as db_session:
                msg_obj = StrongholdMessage(
                    stronghold_id=stronghold_id,
                    user_id=user_id,
                    content=content,
                )
                db_session.add(msg_obj)
                await db_session.commit()
                await db_session.refresh(msg_obj)

            payload = {
                "id": msg_obj.id,
                "user_id": user_id,
                "username": username,
                "content": content,
                "created_at": msg_obj.created_at.isoformat() if msg_obj.created_at else None,
            }
            await chat_manager.broadcast(stronghold_id, payload)
    except WebSocketDisconnect:
        pass
    finally:
        chat_manager.disconnect(websocket, stronghold_id)
