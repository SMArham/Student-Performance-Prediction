"""
Unit Tests for Machine Learning Pipelines
Student Performance Prediction & Analytics System
"""

import pytest
from ml.preprocessing import get_performance_badge
from backend.app.services.ml_service import ml_service


def test_models_loaded():
    """Verify that all 4 stage models are loaded in the ML service."""
    stages = ["university", "matric_inter", "secondary", "primary"]
    for stage in stages:
        assert stage in ml_service.models, f"Model for stage {stage} was not loaded!"


def test_university_prediction():
    """Test inference output for University Gradient Boosting model."""
    sample_input = {
        "Age": 21,
        "Attendance_Pct": 90.0,
        "Study_Hours_Per_Day": 5.0,
        "Previous_CGPA": 3.6,
        "Sleep_Hours": 7.5,
        "Social_Hours_Week": 6,
        "Gender": "Male",
        "Major": "Engineering",
    }
    res = ml_service.predict("university", sample_input)
    assert res["success"] is True
    assert 0.0 <= res["predicted_score"] <= 4.0
    assert "CGPA" in res["formatted_score"]
    assert res["status_badge"] in ["Exemplary", "On Track", "At Risk", "Critical Intervention Needed"]
    assert res["confidence_interval_low"] <= res["predicted_score"] <= res["confidence_interval_high"]


def test_matric_inter_prediction():
    """Test inference output for Matric/Inter Ridge model."""
    sample_input = {
        "SSC_I_Marks": 650,
        "SSC_II_Marks": 680,
        "HSSC_I_Marks": 420,
        "Attendance_Rate": 85.0,
        "Study_Hours": 4.0,
        "Previous_Failures": 0,
        "Exam_Attempts": 1,
        "Region": "Mohmand",
        "Gender": "Male",
        "Enrollment_Type": "Regular",
        "Subject_Group": "Science",
        "Parent_Education_Level": "College",
        "Parent_Income": "Medium",
        "Extra_Tuition": "No",
        "School_Type": "Private",
        "Co_Curricular_Activities": "Yes",
    }
    res = ml_service.predict("matric_inter", sample_input)
    assert res["success"] is True
    assert 0.0 <= res["predicted_score"] <= 1100.0
    assert "1100" in res["formatted_score"]


def test_secondary_prediction():
    """Test inference output for Secondary Gradient Boosting model."""
    sample_input = {
        "age": 16,
        "Medu": 3,
        "Fedu": 3,
        "traveltime": 1,
        "studytime": 2,
        "failures": 0,
        "famrel": 4,
        "freetime": 3,
        "goout": 3,
        "Dalc": 1,
        "Walc": 1,
        "health": 4,
        "absences": 4,
        "G1": 15,
        "G2": 16,
        "school": "GP",
        "sex": "F",
        "address": "U",
        "famsize": "GT3",
        "Pstatus": "T",
        "Mjob": "teacher",
        "Fjob": "services",
        "reason": "course",
        "guardian": "mother",
        "schoolsup": "no",
        "famsup": "yes",
        "paid": "no",
        "activities": "yes",
        "nursery": "yes",
        "higher": "yes",
        "internet": "yes",
        "romantic": "no",
    }
    res = ml_service.predict("secondary", sample_input)
    assert res["success"] is True
    assert 0.0 <= res["predicted_score"] <= 100.0
    assert "%" in res["formatted_score"]


def test_primary_prediction():
    """Test inference output for Primary Linear Regression model."""
    sample_input = {
        "Enrolment score": 78.5,
        "Learning score": 74.0,
        "Retention score": 82.0,
        "School infrastructure score": 70.0,
        "Gender parity score": 88.0,
        "Total number of schools": 520,
        "Drinking water": 85.0,
        "Electricity": 80.0,
        "Toilet": 90.0,
        "Province": "Punjab",
    }
    res = ml_service.predict("primary", sample_input)
    assert res["success"] is True
    assert 0.0 <= res["predicted_score"] <= 100.0
    assert "%" in res["formatted_score"]


def test_performance_badge_calibration():
    """Verify calibrated performance badge assignments."""
    badge, color, _ = get_performance_badge("university", 3.85)
    assert badge == "Exemplary"
    assert color == "badge-success"

    badge, color, _ = get_performance_badge("university", 3.20)
    assert badge == "On Track"
    assert color == "badge-primary"

    badge, color, _ = get_performance_badge("university", 2.60)
    assert badge == "At Risk"
    assert color == "badge-warning"

    badge, color, _ = get_performance_badge("university", 1.90)
    assert badge == "Critical Intervention Needed"
    assert color == "badge-danger"
