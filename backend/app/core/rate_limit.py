from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request

limiter = Limiter(key_func=get_remote_address)

# Rate limit configurations per endpoint pattern
RATE_LIMITS = {
    "map": "100/minute",
    "pin_create": "10/hour",
    "inspiration": "5/day",  # Already enforced in endpoint logic
    "admin": "50/minute",
    "default": "200/minute",
}


def get_rate_limit_for_path(path: str) -> str:
    """Determine rate limit based on path."""
    if path.startswith("/map"):
        return RATE_LIMITS["map"]
    elif path.startswith("/pins") and "inspire" in path:
        return RATE_LIMITS["inspiration"]
    elif path.startswith("/pins") and any(method in path for method in ["POST", ""]):
        return RATE_LIMITS["pin_create"]
    elif path.startswith("/admin"):
        return RATE_LIMITS["admin"]
    else:
        return RATE_LIMITS["default"]
