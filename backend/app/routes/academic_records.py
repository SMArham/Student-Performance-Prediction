"""
Academic Terms and Historical Semesters CRUD Route
Student Performance Prediction and Analytics System
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from backend.app.core.security import get_current_user_id
from backend.app.services.supabase_service import supabase_service
from backend.app.models.schemas import (
    AcademicTermCreate,
    AcademicTermsListResponse,
)

router = APIRouter(prefix="/api/v1/academic-records", tags=["Academic Records"])


@router.get("", response_model=AcademicTermsListResponse, summary="Get Historical Semesters and Terms")
async def get_academic_terms(
    stage: str = Query("university", description="Stage: university, intermediate, secondary, primary"),
    auth_user_id: str = Depends(get_current_user_id),
):
    """
    Returns all logged semesters / academic terms for the authenticated student,
    including cumulative GPA, subject grades, and term breakdown.
    """
    return supabase_service.get_academic_terms(user_id=auth_user_id, stage=stage)


@router.post("", response_model=AcademicTermsListResponse, summary="Add Semester or Academic Term")
async def create_academic_term(
    term_payload: AcademicTermCreate,
    auth_user_id: str = Depends(get_current_user_id),
):
    """
    Adds a new semester or class term with its respective subjects, credits, and marks.
    Persists data directly in the Supabase database.
    """
    return supabase_service.create_academic_term(
        user_id=auth_user_id,
        term_data=term_payload.model_dump()
    )


@router.delete("/{term_name}", summary="Delete Semester or Academic Term")
async def delete_academic_term(
    term_name: str,
    stage: Optional[str] = Query(None, description="Stage filter"),
    auth_user_id: str = Depends(get_current_user_id),
):
    """
    Deletes a specific semester or academic term without affecting other terms.
    """
    success = supabase_service.delete_academic_term(
        user_id=auth_user_id,
        term_name=term_name,
        stage=stage
    )
    return {"success": success, "message": f"Academic term '{term_name}' removed."}
