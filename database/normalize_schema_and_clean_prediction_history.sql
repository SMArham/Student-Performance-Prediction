-- ==============================================================================
-- EDUMETRICS RELATIONAL NORMALIZATION & PREDICTION_HISTORY CORE CLEANUP
-- Run this in your Supabase Project -> SQL Editor
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CLEAN PREDICTION_HISTORY: KEEP ONLY CORE ML COLUMNS, DROP ALL REDUNDANCIES
-- ------------------------------------------------------------------------------

-- Sync any leftover values from duplicate columns into canonical core columns
UPDATE public.prediction_history
SET
    input_features = CASE
        WHEN (input_features IS NULL OR input_features = '{}'::jsonb) AND input_payload IS NOT NULL
        THEN input_payload
        ELSE input_features
    END,
    confidence_interval_low = COALESCE(confidence_interval_low, confidence_min),
    confidence_interval_high = COALESCE(confidence_interval_high, confidence_max),
    explanation = CASE
        WHEN (explanation IS NULL OR explanation = '{}'::jsonb) AND (positive_factors IS NOT NULL OR growth_factors IS NOT NULL)
        THEN jsonb_build_object(
            'positive_factors', COALESCE(positive_factors, '[]'::jsonb),
            'growth_factors', COALESCE(growth_factors, '[]'::jsonb)
        )
        ELSE explanation
    END;

-- Drop all redundant duplicate columns
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS input_payload;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS confidence_min;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS confidence_max;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS positive_factors;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS growth_factors;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS role;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS teacher_rating;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS teacher_notes;

-- ------------------------------------------------------------------------------
-- 2. BASE ENTITY: public.profiles (Common Base Identity ONLY - 3NF)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS student_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS program;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS institution_name;

-- ------------------------------------------------------------------------------
-- 3. TEACHER ENTITY: public.teacher_profiles (Specialized 1:1 Extension Table)
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

-- Enable RLS on teacher_profiles
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view own teacher_profile" ON public.teacher_profiles;
CREATE POLICY "Teachers can view own teacher_profile" ON public.teacher_profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can update own teacher_profile" ON public.teacher_profiles;
CREATE POLICY "Teachers can update own teacher_profile" ON public.teacher_profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on teacher_profiles" ON public.teacher_profiles;
CREATE POLICY "Service role full access on teacher_profiles" ON public.teacher_profiles FOR ALL USING (auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- 4. AUTOMATED AUTH SIGNUP ROUTER TRIGGER (Separate Student & Teacher Entities)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS 
DECLARE
    user_role TEXT;
    user_stage TEXT;
BEGIN
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    user_stage := COALESCE(NEW.raw_user_meta_data->>'stage', 'university');

    -- 1. Insert Core Base Profile
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

    -- 2. Route entity to specialized 1:1 table based on user role
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
 LANGUAGE plpgsql SECURITY DEFINER;
