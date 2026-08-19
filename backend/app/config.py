"""
Application Configuration Module
Student Performance Prediction & Analytics System
"""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8005

    SECRET_KEY: str = "dev_secret_key_student_performance_analytics_system_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Supabase Credentials
    SUPABASE_URL: str = "https://your-project-id.supabase.co"
    SUPABASE_ANON_KEY: str = "mock_anon_key"
    SUPABASE_SERVICE_ROLE_KEY: str = "mock_service_role_key"
    SUPABASE_DB_PASSWORD: str = "PA5WJyT+$xMpvPd"

    # ML Artifacts Directory (relative to project root)
    ML_ARTIFACTS_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ml", "artifacts")

    # CORS Allowed Origins
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:8005",
        "http://127.0.0.1:8005",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*",
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
