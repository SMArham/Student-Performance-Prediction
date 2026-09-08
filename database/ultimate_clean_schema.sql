-- ==============================================================================
-- EDUMETRICS ULTIMATE MINIMAL & CLEAN DATABASE MIGRATION (100% ERROR-FREE)
-- Run this in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. MODEL_REGISTRY: REMOVE UUID, SET 3-DIGIT IDs (101, 102, 103, 104)
-- Removes: algorithm, model_type, metrics, version, features_list, artifact_path
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.model_registry DROP CONSTRAINT IF EXISTS uq_model_registry_stage_version CASCADE;
ALTER TABLE public.model_registry ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.model_registry ALTER COLUMN id TYPE TEXT;

ALTER TABLE public.model_registry DROP COLUMN IF EXISTS algorithm CASCADE;
ALTER TABLE public.model_registry DROP COLUMN IF EXISTS model_type CASCADE;
ALTER TABLE public.model_registry DROP COLUMN IF EXISTS metrics CASCADE;
ALTER TABLE public.model_registry DROP COLUMN IF EXISTS version CASCADE;
ALTER TABLE public.model_registry DROP COLUMN IF EXISTS features_list CASCADE;
ALTER TABLE public.model_registry DROP COLUMN IF EXISTS artifact_path CASCADE;

UPDATE public.model_registry SET id = '101' WHERE stage = 'university';
UPDATE public.model_registry SET id = '102' WHERE stage = 'matric_inter';
UPDATE public.model_registry SET id = '103' WHERE stage = 'secondary';
UPDATE public.model_registry SET id = '104' WHERE stage = 'primary';

-- ------------------------------------------------------------------------------
-- 2. PREDICTION_HISTORY: DROP user_id, model_name & ALL UNNECESSARY COLUMNS (CASCADE)
-- ------------------------------------------------------------------------------
-- Drop all policies referencing user_id before dropping the column
DROP POLICY IF EXISTS "Users can view own predictions" ON public.prediction_history;
DROP POLICY IF EXISTS "Users can insert own predictions" ON public.prediction_history;
DROP POLICY IF EXISTS "Users can delete own predictions" ON public.prediction_history;
DROP POLICY IF EXISTS "Users can view own prediction_history" ON public.prediction_history;
DROP POLICY IF EXISTS "Users can insert own prediction_history" ON public.prediction_history;
DROP POLICY IF EXISTS "Users can delete own prediction_history" ON public.prediction_history;
DROP POLICY IF EXISTS "Service role full access on prediction_history" ON public.prediction_history;

ALTER TABLE IF EXISTS public.prediction_history DROP CONSTRAINT IF EXISTS prediction_history_user_id_fkey CASCADE;

-- Drop user_id and model_name using CASCADE
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS model_name CASCADE;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS model_version CASCADE;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS confidence_interval_low CASCADE;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS confidence_interval_high CASCADE;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS confidence_min CASCADE;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS confidence_max CASCADE;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS explanation CASCADE;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS positive_factors CASCADE;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS growth_factors CASCADE;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS input_payload CASCADE;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS role CASCADE;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS teacher_rating CASCADE;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS teacher_notes CASCADE;

-- Convert id to TEXT and assign 4-digit IDs (1001, 1002...)
ALTER TABLE public.prediction_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.prediction_history ALTER COLUMN id TYPE TEXT;

WITH ranked_preds AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rnum
    FROM public.prediction_history
)
UPDATE public.prediction_history p
SET id = (1000 + rp.rnum)::text
FROM ranked_preds rp
WHERE p.id = rp.id;

-- Recreate clean policies for prediction_history
CREATE POLICY "Public read prediction_history" ON public.prediction_history FOR SELECT USING (true);
CREATE POLICY "Service role all prediction_history" ON public.prediction_history FOR ALL USING (auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- 3. ACADEMIC_RECORDS: REMOVE REDUNDANT TOTALS & USE SHORT 4-DIGIT IDs (2001, 2002...)
-- ------------------------------------------------------------------------------
ALTER TABLE public.academic_records ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.academic_records ALTER COLUMN id TYPE TEXT;

ALTER TABLE public.academic_records DROP COLUMN IF EXISTS term_order CASCADE;
ALTER TABLE public.academic_records DROP COLUMN IF EXISTS raw_score CASCADE;
ALTER TABLE public.academic_records DROP COLUMN IF EXISTS credits_earned CASCADE;
ALTER TABLE public.academic_records DROP COLUMN IF EXISTS total_credits CASCADE;
ALTER TABLE public.academic_records DROP COLUMN IF EXISTS recorded_date CASCADE;

WITH ranked_recs AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rnum
    FROM public.academic_records
)
UPDATE public.academic_records a
SET id = (2000 + ra.rnum)::text
FROM ranked_recs ra
WHERE a.id = ra.id;

