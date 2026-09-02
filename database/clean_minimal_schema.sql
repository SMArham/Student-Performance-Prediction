-- ==============================================================================
-- EDUMETRICS CLEAN MINIMAL SCHEMA & SHORT READABLE ID MIGRATION (POLICY-SAFE)
-- Run this in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CONVERT RECORD IDs TO TEXT (Supports Short Readable IDs like PRD-101, REC-101)
-- Notice: We do NOT alter profiles.id because it is the Supabase Auth UUID anchor.
-- Instead, we alter application record tables whose IDs you want short & readable.
-- ------------------------------------------------------------------------------

-- Prediction History: Drop default UUID generator & convert id to TEXT
ALTER TABLE public.prediction_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.prediction_history ALTER COLUMN id TYPE TEXT;

-- Academic Records: Drop default UUID generator & convert id to TEXT
ALTER TABLE public.academic_records ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.academic_records ALTER COLUMN id TYPE TEXT;

-- ------------------------------------------------------------------------------
-- 2. CLEAN PREDICTION_HISTORY: DROP UNNECESSARY & REDUNDANT COLUMNS
-- Keep ONLY essential core: id, user_id, stage, model_name, input_features, predicted_score, predicted_grade, status_badge, created_at
-- ------------------------------------------------------------------------------
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS model_version;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS confidence_interval_low;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS confidence_interval_high;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS confidence_min;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS confidence_max;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS explanation;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS positive_factors;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS growth_factors;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS input_payload;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS role;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS teacher_rating;
ALTER TABLE public.prediction_history DROP COLUMN IF EXISTS teacher_notes;

-- ------------------------------------------------------------------------------
-- 3. CLEAN MODEL_REGISTRY: REMOVE VERSION & COMPLEX ARTIFACT BLOAT
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.model_registry DROP CONSTRAINT IF EXISTS uq_model_registry_stage_version;
ALTER TABLE IF EXISTS public.model_registry DROP COLUMN IF EXISTS version;
ALTER TABLE IF EXISTS public.model_registry DROP COLUMN IF EXISTS features_list;
ALTER TABLE IF EXISTS public.model_registry DROP COLUMN IF EXISTS artifact_path;

-- ------------------------------------------------------------------------------
-- 4. CLEAN PROFILES: BASE IDENTITY ONLY (No avatar, no student/teacher specifics)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles DROP COLUMN IF EXISTS gender;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS bio;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_number;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS student_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS program;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS institution_name;

-- Add short human-readable identifier for easy user display
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS short_id TEXT UNIQUE;
UPDATE public.profiles
SET short_id = CASE
    WHEN role IN ('instructor', 'teacher') THEN 'TCH-' || UPPER(SUBSTRING(id::text FROM 1 FOR 4))
    ELSE 'STU-' || UPPER(SUBSTRING(id::text FROM 1 FOR 4))
END
WHERE short_id IS NULL;

-- ------------------------------------------------------------------------------
-- 5. CLEAN STUDENT_PROFILES: REMOVE UNUSED RAW / COMPLEX COLUMNS
-- ------------------------------------------------------------------------------
ALTER TABLE public.student_profiles DROP COLUMN IF EXISTS sleep_hours_per_day;
ALTER TABLE public.student_profiles DROP COLUMN IF EXISTS social_hours_per_week;
ALTER TABLE public.student_profiles DROP COLUMN IF EXISTS extra_tuition;
ALTER TABLE public.student_profiles DROP COLUMN IF EXISTS previous_failures;

-- ------------------------------------------------------------------------------
-- 6. CLEAN ACADEMIC_RECORDS: REMOVE REDUNDANT NUMERIC TOTALS
-- ------------------------------------------------------------------------------
ALTER TABLE public.academic_records DROP COLUMN IF EXISTS term_order;
ALTER TABLE public.academic_records DROP COLUMN IF EXISTS raw_score;
ALTER TABLE public.academic_records DROP COLUMN IF EXISTS credits_earned;
ALTER TABLE public.academic_records DROP COLUMN IF EXISTS total_credits;
ALTER TABLE public.academic_records DROP COLUMN IF EXISTS recorded_date;

-- ------------------------------------------------------------------------------
-- 7. CREATE CLEAN TEACHER_PROFILES TABLE (If not already created)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
    id TEXT PRIMARY KEY DEFAULT ('TP-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 6))),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    faculty_id_code TEXT UNIQUE,
    department TEXT DEFAULT 'Faculty of Computer Science',
    designation TEXT DEFAULT 'Senior Instructor / Professor',
    institution_name TEXT DEFAULT 'University Campus',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user_id ON public.teacher_profiles(user_id);
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS \"Teachers can view own teacher_profile\" ON public.teacher_profiles;
CREATE POLICY \"Teachers can view own teacher_profile\" ON public.teacher_profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS \"Teachers can update own teacher_profile\" ON public.teacher_profiles;
CREATE POLICY \"Teachers can update own teacher_profile\" ON public.teacher_profiles FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS \"Service role full access on teacher_profiles\" ON public.teacher_profiles;
CREATE POLICY \"Service role full access on teacher_profiles\" ON public.teacher_profiles FOR ALL USING (auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- 8. CONVERT EXISTING LONG UUIDs TO SHORT READABLE IDs (PRD-001, REC-001, SUB-1)
-- ------------------------------------------------------------------------------
-- Convert prediction_history IDs to PRD-0001, PRD-0002...
WITH ranked_preds AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rnum
    FROM public.prediction_history
)
UPDATE public.prediction_history p
SET id = 'PRD-' || LPAD(rp.rnum::text, 4, '0')
FROM ranked_preds rp
WHERE p.id = rp.id AND LENGTH(p.id) > 12;

-- Convert academic_records IDs to REC-0001, REC-0002...
WITH ranked_recs AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rnum
    FROM public.academic_records
)
UPDATE public.academic_records a
SET id = 'REC-' || LPAD(ra.rnum::text, 4, '0')
FROM ranked_recs ra
WHERE a.id = ra.id AND LENGTH(a.id) > 12;

-- Shorten subjects IDs inside academic_records JSONB to SUB-1, SUB-2...
UPDATE public.academic_records
SET subjects = (
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', 'SUB-' || s_idx,
            'subject_name', s->>'subject_name',
            'obtained_marks', COALESCE((s->>'obtained_marks')::numeric, 80),
            'total_marks', COALESCE((s->>'total_marks')::numeric, 100),
            'grade', COALESCE(s->>'grade', 'A')
        )
    )
    FROM jsonb_array_elements(subjects) WITH ORDINALITY AS arr(s, s_idx)
)
WHERE subjects IS NOT NULL AND jsonb_array_length(subjects) > 0;
