"""
Centralized Exception Handling Module
Student Performance Prediction & Analytics System
"""

from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from backend.app.core.logger import logger


class AppException(Exception):
    """Base application exception."""
    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class ValidationError(AppException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, details=details)


class ResourceNotFoundError(AppException):
    def __init__(self, message: str = "Requested resource not found", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND, details=details)


class AuthenticationError(AppException):
    def __init__(self, message: str = "Invalid or expired authentication credentials", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=status.HTTP_401_UNAUTHORIZED, details=details)


class ModelInferenceError(AppException):
    def __init__(self, message: str = "Error executing ML model inference", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, details=details)


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handles all custom application exceptions with standardized error JSON."""
    logger.error(f"AppException on {request.method} {request.url.path}: {exc.message} (status: {exc.status_code})")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "type": exc.__class__.__name__,
                "message": exc.message,
                "details": exc.details,
                "status_code": exc.status_code,
            },
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Fallback handler for unhandled internal server exceptions."""
    logger.exception(f"Unhandled Exception on {request.method} {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "type": "InternalServerError",
                "message": "An unexpected internal server error occurred.",
                "details": {"error": str(exc)},
                "status_code": 500,
            },
        },
    )
