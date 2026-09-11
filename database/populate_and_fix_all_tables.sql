-- ==============================================================================
-- DATABASE SCHEMA REPAIR: ENABLE 100% REAL-TIME USER DATA PERSISTENCE
-- NO MOCK/FAKE DATA INSERTED. PRESERVES REAL USERS & ACCEPTS ALL FRONTEND INPUTS.
-- Run this in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. DROP OBSOLETE MODEL REGISTRY & UNWANTED PROFILES COLUMNS
DROP TABLE IF EXISTS public.model_registry CASCADE;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS current_gpa CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS updated_at CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS short_id CASCADE;

-- 2. DROP RESTRICTIVE FOREIGN KEY CONSTRAINTS (Allow clean STU-XX, TCH-XX IDs)
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.academic_records DROP CONSTRAINT IF EXISTS academic_records_user_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.academic_subjects DROP CONSTRAINT IF EXISTS academic_subjects_user_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.teacher_class_roster DROP CONSTRAINT IF EXISTS teacher_class_roster_teacher_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.prediction_history DROP CONSTRAINT IF EXISTS prediction_history_user_id_fkey CASCADE;

-- 3. ENSURE ALL TABLES & COLUMNS ACCEPT REAL FRONTEND DATA (TEXT IDs & COMPATIBLE FIELDS)

-- 3A. PROFILES
ALTER TABLE public.profiles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT;

-- Standardize existing user IDs to clean STU-01, STU-02, STU-03
UPDATE public.profiles SET id = 'STU-01' WHERE LOWER(email) = 'fatima@gmail.com' OR id = '9e967bbb-9361-4b32-97d6-80b61a13';
UPDATE public.profiles SET id = 'STU-02' WHERE LOWER(email) = 'zzzz@gmail.com' OR id = 'f8b817d6-2fd3-4fe5-ab24-a8be16aaca';
UPDATE public.profiles SET id = 'STU-03' WHERE LOWER(email) = 'kkk@gmail.com';

-- 3B. ACADEMIC_RECORDS (Create if missing, ensure columns match frontend input)
CREATE TABLE IF NOT EXISTS public.academic_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'university',
    term_name TEXT NOT NULL,
    gpa NUMERIC(4,2) NOT NULL DEFAULT 3.50,
    cgpa NUMERIC(4,2) NOT NULL DEFAULT 3.50,
    attendance_pct NUMERIC(5,2) DEFAULT 85,
    credit_hours NUMERIC(5,2) DEFAULT 18,
    midterm_score NUMERIC(5,2) DEFAULT 80,
    backlogs INTEGER DEFAULT 0,
    study_hours NUMERIC(4,2) DEFAULT 4.5,
    subjects JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    ALTER TABLE public.academic_records ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.academic_records ALTER COLUMN id TYPE TEXT;
    ALTER TABLE public.academic_records ALTER COLUMN user_id TYPE TEXT;
    
    -- Ensure columns matching frontend forms exist
    ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS attendance_pct NUMERIC(5,2) DEFAULT 85;
    ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS credit_hours NUMERIC(5,2) DEFAULT 18;
    ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS midterm_score NUMERIC(5,2) DEFAULT 80;
    ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS backlogs INTEGER DEFAULT 0;
    ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS study_hours NUMERIC(4,2) DEFAULT 4.5;
    ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS subjects JSONB DEFAULT '[]'::jsonb;
    
    -- Remove restrictive NOT NULL on old columns so user inputs never fail
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='academic_records' AND column_name='term_order') THEN
        ALTER TABLE public.academic_records ALTER COLUMN term_order DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='academic_records' AND column_name='raw_score') THEN
        ALTER TABLE public.academic_records ALTER COLUMN raw_score DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='academic_records' AND column_name='credits_earned') THEN
        ALTER TABLE public.academic_records ALTER COLUMN credits_earned DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='academic_records' AND column_name='total_credits') THEN
        ALTER TABLE public.academic_records ALTER COLUMN total_credits DROP NOT NULL;
    END IF;
