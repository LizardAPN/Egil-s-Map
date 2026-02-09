from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://egilsmap:egilsmap_secret@localhost:5433/egilsmap"

    # S3
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "egilsmap-uploads"
    s3_region: str = "us-east-1"

    # Auth
    auth_secret: str = "your-auth-secret-min-32-chars"
    backend_url: str = "http://localhost:8000"

    class Config:
        # Look for .env in project root (parent of backend directory)
        env_file = str(Path(__file__).parent.parent.parent / ".env")
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
