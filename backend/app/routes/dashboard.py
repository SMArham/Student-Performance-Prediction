"""
Student Dashboard Analytics Route
Student Performance Prediction & Analytics System
"""

from fastapi import APIRouter, Depends, Query
from backend.app.core.security import get_current_user_id
from backend.app.services.dashboard_service import dashboard_service
from backend.app.models.schemas import DashboardSummaryResponse

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse, summary="Get Student Dashboard Summary")
async def get_dashboard_summary(
    stage: str = Query("university", description="Education stage: university, matric_inter, secondary, primary"),
    user_id: str = Depends(get_current_user_id),
):
    """
    Returns complete Page 1 summary for the student:
    - Student Profile & Institution Info
    - Top KPI Cards (Current GPA, Cumulative CGPA, Predicted GPA, Calibrated Performance Status Badge)
    - GPA Progression Trend Series (Past GPA, Current GPA, Predicted Target) for Chart.js
    - Recent Prediction Logs & Actionable Tips
    """
    return dashboard_service.get_dashboard_summary(user_id=user_id, stage=stage)
