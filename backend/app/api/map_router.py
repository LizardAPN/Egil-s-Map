from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.core.deps import get_current_user_optional
from app.core.redis import get_heatmap_cached, set_heatmap_cached
from app.models.user import User

router = APIRouter()


@router.get("/chapters")
async def get_chapters(
    min_lat: float = Query(...),
    max_lat: float = Query(...),
    min_lng: float = Query(...),
    max_lng: float = Query(...),
    locale: Optional[str] = Query(None, description="Locale for tier_title (ru, en)"),
    user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Chapters (bonfires) in the bbox. When authenticated, returns only the current user's chapters (everyone has their own map)."""
    if user is None:
        return []

    title_col = "title_en" if locale == "en" else "title_ru"
    result = await db.execute(
        text(f"""
            WITH tier_in_bbox AS (
                SELECT t.id AS tier_id, t.{title_col} AS tier_title,
                       ST_Y(t.location::geometry) AS lat, ST_X(t.location::geometry) AS lng
                FROM beacon_tiers t
                WHERE t.user_id = :user_id
                AND t.location IS NOT NULL
                AND ST_X(t.location::geometry) BETWEEN :min_lng AND :max_lng
                AND ST_Y(t.location::geometry) BETWEEN :min_lat AND :max_lat
            ),
            tier_from_pins AS (
                SELECT DISTINCT ON (p.tier_id) p.tier_id, t.{title_col} AS tier_title,
                       ST_Y(p.location::geometry) AS lat, ST_X(p.location::geometry) AS lng
                FROM legacy_pins p
                JOIN beacon_tiers t ON t.id = p.tier_id
                WHERE t.user_id = :user_id
                AND t.location IS NULL
                AND ST_X(p.location::geometry) BETWEEN :min_lng AND :max_lng
                AND ST_Y(p.location::geometry) BETWEEN :min_lat AND :max_lat
                ORDER BY p.tier_id, p.created_at
            )
            SELECT tier_id, tier_title, lat, lng FROM tier_in_bbox
            UNION ALL
            SELECT tfp.tier_id, tfp.tier_title, tfp.lat, tfp.lng FROM tier_from_pins tfp
            WHERE NOT EXISTS (SELECT 1 FROM tier_in_bbox tib WHERE tib.tier_id = tfp.tier_id)
        """),
        {
            "user_id": user.id,
            "min_lng": min_lng,
            "max_lng": max_lng,
            "min_lat": min_lat,
            "max_lat": max_lat,
        },
    )
    rows = result.fetchall()
    return [
        {"tier_id": r[0], "tier_title": r[1], "lat": r[2], "lng": r[3]}
        for r in rows
    ]


@router.get("/heatmap")
async def get_heatmap(
    min_lat: float = Query(...),
    max_lat: float = Query(...),
    min_lng: float = Query(...),
    max_lng: float = Query(...),
    user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Heatmap in bbox. When authenticated, only current user's pins (everyone has their own map)."""
    if user is None:
        return []

    # No cache when filtered by user (per-user data)
    center_lng = (min_lng + max_lng) / 2
    center_lat = (min_lat + max_lat) / 2
    distance_meters = 111000 * ((max_lat - min_lat) ** 2 + (max_lng - min_lng) ** 2) ** 0.5

    result = await db.execute(
        text("""
            SELECT ST_X(p.location::geometry) as lng, ST_Y(p.location::geometry) as lat,
                   COUNT(i.id)::float as intensity
            FROM legacy_pins p
            LEFT JOIN inspirations i ON i.to_pin_id = p.id
            WHERE p.user_id = :user_id
            AND ST_DWithin(
                p.location::geometry,
                ST_SetSRID(ST_MakePoint(:center_lng, :center_lat), 4326)::geography,
                :distance_meters
            )
            AND ST_X(p.location::geometry) BETWEEN :min_lng AND :max_lng
            AND ST_Y(p.location::geometry) BETWEEN :min_lat AND :max_lat
            GROUP BY p.id, p.location
        """),
        {
            "user_id": user.id,
            "center_lng": center_lng,
            "center_lat": center_lat,
            "distance_meters": distance_meters,
            "min_lng": min_lng,
            "max_lng": max_lng,
            "min_lat": min_lat,
            "max_lat": max_lat,
        },
    )
    rows = result.fetchall()
    return [
        {"lat": row[1], "lng": row[0], "intensity": max(0.1, min(1.0, row[2] / 10))}
        for row in rows
    ]


@router.get("/pins")
async def get_pins(
    min_lat: float = Query(...),
    max_lat: float = Query(...),
    min_lng: float = Query(...),
    max_lng: float = Query(...),
    locale: Optional[str] = Query(None, description="Locale for tier_title (ru, en)"),
    user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Pins in the bbox. When authenticated, returns only the current user's pins (everyone has their own map)."""
    if user is None:
        return []

    # Use ST_DWithin for better spatial index usage
    center_lng = (min_lng + max_lng) / 2
    center_lat = (min_lat + max_lat) / 2
    # Approximate distance in meters
    distance_meters = 111000 * ((max_lat - min_lat) ** 2 + (max_lng - min_lng) ** 2) ** 0.5
    title_col = "title_en" if locale == "en" else "title_ru"

    result = await db.execute(
        text(f"""
            SELECT p.id, p.tier_id, t.{title_col} as tier_title, p.user_id,
                   ST_X(p.location::geometry) as lng, ST_Y(p.location::geometry) as lat,
                   p.content_type, p.content_url, p.text_content, p.is_private, p.is_echo,
                   (SELECT COUNT(*) FROM inspirations WHERE to_pin_id = p.id) as insp_count,
                   p.created_at
            FROM legacy_pins p
            JOIN beacon_tiers t ON t.id = p.tier_id
            WHERE p.user_id = :user_id
            AND ST_DWithin(
                p.location::geometry,
                ST_SetSRID(ST_MakePoint(:center_lng, :center_lat), 4326)::geography,
                :distance_meters
            )
            AND ST_X(p.location::geometry) BETWEEN :min_lng AND :max_lng
            AND ST_Y(p.location::geometry) BETWEEN :min_lat AND :max_lat
            ORDER BY p.tier_id, p.created_at
        """),
        {
            "user_id": user.id,
            "center_lng": center_lng,
            "center_lat": center_lat,
            "distance_meters": distance_meters,
            "min_lng": min_lng,
            "max_lng": max_lng,
            "min_lat": min_lat,
            "max_lat": max_lat,
        },
    )
    rows = result.fetchall()
    return [
        {
            "id": r[0],
            "tier_id": r[1],
            "tier_title": r[2],
            "user_id": r[3],
            "lng": r[4],
            "lat": r[5],
            "content_type": r[6],
            "content_url": r[7],
            "text_content": r[8],
            "is_private": r[9],
            "is_echo": r[10],
            "inspiration_count": r[11],
            "created_at": r[12].isoformat() if r[12] else None,
        }
        for r in rows
    ]


@router.get("/strongholds")
async def get_strongholds(
    min_lat: float = Query(...),
    max_lat: float = Query(...),
    min_lng: float = Query(...),
    max_lng: float = Query(...),
    locale: Optional[str] = Query(None, description="Locale for name (ru, en)"),
    db: AsyncSession = Depends(get_db),
):
    center_lng = (min_lng + max_lng) / 2
    center_lat = (min_lat + max_lat) / 2
    distance_meters = 111000 * ((max_lat - min_lat) ** 2 + (max_lng - min_lng) ** 2) ** 0.5
    name_col = "name_en" if locale == "en" else "name_ru"

    result = await db.execute(
        text(f"""
            SELECT s.id, s.{name_col} as name, ST_X(s.location::geometry) as lng, ST_Y(s.location::geometry) as lat,
                   COALESCE(SUM(u.total_inspiration_score), 0)::int as brightness
            FROM strongholds s
            LEFT JOIN stronghold_members sm ON sm.stronghold_id = s.id
            LEFT JOIN users u ON u.id = sm.user_id
            WHERE ST_DWithin(
                s.location::geometry,
                ST_SetSRID(ST_MakePoint(:center_lng, :center_lat), 4326)::geography,
                :distance_meters
            )
            AND ST_X(s.location::geometry) BETWEEN :min_lng AND :max_lng
            AND ST_Y(s.location::geometry) BETWEEN :min_lat AND :max_lat
            GROUP BY s.id, s.name_ru, s.name_en, s.location
        """),
        {
            "center_lng": center_lng,
            "center_lat": center_lat,
            "distance_meters": distance_meters,
            "min_lng": min_lng,
            "max_lng": max_lng,
            "min_lat": min_lat,
            "max_lat": max_lat,
        },
    )
    rows = result.fetchall()
    return [
        {"id": r[0], "name": r[1], "lng": r[2], "lat": r[3], "brightness": r[4]}
        for r in rows
    ]
