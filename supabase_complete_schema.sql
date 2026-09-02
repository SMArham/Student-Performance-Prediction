-- ==============================================================================
-- EDUMETRICS AI — COMPLETE SUPABASE DATABASE SCHEMA & COLUMN MIGRATION
-- Run this in your Supabase SQL Editor (Safe & Idempotent: Does NOT drop data)
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. USER PROFILES TABLE (Linked with Supabase auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'instructor', 'admin', 'advisor')),
  stage TEXT NOT NULL DEFAULT 'university' CHECK (stage IN ('university', 'intermediate', 'matric', 'secondary', 'primary')),
  gender TEXT NOT NULL DEFAULT 'male' CHECK (gender IN ('male', 'female', 'other')),
  institution_name TEXT DEFAULT 'Campus / Institution',
  program TEXT DEFAULT 'General Studies',
  student_id TEXT,
  phone_number TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'university';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institution_name TEXT DEFAULT 'Campus / Institution';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS program TEXT DEFAULT 'General Studies';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_id TEXT;

-- ==============================================================================
-- 3. STUDENT PROFILES TABLE (Academic Standings & Goals)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'university',
  student_id_code TEXT,
  institution_name TEXT DEFAULT 'University Campus',
  program_or_major TEXT DEFAULT 'Software Engineering',
  current_grade_level TEXT DEFAULT 'Class 7',
  current_cgpa NUMERIC(4,2) DEFAULT 0.00,
  current_gpa NUMERIC(4,2) DEFAULT 0.00,
  target_cgpa NUMERIC(4,2) DEFAULT 3.80,
  attendance_pct NUMERIC(5,2) DEFAULT 85.00,
  study_hours_per_day NUMERIC(4,2) DEFAULT 4.50,
  sleep_hours_per_day NUMERIC(4,2) DEFAULT 7.00,
  social_hours_per_week NUMERIC(4,2) DEFAULT 8.00,
  extra_tuition BOOLEAN DEFAULT FALSE,
  previous_failures INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_student_profiles_user_stage UNIQUE (user_id, stage)
);

-- ==============================================================================
-- 4. ACADEMIC SUBJECTS TABLE (Granular Subject Marks)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.academic_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'university',
  subject_name TEXT NOT NULL,
  subject_category TEXT NOT NULL DEFAULT 'Theory',
  assessment_period TEXT NOT NULL,
  obtained_marks NUMERIC(6, 2) NOT NULL CHECK (obtained_marks >= 0),
  total_marks NUMERIC(6, 2) NOT NULL CHECK (total_marks > 0),
  percentage NUMERIC(5, 2) GENERATED ALWAYS AS (ROUND((obtained_marks / total_marks) * 100, 2)) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. ACADEMIC RECORDS TABLE (Term / Semester Level Aggregates)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.academic_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'university',
  term_name TEXT NOT NULL,
  term_order INTEGER NOT NULL DEFAULT 1,
  gpa NUMERIC(4,2) NOT NULL DEFAULT 0.00,
  cgpa NUMERIC(4,2) NOT NULL DEFAULT 0.00,
  raw_score NUMERIC(6,2) DEFAULT 0.00,
  credits_earned NUMERIC(5,2) DEFAULT 15.00,
  total_credits NUMERIC(5,2) DEFAULT 15.00,
  subjects JSONB DEFAULT '[]'::jsonb,
  recorded_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. PREDICTION HISTORY TABLE (AI Diagnostic Forecasts & XAI Ledger)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.prediction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'university',
  role TEXT NOT NULL DEFAULT 'student',
  model_name TEXT DEFAULT 'GradientBoostingRegressor',
  model_version TEXT DEFAULT 'v1.0.0',
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  input_features JSONB DEFAULT '{}'::jsonb,
  predicted_score NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  predicted_grade TEXT DEFAULT 'Grade A',
  status_badge TEXT DEFAULT 'On Track',
  confidence_min NUMERIC(6, 2),
  confidence_max NUMERIC(6, 2),
  confidence_interval_low NUMERIC(6, 2),
  confidence_interval_high NUMERIC(6, 2),
  positive_factors JSONB DEFAULT '[]'::jsonb,
  growth_factors JSONB DEFAULT '[]'::jsonb,
  explanation JSONB DEFAULT '{}'::jsonb,
  teacher_rating NUMERIC(3, 1) DEFAULT 5.0,
  teacher_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all adaptive columns exist on prediction_history
