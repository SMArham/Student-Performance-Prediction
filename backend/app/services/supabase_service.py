"""
Supabase Data Service Layer
Student Performance Prediction & Analytics System
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid
from backend.app.core.database import get_supabase_client, memory_db

logger = logging.getLogger("supabase_service")


class SupabaseService:
    def __init__(self):
        self.client = get_supabase_client()

    def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """Fetches profile for given user_id."""
        if self.client:
            try:
                res = self.client.table("profiles").select("*").eq("id", user_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Error querying Supabase profiles: {e}")

        # Fallback to in-memory store
        return memory_db.profiles.get(user_id, {
            "id": user_id,
            "full_name": "Muhammad Ali",
            "email": "student@example.com",
            "role": "student",
            "stage": "university",
            "avatar_url": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_id}",
        })

    def get_student_profile(self, user_id: str, stage: str = "university") -> Dict[str, Any]:
        """Fetches student stage-specific profile details."""
        if self.client:
            try:
                res = self.client.table("student_profiles").select("*").eq("user_id", user_id).eq("stage", stage).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Error querying Supabase student_profiles: {e}")

        # Fallback
        return memory_db.student_profiles.get(user_id, {
            "id": f"sp-{user_id[:6]}",
            "user_id": user_id,
            "student_id_code": "STU-2024-001",
            "stage": stage,
            "institution_name": "National University of Sciences & Technology",
            "program_or_major": "Computer Science",
            "current_grade_level": "Year 3 (6th Semester)",
            "current_cgpa": 3.48,
            "current_gpa": 3.65,
            "target_cgpa": 3.80,
            "attendance_pct": 88.5,
            "study_hours_per_day": 4.5,
            "sleep_hours_per_day": 7.0,
            "social_hours_per_week": 8.0,
        })

    def get_academic_records(self, user_id: str, stage: str = "university") -> List[Dict[str, Any]]:
        """Retrieves chronological term records for user."""
        if self.client:
            try:
                res = self.client.table("academic_records").select("*").eq("user_id", user_id).eq("stage", stage).order("term_order").execute()
                if res.data:
                    return res.data
            except Exception as e:
                logger.warning(f"Error querying academic_records: {e}")

        # Fallback
        return [r for r in memory_db.academic_records if r.get("user_id") == user_id and r.get("stage") == stage]

    def get_prediction_history(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Fetches recent predictions for student."""
        if self.client:
            try:
                res = self.client.table("prediction_history").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
                if res.data:
                    return res.data
            except Exception as e:
                logger.warning(f"Error querying prediction_history: {e}")

        # Fallback
        return [h for h in memory_db.prediction_history if h.get("user_id") == user_id][:limit]

    def save_prediction(self, user_id: str, pred_data: Dict[str, Any]) -> Dict[str, Any]:
        """Saves a newly generated prediction record."""
        record_id = str(uuid.uuid4())
        record = {
            "id": record_id,
            "user_id": user_id,
            "stage": pred_data.get("stage", "university"),
            "model_name": pred_data.get("model_name", "Model"),
            "model_version": pred_data.get("model_version", "v1.0.0"),
            "input_features": pred_data.get("input_features", {}),
            "predicted_score": pred_data.get("predicted_score", 0.0),
            "predicted_grade": pred_data.get("predicted_grade"),
            "confidence_interval_low": pred_data.get("confidence_interval_low", 0.0),
            "confidence_interval_high": pred_data.get("confidence_interval_high", 0.0),
            "status_badge": pred_data.get("status_badge", "On Track"),
            "explanation": pred_data.get("feature_contributions", {}),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        if self.client:
            try:
                self.client.table("prediction_history").insert(record).execute()
            except Exception as e:
                logger.warning(f"Error saving prediction to Supabase: {e}")

        # Always update memory store
        memory_db.prediction_history.insert(0, record)
        return record


supabase_service = SupabaseService()
