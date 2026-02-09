from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from geoalchemy2.functions import ST_X, ST_Y, ST_AsText

from app.core.database import get_db
from app.models.pin import LegacyPin
from app.models.inspiration import Inspiration

router = APIRouter()


@router.get("/heatmap")
async def get_heatmap(
    min_lat: float = Query(...),
    max_lat: float = Query(...),
    min_lng: float = Query(...),
    max_lng: float = Query(...),
    db: AsyncSession = Depends(get_db),
):
    # Aggregate inspiration density by pin location
    bbox = f"POLYGON(({min_lng} {min_lat}, {max_lng} {min_lat}, {max_lng} {max_lat}, {min_lng} {max_lat}, {min_lng} {min_lat}))"
    result = await db.execute(
        text("""
            SELECT ST_X(p.location::geometry) as lng, ST_Y(p.location::geometry) as lat,
                   COUNT(i.id)::float as intensity
            FROM legacy_pins p
            LEFT JOIN inspirations i ON i.to_pin_id = p.id
            WHERE ST_Within(p.location::geometry, ST_GeomFromText(:bbox, 4326))
            GROUP BY p.id, p.location
        """),
        {"bbox": bbox.replace("POLYGON", "POLYGON").replace("  ", " ")},
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
    db: AsyncSession = Depends(get_db),
):
    bbox = f"POLYGON(({min_lng} {min_lat}, {max_lng} {min_lat}, {max_lng} {max_lat}, {min_lng} {max_lat}, {min_lng} {min_lat}))"
    result = await db.execute(
        text("""
            SELECT p.id, p.tier_id, p.user_id, ST_X(p.location::geometry) as lng, ST_Y(p.location::geometry) as lat,
                   p.content_type, p.content_url, p.text_content, p.is_private, p.is_echo,
                   (SELECT COUNT(*) FROM inspirations WHERE to_pin_id = p.id) as insp_count
            FROM legacy_pins p
            WHERE ST_Within(p.location::geometry, ST_GeomFromText(:bbox, 4326))
        """),
        {"bbox": bbox},
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
