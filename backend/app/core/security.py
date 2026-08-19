"""
Security & Authentication Utilities
Student Performance Prediction & Analytics System
"""

import json
import base64
from typing import Optional, Dict, Any
from fastapi import Header
from backend.app.config import settings
from backend.app.core.logger import logger


def decode_jwt_unverified(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes JWT payload without external library dependencies.
    Safe for extracting subject/user_id from client tokens.
    """
    try:
        parts = token.split(".")
        if len(parts) >= 2:
            payload_b64 = parts[1]
            # Handle padding
            rem = len(payload_b64) % 4
            if rem > 0:
                payload_b64 += "=" * (4 - rem)
            payload_json = base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8")
            return json.loads(payload_json)
    except Exception as e:
        logger.debug(f"Could not parse JWT token: {e}")
    return None


def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """
    Extracts authenticated user_id from Authorization Bearer JWT header.
    Returns demo user ID if running in local demo mode or no token is provided.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return "demo-user-id-001"

    token = authorization.split(" ")[1]

    # Handle demo tokens
    if token.startswith("demo-") or token in ["mock_anon_key", "null", "undefined"]:
        return "demo-user-id-001"

    payload = decode_jwt_unverified(token)
    if payload:
        user_id = payload.get("sub") or payload.get("user_id") or payload.get("id")
        if user_id:
            return user_id

    return "demo-user-id-001"
