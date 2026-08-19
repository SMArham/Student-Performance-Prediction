# Student Performance Prediction & Analytics API Documentation

The FastAPI backend provides RESTful endpoints for student dashboard analytics, stage-specific machine learning predictions, historical logs, and the model registry catalog.

Interactive Swagger UI is accessible at: `http://localhost:8000/docs`  
ReDoc is accessible at: `http://localhost:8000/redoc`

---

## 1. System Health Check

### `GET /health`
Returns system diagnostics, active ML models, database connectivity state, and server timestamp.

**Sample Response:**
```json
{
  "status": "healthy",
  "environment": "development",
  "timestamp": "2026-08-19T12:28:15.737000+00:00",
  "database": {
    "status": "connected",
    "provider": "Supabase PostgreSQL"
  },
  "ml_engine": {
    "status": "operational",
    "active_models_count": 4,
    "loaded_stages": ["university", "matric_inter", "secondary", "primary"]
  },
  "version": "1.0.0"
}
```

---

## 2. Student Dashboard Summary (Page 1)

### `GET /api/v1/dashboard/summary`
**Query Parameters:**
- `stage` (string, optional): `university`, `matric_inter`, `secondary`, `primary` (default: `university`)

**Headers:**
- `Authorization: Bearer <JWT_TOKEN>` (optional; defaults to demo student in local mode)

**Sample Response:**
```json
{
  "success": true,
  "student_info": {
    "user_id": "demo-user-id-001",
    "full_name": "Muhammad Ali",
    "email": "student@example.com",
    "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=MuhammadAli",
    "role": "student",
    "stage": "university",
    "student_id_code": "SE-2023-049",
    "institution_name": "Faculty of Computer Science & Engineering",
    "program_or_major": "Software Engineering",
    "current_grade_level": "Year 3 (6th Semester)"
  },
  "kpis": {
    "current_gpa": 3.65,
    "cumulative_cgpa": 3.48,
    "predicted_gpa": 3.72,
    "target_cgpa": 3.80,
    "delta_cgpa": 0.10,
    "trend_direction": "up",
    "status_badge": "Exemplary",
    "status_color": "badge-success",
    "status_message": "Outstanding academic trajectory. Eligible for Dean's Honor Roll and scholarship opportunities."
  },
  "progression_trend": {
    "labels": ["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5 (Current)", "Next Term (AI Target)"],
    "past_gpa_series": [3.20, 3.35, 3.42, 3.52, 3.65, null],
    "current_gpa_series": [null, null, null, null, 3.65, null],
    "predicted_target_series": [null, null, null, null, 3.65, 3.72]
  },
  "recent_predictions": [
    {
      "id": "pred-hist-1",
      "stage": "university",
      "model_name": "University CGPA Multi-Factor Predictor",
      "model_version": "v1.0.0",
      "predicted_score": 3.72,
      "status_badge": "Exemplary",
      "status_color": "badge-success",
      "created_at": "2026-08-19T10:00:00Z"
    }
  ],
  "has_records": true,
  "quick_tips": [
    "Attendance above 85% strongly correlates with achieving Dean's honor list.",
    "Consistently spending 4+ hours on active self-study improves retention by 28%.",
    "Balancing 7+ hours of sleep stabilizes cognitive test performance."
  ]
}
```

---

## 3. Real-Time Stage Predictions

### `POST /api/v1/predictions/{stage}`
Supported stages: `university`, `matric_inter`, `secondary`, `primary`.

#### University Example Request:
```json
{
  "Age": 21,
  "Attendance_Pct": 90.0,
  "Study_Hours_Per_Day": 5.0,
  "Previous_CGPA": 3.60,
  "Sleep_Hours": 7.5,
  "Social_Hours_Week": 6,
  "Gender": "Male",
  "Major": "Engineering"
}
```

#### University Example Response:
```json
{
  "success": true,
  "stage": "university",
  "model_name": "University CGPA Multi-Factor Predictor",
  "model_version": "v1.0.0",
  "predicted_score": 3.74,
  "formatted_score": "3.74 CGPA",
  "predicted_grade": "A (Excellent)",
  "confidence_interval_low": 3.51,
  "confidence_interval_high": 3.97,
  "status_badge": "Exemplary",
  "status_color": "badge-success",
  "recommendation": "Outstanding academic trajectory. Eligible for Dean's Honor Roll and scholarship opportunities.",
  "feature_contributions": {
    "top_positive_factors": [
      "Strong baseline GPA (3.60) accounts for major baseline predictive weight",
      "High attendance rate (90.0%) positively reinforces academic consistency",
      "Daily study routine (5.0 hrs/day) solidifies conceptual retention"
    ],
    "growth_areas": [
      "Maintain >85% attendance during mid-term and final project exam blocks",
      "Target 1 additional hour of weekly group revision for complex core modules"
    ]
  },
  "created_at": "2026-08-19T12:30:00+00:00"
}
```

---

## 4. Prediction History

### `GET /api/v1/history`
**Query Parameters:**
- `limit` (integer, optional, 1-100, default: 20)

Returns the chronological log of predictions executed for the authenticated student.

---

## 5. Model Registry Catalog

### `GET /api/v1/models`
Returns trained model metadata, R² / RMSE / MAE benchmark scores, algorithm details, and input feature schemas across all educational stages.
