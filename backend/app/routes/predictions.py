"""
Multi-Stage Machine Learning Prediction Route
Student Performance Prediction & Analytics System
"""

from typing import Dict, Any, Union, Optional
from fastapi import APIRouter, Depends, Path, Body, Query, status
from backend.app.core.security import get_current_user_id
from backend.app.core.exceptions import ValidationError
from backend.app.services.ml_service import ml_service
from backend.app.services.supabase_service import supabase_service
from backend.app.models.schemas import (
    UniversityPredictionRequest,
    MatricInterPredictionRequest,
    SecondaryPredictionRequest,
    PrimaryPredictionRequest,
    PredictionResponse,
)

router = APIRouter(prefix="/api/v1/predictions", tags=["Predictions"])


@router.post("/{stage}", response_model=PredictionResponse, status_code=status.HTTP_200_OK, summary="Run ML Prediction for Educational Stage")
async def run_stage_prediction(
    stage: str = Path(..., description="Educational Stage: university, matric_inter, secondary, primary"),
    payload: Dict[str, Any] = Body(..., description="Stage-specific input features JSON"),
    user_id: Optional[str] = Query(None, description="Optional User ID override"),
    auth_user_id: str = Depends(get_current_user_id),
):
    """
    Executes trained ML pipeline inference for the specified educational stage:
    - **university**: Gradient Boosting Regressor (predicts Final CGPA)
    - **matric_inter**: Ridge Regression (predicts HSSC-II Marks)
    - **secondary**: Gradient Boosting Regressor (predicts G3 Score)
    - **primary**: Linear Regression (predicts Education Score)
    
    Returns calibrated prediction, confidence intervals, status badge, and explanations.
    """
    effective_user_id = user_id or auth_user_id
    valid_stages = ["university", "matric_inter", "secondary", "primary"]
    stage_clean = stage.lower()
    if stage_clean not in valid_stages:
        raise ValidationError(f"Invalid stage '{stage}'. Must be one of: {', '.join(valid_stages)}")

    # Execute ML Inference
    result = ml_service.predict(stage=stage_clean, input_dict=payload)

    # Save to history
    supabase_service.save_prediction(
        user_id=effective_user_id,
        pred_data={
            "stage": stage_clean,
            "model_name": result["model_name"],
            "model_version": result["model_version"],
            "input_features": payload,
            "predicted_score": result["predicted_score"],
            "predicted_grade": result.get("predicted_grade"),
            "confidence_interval_low": result["confidence_interval_low"],
            "confidence_interval_high": result["confidence_interval_high"],
            "status_badge": result["status_badge"],
            "feature_contributions": result.get("feature_contributions", {}),
        },
    )

    return result
