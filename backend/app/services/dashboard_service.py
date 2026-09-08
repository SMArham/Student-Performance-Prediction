"""
Dashboard Aggregator & Analytics Service
Student Performance Prediction & Analytics System
"""

import logging
from typing import Dict, Any, List
from backend.app.services.supabase_service import supabase_service
from backend.app.services.ml_service import ml_service
from backend.app.models.schemas import (
    DashboardSummaryResponse,
    StudentInfo,
    KPICards,
    ProgressionChartData,
    HistoryItem,
)
from ml.preprocessing import get_performance_badge

logger = logging.getLogger("dashboard_service")


class DashboardService:
    def get_dashboard_summary(self, user_id: str, stage: str = "university") -> DashboardSummaryResponse:
        """
        Builds the complete Page 1 Student Dashboard summary payload.
        Includes Student Info, Top KPI Cards, Chart.js GPA Progression Trend data, and recent prediction history.
        """
        profile = supabase_service.get_user_profile(user_id)
        student = supabase_service.get_student_profile(user_id, stage=stage)
        records = supabase_service.get_academic_records(user_id, stage=stage)
        history = supabase_service.get_prediction_history(user_id, limit=5)

        # 1. Student Profile Data
        student_info = StudentInfo(
            user_id=user_id,
            full_name=profile.get("full_name", ""),
            email=profile.get("email", ""),
            avatar_url=None,
            role=profile.get("role", "student"),
            stage=stage,
            student_id_code=student.get("student_id_code", ""),
            institution_name=student.get("institution_name", ""),
            program_or_major=student.get("program_or_major", ""),
            current_grade_level=student.get("current_grade_level", ""),
        )

        has_records = len(records) > 0

        # 2. Derive Current GPA and CGPA
        if has_records:
            latest_record = records[-1]
            raw_g = latest_record.get("gpa") or latest_record.get("percentage") or latest_record.get("obtained_marks") or student.get("current_gpa", 0.0)
            try:
                raw_g = float(raw_g)
            except (ValueError, TypeError):
                raw_g = 0.0
            current_gpa = raw_g if raw_g <= 4.0 else round((raw_g / 100.0) * 4.0, 2)
            cumulative_cgpa = current_gpa
            
            # Previous term delta
            if len(records) >= 2:
                prev_g = records[-2].get("gpa") or records[-2].get("percentage") or records[-2].get("obtained_marks") or current_gpa
                try:
                    prev_cgpa = float(prev_g) if float(prev_g) <= 4.0 else round((float(prev_g) / 100.0) * 4.0, 2)
                except (ValueError, TypeError):
                    prev_cgpa = current_gpa
                delta_cgpa = round(cumulative_cgpa - prev_cgpa, 2)
            else:
                delta_cgpa = 0.0
            target_cgpa = 0.0
            trend_direction = "up" if delta_cgpa >= 0 else "down"

            # 3. Dynamic ML Prediction for Dashboard KPI
            try:
                ml_input = {
                    "Age": 21,
                    "Attendance_Pct": student.get("attendance_pct", 85.0),
                    "Study_Hours_Per_Day": student.get("study_hours_per_day", 4.0),
                    "Previous_CGPA": cumulative_cgpa,
                    "Sleep_Hours": student.get("sleep_hours_per_day", 7.0),
                    "Social_Hours_Week": student.get("social_hours_per_week", 8),
                    "Gender": "Male",
                    "Major": student.get("program_or_major", "Software Engineering"),
                    "HSSC_I_Marks": 500,
                    "SSC_Marks": 950,
                    "Attendance_Rate": 92.0,
                    "study_hours": 6.0,
                    "past_annual_pct": 88.0,
                    "term_assessment_pct": 90.0,
                    "math_score": 90.0,
                    "read_score": 92.0,
                    "communication_skill": "Expressive & Confident",
                    "classroom_activity": "Highly Active & Enthusiastic"
                }
                pred_res = ml_service.predict(stage, ml_input)
                predicted_gpa = float(pred_res.get("predicted_score", cumulative_cgpa))
                badge_text = pred_res.get("status_badge", "On Track")
                badge_color = pred_res.get("status_color", "badge-primary")
                badge_msg = pred_res.get("recommendation", "Consistent academic trajectory.")
            except Exception as e:
                logger.warning(f"Error computing inline ML prediction for dashboard: {e}")
                predicted_gpa = round(min(4.0, cumulative_cgpa + 0.15), 2)
                badge_text, badge_color, badge_msg = get_performance_badge(stage, cumulative_cgpa)
        else:
            current_gpa = 0.0
            cumulative_cgpa = 0.0
            delta_cgpa = 0.0
            target_cgpa = 0.0
            trend_direction = "neutral"
            predicted_gpa = 0.0
            badge_text = "No Evaluations"
            badge_color = "badge-neutral"
            badge_msg = "No academic records or prediction history recorded."

        kpis = KPICards(
            current_gpa=current_gpa,
            cumulative_cgpa=cumulative_cgpa,
            predicted_gpa=predicted_gpa,
            target_cgpa=target_cgpa,
            delta_cgpa=delta_cgpa,
            trend_direction=trend_direction,
            status_badge=badge_text,
            status_color=badge_color,
            status_message=badge_msg,
        )

        # 4. GPA Progression Trend Chart Data
        if has_records:
            labels = [r.get("subject_name", f"Term {i+1}") for i, r in enumerate(records[:4])]
            past_series = [float(r.get("obtained_marks", 85.0)) if float(r.get("obtained_marks", 85.0)) <= 4.0 else round((float(r.get("obtained_marks", 85.0)) / 100.0) * 4.0, 2) for r in records[:4]]
            curr_series = [None] * len(past_series)
            curr_series[-1] = current_gpa
            pred_series = [None] * len(past_series)
            pred_series[-1] = current_gpa

            # Add Future Projected Milestone
            labels.append("Next Term (AI Target)")
            past_series.append(None)
            curr_series.append(None)
            pred_series.append(predicted_gpa)
        else:
            labels = []
            past_series = []
            curr_series = []
            pred_series = []

        progression_trend = ProgressionChartData(
            labels=labels,
            past_gpa_series=past_series,
            current_gpa_series=curr_series,
            predicted_target_series=pred_series,
        )

        # 5. Recent Prediction History Items
        recent_items: List[HistoryItem] = []
        for h in history:
            score = float(h.get("predicted_score", 0.0))
            b_text, b_col, _ = get_performance_badge(h.get("stage", stage), score)
            recent_items.append(
                HistoryItem(
                    id=str(h.get("id", "")),
                    stage=str(h.get("stage", stage)),
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

        # 6. Actionable recommendations / quick tips
        quick_tips = [
            "Attendance above 85% strongly correlates with achieving Dean's honor list.",
            "Consistently spending 4+ hours on active self-study improves retention by 28%.",
            "Balancing 7+ hours of sleep stabilizes cognitive test performance.",
        ]

        return DashboardSummaryResponse(
            success=True,
            student_info=student_info,
            kpis=kpis,
            progression_trend=progression_trend,
            recent_predictions=recent_items,
            has_records=has_records,
            quick_tips=quick_tips,
        )


dashboard_service = DashboardService()
