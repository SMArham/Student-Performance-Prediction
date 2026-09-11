import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_academic_records_get_default():
    response = client.get("/api/v1/academic-records?stage=university")
    assert response.status_code == 200
    data = response.json()
    assert "success" in data
    assert "terms" in data
    assert isinstance(data['terms'], list)
    assert "cumulative_cgpa" in data
    assert "stage" in data

def test_academic_records_create_university_term():
    term_payload = {
        "term_name": "QA Test Semester 1",
        "stage": "university",
        "gpa": 3.80,
        "cgpa": 3.75,
        "attendance_pct": 95.0,
        "credit_hours": 18,
        "midterm_score": 88.0,
        "backlogs": 0,
        "study_hours": 5.0,
        "subjects": [
            {
                "subject_name": "QA Algorithms",
                "subject_category": "Theory",
                "obtained_marks": 85.0,
                "total_marks": 100.0,
                "grade": "A",
                "credits": 3
            }
        ]
    }
    response = client.post("/api/v1/academic-records", json=term_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    term_names = [t["term_name"] for t in data['terms']]
    assert "QA Test Semester 1" in term_names

def test_academic_records_create_intermediate_term():
    term_payload = {
        "term_name": "QA 1st Year (11th Class)",
        "stage": "intermediate",
        "gpa": 1.70,
        "percentage": 78.5,
        "attendance_pct": 90.0,
        "credit_hours": 0,
        "midterm_score": 82.0,
        "study_hours": 4.5,
        "subjects": [
            {
                "subject_name": "QA Physics",
                "subject_category": "Core Science",
                "obtained_marks": 78.0,
                "total_marks": 100.0,
                "grade": "A",
                "credits": 3
            }
        ]
    }
    response = client.post("/api/v1/academic-records", json=term_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True

def test_academic_records_delete_term():
    response = client.delete("/api/v1/academic-records/QA%20Test%20Semester%201?stage=university")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "QA Test Semester 1" in data["message"]
    client.delete("/api/v1/academic-records/QA%201st%20Year%20(11th%20Class)?stage=intermediate")
