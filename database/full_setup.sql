-- ==============================================================================
-- STUDENT PERFORMANCE PREDICTION & ANALYTICS SYSTEM
-- COMPLETE SUPABASE INITIALIZATION SCRIPT (Run this in Supabase SQL Editor)
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. Profiles Table (Extends Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin', 'advisor')),
    stage TEXT NOT NULL DEFAULT 'university' CHECK (stage IN ('university', 'matric_inter', 'secondary', 'primary')),
    phone_number TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ------------------------------------------------------------------------------
-- 3. Student Profiles Table
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
    CONSTRAINT uq_student_profiles_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON public.student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_stage ON public.student_profiles(stage);

-- ------------------------------------------------------------------------------
-- 4. Teacher Profiles Table (Instructor Entity - 1:1 with profiles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    faculty_id_code TEXT UNIQUE,
    department TEXT DEFAULT 'Faculty of Computer Science',
    designation TEXT DEFAULT 'Senior Instructor / Professor',
    institution_name TEXT DEFAULT 'University Campus',
    office_room TEXT DEFAULT 'Room 402, Block B',
    education_level TEXT DEFAULT 'Ph.D. / M.Sc.',
    years_of_experience INTEGER DEFAULT 5,
    specialization TEXT DEFAULT 'Data Science & Pedagogical Analytics',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user_id ON public.teacher_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_code ON public.teacher_profiles(faculty_id_code);

-- ------------------------------------------------------------------------------
-- 5. Academic Records Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stage TEXT NOT NULL CHECK (stage IN ('university', 'matric_inter', 'secondary', 'primary')),
    term_name TEXT NOT NULL,
    term_order INTEGER NOT NULL,
    gpa NUMERIC(4,2) NOT NULL,
    cgpa NUMERIC(4,2) NOT NULL,
    raw_score NUMERIC(6,2),
    credits_earned NUMERIC(5,2) DEFAULT 15.00,
    total_credits NUMERIC(5,2) DEFAULT 15.00,
    subjects JSONB DEFAULT '[]'::jsonb,
    recorded_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_academic_records_user_order ON public.academic_records(user_id, stage, term_order);

-- ------------------------------------------------------------------------------
-- 5. Prediction History Table
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
-- 6. Model Registry Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.model_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage TEXT NOT NULL CHECK (stage IN ('university', 'matric_inter', 'secondary', 'primary')),
    model_name TEXT NOT NULL,
    model_type TEXT NOT NULL,
    algorithm TEXT NOT NULL,
    version TEXT NOT NULL,
    metrics JSONB NOT NULL,
    features_list JSONB NOT NULL,
    artifact_path TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    trained_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT uq_model_registry_stage_version UNIQUE (stage, version)
);

CREATE INDEX IF NOT EXISTS idx_model_registry_stage_active ON public.model_registry(stage, is_active);

-- ------------------------------------------------------------------------------
-- 7. Trigger to automatically create profile on Supabase Auth Signup
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_stage TEXT;
BEGIN
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    user_stage := COALESCE(NEW.raw_user_meta_data->>'stage', 'university');

    -- 1. Insert Base Profile (Core Identity)
    INSERT INTO public.profiles (id, full_name, email, role, stage)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        user_role,
        user_stage
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        stage = EXCLUDED.stage,
        updated_at = NOW();

    -- 2. Route to specialized profile table based on role (Separate Entities)
    IF user_role IN ('instructor', 'teacher') THEN
        INSERT INTO public.teacher_profiles (user_id, faculty_id_code, institution_name, department)
        VALUES (
            NEW.id,
            'TCH-' || UPPER(SUBSTRING(NEW.id::text FROM 1 FOR 6)),
            COALESCE(NEW.raw_user_meta_data->>'institution_name', 'University Campus'),
            COALESCE(NEW.raw_user_meta_data->>'department', 'Faculty of Computer Science')
        )
        ON CONFLICT (user_id) DO NOTHING;
    ELSE
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
            user_stage,
            'STU-' || UPPER(SUBSTRING(NEW.id::text FROM 1 FOR 6)),
            'Faculty of Computer Science & Engineering',
            'Software Engineering',
            'Year 3 (6th Semester)',
            3.48,
            3.65,
            3.80
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 8. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_registry ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role full access on profiles" ON public.profiles;
CREATE POLICY "Service role full access on profiles" ON public.profiles FOR ALL USING (auth.role() = 'service_role');

-- Student Profiles Policies
DROP POLICY IF EXISTS "Students can view own student_profile" ON public.student_profiles;
CREATE POLICY "Students can view own student_profile" ON public.student_profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can insert own student_profile" ON public.student_profiles;
CREATE POLICY "Students can insert own student_profile" ON public.student_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can update own student_profile" ON public.student_profiles;
CREATE POLICY "Students can update own student_profile" ON public.student_profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on student_profiles" ON public.student_profiles;
CREATE POLICY "Service role full access on student_profiles" ON public.student_profiles FOR ALL USING (auth.role() = 'service_role');

-- Teacher Profiles Policies
DROP POLICY IF EXISTS "Teachers can view own teacher_profile" ON public.teacher_profiles;
CREATE POLICY "Teachers can view own teacher_profile" ON public.teacher_profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can update own teacher_profile" ON public.teacher_profiles;
CREATE POLICY "Teachers can update own teacher_profile" ON public.teacher_profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on teacher_profiles" ON public.teacher_profiles;
CREATE POLICY "Service role full access on teacher_profiles" ON public.teacher_profiles FOR ALL USING (auth.role() = 'service_role');

-- Academic Records Policies
DROP POLICY IF EXISTS "Users can view own academic_records" ON public.academic_records;
CREATE POLICY "Users can view own academic_records" ON public.academic_records FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own academic_records" ON public.academic_records;
CREATE POLICY "Users can insert own academic_records" ON public.academic_records FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on academic_records" ON public.academic_records;
CREATE POLICY "Service role full access on academic_records" ON public.academic_records FOR ALL USING (auth.role() = 'service_role');

-- Prediction History Policies
DROP POLICY IF EXISTS "Users can view own prediction_history" ON public.prediction_history;
CREATE POLICY "Users can view own prediction_history" ON public.prediction_history FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own prediction_history" ON public.prediction_history;
CREATE POLICY "Users can insert own prediction_history" ON public.prediction_history FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on prediction_history" ON public.prediction_history;
CREATE POLICY "Service role full access on prediction_history" ON public.prediction_history FOR ALL USING (auth.role() = 'service_role');

-- Model Registry Policies
DROP POLICY IF EXISTS "Public read-only access for active models" ON public.model_registry;
CREATE POLICY "Public read-only access for active models" ON public.model_registry FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Service role manages model registry" ON public.model_registry;
CREATE POLICY "Service role manages model registry" ON public.model_registry FOR ALL USING (auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- 9. Insert Initial Model Catalog Seed Records
-- ------------------------------------------------------------------------------
INSERT INTO public.model_registry (stage, model_name, model_type, algorithm, version, metrics, features_list, artifact_path, is_active)
VALUES 
(
    'university',
    'University CGPA Multi-Factor Predictor',
    'Regression',
    'Gradient Boosting Regressor',
    'v1.0.0',
    '{"r2": 0.9525, "rmse": 0.1167, "mae": 0.0970, "train_samples": 4000, "test_samples": 1000}'::jsonb,
    '["Age", "Attendance_Pct", "Study_Hours_Per_Day", "Previous_CGPA", "Sleep_Hours", "Social_Hours_Week", "Gender", "Major"]'::jsonb,
    'ml/artifacts/university_gradient_boosting_v1.0.0.joblib',
    TRUE
),
(
    'matric_inter',
    'Matric/Intermediate HSSC-II Marks Predictor',
    'Regression',
    'Ridge Regression',
    'v1.0.0',
    '{"r2": 0.8520, "rmse": 24.12, "mae": 18.35, "train_samples": 72000, "test_samples": 18000}'::jsonb,
    '["SSC_I_Marks", "SSC_II_Marks", "HSSC_I_Marks", "Attendance_Rate", "Study_Hours", "Previous_Failures", "Exam_Attempts", "Region", "Gender", "Enrollment_Type", "Subject_Group", "Parent_Education_Level", "Parent_Income", "Extra_Tuition", "School_Type"]'::jsonb,
    'ml/artifacts/matric_inter_ridge_v1.0.0.joblib',
    TRUE
),
(
    'secondary',
    'Secondary School Final Grade (G3) Predictor',
    'Regression',
    'Gradient Boosting Regressor',
    'v1.0.0',
    '{"r2": 0.8083, "rmse": 1.9829, "mae": 1.1526, "train_samples": 316, "test_samples": 79}'::jsonb,
    '["age", "Medu", "Fedu", "traveltime", "studytime", "failures", "famrel", "freetime", "goout", "Dalc", "Walc", "health", "absences", "G1", "G2", "school", "sex", "address", "famsize", "Pstatus", "Mjob", "Fjob", "reason", "guardian", "schoolsup", "famsup", "paid", "activities", "nursery", "higher", "internet", "romantic"]'::jsonb,
    'ml/artifacts/secondary_gradient_boosting_v1.0.0.joblib',
    TRUE
),
(
    'primary',
    'Primary Education Multi-Indicator Predictor',
    'Regression',
    'Linear Regression',
    'v1.0.0',
    '{"r2": 0.9738, "rmse": 2.1599, "mae": 0.8251, "train_samples": 464, "test_samples": 116}'::jsonb,
    '["Enrolment score", "Learning score", "Retention score", "School infrastructure score", "Gender parity score", "Total number of schools", "Drinking water", "Electricity", "Toilet", "Province"]'::jsonb,
    'ml/artifacts/primary_linear_regression_v1.0.0.joblib',
    TRUE
)
ON CONFLICT (stage, version) DO UPDATE 
SET metrics = EXCLUDED.metrics,
    is_active = EXCLUDED.is_active,
    artifact_path = EXCLUDED.artifact_path;
