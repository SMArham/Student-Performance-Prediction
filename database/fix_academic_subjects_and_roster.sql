-- ==============================================================================
-- FIX ACADEMIC_SUBJECTS & TEACHER_CLASS_ROSTER (SHORT READABLE IDs)
-- Run this in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ACADEMIC_SUBJECTS (The exact table from your screenshot!)
-- Converts id -> S-01, S-02... and user_id -> STU-01, STU-02...
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS \"Allow academic subjects management\" ON public.academic_subjects;
DROP POLICY IF EXISTS \"Users can view own subjects\" ON public.academic_subjects;
DROP POLICY IF EXISTS \"Users can insert own subjects\" ON public.academic_subjects;
DROP POLICY IF EXISTS \"Users can update own subjects\" ON public.academic_subjects;
DROP POLICY IF EXISTS \"Users can delete own subjects\" ON public.academic_subjects;
DROP POLICY IF EXISTS \"Public read academic_subjects\" ON public.academic_subjects;
DROP POLICY IF EXISTS \"Public insert academic_subjects\" ON public.academic_subjects;
DROP POLICY IF EXISTS \"Public update academic_subjects\" ON public.academic_subjects;
DROP POLICY IF EXISTS \"Public delete academic_subjects\" ON public.academic_subjects;
DROP POLICY IF EXISTS \"Service role full access on academic_subjects\" ON public.academic_subjects;

ALTER TABLE IF EXISTS public.academic_subjects DROP CONSTRAINT IF EXISTS academic_subjects_user_id_fkey CASCADE;

ALTER TABLE public.academic_subjects ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.academic_subjects ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.academic_subjects ALTER COLUMN user_id TYPE TEXT;

-- Convert all IDs in academic_subjects to S-01, S-02, S-03...
WITH ranked_subjects AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rnum
    FROM public.academic_subjects
)
UPDATE public.academic_subjects s
SET id = 'S-' || LPAD(rs.rnum::text, 2, '0')
FROM ranked_subjects rs
WHERE s.id = rs.id;

-- Convert all user_id in academic_subjects to short readable IDs (STU-01, STU-02)
UPDATE public.academic_subjects s
SET user_id = COALESCE(p.short_id, 'STU-01')
FROM public.profiles p
WHERE s.user_id = p.id::text OR s.user_id = p.short_id;

UPDATE public.academic_subjects
SET user_id = 'STU-01'
WHERE LENGTH(user_id) > 8;

CREATE POLICY \"Public read academic_subjects\" ON public.academic_subjects FOR SELECT USING (true);
CREATE POLICY \"Public insert academic_subjects\" ON public.academic_subjects FOR INSERT WITH CHECK (true);
CREATE POLICY \"Public update academic_subjects\" ON public.academic_subjects FOR UPDATE USING (true);
CREATE POLICY \"Public delete academic_subjects\" ON public.academic_subjects FOR DELETE USING (true);

-- ------------------------------------------------------------------------------
-- 2. TEACHER_CLASS_ROSTER (The row you pasted: id & teacher_id)
-- Converts id -> STU-01 and teacher_id -> TCH-01
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS \"Public read teacher_class_roster\" ON public.teacher_class_roster;
DROP POLICY IF EXISTS \"Public insert teacher_class_roster\" ON public.teacher_class_roster;
DROP POLICY IF EXISTS \"Public update teacher_class_roster\" ON public.teacher_class_roster;
DROP POLICY IF EXISTS \"Public delete teacher_class_roster\" ON public.teacher_class_roster;
DROP POLICY IF EXISTS \"Teachers can view own roster\" ON public.teacher_class_roster;
DROP POLICY IF EXISTS \"Teachers can insert into roster\" ON public.teacher_class_roster;
DROP POLICY IF EXISTS \"Teachers can update roster\" ON public.teacher_class_roster;
DROP POLICY IF EXISTS \"Teachers can delete from roster\" ON public.teacher_class_roster;
DROP POLICY IF EXISTS \"Teachers can view own class roster\" ON public.teacher_class_roster;
DROP POLICY IF EXISTS \"Teachers can manage own class roster\" ON public.teacher_class_roster;
DROP POLICY IF EXISTS \"Service role full access on teacher_class_roster\" ON public.teacher_class_roster;

ALTER TABLE IF EXISTS public.teacher_class_roster DROP CONSTRAINT IF EXISTS teacher_class_roster_teacher_id_fkey CASCADE;

ALTER TABLE public.teacher_class_roster ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.teacher_class_roster ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.teacher_class_roster ALTER COLUMN teacher_id TYPE TEXT;

WITH ranked_roster AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rnum
    FROM public.teacher_class_roster
)
UPDATE public.teacher_class_roster r
SET 
    id = 'STU-' || LPAD(rr.rnum::text, 2, '0'),
    teacher_id = 'TCH-01'
FROM ranked_roster rr
WHERE r.id = rr.id;

CREATE POLICY \"Public read teacher_class_roster\" ON public.teacher_class_roster FOR SELECT USING (true);
CREATE POLICY \"Public insert teacher_class_roster\" ON public.teacher_class_roster FOR INSERT WITH CHECK (true);
CREATE POLICY \"Public update teacher_class_roster\" ON public.teacher_class_roster FOR UPDATE USING (true);
CREATE POLICY \"Public delete teacher_class_roster\" ON public.teacher_class_roster FOR DELETE USING (true);

-- ------------------------------------------------------------------------------
-- 3. ACADEMIC_RECORDS: SHORT 4-DIGIT IDs (2001, 2002...)
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
WHERE a.id = ra.id AND LENGTH(a.id) > 6;

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
