"""
Comprehensive Test Suite for Student Management & CRUD Operations
Student Performance Prediction & Analytics System
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_list_students_default():
    """Verify that student roster is returned with 200 OK."""
    response = client.get("/api/v1/students")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "count" in data
    assert "students" in data


def _get_or_create_student():
    list_resp = client.get("/api/v1/students")
    students = list_resp.json().get("students", [])
    if students:
        return students[0]["id"]
    new_student = {
        "roll_no": "TEST-SE-01",
        "student_name": "Test Candidate Student",
        "email": "test.candidate@university.edu",
        "stage": "university",
        "class_section": "BSSE-4B",
        "subject": "Distributed Systems",
        "attendance_pct": 95.0,
        "quiz_test_pct": 90.0,
        "assignment_pct": 92.0,
        "midterm_score": 88.0,
        "gender": "male",
        "notes": "Fast conceptual grasp in concurrent programming."
    }
    response = client.post("/api/v1/students", json=new_student)
    return response.json()["id"]


def test_create_student():
    """Verify creating a new student in the gradebook roster."""
    new_student = {
        "roll_no": "TEST-SE-99",
        "student_name": "Test Candidate Student",
        "email": "test.candidate@university.edu",
        "stage": "university",
        "class_section": "BSSE-4B",
        "subject": "Distributed Systems",
        "attendance_pct": 95.0,
        "quiz_test_pct": 90.0,
        "assignment_pct": 92.0,
        "midterm_score": 88.0,
        "gender": "male",
        "notes": "Fast conceptual grasp in concurrent programming."
    }
    response = client.post("/api/v1/students", json=new_student)
    assert response.status_code == 201
    created = response.json()
    assert created["roll_no"] == "TEST-SE-99"
    assert created["student_name"] == "Test Candidate Student"
    assert "predicted_score" in created
    assert created["predicted_score"] is not None
    assert "status_badge" in created
    assert "id" in created


def test_get_student_by_id():
    """Verify retrieving student details by ID."""
    target_id = _get_or_create_student()

    response = client.get(f"/api/v1/students/{target_id}")
    assert response.status_code == 200
    student = response.json()
    assert student["id"] == target_id
    assert "attendance_pct" in student


def test_update_student():
    """Verify updating student grades, attendance, and remarks."""
    target_id = _get_or_create_student()

    update_payload = {
        "attendance_pct": 98.0,
        "quiz_test_pct": 95.0,
        "notes": "Updated remarks - outstanding performance across all labs."
    }
    response = client.put(f"/api/v1/students/{target_id}", json=update_payload)
    assert response.status_code == 200
    updated = response.json()
    assert updated["attendance_pct"] == 98.0
    assert updated["quiz_test_pct"] == 95.0
    assert "Updated remarks" in updated["notes"]


def test_evaluate_student():
    """Verify executing real-time ML evaluation on individual student."""
    target_id = _get_or_create_student()

    response = client.post(f"/api/v1/students/{target_id}/evaluate")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["student_id"] == target_id
    assert "prediction" in data


def test_batch_prediction_evaluation():
    """Verify batch evaluation for an entire class roster."""
    batch_payload = {
        "stage": "university",
        "class_name": "BSSE-4A",
        "subject": "Data Structures",
        "students": [
            {
                "roll_no": "STU-01",
                "student_name": "Student Alpha",
                "attendance_pct": 94.0,
                "quiz_test_pct": 90.0,
                "assignment_pct": 92.0,
                "midterm_score": 88.0,
                "gender": "male"
            },
            {
                "roll_no": "STU-02",
                "student_name": "Student Beta",
                "attendance_pct": 60.0,
                "quiz_test_pct": 55.0,
                "assignment_pct": 58.0,
                "midterm_score": 50.0,
                "gender": "female"
            }
        ]
    }
    response = client.post("/api/v1/predictions/batch/evaluate", json=batch_payload)
    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True
    assert result["total_evaluated"] == 2
    assert "class_average" in result
    assert "high_achievers_count" in result
    assert "at_risk_count" in result
    assert "grade_distribution" in result


def test_delete_student():
    """Verify deleting a student from the roster."""
    # Create a temporary student to delete
    temp_student = {
        "roll_no": "DEL-99",
        "student_name": "Delete Me",
        "email": "del@test.com",
        "stage": "university",
        "class_section": "BSSE-4A",
        "subject": "Test Course",
        "attendance_pct": 70.0,
        "quiz_test_pct": 70.0,
        "assignment_pct": 70.0,
        "midterm_score": 70.0,
        "gender": "male"
    }
    create_resp = client.post("/api/v1/students", json=temp_student)
    stu_id = create_resp.json()["id"]

    del_resp = client.delete(f"/api/v1/students/{stu_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True

    # Confirm 404 on subsequent get
    get_resp = client.get(f"/api/v1/students/{stu_id}")
    assert get_resp.status_code == 404
