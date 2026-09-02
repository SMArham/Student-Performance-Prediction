# 🎓 Student Performance Prediction & Analytics System

[![Python](https://img.shields.io/badge/Python-3.11%2B%20%7C%203.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-ML%20Pipelines-F7931E.svg)](https://scikit-learn.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20RLS-3ECF8E.svg)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black.svg)](https://vercel.com/)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7.svg)](https://render.com/)

An AI-powered academic analytics and forecasting web application designed to help students and educators predict academic performance, monitor progress, and intervene early.

The platform provides stage-calibrated predictions across **4 educational levels** (University, Matric / Intermediate, Secondary School, and Primary School) using machine learning pipelines, interactive dashboards, and complete teacher class roster management.

---

## 🌟 Key Features

- 🧠 **Multi-Stage Machine Learning Pipelines**
  - **University**: Gradient Boosting Regressor for CGPA predictions (R² = 0.95).
  - **Matric / Intermediate**: Ridge Regression for HSSC marks.
  - **Secondary School**: Gradient Boosting Regressor for final exam scores (R² = 0.81).
  - **Primary School**: Linear Regression for foundational subject metrics (R² = 0.97).

- 📊 **Interactive Student Dashboard**
  - Live GPA trajectory progression charts powered by **Chart.js**.
  - Performance risk classification (*Exemplary*, *On Track*, *At Risk*, *Critical Intervention*).
  - What-If simulator to test how study hours, sleep, and attendance impact forecasted grades.

- 👨‍🏫 **Teacher Dashboard & Analytics**
  - Complete class roster management with **Create, Read, Update, and Delete (CRUD)** operations.
  - One-click **Run AI** to instantly evaluate entire class sections.
  - Risk distribution charts, subject breakdown, and student search/filtering.

- 🗄️ **Clean Database Architecture**
  - Unified **Supabase (PostgreSQL)** database schema with zero data redundancy.
  - Short, readable human-friendly identifiers (STU-01, TCH-01, 101, 1001).
  - Row Level Security (RLS) policies protecting student privacy.

---

## 🏗️ Project Architecture

`
Student-Performance-Prediction/
├── backend/                  # FastAPI Application
│   └── app/
│       ├── core/             # Supabase client & database config
│       ├── models/           # Pydantic schemas & validation
│       ├── routes/           # API endpoints (predictions, students, academic records)
│       └── services/         # ML inference, Supabase integration, dashboard logic
├── frontend/                 # Client-Side Application (HTML5, Modern CSS, Vanilla JS)
│   ├── css/                  # Modular design system (variables, components, layout)
│   ├── js/                   # API clients, Chart.js managers, auth, CRUD logic
│   ├── dashboard.html        # Student analytics portal
│   ├── teacher-dashboard.html# Teacher class management & overview
│   ├── teacher-analytics.html# In-depth class performance & roster CRUD
│   ├── prediction.html       # Student prediction form & simulator
│   └── login.html            # Authentication gateway
├── ml/                       # Machine Learning Pipelines
│   ├── artifacts/            # Serialized trained model pipelines (.pkl)
│   ├── train.py              # Automated dataset generation & model training script
│   └── preprocessing.py      # Custom scikit-learn transformers
├── database/                 # Production PostgreSQL migrations & schemas
├── tests/                    # Pytest test suite (19 unit & integration tests)
├── render.yaml               # One-click Render deployment blueprint
├── vercel.json               # Vercel routing & reverse proxy configuration
└── requirements.txt          # Python runtime dependencies
`

---

## ⚡ Quick Start (Local Setup)

### 1. Clone the Repository
`ash
git clone https://github.com/SMArham/Student-Performance-Prediction.git
cd Student-Performance-Prediction
`

### 2. Install Dependencies
`ash
pip install -r requirements.txt
`

### 3. Setup Environment Variables
Copy .env.example to .env and fill in your Supabase credentials:
`ash
cp .env.example .env
`

### 4. Train ML Models & Run Server
`ash
python ml/train.py
python run_server.py
`

Open your browser at:
- **Application Portal**: [http://localhost:9005/login.html](http://localhost:9005/login.html)
- **Student Dashboard**: [http://localhost:9005/dashboard.html](http://localhost:9005/dashboard.html)
- **Teacher Analytics**: [http://localhost:9005/teacher-analytics.html](http://localhost:9005/teacher-analytics.html)
- **Interactive API Docs (Swagger)**: [http://localhost:9005/docs](http://localhost:9005/docs)

---

## 🧪 Automated Testing

To run the complete automated test suite:
`ash
python -m pytest tests/ -v
`
All **19 tests** cover API endpoints, machine learning inference, and teacher class roster CRUD operations.

---

## 🚀 Deployment Overview

| Service | Component | Platform |
|---|---|---|
| **Backend API** | FastAPI + Python ML Pipelines | [Render](https://render.com/) |
| **Frontend UI** | Static Assets (HTML/CSS/JS) | [Vercel](https://vercel.com/) |
| **Database** | PostgreSQL + Auth + RLS | [Supabase](https://supabase.com/) |

---

## 👥 Team & Contributors

Proudly designed and developed by:

| Contributor | GitHub Profile | Role / Responsibility |
|---|---|---|
| **Syed Muhammad Arham** | [@SMArham](https://github.com/SMArham) | Project Lead & Full-Stack Architect |
| **Muhammad Yahya Siddiqui** | [@muhammadyahyasiddiqui](https://github.com/muhammadyahyasiddiqui) | Core Contributor & Full-Stack Developer |
| **Fatima Hasnain** | [@fatimahasnain518](https://github.com/fatimahasnain518) | Core Contributor & Analytics Team Member |

---

## 📄 License
This project is developed for educational and research purposes.
