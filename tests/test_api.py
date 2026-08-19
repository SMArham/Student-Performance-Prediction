"""
Integration Tests for FastAPI Backend Endpoints
Student Performance Prediction & Analytics System
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify GET /health returns status healthy and lists loaded stages."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["ml_engine"]["status"] == "operational"
    assert len(data["ml_engine"]["loaded_stages"]) == 4


def test_dashboard_summary_endpoint():
    """Verify GET /api/v1/dashboard/summary returns Page 1 student data structure."""
    response = client.get("/api/v1/dashboard/summary?stage=university")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

    # Validate student info
    assert "student_info" in data
    assert data["student_info"]["stage"] == "university"
    assert "full_name" in data["student_info"]

    # Validate KPIs
    assert "kpis" in data
    kpis = data["kpis"]
    assert "current_gpa" in kpis
    assert "cumulative_cgpa" in kpis
    assert "predicted_gpa" in kpis
    assert "status_badge" in kpis

    # Validate progression chart data
    assert "progression_trend" in data
    trend = data["progression_trend"]
    assert "labels" in trend
    assert len(trend["labels"]) > 0
    assert "past_gpa_series" in trend
    assert "predicted_target_series" in trend


def test_predictions_university():
    """Verify POST /api/v1/predictions/university runs inference properly."""
    payload = {
        "Age": 22,
        "Attendance_Pct": 92.0,
        "Study_Hours_Per_Day": 5.5,
        "Previous_CGPA": 3.75,
        "Sleep_Hours": 7.0,
        "Social_Hours_Week": 6,
        "Gender": "Female",
        "Major": "Computer Science",
    }
    response = client.post("/api/v1/predictions/university", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["stage"] == "university"
    assert "predicted_score" in data
    assert 0.0 <= data["predicted_score"] <= 4.0
    assert data["status_badge"] in ["Exemplary", "On Track", "At Risk", "Critical Intervention Needed"]


def test_predictions_matric_inter():
    """Verify POST /api/v1/predictions/matric_inter runs inference properly."""
    payload = {
        "SSC_I_Marks": 700,
        "SSC_II_Marks": 720,
        "HSSC_I_Marks": 450,
        "Attendance_Rate": 90.0,
        "Study_Hours": 4.5,
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
    response = client.post("/api/v1/predictions/matric_inter", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["stage"] == "matric_inter"
    assert "predicted_score" in data


def test_history_endpoint():
    """Verify GET /api/v1/history returns history records."""
    response = client.get("/api/v1/history?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_models_registry_endpoint():
    """Verify GET /api/v1/models returns active model catalog."""
    response = client.get("/api/v1/models")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    assert "university" in data["models"]
