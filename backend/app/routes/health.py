"""
Health Check & System Diagnostics Route
Student Performance Prediction & Analytics System
"""

from datetime import datetime, timezone
from fastapi import APIRouter
from backend.app.config import settings
from backend.app.services.ml_service import ml_service
from backend.app.core.database import get_supabase_client

router = APIRouter(tags=["Health"])


@router.get("/health", summary="System Health & Readiness Check")
async def health_check():
    """
    Returns API server status, active ML models, database connectivity, and timestamp.
    """
    supabase = get_supabase_client()
    db_status = "connected" if supabase is not None else "in-memory-demo-mode"

    loaded_stages = list(ml_service.models.keys())
    all_models_ready = len(loaded_stages) >= 4

    return {
        "status": "healthy" if all_models_ready else "degraded",
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "status": db_status,
            "provider": "Supabase PostgreSQL",
        },
        "ml_engine": {
            "status": "operational" if all_models_ready else "partial",
            "active_models_count": len(loaded_stages),
            "loaded_stages": loaded_stages,
        },
        "version": "1.0.0",
    }
