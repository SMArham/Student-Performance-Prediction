"""
Model Registry Route
Student Performance Prediction & Analytics System
"""

from typing import Dict, Any, List
from fastapi import APIRouter
from backend.app.services.ml_service import ml_service

router = APIRouter(prefix="/api/v1/models", tags=["Model Registry"])


@router.get("", summary="Get Catalog of Active ML Models & Metrics")
async def get_models_catalog():
    """
    Returns registered stage models, algorithms, performance metrics (R2, RMSE, MAE), and input feature schemas.
    """
    return ml_service.registry