ALTER TABLE public.prediction_history ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student';
ALTER TABLE public.prediction_history ADD COLUMN IF NOT EXISTS model_name TEXT DEFAULT 'GradientBoostingRegressor';
ALTER TABLE public.prediction_history ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT 'v1.0.0';
ALTER TABLE public.prediction_history ADD COLUMN IF NOT EXISTS input_payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.prediction_history ADD COLUMN IF NOT EXISTS input_features JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.prediction_history ADD COLUMN IF NOT EXISTS confidence_min NUMERIC(6, 2);
ALTER TABLE public.prediction_history ADD COLUMN IF NOT EXISTS confidence_max NUMERIC(6, 2);
ALTER TABLE public.prediction_history ADD COLUMN IF NOT EXISTS confidence_interval_low NUMERIC(6, 2);
ALTER TABLE public.prediction_history ADD COLUMN IF NOT EXISTS confidence_interval_high NUMERIC(6, 2);
ALTER TABLE public.prediction_history ADD COLUMN IF NOT EXISTS positive_factors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.prediction_history ADD COLUMN IF NOT EXISTS growth_factors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.prediction_history ADD COLUMN IF NOT EXISTS explanation JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.prediction_history ADD COLUMN IF NOT EXISTS teacher_rating NUMERIC(3, 1) DEFAULT 5.0;
ALTER TABLE public.prediction_history ADD COLUMN IF NOT EXISTS teacher_notes TEXT DEFAULT '';

-- ==============================================================================
-- 7. TEACHER CLASS ROSTER TABLE (Teacher Cohort Management)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.teacher_class_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_id_code TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'university',
  attendance_pct NUMERIC(5, 2) DEFAULT 0.00,
  avg_marks NUMERIC(5, 2) DEFAULT 0.00,
  study_hours NUMERIC(4, 1) DEFAULT 0.0,
  risk_level TEXT DEFAULT 'Low Risk',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. MODEL REGISTRY TABLE (ML Models & Production Metrics)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage TEXT NOT NULL CHECK (stage IN ('university', 'matric_inter', 'secondary', 'primary')),
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  version TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  features_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  artifact_path TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  trained_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_model_registry_stage_version UNIQUE (stage, version)
);

-- ==============================================================================
-- 9. INDEXES FOR HIGH-SPEED QUERYING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_academic_subjects_user_id ON public.academic_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_academic_records_user_order ON public.academic_records(user_id, stage, term_order);
CREATE INDEX IF NOT EXISTS idx_prediction_history_user_date ON public.prediction_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_class_roster_teacher_id ON public.teacher_class_roster(teacher_id);
CREATE INDEX IF NOT EXISTS idx_model_registry_stage_active ON public.model_registry(stage, is_active);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_class_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_registry ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies (Allow authenticated users and service queries)
DO $$
BEGIN
  -- Profiles
  DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
  CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (true);
  CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (true);

  -- Student Profiles
  DROP POLICY IF EXISTS "Allow student profiles management" ON public.student_profiles;
  CREATE POLICY "Allow student profiles management" ON public.student_profiles FOR ALL USING (true) WITH CHECK (true);

  -- Academic Subjects
  DROP POLICY IF EXISTS "Allow academic subjects management" ON public.academic_subjects;
  CREATE POLICY "Allow academic subjects management" ON public.academic_subjects FOR ALL USING (true) WITH CHECK (true);

  -- Academic Records
  DROP POLICY IF EXISTS "Allow academic records management" ON public.academic_records;
  CREATE POLICY "Allow academic records management" ON public.academic_records FOR ALL USING (true) WITH CHECK (true);

  -- Prediction History
  DROP POLICY IF EXISTS "Allow prediction history management" ON public.prediction_history;
  CREATE POLICY "Allow prediction history management" ON public.prediction_history FOR ALL USING (true) WITH CHECK (true);

  -- Teacher Class Roster
  DROP POLICY IF EXISTS "Allow teacher roster management" ON public.teacher_class_roster;
  CREATE POLICY "Allow teacher roster management" ON public.teacher_class_roster FOR ALL USING (true) WITH CHECK (true);

  -- Model Registry
  DROP POLICY IF EXISTS "Allow read model registry" ON public.model_registry;
  CREATE POLICY "Allow read model registry" ON public.model_registry FOR SELECT USING (true);
END $$;

-- ==============================================================================
-- 11. AUTOMATIC USER CREATION TRIGGER ON AUTH SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_unique_code INT := FLOOR(100 + RANDOM() * 900);
  v_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  v_id_code TEXT := COALESCE(NEW.raw_user_meta_data->>'student_id', CASE WHEN v_role = 'teacher' THEN 'TCH-2026-' || v_unique_code ELSE 'STU-2026-' || v_unique_code END);
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    stage,
    gender,
    institution_name,
    program,
    student_id
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'stage', 'university'),
    COALESCE(NEW.raw_user_meta_data->>'gender', 'male'),
    COALESCE(NEW.raw_user_meta_data->>'institution_name', NEW.raw_user_meta_data->>'institution', 'Faculty of Engineering'),
    COALESCE(NEW.raw_user_meta_data->>'program', NEW.raw_user_meta_data->>'major', 'Software Engineering'),
    v_id_code
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    stage = EXCLUDED.stage,
    gender = EXCLUDED.gender,
    institution_name = EXCLUDED.institution_name,
    program = EXCLUDED.program,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
