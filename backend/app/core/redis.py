import redis.asyncio as redis
from functools import lru_cache
from typing import Optional

from .config import get_settings

settings = get_settings()

_redis_client: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    """Get Redis client instance."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def close_redis():
    """Close Redis connection."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None


def get_inspiration_count_key(user_id: int, date: str) -> str:
    """Get Redis key for daily inspiration count."""
    return f"inspiration_count:{user_id}:{date}"


async def get_daily_inspiration_count(user_id: int, date: str) -> Optional[int]:
    """Get daily inspiration count from Redis."""
    try:
        redis_client = await get_redis()
        key = get_inspiration_count_key(user_id, date)
        value = await redis_client.get(key)
        return int(value) if value else None
    except Exception:
        return None


async def increment_daily_inspiration_count(user_id: int, date: str, ttl_seconds: int) -> int:
    """Increment daily inspiration count in Redis."""
    try:
        redis_client = await get_redis()
        key = get_inspiration_count_key(user_id, date)
        count = await redis_client.incr(key)
        await redis_client.expire(key, ttl_seconds)
        return count
    except Exception:
        return 0
