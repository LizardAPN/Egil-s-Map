import logging
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from .config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()
ALGORITHM = "HS256"

# bcrypt limits input to 72 bytes; truncate if longer
BCRYPT_MAX_BYTES = 72


def _prepare_password(password: str) -> bytes:
    """Prepare password for bcrypt by ensuring it's <= 72 bytes."""
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > BCRYPT_MAX_BYTES:
        # Truncate to 72 bytes, handling UTF-8 boundaries
        truncated_bytes = password_bytes[:BCRYPT_MAX_BYTES]
        # Remove any incomplete UTF-8 sequences at the end
        while truncated_bytes and (truncated_bytes[-1] & 0xC0) == 0x80:
            truncated_bytes = truncated_bytes[:-1]
        return truncated_bytes
    return password_bytes


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(_prepare_password(plain_password), hashed_password.encode("utf-8"))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    password_bytes = _prepare_password(password)
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.auth_secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.auth_secret, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        # Log token length and error type (never log the token itself)
        logger.warning(
            "JWT decode failed: %s (token_len=%d)",
            str(e),
            len(token) if token else 0,
        )
        return None
