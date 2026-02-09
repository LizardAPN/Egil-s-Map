import uuid
from typing import BinaryIO

import boto3
from botocore.config import Config

from app.core.config import get_settings

settings = get_settings()

# Initialize S3 client lazily to prevent startup failures if S3 is unavailable
_client = None

def get_s3_client():
    """Get S3 client instance, creating it if needed."""
    global _client
    if _client is None:
        try:
            _client = boto3.client(
                "s3",
                endpoint_url=settings.s3_endpoint_url,
                aws_access_key_id=settings.s3_access_key,
                aws_secret_access_key=settings.s3_secret_key,
                config=Config(
                    signature_version="s3v4",
                    s3={'addressing_style': 'path'}
                ),
                region_name=settings.s3_region,
            )
        except Exception as e:
            # Log error but don't fail startup - S3 is not required for registration
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"S3 client initialization failed: {e}. S3 features will be unavailable.")
            raise
    return _client

# For backward compatibility, create client at module level if possible
try:
    client = get_s3_client()
except Exception:
    # If S3 is unavailable at startup, client will be None
    # Functions that use it will need to handle this gracefully
    client = None


def ensure_bucket():
    """Ensure S3 bucket exists, creating it if needed."""
    try:
        s3_client = get_s3_client()
        s3_client.head_bucket(Bucket=settings.s3_bucket)
    except Exception:
        # Bucket doesn't exist or S3 is unavailable - try to create it
        try:
            s3_client = get_s3_client()
            s3_client.create_bucket(Bucket=settings.s3_bucket)
        except Exception as e:
            # If S3 is unavailable, log warning but don't fail
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to ensure S3 bucket exists: {e}")
            raise


def upload_file(file: BinaryIO, content_type: str, key_prefix: str = "pins") -> str:
    ensure_bucket()
    ext = "bin"
    if "image" in content_type:
        ext = "jpg"
    elif "video" in content_type:
        ext = "mp4"
    key = f"{key_prefix}/{uuid.uuid4().hex}.{ext}"
    s3_client = get_s3_client()
    s3_client.upload_fileobj(
        file,
        settings.s3_bucket,
        key,
        ExtraArgs={"ContentType": content_type},
    )
    return f"{settings.s3_endpoint_url}/{settings.s3_bucket}/{key}"


def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    s3_client = get_s3_client()
    return s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket, "Key": key},
        ExpiresIn=expires_in,
    )
