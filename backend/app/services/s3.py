import uuid
from typing import BinaryIO

import boto3
from botocore.config import Config

from app.core.config import get_settings

settings = get_settings()

client = boto3.client(
    "s3",
    endpoint_url=settings.s3_endpoint_url,
    aws_access_key_id=settings.s3_access_key,
    aws_secret_access_key=settings.s3_secret_key,
    config=Config(signature_version="s3v4"),
    region_name=settings.s3_region,
)


def ensure_bucket():
    try:
        client.head_bucket(Bucket=settings.s3_bucket)
    except Exception:
        client.create_bucket(Bucket=settings.s3_bucket)


def upload_file(file: BinaryIO, content_type: str, key_prefix: str = "pins") -> str:
    ensure_bucket()
    ext = "bin"
    if "image" in content_type:
        ext = "jpg"
    elif "video" in content_type:
        ext = "mp4"
    key = f"{key_prefix}/{uuid.uuid4().hex}.{ext}"
    client.upload_fileobj(
        file,
        settings.s3_bucket,
        key,
        ExtraArgs={"ContentType": content_type},
    )
    return f"{settings.s3_endpoint_url}/{settings.s3_bucket}/{key}"


def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket, "Key": key},
        ExpiresIn=expires_in,
    )
