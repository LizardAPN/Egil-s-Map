import json
import redis.asyncio as redis
from functools import lru_cache
from typing import Optional, Any

from .config import get_settings

settings = get_settings()

_redis_client: Optional[redis.Redis] = None

HEATMAP_CACHE_TTL = 300  # 5 minutes

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


def get_heatmap_cache_key(min_lat: float, max_lat: float, min_lng: float, max_lng: float) -> str:
    """Get Redis key for heatmap data. Round bounds to 2 decimals for cache hits."""
    r_min_lat = round(min_lat, 2)
    r_max_lat = round(max_lat, 2)
    r_min_lng = round(min_lng, 2)
    r_max_lng = round(max_lng, 2)
    return f"heatmap:{r_min_lat}:{r_max_lat}:{r_min_lng}:{r_max_lng}"


async def get_heatmap_cached(
    min_lat: float, max_lat: float, min_lng: float, max_lng: float
) -> Optional[list[dict[str, Any]]]:
    """Get heatmap data from Redis cache."""
    try:
        redis_client = await get_redis()
        key = get_heatmap_cache_key(min_lat, max_lat, min_lng, max_lng)
        value = await redis_client.get(key)
        return json.loads(value) if value else None
    except Exception:
        return None


async def set_heatmap_cached(
    min_lat: float, max_lat: float, min_lng: float, max_lng: float, data: list[dict[str, Any]]
) -> None:
    """Cache heatmap data in Redis."""
    try:
        redis_client = await get_redis()
        key = get_heatmap_cache_key(min_lat, max_lat, min_lng, max_lng)
        await redis_client.set(key, json.dumps(data), ex=HEATMAP_CACHE_TTL)
    except Exception:
        pass
