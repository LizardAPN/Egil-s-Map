from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

from app.core.config import get_settings
from app.core.logging import setup_logging, get_logger, RequestLogger
from app.core.rate_limit import limiter, get_rate_limit_for_path
from app.api import auth, map_router, pins, profile, strongholds, beacon, admin

settings = get_settings()

# Setup logging
setup_logging(settings.environment)
logger = get_logger(__name__)
request_logger = RequestLogger(logger)

app = FastAPI(
    title="Egil's Map API",
    description="Open-source digital legacy platform",
    version="0.1.0",
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Ensure 500 errors return JSON with CORS headers."""
    logger.exception("Unhandled exception: %s", exc)
    origin = request.headers.get("origin", "")
    allow_origin = origin if origin in _cors_origins else _cors_origins[0]
    detail = "Internal server error"
    if settings.environment == "development":
        detail = str(exc)
    return JSONResponse(
        status_code=500,
        content={"detail": detail},
        headers={
            "Access-Control-Allow-Origin": allow_origin,
            "Access-Control-Allow-Credentials": "true",
        },
    )

# Configure CORS - ensure preflight requests work properly
# Include common dev ports (Next.js falls back when 3000 is in use)
_cors_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3005",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
    "http://127.0.0.1:3005",
    # Production
    "http://egilsmap.ru",
    "https://egilsmap.ru",
    "http://www.egilsmap.ru",
    "https://www.egilsmap.ru",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Log requests and errors."""
    user_id = None
    # Try to extract user_id from token if present (simplified - full extraction in deps)
    try:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            from app.core.security import decode_access_token
            payload = decode_access_token(token)
            if payload and payload.get("sub"):
                user_id = int(payload.get("sub"))
    except Exception:
        pass
    
    await request_logger.log_request(request, user_id)
    
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        await request_logger.log_error(e, request, user_id)
        raise

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(map_router.router, prefix="/map", tags=["map"])
app.include_router(pins.router, prefix="/pins", tags=["pins"])
app.include_router(profile.router, prefix="/profile", tags=["profile"])
app.include_router(strongholds.router, prefix="/strongholds", tags=["strongholds"])
app.include_router(beacon.router, prefix="/beacon", tags=["beacon"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])


@app.get("/health")
async def health():
    """Health check endpoint for monitoring."""
    health_status = {
        "status": "healthy",
        "db": "unknown",
        "redis": "unknown",
        "s3": "unknown",
    }
    
    # Check database
    try:
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        health_status["db"] = "ok"
    except Exception as e:
        health_status["db"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"
        logger.error("Database health check failed", extra={"error": str(e)})
    
    # Check Redis
    try:
        from app.core.redis import get_redis
        redis_client = await get_redis()
        await redis_client.ping()
        health_status["redis"] = "ok"
    except Exception as e:
        health_status["redis"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"
        logger.error("Redis health check failed", extra={"error": str(e)})
    
    # Check S3
    try:
        import boto3
        from botocore.config import Config
        from app.core.config import get_settings
        s3_settings = get_settings()
        s3_client = boto3.client(
            "s3",
            endpoint_url=s3_settings.s3_endpoint_url,
            aws_access_key_id=s3_settings.s3_access_key,
            aws_secret_access_key=s3_settings.s3_secret_key,
            region_name=s3_settings.s3_region,
            config=Config(s3={'addressing_style': 'path'})
        )
        s3_client.list_objects(Bucket=s3_settings.s3_bucket, MaxKeys=1)
        health_status["s3"] = "ok"
    except Exception as e:
        health_status["s3"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"
        logger.error("S3 health check failed", extra={"error": str(e)})
    
    status_code = 200 if health_status["status"] == "healthy" else 503
    return JSONResponse(content=health_status, status_code=status_code)
