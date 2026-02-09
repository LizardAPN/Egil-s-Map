from typing import Optional
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .database import get_db, AsyncSessionLocal
from .security import decode_access_token
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-Auth-Token", auto_error=False)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_token: Optional[str] = Depends(api_key_header),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    token = None
    if credentials:
        token = credentials.credentials
    elif x_token:
        token = x_token

    if not token or token.strip() in ("", "undefined", "null"):
        return None

    payload = decode_access_token(token)
    if not payload:
        logger.debug("Auth failed: token decode failed (invalid or expired)")
        return None

    user_id = payload.get("sub")
    if not user_id:
        logger.debug("Auth failed: no sub in token payload")
        return None

    # Convert user_id to integer since User.id is an integer column
    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        return None

    result = await db.execute(select(User).where(User.id == user_id_int))
    user = result.scalar_one_or_none()
    if not user:
        logger.debug("Auth failed: user not found for sub=%s", user_id)
        return None

    # Debug logging for role
    logger.debug(f"User authenticated: id={user.id}, username={user.username}, role={user.role.value}")

    # If user is shadow banned, return None (they appear as not authenticated)
    if user.is_shadow_banned:
        logger.debug("Auth failed: user shadow banned")
        return None

    return user


async def get_current_user(
    user: Optional[User] = Depends(get_current_user_optional),
) -> User:
    if user is None:
        logger.warning("Protected route: not authenticated (missing/invalid token or user not found)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user


async def require_role(
    required_role: UserRole,
    user: User = Depends(get_current_user),
) -> User:
    """Require user to have at least the specified role."""
    role_hierarchy = {
        UserRole.USER: 1,
        UserRole.MODERATOR: 2,
        UserRole.ADMIN: 3,
    }
    
    user_level = role_hierarchy.get(user.role, 0)
    required_level = role_hierarchy.get(required_role, 0)
    
    if user_level < required_level:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires {required_role.value} role or higher",
        )
    
    return user


async def require_moderator(
    user: User = Depends(get_current_user),
) -> User:
    """Require user to be MODERATOR or ADMIN."""
    return await require_role(UserRole.MODERATOR, user)


async def require_admin(
    user: User = Depends(get_current_user),
) -> User:
    """Require user to be ADMIN."""
    return await require_role(UserRole.ADMIN, user)
