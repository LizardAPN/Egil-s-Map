from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pathlib import Path

# Calculate .env file path relative to this file
# config.py is at backend/app/core/config.py, so we need to go up 3 levels to get to project root
_ENV_FILE = Path(__file__).parent.parent.parent.parent / ".env"


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

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Environment
    environment: str = "development"

    model_config = SettingsConfigDict(
        # Look for .env in project root (parent of backend directory)
        env_file=str(_ENV_FILE.resolve()),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
