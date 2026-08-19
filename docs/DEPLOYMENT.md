# Deployment Guide: Student Performance Prediction & Analytics System

This guide outlines deployment for both Supabase (Database & Auth), Render (FastAPI Backend), and Vercel (Frontend Static UI).

---

## 1. Supabase Database & Auth Setup

1. Create a new project on [Supabase.com](https://supabase.com).
2. Navigate to **SQL Editor** in your Supabase dashboard.
3. Run the following files in sequence:
   - `database/schema.sql` (Creates tables, triggers, and indices)
   - `database/rls_policies.sql` (Enables Row Level Security and creates security policies)
   - `database/seed.sql` (Inserts initial model catalog records)
4. Go to **Project Settings -> API** and copy:
   - `Project URL` -> Set as `SUPABASE_URL`
   - `anon public key` -> Set as `SUPABASE_ANON_KEY` (also update in `frontend/js/supabase-client.js`)
   - `service_role secret key` -> Set as `SUPABASE_SERVICE_ROLE_KEY` (Backend environment only)

---

## 2. Backend Deployment (Render.com)

The project includes a ready `render.yaml` blueprint.

1. Push this repository to GitHub or GitLab.
2. In Render dashboard, select **New -> Blueprint** and connect your repository.
3. Render will parse `render.yaml` and set up the Python web service.
4. Set the environment variables in Render:
   - `SUPABASE_URL`: Your Supabase URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service-role secret
   - `SUPABASE_DB_PASSWORD`: `PA5WJyT+$xMpvPd`
   - `ENVIRONMENT`: `production`

---

## 3. Frontend Deployment (Vercel)

The repository includes `vercel.json` for static serving:

1. Import repository into Vercel.
2. Set root directory or leave as repository root.
3. Update `frontend/js/supabase-client.js` with your live Supabase URL and Anon Key.
4. Deploy!

---

## 4. Local Development Quickstart

To run both Frontend and Backend locally:

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Train and serialize ML models
python ml/train.py

# 3. Run FastAPI backend (with static frontend mounted)
python backend/app/main.py
```

Then open your browser and navigate to:
👉 `http://localhost:8000/dashboard.html` (or `http://localhost:8000/login.html`)
