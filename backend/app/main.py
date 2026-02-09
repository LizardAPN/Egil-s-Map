from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api import auth, map_router, pins, profile, strongholds, beacon

settings = get_settings()

app = FastAPI(
    title="Egil's Map API",
    description="Open-source digital legacy platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(map_router.router, prefix="/map", tags=["map"])
app.include_router(pins.router, prefix="/pins", tags=["pins"])
app.include_router(profile.router, prefix="/profile", tags=["profile"])
app.include_router(strongholds.router, prefix="/strongholds", tags=["strongholds"])
app.include_router(beacon.router, prefix="/beacon", tags=["beacon"])


@app.get("/health")
async def health():
    return {"status": "ok"}
