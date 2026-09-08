# 🎓 Student Performance Prediction & Analytics System

[![Python](https://img.shields.io/badge/Python-3.11%2B%20%7C%203.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-ML%20Pipelines-F7931E.svg)](https://scikit-learn.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20RLS-3ECF8E.svg)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black.svg)](https://vercel.com/)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7.svg)](https://render.com/)

An AI-powered academic analytics and forecasting web platform designed to help students and educators predict performance, monitor progress, and deliver early academic interventions.

The platform provides stage-calibrated predictions across **4 educational stages** (University, Matric / Intermediate, Secondary School, and Primary School) using machine learning pipelines, interactive analytics, and class roster management.

---

## 🌟 Key Features

- 🧠 **Multi-Stage Machine Learning Pipelines**
  - **University**: Gradient Boosting Regressor for CGPA predictions.
  - **Matric / Intermediate**: Ridge Regression for HSSC marks.
  - **Secondary School**: Gradient Boosting Regressor for final exam scores.
  - **Primary School**: Linear Regression for foundational metrics.

- 📊 **Interactive Student Dashboard**
  - Live GPA trajectory progression charts powered by **Chart.js**.
  - Performance classification badges (*Exemplary*, *On Track*, *At Risk*, *Critical Intervention*).
  - What-If simulator to test how study hours, sleep, and attendance impact forecasted grades.

- 👨‍🏫 **Teacher Dashboard & Analytics**
  - Complete student roster management with **Create, Read, Update, and Delete (CRUD)** operations.
  - One-click **Run AI** to evaluate entire class sections instantly.
  - Performance risk distribution charts, subject breakdown, and search filtering.

- 🗄️ **Clean Database Architecture**
  - Unified **Supabase (PostgreSQL)** database schema with zero data redundancy.
  - Short, readable human-friendly identifiers (STU-01, TCH-01, 101, 1001).
  - Row Level Security (RLS) policies protecting student privacy.

---

## ⚡ Quick Start (Local Setup)

### 1. Clone the Repository
```bash
git clone https://github.com/SMArham/Student-Performance-Prediction.git
cd Student-Performance-Prediction
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Setup Environment Variables
Copy `.env.example` to `.env` and add your Supabase credentials:
```bash
cp .env.example .env
```

### 4. Train ML Models & Run Server
```bash
python ml/train.py
python run_server.py
```

Open your browser at:
- **Application Portal**: [http://localhost:9005/login.html](http://localhost:9005/login.html)
- **Student Dashboard**: [http://localhost:9005/dashboard.html](http://localhost:9005/dashboard.html)
- **Teacher Analytics**: [http://localhost:9005/teacher-analytics.html](http://localhost:9005/teacher-analytics.html)

---

## 🧪 Automated Testing

Run the full pytest suite:
```bash
python -m pytest tests/ -v
```
All **19 tests** validate API endpoints, machine learning pipelines, schema validation, and student CRUD operations.

---

## 🚀 Deployment

| Component | Platform | Role |
|---|---|---|
| **Backend API** | [Render](https://render.com/) | FastAPI + Python ML Models |
| **Frontend UI** | [Vercel](https://vercel.com/) | Static Web Assets (HTML/CSS/JS) |
| **Database** | [Supabase](https://supabase.com/) | PostgreSQL + Auth + RLS |

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
