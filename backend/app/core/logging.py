import logging
import json
import sys
from pythonjsonlogger import jsonlogger
from datetime import datetime


def setup_logging(environment: str = "development"):
    """Setup structured JSON logging."""
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO if environment == "production" else logging.DEBUG)
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # JSON formatter for structured logging
    json_formatter = jsonlogger.JsonFormatter(
        "%(timestamp)s %(level)s %(name)s %(message)s",
        timestamp=True,
    )
    
    # Console handler (always)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(json_formatter)
    root_logger.addHandler(console_handler)
    
    # File handler for production
    if environment == "production":
        file_handler = logging.FileHandler("app.log")
        file_handler.setFormatter(json_formatter)
        root_logger.addHandler(file_handler)
    
    return root_logger


def get_logger(name: str):
    """Get a logger instance."""
    return logging.getLogger(name)


class RequestLogger:
    """Middleware logger for FastAPI requests."""
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
    
    async def log_request(self, request, user_id: int | None = None):
        """Log request details."""
        extra = {
            "method": request.method,
            "path": request.url.path,
            "query_params": str(request.query_params),
            "client_ip": request.client.host if request.client else None,
            "user_id": user_id,
        }
        self.logger.info("Request received", extra=extra)
    
    async def log_error(self, error: Exception, request, user_id: int | None = None):
        """Log error details."""
        extra = {
            "error_type": type(error).__name__,
            "error_message": str(error),
            "method": request.method,
            "path": request.url.path,
            "user_id": user_id,
        }
        self.logger.error("Request error", extra=extra, exc_info=True)
