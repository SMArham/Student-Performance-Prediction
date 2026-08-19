# Student Performance Prediction & Analytics System

An enterprise-grade, multi-stage AI platform that predicts student academic performance across 4 educational stages, monitors real-time GPA trajectories, and delivers calibrated interventions.

Built with **FastAPI**, **Scikit-learn**, **Vanilla JavaScript**, **Chart.js**, and **Supabase (PostgreSQL + RLS)**.

---

## 🌟 Key Features (PAGE 1: Foundation & Student Dashboard)

- 📊 **Multi-Stage ML Pipelines**: Pre-trained and serialized Scikit-learn pipelines with calibrated prediction intervals:
  - **University**: Gradient Boosting Regressor for CGPA ($R^2 = 0.9525$)
  - **Matric / Intermediate**: Ridge Regression for HSSC-II Marks
  - **Secondary**: Gradient Boosting Regressor for G3 Score ($R^2 = 0.8083$)
  - **Primary**: Linear Regression for Education Score ($R^2 = 0.9738$)
- 🛡️ **Supabase Security & RLS**: Strict PostgreSQL Row Level Security (`auth.uid() = user_id`) protecting profile, academic records, and prediction history. Safe client-side Auth with zero service-key leakage.
- 📈 **Dynamic GPA Progression Chart**: High-contrast Chart.js visualization seamlessly connecting historical semester GPAs, the current active term, and AI-projected target trajectories.
- 🏷️ **Calibrated Performance Badges**: Automated classification into *Exemplary*, *On Track*, *At Risk*, and *Critical Intervention Needed* with actionable advisory recommendations.
- ⚡ **Interactive AI Performance Simulator**: Instant in-browser simulation modal to test how changes in study hours, attendance, sleep, and social habits impact forecasted GPA.
- 🎨 **Modular Design System**: Standardized CSS tokens (`variables.css`, `layout.css`, `components.css`) ensuring seamless collaboration for Team Members 2 & 3.

---

## 🚀 Quick Start (Local Run)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Train & Serialize ML Models
```bash
python ml/train.py
```

### 3. Start the Application Server
```bash
python backend/app/main.py
```

Open your browser at:
- **Student Dashboard (Page 1)**: [http://localhost:8000/dashboard.html](http://localhost:8000/dashboard.html)
- **Sign In / Demo Login**: [http://localhost:8000/login.html](http://localhost:8000/login.html)
- **Registration**: [http://localhost:8000/signup.html](http://localhost:8000/signup.html)
- **Interactive API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🧪 Running Automated Tests

Run the full pytest suite:
```bash
python -m pytest tests/ -v
```
All 12 unit & integration tests validate ML pipelines, API endpoints, schema validation, and calibration rules.

---

## 📚 Detailed Documentation

- [API Specification](docs/API_DOCS.md)
- [System Architecture & Monorepo Design](docs/ARCHITECTURE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Database Schema (SQL)](database/schema.sql)
- [Row Level Security Policies (SQL)](database/rls_policies.sql)

---

## 👥 Team & Contributors

| Contributor | GitHub Profile | Role / Responsibility |
|---|---|---|
| **Syed Muhammad Arham** | [@SMArham](https://github.com/SMArham) | Project Lead & Page 1 (Foundation, Auth & Student Dashboard) |
| **Fatima Hasnain** | [@fatimahasnain518](https://github.com/fatimahasnain518) | Core Contributor & Analytics Team Member |

