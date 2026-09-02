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
@router.get("/student", response_model=List[HistoryItem], summary="Get Student Prediction History (Alias)")
async def get_history(
    limit: int = Query(50, ge=1, le=100, description="Max history records to return"),
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
                role=str(h.get("role", "student")),
                model_name=str(h.get("model_name", "Predictor")),
                model_version=str(h.get("model_version", "v1.0.0")),
                score=h.get("formatted_score") or h.get("score") or f"{score}",
                formatted_score=h.get("formatted_score") or h.get("score") or f"{score}",
                predicted_score=score,
                predicted_grade=h.get("predicted_grade") or h.get("grade"),
                status_badge=h.get("status_badge") or b_text,
                status_color=h.get("status_color") or b_col,
                payload=h.get("payload") or h.get("input_payload") or {},
                recommendations=h.get("recommendations"),
                created_at=str(h.get("created_at", "")),
            )
        )
    return items


@router.post("", summary="Save Prediction Record to History")
async def save_history_record(
    payload: dict,
    auth_user_id: str = Depends(get_current_user_id),
):
    """
    Persists an AI forecast run into prediction history with full telemetry.
    """
    saved = supabase_service.save_prediction(user_id=auth_user_id, pred_data=payload)
    return {"success": True, "record": saved}


@router.delete("/{history_id}", summary="Delete Single History Record")
async def delete_history_item(
    history_id: str,
    auth_user_id: str = Depends(get_current_user_id),
):
    """
    Deletes a specific ML prediction record from student history.
    """
    deleted = supabase_service.delete_prediction(history_id=history_id, user_id=auth_user_id)
    return {"success": True, "message": f"Prediction record '{history_id}' deleted."}


@router.delete("", summary="Clear All History Records")
async def clear_all_history(
    auth_user_id: str = Depends(get_current_user_id),
):
    """
    Clears all saved prediction records for the authenticated student.
    """
    count = supabase_service.clear_prediction_history(user_id=auth_user_id)
    return {"success": True, "message": f"Cleared {count} historical records."}


@router.patch("/{history_id}", summary="Update History Item Notes / Status")
async def update_history_item(
    history_id: str,
    notes: Optional[str] = Query(None),
    status_badge: Optional[str] = Query(None),
    auth_user_id: str = Depends(get_current_user_id),
):
    """
    Updates qualitative notes or status tag on a historical run.
    """
    updated = supabase_service.update_prediction_notes(
        history_id=history_id,
        notes=notes,
        status_badge=status_badge,
    )
    return {"success": True, "record": updated}