END $$;

-- 3C. ACADEMIC_SUBJECTS (Course-by-course breakdowns)
CREATE TABLE IF NOT EXISTS public.academic_subjects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'university',
    subject_name TEXT NOT NULL,
    subject_category TEXT DEFAULT 'Core',
    assessment_period TEXT NOT NULL,
    obtained_marks NUMERIC(6,2) NOT NULL,
    total_marks NUMERIC(6,2) NOT NULL DEFAULT 100,
    percentage NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    ALTER TABLE public.academic_subjects ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.academic_subjects ALTER COLUMN id TYPE TEXT;
    ALTER TABLE public.academic_subjects ALTER COLUMN user_id TYPE TEXT;
END $$;

-- 3D. PREDICTION_HISTORY (Live ML predictions from frontend)
CREATE TABLE IF NOT EXISTS public.prediction_history (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    stage TEXT NOT NULL DEFAULT 'university',
    input_features JSONB NOT NULL DEFAULT '{}'::jsonb,
    predicted_score NUMERIC(6,2) NOT NULL,
    predicted_grade TEXT DEFAULT 'Grade A',
    status_badge TEXT DEFAULT 'On Track',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    ALTER TABLE public.prediction_history ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.prediction_history ALTER COLUMN id TYPE TEXT;
    ALTER TABLE public.prediction_history ADD COLUMN IF NOT EXISTS user_id TEXT;
    
    -- Drop restrictive NOT NULL constraints on legacy columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prediction_history' AND column_name='model_name') THEN
        ALTER TABLE public.prediction_history ALTER COLUMN model_name DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prediction_history' AND column_name='model_version') THEN
        ALTER TABLE public.prediction_history ALTER COLUMN model_version DROP NOT NULL;
    END IF;
END $$;

-- 3E. TEACHER_CLASS_ROSTER (Teacher portal roster entries)
CREATE TABLE IF NOT EXISTS public.teacher_class_roster (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL,
    student_id TEXT,
    student_id_code TEXT,
    student_name TEXT NOT NULL,
    email TEXT,
    stage TEXT NOT NULL DEFAULT 'university',
    department_or_program TEXT DEFAULT 'Software Engineering',
    current_gpa NUMERIC(4,2) DEFAULT 3.50,
    predicted_score NUMERIC(6,2) DEFAULT 3.50,
    predicted_grade TEXT DEFAULT 'Grade A',
    status_badge TEXT DEFAULT 'On Track',
    risk_level TEXT DEFAULT 'Low Risk',
    attendance_pct NUMERIC(5,2) DEFAULT 85,
    avg_marks NUMERIC(5,2) DEFAULT 85,
    study_hours NUMERIC(4,2) DEFAULT 12.0,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    ALTER TABLE public.teacher_class_roster ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.teacher_class_roster ALTER COLUMN id TYPE TEXT;
    ALTER TABLE public.teacher_class_roster ALTER COLUMN teacher_id TYPE TEXT;
END $$;

-- 4. RECREATE CLEAN OPEN POLICIES (Users can read, write, update & delete freely)
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles CASCADE;
DROP POLICY IF EXISTS "Public insert profiles" ON public.profiles CASCADE;
DROP POLICY IF EXISTS "Public update profiles" ON public.profiles CASCADE;
DROP POLICY IF EXISTS "Public delete profiles" ON public.profiles CASCADE;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Public delete profiles" ON public.profiles FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public read academic_records" ON public.academic_records CASCADE;
DROP POLICY IF EXISTS "Public insert academic_records" ON public.academic_records CASCADE;
DROP POLICY IF EXISTS "Public update academic_records" ON public.academic_records CASCADE;
DROP POLICY IF EXISTS "Public delete academic_records" ON public.academic_records CASCADE;
CREATE POLICY "Public read academic_records" ON public.academic_records FOR SELECT USING (true);
CREATE POLICY "Public insert academic_records" ON public.academic_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update academic_records" ON public.academic_records FOR UPDATE USING (true);
CREATE POLICY "Public delete academic_records" ON public.academic_records FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public read academic_subjects" ON public.academic_subjects CASCADE;
DROP POLICY IF EXISTS "Public insert academic_subjects" ON public.academic_subjects CASCADE;
DROP POLICY IF EXISTS "Public update academic_subjects" ON public.academic_subjects CASCADE;
DROP POLICY IF EXISTS "Public delete academic_subjects" ON public.academic_subjects CASCADE;
CREATE POLICY "Public read academic_subjects" ON public.academic_subjects FOR SELECT USING (true);
CREATE POLICY "Public insert academic_subjects" ON public.academic_subjects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update academic_subjects" ON public.academic_subjects FOR UPDATE USING (true);
CREATE POLICY "Public delete academic_subjects" ON public.academic_subjects FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public read prediction_history" ON public.prediction_history CASCADE;
DROP POLICY IF EXISTS "Public insert prediction_history" ON public.prediction_history CASCADE;
DROP POLICY IF EXISTS "Public update prediction_history" ON public.prediction_history CASCADE;
DROP POLICY IF EXISTS "Public delete prediction_history" ON public.prediction_history CASCADE;
CREATE POLICY "Public read prediction_history" ON public.prediction_history FOR SELECT USING (true);
CREATE POLICY "Public insert prediction_history" ON public.prediction_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update prediction_history" ON public.prediction_history FOR UPDATE USING (true);
CREATE POLICY "Public delete prediction_history" ON public.prediction_history FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public read teacher_class_roster" ON public.teacher_class_roster CASCADE;
DROP POLICY IF EXISTS "Public insert teacher_class_roster" ON public.teacher_class_roster CASCADE;
DROP POLICY IF EXISTS "Public update teacher_class_roster" ON public.teacher_class_roster CASCADE;
DROP POLICY IF EXISTS "Public delete teacher_class_roster" ON public.teacher_class_roster CASCADE;
CREATE POLICY "Public read teacher_class_roster" ON public.teacher_class_roster FOR SELECT USING (true);
CREATE POLICY "Public insert teacher_class_roster" ON public.teacher_class_roster FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update teacher_class_roster" ON public.teacher_class_roster FOR UPDATE USING (true);
CREATE POLICY "Public delete teacher_class_roster" ON public.teacher_class_roster FOR DELETE USING (true);

-- 5. RECREATE CLEAN SEQUENTIAL SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    u_role TEXT;
    u_stage TEXT;
    next_num INT;
    new_id TEXT;
BEGIN
    u_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    u_stage := COALESCE(NEW.raw_user_meta_data->>'stage', 'university');

    IF NEW.raw_user_meta_data->>'student_id' IS NOT NULL AND (NEW.raw_user_meta_data->>'student_id' LIKE 'STU-%' OR NEW.raw_user_meta_data->>'student_id' LIKE 'TCH-%') THEN
        new_id := NEW.raw_user_meta_data->>'student_id';
    ELSE
        SELECT COALESCE(MAX(SUBSTRING(id FROM '[0-9]+')::INT), 0) + 1 INTO next_num 
        FROM public.profiles 
        WHERE role = u_role;

        IF u_role IN ('instructor', 'teacher') THEN
            new_id := 'TCH-' || LPAD(next_num::text, 2, '0');
        ELSE
            new_id := 'STU-' || LPAD(next_num::text, 2, '0');
        END IF;
    END IF;

    INSERT INTO public.profiles (
        id, full_name, email, role, stage,
        institution_name, department_or_program, created_at
    )
    VALUES (
        new_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        u_role,
        u_stage,
        COALESCE(NEW.raw_user_meta_data->>'institution_name', 'University Campus'),
        COALESCE(NEW.raw_user_meta_data->>'program_or_major', NEW.raw_user_meta_data->>'department', 'Software Engineering'),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
