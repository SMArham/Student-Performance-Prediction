"""
Database & Supabase Client Module
Student Performance Prediction & Analytics System
"""

from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from backend.app.config import settings
from backend.app.core.logger import logger

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """Returns singleton Supabase client or None if running in standalone mock mode."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if settings.SUPABASE_URL and not settings.SUPABASE_URL.startswith("https://your-project"):
        try:
            _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
            logger.info("Connected to live Supabase client successfully.")
            return _supabase_client
        except Exception as e:
            logger.warning(f"Failed to initialize Supabase client: {e}. Falling back to internal state store.")
            return None
    return None


# ------------------------------------------------------------------------------
# In-Memory Fallback State Store (Ensures 100% offline & local demo functionality)
# ------------------------------------------------------------------------------
class InMemoryDataStore:
    def __init__(self):
        self.profiles: Dict[str, Dict[str, Any]] = {
            "demo-user-id-001": {
                "id": "demo-user-id-001",
                "full_name": "Muhammad Ali",
                "email": "student@example.com",
                "role": "student",
                "stage": "university",
                "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=MuhammadAli",
            }
        }
        self.student_profiles: Dict[str, Dict[str, Any]] = {
            "demo-user-id-001": {
                "id": "sp-001",
                "user_id": "demo-user-id-001",
                "student_id_code": "SE-2023-049",
                "stage": "university",
                "institution_name": "Faculty of Computer Science & Engineering",
                "program_or_major": "Software Engineering",
                "current_grade_level": "Year 3 (6th Semester)",
                "current_cgpa": 3.48,
                "current_gpa": 3.65,
                "target_cgpa": 3.80,
                "attendance_pct": 88.5,
                "study_hours_per_day": 4.5,
                "sleep_hours_per_day": 7.2,
                "social_hours_per_week": 8.0,
            }
        }
        self.academic_records: List[Dict[str, Any]] = [
            {
                "id": "rec-1",
                "user_id": "demo-user-id-001",
                "stage": "university",
                "term_name": "Semester 1",
                "term_order": 1,
                "gpa": 3.20,
                "cgpa": 3.20,
                "credits_earned": 16.0,
                "total_credits": 16.0,
                "recorded_date": "2023-01-15",
            },
            {
                "id": "rec-2",
                "user_id": "demo-user-id-001",
                "stage": "university",
                "term_name": "Semester 2",
                "term_order": 2,
                "gpa": 3.35,
                "cgpa": 3.28,
                "credits_earned": 18.0,
                "total_credits": 34.0,
                "recorded_date": "2023-06-20",
            },
            {
                "id": "rec-3",
                "user_id": "demo-user-id-001",
                "stage": "university",
                "term_name": "Semester 3",
                "term_order": 3,
                "gpa": 3.42,
                "cgpa": 3.33,
                "credits_earned": 17.0,
                "total_credits": 51.0,
                "recorded_date": "2024-01-10",
            },
            {
                "id": "rec-4",
                "user_id": "demo-user-id-001",
                "stage": "university",
                "term_name": "Semester 4",
                "term_order": 4,
                "gpa": 3.52,
                "cgpa": 3.38,
                "credits_earned": 18.0,
                "total_credits": 69.0,
                "recorded_date": "2024-06-15",
            },
            {
                "id": "rec-5",
                "user_id": "demo-user-id-001",
                "stage": "university",
                "term_name": "Semester 5 (Current)",
                "term_order": 5,
                "gpa": 3.65,
                "cgpa": 3.48,
                "credits_earned": 17.0,
                "total_credits": 86.0,
                "recorded_date": "2025-01-12",
            },
        ]
        self.prediction_history: List[Dict[str, Any]] = [
            {
                "id": "pred-hist-1",
                "user_id": "demo-user-id-001",
                "stage": "university",
                "model_name": "University CGPA Multi-Factor Predictor",
                "model_version": "v1.0.0",
                "input_features": {
                    "Age": 21,
                    "Attendance_Pct": 88.5,
                    "Study_Hours_Per_Day": 4.5,
                    "Previous_CGPA": 3.48,
                    "Sleep_Hours": 7.2,
                    "Social_Hours_Week": 8,
                    "Gender": "Male",
                    "Major": "Engineering",
                },
                "predicted_score": 3.72,
                "predicted_grade": "A-",
                "confidence_interval_low": 3.61,
                "confidence_interval_high": 3.83,
                "status_badge": "Exemplary",
                "created_at": "2026-08-19T10:00:00Z",
            }
        ]


memory_db = InMemoryDataStore()
