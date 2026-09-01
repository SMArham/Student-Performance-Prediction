"""
Machine Learning Inference & Service Module
Student Performance Prediction & Analytics System
"""

import os
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional
import pandas as pd
import joblib

from backend.app.config import settings
from backend.app.core.exceptions import ModelInferenceError, ResourceNotFoundError
from ml.preprocessing import get_performance_badge

logger = logging.getLogger("ml_service")


class MLService:
    def __init__(self):
        self.artifacts_dir = settings.ML_ARTIFACTS_DIR
        self.models: Dict[str, Any] = {}
        self.registry: Dict[str, Any] = {}
        self.load_models()

    def load_models(self):
        """Loads all serialized .joblib models and the registry file into memory."""
        registry_file = os.path.join(self.artifacts_dir, "model_registry.json")
        if os.path.exists(registry_file):
            try:
                with open(registry_file, "r", encoding="utf-8") as f:
                    self.registry = json.load(f)
                logger.info(f"Loaded model registry with {len(self.registry.get('models', {}))} stages.")
            except Exception as e:
                logger.error(f"Failed to read model registry: {e}")

        stage_files = {
            "university": "university_gradient_boosting_v1.0.0.joblib",
            "matric_inter": "matric_inter_ridge_v1.0.0.joblib",
            "secondary": "secondary_gradient_boosting_v1.0.0.joblib",
            "primary": "primary_linear_regression_v1.0.0.joblib",
        }

        for stage, filename in stage_files.items():
            path = os.path.join(self.artifacts_dir, filename)
            if os.path.exists(path):
                try:
                    self.models[stage] = joblib.load(path)
                    logger.info(f"Loaded ML model for stage '{stage}' from {filename}")
                except Exception as e:
                    logger.error(f"Error loading model for stage '{stage}': {e}")
            else:
                logger.warning(f"Artifact not found for stage '{stage}' at {path}")

    def predict(self, stage: str, input_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Performs real-time model inference for the given educational stage."""
        stage = stage.lower()
        if stage not in self.models:
            self.load_models()
            if stage not in self.models:
                raise ResourceNotFoundError(f"Trained model for stage '{stage}' is not available.")

        model = self.models[stage]
        model_meta = self.registry.get("models", {}).get(stage, {})
        rmse = model_meta.get("metrics", {}).get("rmse", 0.15)

        try:
            # Map request dict to DataFrame matching training feature columns
            df_input = self._format_input_dataframe(stage, input_dict)
            raw_pred = float(model.predict(df_input)[0])

            # Apply domain clipping and formatting based on stage
            predicted_score, formatted_score, grade = self._calibrate_prediction_output(stage, raw_pred)

            # Calculate 95% prediction interval (approx ± 1.96 * RMSE)
            margin = 1.96 * rmse
            ci_low = max(0.0, round(predicted_score - margin, 2))
            ci_high = round(predicted_score + margin, 2)
            if stage == "university":
                ci_low = max(0.0, min(4.0, ci_low))
                ci_high = min(4.0, ci_high)

            # Calibrate performance tier badge
            badge_text, badge_color, recommendation = get_performance_badge(stage, predicted_score)

            # Feature influence derivation
            contributions = self._compute_feature_contributions(stage, input_dict, predicted_score)

            return {
                "success": True,
                "stage": stage,
                "model_name": model_meta.get("model_name", f"{stage.capitalize()} Model"),
                "model_version": model_meta.get("version", "v1.0.0"),
                "predicted_score": predicted_score,
                "formatted_score": formatted_score,
                "predicted_grade": grade,
                "confidence_interval_low": ci_low,
                "confidence_interval_high": ci_high,
                "status_badge": badge_text,
                "status_color": badge_color,
                "recommendation": recommendation,
                "feature_contributions": contributions,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            logger.exception(f"Inference error for stage {stage}: {e}")
            raise ModelInferenceError(f"Prediction failed: {str(e)}")

    def _format_input_dataframe(self, stage: str, input_dict: Dict[str, Any]) -> pd.DataFrame:
        """Constructs and aligns DataFrame with expected model feature columns."""
        if stage == "university":
            data = {
                "Age": [input_dict.get("Age", input_dict.get("age", 20))],
                "Attendance_Pct": [float(input_dict.get("Attendance_Pct", input_dict.get("attendance_pct", 85.0)))],
                "Study_Hours_Per_Day": [float(input_dict.get("Study_Hours_Per_Day", input_dict.get("study_hours_per_day", 4.0)))],
                "Previous_CGPA": [float(input_dict.get("Previous_CGPA", input_dict.get("previous_cgpa", 3.4)))],
                "Sleep_Hours": [float(input_dict.get("Sleep_Hours", input_dict.get("sleep_hours", 7.0)))],
                "Social_Hours_Week": [int(input_dict.get("Social_Hours_Week", input_dict.get("social_hours_week", 8)))],
                "Gender": [input_dict.get("Gender", input_dict.get("gender", "Male"))],
                "Major": [input_dict.get("Major", input_dict.get("major", "Engineering"))],
            }
            return pd.DataFrame(data)

        elif stage == "matric_inter":
            data = {
                "SSC_I_Marks": [int(input_dict.get("SSC_I_Marks", input_dict.get("ssc_i_marks", 600)))],
                "SSC_II_Marks": [int(input_dict.get("SSC_II_Marks", input_dict.get("ssc_ii_marks", 650)))],
                "HSSC_I_Marks": [int(input_dict.get("HSSC_I_Marks", input_dict.get("hssc_i_marks", 400)))],
                "Attendance_Rate": [float(input_dict.get("Attendance_Rate", input_dict.get("attendance_rate", 85.0)))],
                "Study_Hours": [float(input_dict.get("Study_Hours", input_dict.get("study_hours", 4.0)))],
                "Previous_Failures": [int(input_dict.get("Previous_Failures", input_dict.get("previous_failures", 0)))],
                "Exam_Attempts": [int(input_dict.get("Exam_Attempts", input_dict.get("exam_attempts", 1)))],
                "Region": [input_dict.get("Region", input_dict.get("region", "Mohmand"))],
                "Gender": [input_dict.get("Gender", input_dict.get("gender", "Male"))],
                "Enrollment_Type": [input_dict.get("Enrollment_Type", input_dict.get("enrollment_type", "Regular"))],
                "Subject_Group": [input_dict.get("Subject_Group", input_dict.get("subject_group", "Science"))],
                "Parent_Education_Level": [input_dict.get("Parent_Education_Level", input_dict.get("parent_education_level", "College"))],
                "Parent_Income": [input_dict.get("Parent_Income", input_dict.get("parent_income", "Medium"))],
                "Extra_Tuition": [input_dict.get("Extra_Tuition", input_dict.get("extra_tuition", "No"))],
                "School_Type": [input_dict.get("School_Type", input_dict.get("school_type", "Private"))],
                "Co_Curricular_Activities": [input_dict.get("Co_Curricular_Activities", input_dict.get("co_curricular_activities", "Yes"))],
            }
            return pd.DataFrame(data)

        elif stage == "secondary":
            num_defaults = {
                "age": 16, "Medu": 3, "Fedu": 3, "traveltime": 1, "studytime": 2,
                "failures": 0, "famrel": 4, "freetime": 3, "goout": 3, "Dalc": 1,
                "Walc": 1, "health": 4, "absences": 4, "G1": 14, "G2": 15
            }
            cat_defaults = {
                "school": "GP", "sex": "F", "address": "U", "famsize": "GT3", "Pstatus": "T",
                "Mjob": "teacher", "Fjob": "services", "reason": "course", "guardian": "mother",
                "schoolsup": "no", "famsup": "yes", "paid": "no", "activities": "yes",
                "nursery": "yes", "higher": "yes", "internet": "yes", "romantic": "no"
            }
            row = {}
            for k, default_val in num_defaults.items():
                val = input_dict.get(k, input_dict.get(k.lower()))
                row[k] = [int(val) if val is not None else default_val]
            for k, default_val in cat_defaults.items():
                val = input_dict.get(k, input_dict.get(k.lower()))
                row[k] = [str(val) if val is not None else default_val]
            return pd.DataFrame(row)

        elif stage == "primary":
            data = {
                "Enrolment score": [float(input_dict.get("Enrolment_score", input_dict.get("enrolment_score", 75.0)))],
                "Learning score": [float(input_dict.get("Learning_score", input_dict.get("learning_score", 72.0)))],
                "Retention score": [float(input_dict.get("Retention_score", input_dict.get("retention_score", 80.0)))],
                "School infrastructure score": [float(input_dict.get("School_infrastructure_score", input_dict.get("school_infrastructure_score", 70.0)))],
                "Gender parity score": [float(input_dict.get("Gender_parity_score", input_dict.get("gender_parity_score", 85.0)))],
                "Total number of schools": [int(input_dict.get("Total_number_of_schools", input_dict.get("total_number_of_schools", 500)))],
                "Drinking water": [float(input_dict.get("Drinking_water", input_dict.get("drinking_water", 80.0)))],
                "Electricity": [float(input_dict.get("Electricity", input_dict.get("electricity", 75.0)))],
                "Toilet": [float(input_dict.get("Toilet", input_dict.get("toilet", 85.0)))],
                "Province": [input_dict.get("Province", input_dict.get("province", "Punjab"))],
            }
            return pd.DataFrame(data)

        raise ValueError(f"Unknown stage {stage}")

    def _calibrate_prediction_output(self, stage: str, raw_pred: float) -> Tuple[float, str, Optional[str]]:
        """Calibrates score boundary and calculates letter grade."""
        if stage == "university":
            score = round(max(0.0, min(4.0, raw_pred)), 2)
            formatted = f"{score:.2f} CGPA"
            if score >= 3.7:
                grade = "A (Excellent)"
            elif score >= 3.3:
                grade = "B+ (Very Good)"
            elif score >= 3.0:
                grade = "B (Good)"
            elif score >= 2.5:
                grade = "C+ (Satisfactory)"
            elif score >= 2.0:
                grade = "C (Passing)"
            else:
                grade = "F (Failing)"
            return score, formatted, grade

        elif stage == "matric_inter":
            score = round(max(0.0, min(1100.0, raw_pred)), 1)
            pct = (score / 1100.0) * 100.0
            formatted = f"{score:.0f} / 1100 ({pct:.1f}%)"
            if pct >= 80:
                grade = "A-1 Grade"
            elif pct >= 70:
                grade = "A Grade"
            elif pct >= 60:
                grade = "B Grade"
            elif pct >= 50:
                grade = "C Grade"
            else:
                grade = "D / Fail"
            return score, formatted, grade

        elif stage == "secondary":
            score = round(max(0.0, min(20.0, raw_pred)), 1)
            formatted = f"{score:.1f} / 20"
            if score >= 16:
                grade = "Very Good (16-20)"
            elif score >= 14:
                grade = "Good (14-15)"
            elif score >= 12:
                grade = "Satisfactory (12-13)"
            elif score >= 10:
                grade = "Sufficient (10-11)"
            else:
                grade = "Insufficient (<10)"
            return score, formatted, grade

        elif stage == "primary":
            score = round(max(0.0, min(100.0, raw_pred)), 1)
            formatted = f"{score:.1f} / 100"
            if score >= 80:
                grade = "Proficient Tier"
            elif score >= 65:
                grade = "Developing Tier"
            elif score >= 50:
                grade = "Basic Tier"
            else:
                grade = "Below Basic"
            return score, formatted, grade

        return round(raw_pred, 2), f"{raw_pred:.2f}", None

    def _compute_feature_contributions(self, stage: str, input_dict: Dict[str, Any], score: float) -> Dict[str, Any]:
        """Provides intuitive feature influence insights combining academic metrics and teacher behavioral evaluations."""
        positive_factors = []
        growth_areas = []

        # Behavioral & Soft-Skill Attributes
        attentiveness = input_dict.get("attentiveness_level", "High")
        comm_skill = input_dict.get("communication_skill", "Good")
        assignments = input_dict.get("assignment_consistency", "Always")
        participation = input_dict.get("class_participation", "Active")
        pace = input_dict.get("problem_solving_pace", "Quick")
        teacher_rating = float(input_dict.get("teacher_rating", 4.5))

        # Factor in behavioral strengths
        if attentiveness in ["High", "Very Attentive"]:
            positive_factors.append("High Classroom Attentiveness: Maintains sharp focus and active engagement in class")
        elif attentiveness in ["Low", "Distracted"]:
            growth_areas.append("Improve classroom focus and minimize distractions during core lectures")

        if comm_skill in ["Excellent", "Good"]:
            positive_factors.append(f"Strong Communication Skills: Articulates ideas, questions, and presentations effectively ({comm_skill})")
        elif comm_skill in ["Needs Support", "Developing"]:
            growth_areas.append("Conduct targeted presentation and verbal communication coaching")

        if assignments in ["Always", "Mostly"]:
            positive_factors.append("Assignment Consistency: High homework and project submission discipline")
        else:
            growth_areas.append("Establish strict homework timelines to prevent assignment submission delays")

        if participation in ["Leader", "Active"]:
            positive_factors.append("Collaborative Engagement: Proactive participant and team contributor in discussions")
        elif participation == "Passive":
            growth_areas.append("Encourage speaking up in group activities and interactive Q&A rounds")

        if pace in ["Quick", "Independent"]:
            positive_factors.append("Quick Conceptual Grasp: Solves problems and absorbs new topics rapidly")
        elif pace == "Remediation":
            growth_areas.append("Provide guided step-by-step practice sheets for foundational concept mastery")

        if teacher_rating >= 4.0:
            positive_factors.append(f"Teacher Assessment: Strong {teacher_rating:.1f}/5.0 instructor rating")

        # Stage specific academic metric factors
        if stage == "university":
            att = float(input_dict.get("Attendance_Pct", input_dict.get("attendance_pct", 85.0)))
            prev = float(input_dict.get("Previous_CGPA", input_dict.get("previous_cgpa", 3.4)))
            positive_factors.insert(0, f"Academic Baseline: Previous CGPA of {prev:.2f} provides a strong foundational trajectory")
            positive_factors.insert(1, f"Attendance Track: {att:.1f}% lecture attendance reinforces steady performance")
            if len(growth_areas) == 0:
                growth_areas.append("Maintain >85% attendance during mid-term and final project exam blocks")
                growth_areas.append("Target 1 additional hour of weekly group revision for complex modules")

        elif stage == "matric_inter":
            hssc = float(input_dict.get("HSSC_I_Marks", input_dict.get("hssc_i_marks", 420)))
            positive_factors.insert(0, f"Board Examination Track: Solid HSSC-I benchmark ({hssc:.0f} marks)")
            if len(growth_areas) == 0:
                growth_areas.append("Focus on past 5-year board exam questions for targeted marks enhancement")

        elif stage == "secondary":
            g1 = float(input_dict.get("G1", input_dict.get("g1", 14)))
            positive_factors.insert(0, f"Continuous Assessment: Consistent Period 1 & 2 grade benchmark ({g1:.0f}/20)")
            if len(growth_areas) == 0:
                growth_areas.append("Target regular structured revision before end-of-term examinations")

        elif stage == "primary":
            math_s = float(input_dict.get("Enrolment_score", input_dict.get("math_score", 78.0)))
            positive_factors.insert(0, f"Foundational Literacy & Numeracy: Strong foundational baseline ({math_s:.1f}/100)")
            if len(growth_areas) == 0:
                growth_areas.append("Introduce interactive gamified quizzes to maintain high learning enthusiasm")

        return {
            "top_positive_factors": positive_factors[:4],
            "growth_areas": growth_areas[:3]
        }


ml_service = MLService()
