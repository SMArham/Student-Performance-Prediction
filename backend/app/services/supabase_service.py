"""
Supabase Data Service Layer
Student Performance Prediction & Analytics System
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid
import re
from backend.app.core.database import get_supabase_client, memory_db

logger = logging.getLogger("supabase_service")

UUID_REGEX = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)


class SupabaseService:
    def __init__(self):
        self.client = get_supabase_client()
        self._cached_default_user_id: Optional[str] = None

    def _resolve_user_id(self, user_id: Optional[str]) -> str:
        """Ensures a valid user ID corresponding to a profile in public.profiles."""
        if user_id and str(user_id).strip() and str(user_id).strip().lower() not in ["none", "null", "undefined"]:
            return str(user_id).strip()

        if self._cached_default_user_id:
            return self._cached_default_user_id

        if self.client:
            try:
                res = self.client.table("profiles").select("id").limit(1).execute()
                if res.data and len(res.data) > 0:
                    self._cached_default_user_id = str(res.data[0]["id"])
                    return self._cached_default_user_id
            except Exception as e:
                logger.warning(f"Could not resolve default user_id from Supabase: {e}")

        # Fallback default short ID
        return "STU-01"

    def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """Fetches profile for given user_id from unified public.profiles table."""
        resolved_id = self._resolve_user_id(user_id)
        if self.client:
            try:
                res = self.client.table("profiles").select("*").eq("id", resolved_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Error querying Supabase profiles: {e}")

        # Fallback to in-memory store
        return memory_db.profiles.get(user_id, {
            "id": resolved_id,
            "short_id": f"STU-{resolved_id[:4].upper()}",
            "full_name": "Demo User",
            "email": "user@demo.edu",
            "role": "student",
            "stage": "university",
            "institution_name": "Faculty Campus",
            "department_or_program": "Software Engineering",
            "current_gpa": 3.65,
        })

    def get_student_profile(self, user_id: str, stage: str = "university") -> Dict[str, Any]:
        """Fetches student details directly from the single unified public.profiles table."""
        prof = self.get_user_profile(user_id)
        short_id = prof.get("short_id") or f"STU-{str(prof.get('id',''))[:4].upper()}"
        return {
            "user_id": prof.get("id"),
            "student_id_code": short_id,
            "stage": prof.get("stage", stage),
            "institution_name": prof.get("institution_name", "Faculty of Engineering"),
            "program_or_major": prof.get("department_or_program", "Software Engineering"),
            "current_grade_level": "Semester 6",
            "current_cgpa": float(prof.get("current_gpa", 3.48)),
            "current_gpa": float(prof.get("current_gpa", 3.65)),
            "target_cgpa": 3.80,
            "attendance_pct": 85.00,
        }

    def get_teacher_profile(self, user_id: str) -> Dict[str, Any]:
        """Fetches teacher details directly from the single unified public.profiles table."""
        prof = self.get_user_profile(user_id)
        short_id = prof.get("short_id") or f"TCH-{str(prof.get('id',''))[:4].upper()}"
        return {
            "user_id": prof.get("id"),
            "faculty_id_code": short_id,
            "department": prof.get("department_or_program", "Faculty of Computer Science"),
            "designation": "Senior Instructor / Professor",
            "institution_name": prof.get("institution_name", "University Campus"),
        }

    def update_teacher_profile(self, user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Updates teacher profile details in the single unified profiles table."""
        resolved_id = self._resolve_user_id(user_id)
        if self.client:
            try:
                update_payload = {
                    "department_or_program": profile_data.get("department") or profile_data.get("department_or_program"),
                    "institution_name": profile_data.get("institution_name"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                update_payload = {k: v for k, v in update_payload.items() if v is not None}
                self.client.table("profiles").update(update_payload).eq("id", resolved_id).execute()
            except Exception as e:
                logger.warning(f"Error updating profiles in Supabase: {e}")
        return self.get_teacher_profile(resolved_id)
        return self.get_teacher_profile(resolved_id)

    # --------------------------------------------------------------------------
    # Prediction History CRUD (Aligned with public.prediction_history core schema)
    # --------------------------------------------------------------------------
    def get_prediction_history(self, user_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetches recent predictions for student."""
        if self.client:
            try:
                resolved_id = self._resolve_user_id(user_id)
                query = self.client.table("prediction_history").select("*").order("created_at", desc=True).limit(limit)
                if user_id:
                    query = query.eq("user_id", resolved_id)
                res = query.execute()
                if res.data is not None:
                    return [self._format_history_record(r) for r in res.data]
            except Exception as e:
                logger.warning(f"Error querying prediction_history from Supabase: {e}")
        return [self._format_history_record(h) for h in memory_db.prediction_history][:limit]

    def _format_history_record(self, r: Dict[str, Any]) -> Dict[str, Any]:
        """Normalizes a prediction history row from core public.prediction_history."""
        score = r.get("predicted_score") or r.get("score") or 0.0
        stage = (r.get("stage") or "university").lower()
        formatted_score = f"{score} CGPA" if stage == "university" and score <= 4.0 else f"{score}%"

        explanation = r.get("explanation") if isinstance(r.get("explanation"), dict) else {}
        input_feats = r.get("input_features") if isinstance(r.get("input_features"), dict) else (r.get("input_payload") or {})

        ci_low = r.get("confidence_interval_low") if r.get("confidence_interval_low") is not None else r.get("confidence_min")
        ci_high = r.get("confidence_interval_high") if r.get("confidence_interval_high") is not None else r.get("confidence_max")

        return {
            "id": str(r.get("id")),
            "user_id": str(r.get("user_id")),
            "stage": stage,
            "model_name": str(r.get("model_name", "GradientBoostingRegressor")),
            "model_version": str(r.get("model_version", "v1.0.0")),
            "score": formatted_score,
            "predicted_score": score,
            "formatted_score": formatted_score,
            "grade": r.get("predicted_grade") or "Grade A",
            "predicted_grade": r.get("predicted_grade") or "Grade A",
            "status_badge": r.get("status_badge") or "On Track",
            "status_color": "badge-success" if (r.get("status_badge") in ["Exemplary", "On Track"]) else "badge-warning",
            "confidence_interval_low": ci_low,
            "confidence_interval_high": ci_high,
            "confidence_min": ci_low,
            "confidence_max": ci_high,
            "input_features": input_feats,
            "payload": input_feats,
            "explanation": explanation,
            "recommendations": explanation.get("recommendation") or "Maintains high academic momentum.",
            "timestamp": r.get("created_at") or datetime.now(timezone.utc).isoformat(),
            "created_at": r.get("created_at") or datetime.now(timezone.utc).isoformat(),
        }

    def save_prediction(self, user_id: Optional[str], pred_data: Dict[str, Any]) -> Dict[str, Any]:
        """Saves a newly generated prediction record using strictly essential core attributes and short readable ID."""
        record_id = f"P-{uuid.uuid4().hex[:4].upper()}"
        resolved_id = self._resolve_user_id(user_id)

        raw_score = pred_data.get("predicted_score") or pred_data.get("score") or 0.0
        try:
            raw_score = float(raw_score)
        except (ValueError, TypeError):
            raw_score = 0.0

        input_data = pred_data.get("input_features") or pred_data.get("input_payload") or {}
        if not input_data or input_data == {}:
            input_data = {
                "study_hours": float(pred_data.get("study_hours", 4.5)),
                "attendance": float(pred_data.get("attendance", 85.0)),
                "stage": pred_data.get("stage", "university"),
            }

        # Essential Core Schema Only: id, stage, input_features, predicted_score, predicted_grade, status_badge, created_at
        core_record = {
            "id": record_id,
            "stage": pred_data.get("stage", "university"),
            "input_features": input_data,
            "predicted_score": raw_score,
            "predicted_grade": pred_data.get("predicted_grade") or pred_data.get("grade") or "Grade A",
            "status_badge": pred_data.get("status_badge", "On Track"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        if self.client:
            try:
                self.client.table("prediction_history").insert(core_record).execute()
                logger.info(f"Successfully saved core prediction to Supabase: {record_id}")
            except Exception as e:
                # If database table still has legacy user_id / UUID before migration, supply it as fallback
                err_str = str(e).lower()
                if "user_id" in err_str or "not-null" in err_str:
                    core_record["user_id"] = resolved_id
                if "invalid input syntax for type uuid" in err_str or "22p02" in err_str:
                    core_record["id"] = str(uuid.uuid4())
                try:
                    self.client.table("prediction_history").insert(core_record).execute()
                except Exception as e2:
                    logger.warning(f"Error persisting core prediction: {e2}")

        formatted = self._format_history_record(core_record)
        memory_db.prediction_history.insert(0, formatted)
        return formatted

    def delete_prediction(self, history_id: str, user_id: Optional[str] = None) -> bool:
        """Deletes a prediction record by ID."""
        if self.client:
            try:
                query = self.client.table("prediction_history").delete().eq("id", history_id)
                if user_id and UUID_REGEX.match(str(user_id)):
                    query = query.eq("user_id", user_id)
                query.execute()
            except Exception as e:
                logger.warning(f"Error deleting prediction from Supabase: {e}")

        initial_len = len(memory_db.prediction_history)
        memory_db.prediction_history = [
            h for h in memory_db.prediction_history if str(h.get("id")) != str(history_id)
        ]
        return len(memory_db.prediction_history) < initial_len

    def clear_prediction_history(self, user_id: Optional[str] = None) -> int:
        """Clears all prediction history for a user."""
        if self.client:
            try:
                query = self.client.table("prediction_history").delete()
                if user_id and UUID_REGEX.match(str(user_id)):
                    query = query.eq("user_id", user_id)
                else:
                    query = query.neq("id", "00000000-0000-0000-0000-000000000000")
                query.execute()
            except Exception as e:
                logger.warning(f"Error clearing predictions from Supabase: {e}")

        count = len(memory_db.prediction_history)
        memory_db.prediction_history = []
        return count

    # --------------------------------------------------------------------------
    # Academic Subjects & Multi-Term CRUD (public.academic_subjects)
    # --------------------------------------------------------------------------
    def get_academic_records(self, user_id: str, stage: str = "university") -> List[Dict[str, Any]]:
        """Retrieves chronological academic subject records."""
        return self.get_academic_subjects(user_id=user_id, stage=stage)

    def get_academic_subjects(self, user_id: Optional[str] = None, stage: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieves logged course subjects from Supabase."""
        resolved_id = self._resolve_user_id(user_id)
        if self.client:
            try:
                query = self.client.table("academic_subjects").select("*")
                if resolved_id:
                    query = query.eq("user_id", resolved_id)
                if stage and stage != "all":
                    query = query.eq("stage", stage)
                res = query.order("created_at", desc=True).execute()
                if res.data:
                    return res.data
            except Exception as e:
                logger.warning(f"Error querying academic_subjects from Supabase: {e}")

        return [
            s for s in memory_db.academic_records 
            if (not stage or stage == "all" or s.get("stage") == stage)
        ]

    def save_academic_subject(self, user_id: Optional[str], subject_data: Dict[str, Any]) -> Dict[str, Any]:
        """Saves a course subject record into public.academic_subjects."""
        resolved_id = self._resolve_user_id(user_id)
        # Enforce PostgreSQL constraint: CHECK (subject_category IN ('Theory', 'Lab'))
        raw_category = str(subject_data.get("subject_category") or "Theory").strip().lower()
        validated_category = "Lab" if "lab" in raw_category or "pract" in raw_category else "Theory"

        record = {
            "id": sub_id,
            "user_id": resolved_id,
            "stage": subject_data.get("stage", "university"),
            "subject_name": subject_data.get("subject_name") or subject_data.get("name") or "Coursework",
            "subject_category": validated_category,
            "assessment_period": subject_data.get("assessment_period") or "Current Term",
            "obtained_marks": float(subject_data.get("obtained_marks") or subject_data.get("obtained") or 85.0),
            "total_marks": float(subject_data.get("total_marks") or subject_data.get("max") or 100.0),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        if self.client:
            try:
                res = self.client.table("academic_subjects").insert(record).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Error saving academic subject to Supabase: {e}")

        return record

    def get_academic_terms(self, user_id: Optional[str] = None, stage: str = "university") -> Dict[str, Any]:
        """
        Groups subjects by assessment_period (e.g. Semester 1, Semester 2) to build
        rich chronological academic terms with GPAs and subject lists.
        """
        resolved_id = self._resolve_user_id(user_id)
        all_subjects = self.get_academic_subjects(user_id=resolved_id, stage=stage)

        # Group by assessment_period
        terms_map: Dict[str, List[Dict[str, Any]]] = {}
        for s in all_subjects:
            period = s.get("assessment_period") or "Semester 1"
            if period not in terms_map:
                terms_map[period] = []
            terms_map[period].append(s)

        terms_list: List[Dict[str, Any]] = []
        running_gpas = []

        for idx, (term_name, subs) in enumerate(terms_map.items()):
            tot_obt = sum(float(sub.get("obtained_marks", 0)) for sub in subs)
            tot_max = sum(float(sub.get("total_marks", 100)) for sub in subs) or 100.0
            pct = round((tot_obt / tot_max) * 100.0, 2)
            
            # 4.0 scale calculation
            if stage == "university":
                gpa = round(min(4.0, (pct / 100.0) * 4.0), 2)
            else:
                gpa = pct

            running_gpas.append(gpa)
            cgpa = round(sum(running_gpas) / len(running_gpas), 2)

            # Format subject items
            formatted_subs = []
            for sub in subs:
                sub_obt = float(sub.get("obtained_marks", 0))
                sub_max = float(sub.get("total_marks", 100))
                sub_pct = round((sub_obt / sub_max) * 100, 1) if sub_max > 0 else 0
                grade_label = "A" if sub_pct >= 85 else ("B" if sub_pct >= 70 else ("C" if sub_pct >= 50 else "F"))
                formatted_subs.append({
                    "id": str(sub.get("id")),
                    "subject_name": str(sub.get("subject_name")),
                    "subject_category": str(sub.get("subject_category", "Theory")),
                    "obtained_marks": sub_obt,
                    "total_marks": sub_max,
                    "credits": 3.0,
                    "grade": grade_label
                })

            terms_list.append({
                "id": str(subs[0].get("id")),
                "stage": stage,
                "term_name": term_name,
                "term_order": idx + 1,
                "attendance_pct": 92.0,
                "study_hours": 5.0,
                "gpa": gpa,
                "cgpa": cgpa,
                "total_obtained": tot_obt,
                "total_max": tot_max,
                "percentage": pct,
                "subjects": formatted_subs,
                "created_at": str(subs[0].get("created_at", datetime.now(timezone.utc).isoformat()))
            })

        cum_cgpa = terms_list[-1]["cgpa"] if terms_list else 0.0
        avg_att = 92.0 if terms_list else 0.0

        return {
            "success": True,
            "count": len(terms_list),
            "stage": stage,
            "cumulative_cgpa": cum_cgpa,
            "average_attendance": avg_att,
            "total_terms_logged": len(terms_list),
            "terms": terms_list
        }

    def create_academic_term(self, user_id: Optional[str], term_data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates or updates a semester / academic term and persists its subjects in Supabase."""
        resolved_id = self._resolve_user_id(user_id)
        stage = term_data.get("stage", "university")
        term_name = term_data.get("term_name", "Semester 1")
        subjects = term_data.get("subjects", [])

        # Remove old rows for this term_name to prevent duplicates during edit
        self.delete_academic_term(user_id=resolved_id, term_name=term_name, stage=stage)

        if not subjects:
            if "gpa" in term_data and stage == "university":
                user_gpa = float(term_data["gpa"])
                obt = round(min(100.0, (user_gpa / 4.0) * 100.0), 1)
                subjects = [{"subject_name": f"{term_name} Coursework", "subject_category": "Theory", "obtained_marks": obt, "total_marks": 100.0}]
            else:
                subjects = [{"subject_name": "General Coursework", "subject_category": "Theory", "obtained_marks": 80.0, "total_marks": 100.0}]

        records_to_insert = []
        clean_subjects_json = []
        for idx, s in enumerate(subjects):
            raw_cat = str(s.get("subject_category") or "Theory").strip().lower()
            val_cat = "Lab" if "lab" in raw_cat or "pract" in raw_cat else "Theory"
            sub_id = str(s.get("id") or f"S-{idx+1}")
            obt = float(s.get("obtained_marks", 80.0))
            tot = float(s.get("total_marks", 100.0)) or 100.0
            pct = round((obt / tot) * 100.0, 2) if tot > 0 else 80.0

            sub_grade = s.get("grade")
            if not sub_grade or str(sub_grade).lower() in ["none", "null", ""]:
                if pct >= 85: sub_grade = "A+"
                elif pct >= 75: sub_grade = "A"
                elif pct >= 65: sub_grade = "B"
                elif pct >= 50: sub_grade = "C"
                else: sub_grade = "F"

            clean_subjects_json.append({
                "id": sub_id,
                "subject_name": s.get("subject_name", "Coursework"),
                "obtained_marks": obt,
                "total_marks": tot,
                "grade": str(sub_grade)
            })

            records_to_insert.append({
                "id": sub_id,
                "user_id": resolved_id,
                "stage": stage,
                "subject_name": s.get("subject_name", "Coursework"),
                "subject_category": val_cat,
                "assessment_period": term_name,
                "obtained_marks": obt,
                "total_marks": tot,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

        if self.client:
            # 1. Insert into academic_subjects table
            try:
                self.client.table("academic_subjects").insert(records_to_insert).execute()
            except Exception as e:
                logger.debug(f"Note on academic_subjects insert: {e}")

            # 2. Insert into academic_records table (Core fields only, short readable ID)
            try:
                tot_obt = sum(float(s.get("obtained_marks", 80.0)) for s in clean_subjects_json)
                tot_max = sum(float(s.get("total_marks", 100.0)) for s in clean_subjects_json) or 100.0
                pct = round((tot_obt / tot_max) * 100.0, 2)
                gpa_val = float(term_data.get("gpa", round(min(4.0, (pct / 100.0) * 4.0), 2) if stage == "university" else pct))
                cgpa_val = float(term_data.get("cgpa", gpa_val))

                rec_id = f"R-{uuid.uuid4().hex[:4].upper()}"
                term_record = {
                    "id": rec_id,
                    "user_id": resolved_id,
                    "stage": stage,
                    "term_name": term_name,
                    "gpa": gpa_val,
                    "cgpa": cgpa_val,
                    "subjects": clean_subjects_json,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                try:
                    self.client.table("academic_records").insert(term_record).execute()
                except Exception as ins_err:
                    if "invalid input syntax for type uuid" in str(ins_err).lower() or "22p02" in str(ins_err).lower():
                        term_record["id"] = str(uuid.uuid4())
                        self.client.table("academic_records").insert(term_record).execute()
                    else:
                        raise ins_err
            except Exception as e2:
                logger.debug(f"Academic records insert note: {e2}")

        # Update in-memory fallback
        memory_db.academic_records.extend(records_to_insert)
        return self.get_academic_terms(user_id=resolved_id, stage=stage)

    def delete_academic_term(self, user_id: Optional[str], term_name: str, stage: Optional[str] = None) -> bool:
        """Deletes all subjects under a specific semester/term without affecting other semesters."""
        resolved_id = self._resolve_user_id(user_id)
        if self.client:
            try:
                query = self.client.table("academic_subjects").delete().eq("user_id", resolved_id).eq("assessment_period", term_name)
                if stage and stage != "all":
                    query = query.eq("stage", stage)
                query.execute()
            except Exception as e:
                logger.warning(f"Error deleting academic term from Supabase: {e}")

            try:
                query2 = self.client.table("academic_records").delete().eq("user_id", resolved_id).eq("term_name", term_name)
                if stage and stage != "all":
                    query2 = query2.eq("stage", stage)
                query2.execute()
            except Exception as e2:
                logger.debug(f"Note on academic_records delete: {e2}")

        memory_db.academic_records = [
            r for r in memory_db.academic_records 
            if not (r.get("assessment_period") == term_name and (not stage or r.get("stage") == stage))
        ]
        return True

    # --------------------------------------------------------------------------
    # Student Roster CRUD Operations (public.teacher_class_roster)
    # --------------------------------------------------------------------------
    def _format_student_record(self, r: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": str(r.get("id")),
            "instructor_id": str(r.get("teacher_id") or r.get("instructor_id") or ""),
            "teacher_id": str(r.get("teacher_id") or ""),
            "roll_no": str(r.get("student_id_code") or r.get("roll_no") or "STU-001"),
            "student_id_code": str(r.get("student_id_code") or r.get("roll_no") or "STU-001"),
            "student_name": str(r.get("student_name") or "Student"),
            "email": r.get("email"),
            "stage": str(r.get("stage") or "university"),
            "class_section": str(r.get("class_section") or "Section A"),
            "subject": str(r.get("subject") or "General Coursework"),
            "attendance_pct": float(r.get("attendance_pct") or 85.0),
            "quiz_test_pct": float(r.get("quiz_test_pct") or r.get("avg_marks") or 80.0),
            "assignment_pct": float(r.get("assignment_pct") or r.get("avg_marks") or 80.0),
            "midterm_score": float(r.get("midterm_score") or r.get("avg_marks") or 75.0),
            "avg_marks": float(r.get("avg_marks") or 80.0),
            "study_hours": float(r.get("study_hours") or 4.0),
            "risk_level": str(r.get("risk_level") or "Low Risk"),
            "predicted_score": float(r["predicted_score"]) if r.get("predicted_score") is not None else None,
            "predicted_grade": r.get("predicted_grade"),
            "status_badge": str(r.get("risk_level") or r.get("status_badge") or "Evaluated"),
            "status_color": "badge-success" if str(r.get("risk_level") or "").lower() in ["low risk", "exemplary", "on track"] else "badge-warning",
            "gender": str(r.get("gender") or "male"),
            "notes": r.get("notes"),
            "created_at": str(r.get("created_at") or datetime.now(timezone.utc).isoformat()),
            "updated_at": str(r.get("updated_at") or r.get("created_at") or datetime.now(timezone.utc).isoformat()),
        }

    def get_students(
        self,
        instructor_id: Optional[str] = None,
        stage: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Lists students from teacher_class_roster with optional filters."""
        if self.client:
            try:
                query = self.client.table("teacher_class_roster").select("*")
                if instructor_id and UUID_REGEX.match(str(instructor_id)):
                    query = query.eq("teacher_id", instructor_id)
                if stage and stage != "all":
                    query = query.eq("stage", stage)
                res = query.order("student_name").execute()
                if res.data and len(res.data) > 0:
                    rows = [self._format_student_record(r) for r in res.data]
                    if search:
                        s_low = search.lower()
                        rows = [r for r in rows if s_low in r.get("student_name", "").lower() or s_low in r.get("student_id_code", "").lower()]
                    return rows
            except Exception as e:
                logger.warning(f"Error querying Supabase teacher_class_roster: {e}")

        # In-memory fallback
        students = [self._format_student_record(s) for s in memory_db.students_roster]
        if stage and stage != "all":
            students = [s for s in students if s.get("stage") == stage]
        if search:
            s_low = search.lower()
            students = [
                s for s in students 
                if s_low in s.get("student_name", "").lower() 
                or s_low in s.get("student_id_code", "").lower()
            ]
        return students

    def get_student_by_id(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Gets a single student record from teacher_class_roster."""
        if self.client:
            try:
                res = self.client.table("teacher_class_roster").select("*").eq("id", student_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Error querying student by ID from Supabase: {e}")

        for s in memory_db.students_roster:
            if str(s.get("id")) == str(student_id):
                return s
        return None

    def create_student(self, student_data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a new student record in teacher_class_roster with short readable IDs."""
        now = datetime.now(timezone.utc).isoformat()
        record_id = f"STU-{uuid.uuid4().hex[:3].upper()}"
        raw_tid = student_data.get("teacher_id")
        
        # Use short readable teacher ID (max 6 chars: TCH-01)
        teacher_id = "TCH-01"
        if raw_tid and not UUID_REGEX.match(str(raw_tid)):
            teacher_id = str(raw_tid)
        elif self.client and raw_tid:
            try:
                p_res = self.client.table("profiles").select("short_id").eq("id", raw_tid).execute()
                if p_res.data and p_res.data[0].get("short_id"):
                    teacher_id = p_res.data[0]["short_id"]
            except Exception:
                pass

        roll_val = student_data.get("roll_no") or student_data.get("student_id_code") or record_id
        record = {
            "id": record_id,
            "teacher_id": teacher_id,
            "instructor_id": teacher_id,
            "student_name": student_data.get("student_name", "Student Name"),
            "student_id_code": roll_val,
            "roll_no": roll_val,
            "email": student_data.get("email"),
            "class_section": student_data.get("class_section", "Section A"),
            "subject": student_data.get("subject", "Coursework"),
            "stage": student_data.get("stage", "university"),
            "attendance_pct": float(student_data.get("attendance_pct", 0.0)),
            "quiz_test_pct": float(student_data.get("quiz_test_pct", 0.0)),
            "assignment_pct": float(student_data.get("assignment_pct", 0.0)),
            "midterm_score": float(student_data.get("midterm_score", 0.0)),
            "avg_marks": float(student_data.get("avg_marks") or student_data.get("midterm_score") or 0.0),
            "study_hours": float(student_data.get("study_hours", 0.0)),
            "risk_level": student_data.get("risk_level") or student_data.get("status_badge") or "Low Risk",
            "predicted_score": student_data.get("predicted_score"),
            "predicted_grade": student_data.get("predicted_grade"),
            "status_badge": student_data.get("status_badge", "Evaluated"),
            "status_color": student_data.get("status_color", "badge-success"),
            "gender": student_data.get("gender", "male"),
            "notes": student_data.get("notes"),
            "created_at": now,
        }

        if self.client:
            try:
                self.client.table("teacher_class_roster").insert(record).execute()
                logger.info(f"Created student roster row in Supabase: {record_id}")
            except Exception as e:
                # UUID fallback before migration runs
                err_str = str(e).lower()
                if "invalid input syntax for type uuid" in err_str or "22p02" in err_str or "23503" in err_str:
                    resolved_uuid = self._resolve_user_id(raw_tid)
                    record["id"] = str(uuid.uuid4())
                    record["teacher_id"] = resolved_uuid
                    record["instructor_id"] = resolved_uuid
                    try:
                        self.client.table("teacher_class_roster").insert(record).execute()
                    except Exception as e2:
                        logger.warning(f"Error inserting student with UUID fallback: {e2}")
                else:
                    logger.warning(f"Error inserting student into Supabase teacher_class_roster: {e}")

        memory_db.students_roster.append(record)
        return self._format_student_record(record)

    def update_student(self, student_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates an existing student record in teacher_class_roster."""
        clean_updates = {k: v for k, v in update_data.items() if v is not None}
        db_cols = {"student_name", "student_id_code", "stage", "attendance_pct", "avg_marks", "study_hours", "risk_level", "predicted_score", "predicted_grade", "teacher_id"}
        db_payload = {k: v for k, v in clean_updates.items() if k in db_cols}

        if self.client and db_payload:
            try:
                self.client.table("teacher_class_roster").update(db_payload).eq("id", student_id).execute()
            except Exception as e:
                logger.warning(f"Error updating student in Supabase teacher_class_roster: {e}")

        for i, s in enumerate(memory_db.students_roster):
            if str(s.get("id")) == str(student_id):
                memory_db.students_roster[i].update(clean_updates)
                return self._format_student_record(memory_db.students_roster[i])

        return self._format_student_record({"id": student_id, **clean_updates})

    def delete_student(self, student_id: str) -> bool:
        """Deletes a student record from teacher_class_roster."""
        if self.client:
            try:
                self.client.table("teacher_class_roster").delete().eq("id", student_id).execute()
            except Exception as e:
                logger.warning(f"Error deleting student from Supabase teacher_class_roster: {e}")

        initial_len = len(memory_db.students_roster)
        memory_db.students_roster = [
            s for s in memory_db.students_roster if str(s.get("id")) != str(student_id)
        ]
        return len(memory_db.students_roster) < initial_len


supabase_service = SupabaseService()


