# System Architecture & Monorepo Design

## 1. High-Level Architecture

The **Student Performance Prediction & Analytics System** is engineered as a decoupled, multi-tiered enterprise full-stack platform:

```
[ Frontend (HTML5, Vanilla JS, Custom CSS3, Chart.js) ]
                      |
                      | HTTPS / REST / JWT Bearer
                      v
       [ Backend (FastAPI, Pydantic V2) ]
        /             |             \
       v              v              v
[ Supabase PostgreSQL ]   [ ML Pipelines ]   [ Centralized Logger ]
(RLS: auth.uid() = user_id)  (Joblib Artifacts)
```

---

## 2. Monorepo Organization

```
Ai project/
├── frontend/                     # Modern Vanilla JS / HTML5 / CSS3 SPA
│   ├── index.html                # Entry point & smart auth router
│   ├── login.html                # Authentication login screen
│   ├── signup.html               # Multi-stage user registration screen
│   ├── dashboard.html            # PAGE 1: Student Dashboard & Analytics
│   ├── css/
│   │   ├── variables.css         # Design system tokens (colors, radius, shadows)
│   │   ├── layout.css            # Sidebar, top navbar, responsive grid
│   │   ├── components.css        # KPI cards, badges, modals, toasts, skeletons
│   │   └── dashboard.css         # Split charts, advisory box, history table
│   └── js/
│       ├── supabase-client.js    # Client-safe Supabase auth wrapper
│       ├── auth.js               # Sign in, sign up, demo access
│       ├── api.js                # FastAPI client with token injection
│       └── dashboard.js          # Chart.js trend rendering & KPI updates
│
├── backend/                      # Production Python / FastAPI Service
│   └── app/
│       ├── main.py               # App setup, CORS, lifespan, exception handlers
│       ├── config.py             # Pydantic Settings & environment variables
│       ├── core/
│       │   ├── logger.py         # Structured logging
│       │   ├── exceptions.py     # Centralized error handlers & custom exceptions
│       │   ├── database.py       # Supabase client + offline fallback store
│       │   └── security.py       # JWT decoder & current user dependency
│       ├── models/
│       │   └── schemas.py        # Pydantic validation models
│       ├── routes/
│       │   ├── health.py         # /health diagnostics
│       │   ├── dashboard.py      # /api/v1/dashboard/summary
│       │   ├── predictions.py    # /api/v1/predictions/{stage}
│       │   ├── history.py        # /api/v1/history
│       │   └── models_registry.py# /api/v1/models
│       └── services/
│           ├── ml_service.py     # Model loading, inference, explanations
│           ├── dashboard_service.py # Aggregation & Chart.js series formatting
│           └── supabase_service.py  # Profiles & history DB access
│
├── ml/                           # Machine Learning Pipelines
│   ├── preprocessing.py          # Data cleaning & performance tier calibration
│   ├── train.py                  # Multi-stage training & serialization script
│   └── artifacts/                # Serialized .joblib pipelines & registry JSON
│
├── database/                     # PostgreSQL Migrations & Security
│   ├── schema.sql                # Complete relational schema & triggers
│   ├── rls_policies.sql          # Row Level Security (RLS) policies
│   └── seed.sql                  # Initial seed data for testing
│
├── tests/                        # Automated Pytest Suite
│   ├── test_api.py               # Integration tests for FastAPI endpoints
│   └── test_ml_pipelines.py      # Unit tests for ML inference & metrics
│
├── docs/                         # Technical Documentation
│   ├── API_DOCS.md
│   ├── ARCHITECTURE.md
│   └── DEPLOYMENT.md
│
├── requirements.txt
├── .env.example
├── .env
├── .gitignore
├── vercel.json
└── render.yaml
```

---

## 3. Row Level Security (RLS) Model

Security is enforced directly at the PostgreSQL layer using Supabase Row Level Security:

1. **`profiles`**: `auth.uid() = id` (Students can read/update only their own profile).
2. **`student_profiles`**: `auth.uid() = user_id` (Stage records are private to user).
3. **`academic_records`**: `auth.uid() = user_id` (Term GPA records are isolated).
4. **`prediction_history`**: `auth.uid() = user_id` (Inference history is private).
5. **`model_registry`**: Public read-only for active models (`is_active = TRUE`), write-restricted to backend service role.

---

## 4. Multi-Stage Machine Learning Models

| Stage | Target Variable | Algorithm | Evaluation Metrics |
|---|---|---|---|
| **University** | `Final_CGPA` (0.0 - 4.0) | **Gradient Boosting Regressor** | $R^2 = 0.9525$, $RMSE = 0.1167$ |
| **Matric / Inter** | `HSSC_II_Marks` (0 - 1100) | **Ridge Regression** | Scaled linear regularized model |
| **Secondary** | `G3` Grade (0 - 20) | **Gradient Boosting Regressor** | $R^2 = 0.8083$, $RMSE = 1.9829$ |
| **Primary** | `Education score` (0 - 100) | **Linear Regression** | $R^2 = 0.9738$, $RMSE = 2.1599$ |
