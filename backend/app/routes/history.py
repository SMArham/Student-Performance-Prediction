"""
Prediction & Academic Records History Route
Student Performance Prediction & Analytics System
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from backend.app.core.security import get_current_user_id
from backend.app.services.supabase_service import supabase_service
from backend.app.models.schemas import HistoryItem
from ml.preprocessing import get_performance_badge

router = APIRouter(prefix="/api/v1/history", tags=["History"])


@router.get("", response_model=List[HistoryItem], summary="Get Student Prediction History")
async def get_history(
    limit: int = Query(20, ge=1, le=100, description="Max history records to return"),
    user_id: Optional[str] = Query(None, description="Optional User ID override"),
    auth_user_id: str = Depends(get_current_user_id),
):
    """
    Returns chronological history of all ML predictions made for the authenticated student.
    """
    effective_user_id = user_id or auth_user_id
    raw_history = supabase_service.get_prediction_history(user_id=effective_user_id, limit=limit)
    items: List[HistoryItem] = []
    for h in raw_history:
        stage = h.get("stage", "university")
        score = float(h.get("predicted_score", 0.0))
        b_text, b_col, _ = get_performance_badge(stage, score)
        items.append(
            HistoryItem(
                id=str(h.get("id", "")),
                stage=stage,
                model_name=str(h.get("model_name", "Predictor")),
                model_version=str(h.get("model_version", "v1.0.0")),
                predicted_score=score,
                status_badge=b_text,
                status_color=b_col,
                created_at=str(h.get("created_at", "")),
            )
        )
    return items
