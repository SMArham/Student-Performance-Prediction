"""
Student Management & CRUD Router (Teacher / Instructor Portal)
Student Performance Prediction & Analytics System
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from backend.app.core.security import get_current_user_id
from backend.app.services.supabase_service import supabase_service
from backend.app.services.ml_service import ml_service
from backend.app.models.schemas import (
    StudentCreateRequest,
    StudentUpdateRequest,
    StudentRecord,
    StudentListResponse,
)
from ml.preprocessing import get_performance_badge

logger = logging.getLogger("students_router")
router = APIRouter(prefix="/api/v1/students", tags=["Student Management"])


@router.get("", response_model=StudentListResponse, summary="List Students Roster")
async def list_students(
    stage: Optional[str] = Query(None, description="Filter by stage (e.g. university, intermediate)"),
    search: Optional[str] = Query(None, description="Search by student name, roll number, or class"),
    instructor_id: Optional[str] = Query(None, description="Filter by instructor ID"),
    auth_user_id: str = Depends(get_current_user_id),
):
    """
    Returns all registered student records managed by the instructor.
    Supports stage filtering and substring text search.
    """
    students_raw = supabase_service.get_students(
        instructor_id=instructor_id or auth_user_id,
        stage=stage,
        search=search,
    )
    records = [StudentRecord(**s) for s in students_raw]
    return StudentListResponse(success=True, count=len(records), students=records)


@router.post("", response_model=StudentRecord, status_code=status.HTTP_201_CREATED, summary="Create Student Record")
async def create_student(
    payload: StudentCreateRequest,
    auth_user_id: str = Depends(get_current_user_id),
):
    """
    Creates a new student record in the gradebook roster.
    Automatically computes baseline predicted score if sufficient inputs exist.
    """
    student_dict = payload.model_dump()
    student_dict["instructor_id"] = auth_user_id

    # Auto-calibrate initial predicted score based on marks & attendance
    avg_score = (
        student_dict["attendance_pct"] * 0.20
        + student_dict["quiz_test_pct"] * 0.25
        + student_dict["assignment_pct"] * 0.25
        + student_dict["midterm_score"] * 0.30
    )
    is_uni = payload.stage == "university"
    predicted_val = round((avg_score / 100.0) * 4.0, 2) if is_uni else round(avg_score, 1)
    badge_text, badge_color, grade_letter = get_performance_badge(payload.stage, predicted_val)

    student_dict["predicted_score"] = predicted_val
    student_dict["predicted_grade"] = grade_letter
    student_dict["status_badge"] = badge_text
    student_dict["status_color"] = badge_color

    created = supabase_service.create_student(student_dict)
    return StudentRecord(**created)


@router.get("/{student_id}", response_model=StudentRecord, summary="Get Student Details")
async def get_student(
    student_id: str,
    auth_user_id: str = Depends(get_current_user_id),
):
    """
    Retrieves individual student information, coursework grades, and diagnostics.
    """
    student = supabase_service.get_student_by_id(student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found in roster.",
        )
    return StudentRecord(**student)


@router.put("/{student_id}", response_model=StudentRecord, summary="Update Student Record")
async def update_student(
    student_id: str,
    payload: StudentUpdateRequest,
    auth_user_id: str = Depends(get_current_user_id),
):
    """
    Updates student academic marks, attendance, or personal information.
    Re-calibrates predicted standing and status tier.
    """
    existing = supabase_service.get_student_by_id(student_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found.",
        )

    update_dict = payload.model_dump(exclude_unset=True)

    # Re-calculate predicted metrics if academic components updated
    merged = {**existing, **update_dict}
    avg_score = (
        float(merged.get("attendance_pct", 85.0)) * 0.20
        + float(merged.get("quiz_test_pct", 80.0)) * 0.25
        + float(merged.get("assignment_pct", 80.0)) * 0.25
        + float(merged.get("midterm_score", 75.0)) * 0.30
    )
    stage = merged.get("stage", "university")
    is_uni = stage == "university"
    predicted_val = round((avg_score / 100.0) * 4.0, 2) if is_uni else round(avg_score, 1)
    badge_text, badge_color, grade_letter = get_performance_badge(stage, predicted_val)

    update_dict["predicted_score"] = predicted_val
    update_dict["predicted_grade"] = grade_letter
    update_dict["status_badge"] = badge_text
    update_dict["status_color"] = badge_color

    updated = supabase_service.update_student(student_id, update_dict)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update student record.",
        )
    return StudentRecord(**updated)


@router.delete("/{student_id}", summary="Delete Student Record")
async def delete_student(
    student_id: str,
    auth_user_id: str = Depends(get_current_user_id),
):
    """
    Deletes a student record permanently from the instructor's gradebook roster.
    """
    deleted = supabase_service.delete_student(student_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' could not be deleted or does not exist.",
        )
    return {"success": True, "message": f"Student '{student_id}' deleted successfully."}


@router.post("/bulk", response_model=Dict[str, Any], summary="Bulk Import Students from CSV/List")
async def bulk_import_students(
    students: List[StudentCreateRequest],
    auth_user_id: str = Depends(get_current_user_id),
):
    """
    Imports and saves multiple student records simultaneously from CSV/data upload.
    """
    created_list = []
    for s in students:
        s_dict = s.model_dump()
        s_dict["instructor_id"] = auth_user_id
        avg_score = (
            s_dict["attendance_pct"] * 0.20
            + s_dict["quiz_test_pct"] * 0.25
            + s_dict["assignment_pct"] * 0.25
            + s_dict["midterm_score"] * 0.30
        )
        is_uni = s.stage == "university"
        predicted_val = round((avg_score / 100.0) * 4.0, 2) if is_uni else round(avg_score, 1)
        b_text, b_col, g_let = get_performance_badge(s.stage, predicted_val)
        s_dict["predicted_score"] = predicted_val
        s_dict["predicted_grade"] = g_let
        s_dict["status_badge"] = b_text
        s_dict["status_color"] = b_col
        created = supabase_service.create_student(s_dict)
        created_list.append(created)

    return {
        "success": True,
        "imported_count": len(created_list),
        "message": f"Successfully imported {len(created_list)} students into roster.",
    }


@router.post("/{student_id}/evaluate", summary="Run Real-Time AI Evaluation on Student")
async def evaluate_student(
    student_id: str,
    auth_user_id: str = Depends(get_current_user_id),
):
    """
    Runs full ML inference model on an individual student's recorded parameters.
    """
    student = supabase_service.get_student_by_id(student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student '{student_id}' not found.",
        )

    stage = student.get("stage", "university")
    features = {
        "Age": 21,
        "Attendance_Pct": student.get("attendance_pct", 85.0),
        "Study_Hours_Per_Day": 4.0,
        "Previous_CGPA": round(student.get("midterm_score", 75.0) / 25.0, 2) if stage == "university" else 75.0,
        "Sleep_Hours": 7.0,
        "Social_Hours_Week": 8,
        "Gender": student.get("gender", "male").capitalize(),
        "Major": "Engineering",
    }

    try:
        pred_res = ml_service.predict(stage, features)
        # Update student record with new ML predicted score
        supabase_service.update_student(student_id, {
            "predicted_score": pred_res.get("predicted_score"),
            "predicted_grade": pred_res.get("predicted_grade"),
            "status_badge": pred_res.get("status_badge"),
        })
        return {
            "success": True,
            "student_id": student_id,
            "student_name": student.get("student_name"),
            "prediction": pred_res,
        }
    except Exception as e:
        logger.error(f"Evaluation error for student {student_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference execution failed: {str(e)}",
        )