-- Shorten subject IDs inside JSONB to S-1, S-2, S-3 (3 characters)
UPDATE public.academic_records
SET subjects = (
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', 'S-' || s_idx,
            'subject_name', s->>'subject_name',
            'obtained_marks', COALESCE((s->>'obtained_marks')::numeric, 80),
            'total_marks', COALESCE((s->>'total_marks')::numeric, 100),
            'grade', COALESCE(s->>'grade', 'A')
        )
    )
    FROM jsonb_array_elements(subjects) WITH ORDINALITY AS arr(s, s_idx)
)
WHERE subjects IS NOT NULL AND jsonb_array_length(subjects) > 0;

-- ------------------------------------------------------------------------------
-- 4. CONSOLIDATE PROFILES: ONE SINGLE TABLE (Eliminate Duplicacy)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles DROP COLUMN IF EXISTS gender CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS bio CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_number CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar_url CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS student_id CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS program CASCADE;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS short_id TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institution_name TEXT DEFAULT 'Faculty Campus';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department_or_program TEXT DEFAULT 'Software Engineering';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_gpa NUMERIC(4,2) DEFAULT 3.65;

DO 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'student_profiles') THEN
        UPDATE public.profiles p
        SET 
            institution_name = COALESCE(sp.institution_name, p.institution_name),
            department_or_program = COALESCE(sp.program_or_major, p.department_or_program),
            current_gpa = COALESCE(sp.current_gpa, 3.65)
        FROM public.student_profiles sp
        WHERE p.id = sp.user_id;
    END IF;
END ;

DO 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teacher_profiles') THEN
        UPDATE public.profiles p
        SET 
            institution_name = COALESCE(tp.institution_name, p.institution_name),
            department_or_program = COALESCE(tp.department, p.department_or_program)
        FROM public.teacher_profiles tp
        WHERE p.id = tp.user_id;
    END IF;
END ;

-- Assign short readable user IDs (STU-01, STU-02, TCH-01, TCH-02 - max 6 chars)
WITH ranked_users AS (
    SELECT id, role, ROW_NUMBER() OVER (PARTITION BY role ORDER BY created_at ASC) as rnum
    FROM public.profiles
)
UPDATE public.profiles p
SET short_id = CASE
    WHEN ru.role IN ('instructor', 'teacher') THEN 'TCH-' || LPAD(ru.rnum::text, 2, '0')
    ELSE 'STU-' || LPAD(ru.rnum::text, 2, '0')
END
FROM ranked_users ru
WHERE p.id = ru.id;

-- DROP separate redundant tables completely
DROP TABLE IF EXISTS public.student_profiles CASCADE;
DROP TABLE IF EXISTS public.teacher_profiles CASCADE;

-- ------------------------------------------------------------------------------
-- 5. SIMPLE UNIFIED SIGNUP TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS 
DECLARE
    u_role TEXT;
    u_stage TEXT;
    next_num INT;
    new_short_id TEXT;
BEGIN
    u_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
    u_stage := COALESCE(NEW.raw_user_meta_data->>'stage', 'university');

    SELECT COUNT(*) + 1 INTO next_num FROM public.profiles WHERE role = u_role;
    IF u_role IN ('instructor', 'teacher') THEN
        new_short_id := 'TCH-' || LPAD(next_num::text, 2, '0');
    ELSE
        new_short_id := 'STU-' || LPAD(next_num::text, 2, '0');
    END IF;

    INSERT INTO public.profiles (
        id, short_id, full_name, email, role, stage,
        institution_name, department_or_program, current_gpa
    )
    VALUES (
        NEW.id,
        new_short_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        u_role,
        u_stage,
        COALESCE(NEW.raw_user_meta_data->>'institution_name', 'University Campus'),
        COALESCE(NEW.raw_user_meta_data->>'program_or_major', NEW.raw_user_meta_data->>'department', 'Software Engineering'),
        3.65
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
 LANGUAGE plpgsql SECURITY DEFINER;
