from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.core.redis import get_heatmap_cached, set_heatmap_cached

router = APIRouter()


@router.get("/heatmap")
async def get_heatmap(
    min_lat: float = Query(...),
    max_lat: float = Query(...),
    min_lng: float = Query(...),
    max_lng: float = Query(...),
    db: AsyncSession = Depends(get_db),
):
    # Try Redis cache first
    cached = await get_heatmap_cached(min_lat, max_lat, min_lng, max_lng)
    if cached is not None:
        return cached

    # Aggregate inspiration density by pin location
    # Use ST_DWithin (PostGIS) for spatial index usage
    center_lng = (min_lng + max_lng) / 2
    center_lat = (min_lat + max_lat) / 2
    distance_meters = 111000 * ((max_lat - min_lat) ** 2 + (max_lng - min_lng) ** 2) ** 0.5

    result = await db.execute(
        text("""
            SELECT ST_X(p.location::geometry) as lng, ST_Y(p.location::geometry) as lat,
                   COUNT(i.id)::float as intensity
            FROM legacy_pins p
            LEFT JOIN inspirations i ON i.to_pin_id = p.id
            WHERE ST_DWithin(
                p.location::geometry,
                ST_SetSRID(ST_MakePoint(:center_lng, :center_lat), 4326)::geography,
                :distance_meters
            )
            AND ST_X(p.location::geometry) BETWEEN :min_lng AND :max_lng
            AND ST_Y(p.location::geometry) BETWEEN :min_lat AND :max_lat
            GROUP BY p.id, p.location
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
    data = [
        {"lat": row[1], "lng": row[0], "intensity": max(0.1, min(1.0, row[2] / 10))}
        for row in rows
    ]
    await set_heatmap_cached(min_lat, max_lat, min_lng, max_lng, data)
    return data


@router.get("/pins")
async def get_pins(
    min_lat: float = Query(...),
    max_lat: float = Query(...),
    min_lng: float = Query(...),
    max_lng: float = Query(...),
    db: AsyncSession = Depends(get_db),
):
    # Use ST_DWithin for better spatial index usage
    center_lng = (min_lng + max_lng) / 2
    center_lat = (min_lat + max_lat) / 2
    # Approximate distance in meters
    distance_meters = 111000 * ((max_lat - min_lat) ** 2 + (max_lng - min_lng) ** 2) ** 0.5
    
    result = await db.execute(
        text("""
            SELECT p.id, p.tier_id, p.user_id, ST_X(p.location::geometry) as lng, ST_Y(p.location::geometry) as lat,
                   p.content_type, p.content_url, p.text_content, p.is_private, p.is_echo,
                   (SELECT COUNT(*) FROM inspirations WHERE to_pin_id = p.id) as insp_count
            FROM legacy_pins p
            WHERE ST_DWithin(
                p.location::geometry,
                ST_SetSRID(ST_MakePoint(:center_lng, :center_lat), 4326)::geography,
                :distance_meters
            )
            AND ST_X(p.location::geometry) BETWEEN :min_lng AND :max_lng
            AND ST_Y(p.location::geometry) BETWEEN :min_lat AND :max_lat
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
        {
            "id": r[0],
            "tier_id": r[1],
            "user_id": r[2],
            "lng": r[3],
            "lat": r[4],
            "content_type": r[5],
            "content_url": r[6],
            "text_content": r[7],
            "is_private": r[8],
            "is_echo": r[9],
            "inspiration_count": r[10],
        }
        for r in rows
    ]
