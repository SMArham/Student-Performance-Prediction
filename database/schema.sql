-- ==============================================================================
-- Student Performance Prediction & Analytics System
-- Database Schema (PostgreSQL for Supabase)
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Profiles Table (Extends Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin', 'advisor')),
    avatar_url TEXT,
    stage TEXT NOT NULL DEFAULT 'university' CHECK (stage IN ('university', 'matric_inter', 'secondary', 'primary')),
    phone_number TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Index for email and role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ------------------------------------------------------------------------------
-- 2. Student Profiles (Stage-specific student academic details)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id_code TEXT,
    stage TEXT NOT NULL CHECK (stage IN ('university', 'matric_inter', 'secondary', 'primary')),
    institution_name TEXT,
    program_or_major TEXT,
    current_grade_level TEXT,
    current_cgpa NUMERIC(4,2) DEFAULT 0.00,
    current_gpa NUMERIC(4,2) DEFAULT 0.00,
    target_cgpa NUMERIC(4,2) DEFAULT 3.80,
    attendance_pct NUMERIC(5,2) DEFAULT 85.00,
    study_hours_per_day NUMERIC(4,2) DEFAULT 4.00,
    sleep_hours_per_day NUMERIC(4,2) DEFAULT 7.00,
    social_hours_per_week NUMERIC(4,2) DEFAULT 10.00,
    extra_tuition BOOLEAN DEFAULT FALSE,
    previous_failures INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT uq_student_profiles_user_stage UNIQUE (user_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON public.student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_stage ON public.student_profiles(stage);

-- ------------------------------------------------------------------------------
-- 3. Academic Records (Term-by-term GPA and course history)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stage TEXT NOT NULL CHECK (stage IN ('university', 'matric_inter', 'secondary', 'primary')),
    term_name TEXT NOT NULL,          -- e.g. "Year 1 - Term 1", "Semester 1", "Class 9th", "G1"
    term_order INTEGER NOT NULL,      -- Sequence order: 1, 2, 3...
    gpa NUMERIC(4,2) NOT NULL,        -- Term GPA or normalized score (0.00 - 4.00)
    cgpa NUMERIC(4,2) NOT NULL,       -- Cumulative GPA up to this term
    raw_score NUMERIC(6,2),           -- Stage raw score (e.g. 850/1100, 16/20)
    credits_earned NUMERIC(5,2) DEFAULT 15.00,
    total_credits NUMERIC(5,2) DEFAULT 15.00,
    subjects JSONB DEFAULT '[]'::jsonb, -- Course breakdown: [{code, name, grade, credits}]
    recorded_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_academic_records_user_order ON public.academic_records(user_id, stage, term_order);

-- ------------------------------------------------------------------------------
-- 4. Prediction History (Log of all ML inference requests & outputs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prediction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stage TEXT NOT NULL CHECK (stage IN ('university', 'matric_inter', 'secondary', 'primary')),
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    input_features JSONB NOT NULL,
    predicted_score NUMERIC(6,2) NOT NULL,
    predicted_grade TEXT,
    confidence_interval_low NUMERIC(6,2),
    confidence_interval_high NUMERIC(6,2),
    status_badge TEXT NOT NULL CHECK (status_badge IN ('Exemplary', 'On Track', 'At Risk', 'Critical Intervention Needed')),
    explanation JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_prediction_history_user_date ON public.prediction_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_history_stage ON public.prediction_history(stage);

-- ------------------------------------------------------------------------------
-- 5. Model Registry (Catalog of trained ML models and production metrics)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.model_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage TEXT NOT NULL CHECK (stage IN ('university', 'matric_inter', 'secondary', 'primary')),
    model_name TEXT NOT NULL,
    model_type TEXT NOT NULL, -- e.g. "Regression", "Classification"
    algorithm TEXT NOT NULL,  -- e.g. "Gradient Boosting Regressor", "Ridge Regression"
    version TEXT NOT NULL,    -- e.g. "v1.0.0"
    metrics JSONB NOT NULL,   -- e.g. {"r2": 0.953, "rmse": 0.115, "mae": 0.089}
    features_list JSONB NOT NULL,
    artifact_path TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    trained_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT uq_model_registry_stage_version UNIQUE (stage, version)
);

CREATE INDEX IF NOT EXISTS idx_model_registry_stage_active ON public.model_registry(stage, is_active);

-- ------------------------------------------------------------------------------
-- 6. Automated Trigger to create Profile on Supabase Auth Signup
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, stage, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        COALESCE(NEW.raw_user_meta_data->>'stage', 'university'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.email)
    );

    -- Create initial default student profile record
    INSERT INTO public.student_profiles (
        user_id,
        stage,
        student_id_code,
        institution_name,
        program_or_major,
        current_grade_level,
        current_cgpa,
        current_gpa,
        target_cgpa
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'stage', 'university'),
        'STU-' || UPPER(SUBSTRING(NEW.id::text FROM 1 FOR 6)),
        'National University of Sciences & Technology',
        'Computer Science',
        'Year 3 (Junior)',
        3.42,
        3.55,
        3.80
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger hook on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_student_profiles_updated_at
    BEFORE UPDATE ON public.student_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
