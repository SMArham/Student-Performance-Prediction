-- ==============================================================================
-- FIX ALL REMAINING TABLES: PROFILES, ACADEMIC_SUBJECTS, ROSTER, ACADEMIC_RECORDS
-- Run this in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DROP ALL OLD POLICIES & CONSTRAINTS THAT CAUSE ERRORS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS \"Users can view own profile\" ON public.profiles CASCADE;
DROP POLICY IF EXISTS \"Users can update own profile\" ON public.profiles CASCADE;
DROP POLICY IF EXISTS \"Users can insert own profile\" ON public.profiles CASCADE;
DROP POLICY IF EXISTS \"Public profiles are viewable by everyone\" ON public.profiles CASCADE;
DROP POLICY IF EXISTS \"Service role full access on profiles\" ON public.profiles CASCADE;
DROP POLICY IF EXISTS \"Public read profiles\" ON public.profiles CASCADE;
DROP POLICY IF EXISTS \"Public update profiles\" ON public.profiles CASCADE;
DROP POLICY IF EXISTS \"Public insert profiles\" ON public.profiles CASCADE;
DROP POLICY IF EXISTS \"Public delete profiles\" ON public.profiles CASCADE;

DROP POLICY IF EXISTS \"Allow academic subjects management\" ON public.academic_subjects CASCADE;
DROP POLICY IF EXISTS \"Users can view own subjects\" ON public.academic_subjects CASCADE;
DROP POLICY IF EXISTS \"Users can insert own subjects\" ON public.academic_subjects CASCADE;
DROP POLICY IF EXISTS \"Users can update own subjects\" ON public.academic_subjects CASCADE;
DROP POLICY IF EXISTS \"Users can delete own subjects\" ON public.academic_subjects CASCADE;
DROP POLICY IF EXISTS \"Public read academic_subjects\" ON public.academic_subjects CASCADE;
DROP POLICY IF EXISTS \"Public insert academic_subjects\" ON public.academic_subjects CASCADE;
DROP POLICY IF EXISTS \"Public update academic_subjects\" ON public.academic_subjects CASCADE;
DROP POLICY IF EXISTS \"Public delete academic_subjects\" ON public.academic_subjects CASCADE;

DROP POLICY IF EXISTS \"Public read teacher_class_roster\" ON public.teacher_class_roster CASCADE;
DROP POLICY IF EXISTS \"Public insert teacher_class_roster\" ON public.teacher_class_roster CASCADE;
DROP POLICY IF EXISTS \"Public update teacher_class_roster\" ON public.teacher_class_roster CASCADE;
DROP POLICY IF EXISTS \"Public delete teacher_class_roster\" ON public.teacher_class_roster CASCADE;
DROP POLICY IF EXISTS \"Teachers can view own roster\" ON public.teacher_class_roster CASCADE;
DROP POLICY IF EXISTS \"Teachers can insert into roster\" ON public.teacher_class_roster CASCADE;
DROP POLICY IF EXISTS \"Teachers can update roster\" ON public.teacher_class_roster CASCADE;
DROP POLICY IF EXISTS \"Teachers can delete from roster\" ON public.teacher_class_roster CASCADE;

ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.teacher_class_roster DROP CONSTRAINT IF EXISTS teacher_class_roster_teacher_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.academic_records DROP CONSTRAINT IF EXISTS academic_records_user_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.academic_subjects DROP CONSTRAINT IF EXISTS academic_subjects_user_id_fkey CASCADE;

-- ------------------------------------------------------------------------------
-- 2. ALTER COLUMNS TO TEXT ACROSS ALL TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT;

ALTER TABLE public.teacher_class_roster ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.teacher_class_roster ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.teacher_class_roster ALTER COLUMN teacher_id TYPE TEXT;

ALTER TABLE public.academic_records ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.academic_records ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.academic_records ALTER COLUMN user_id TYPE TEXT;

ALTER TABLE public.academic_subjects ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.academic_subjects ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.academic_subjects ALTER COLUMN user_id TYPE TEXT;

-- ------------------------------------------------------------------------------
-- 3. PROFILES: CONVERT id TO STU-01, STU-02, TCH-01, TCH-02... (From your screenshot)
-- ------------------------------------------------------------------------------
UPDATE public.profiles
SET id = short_id
WHERE short_id IS NOT NULL AND LENGTH(short_id) <= 6;

WITH ranked_users AS (
    SELECT id, role, ROW_NUMBER() OVER (PARTITION BY role ORDER BY created_at ASC) as rnum
    FROM public.profiles
    WHERE LENGTH(id) > 6
)
UPDATE public.profiles p
SET id = CASE
    WHEN ru.role IN ('instructor', 'teacher') THEN 'TCH-' || LPAD(ru.rnum::text, 2, '0')
    ELSE 'STU-' || LPAD(ru.rnum::text, 2, '0')
END,
short_id = CASE
    WHEN ru.role IN ('instructor', 'teacher') THEN 'TCH-' || LPAD(ru.rnum::text, 2, '0')
    ELSE 'STU-' || LPAD(ru.rnum::text, 2, '0')
END
FROM ranked_users ru
WHERE p.id = ru.id;

-- ------------------------------------------------------------------------------
-- 4. ACADEMIC_SUBJECTS: CONVERT id TO S-01, S-02... AND user_id TO STU-01
-- ------------------------------------------------------------------------------
WITH ranked_subjects AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rnum
    FROM public.academic_subjects
)
UPDATE public.academic_subjects s
SET id = 'S-' || LPAD(rs.rnum::text, 2, '0')
FROM ranked_subjects rs
WHERE s.id = rs.id;

UPDATE public.academic_subjects
SET user_id = 'STU-01'
WHERE LENGTH(user_id) > 6;

-- ------------------------------------------------------------------------------
-- 5. TEACHER_CLASS_ROSTER: CONVERT id TO STU-01 AND teacher_id TO TCH-01
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 6. ACADEMIC_RECORDS: CONVERT id TO 2001, 2002... AND user_id TO STU-01
-- ------------------------------------------------------------------------------
WITH ranked_recs AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rnum
    FROM public.academic_records
)
UPDATE public.academic_records a
SET id = (2000 + ra.rnum)::text,
    user_id = 'STU-01'
FROM ranked_recs ra
WHERE a.id = ra.id AND LENGTH(a.id) > 6;

-- ------------------------------------------------------------------------------
-- 7. RECREATE CLEAN OPEN POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY \"Public read profiles\" ON public.profiles FOR SELECT USING (true);
CREATE POLICY \"Public insert profiles\" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY \"Public update profiles\" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY \"Public delete profiles\" ON public.profiles FOR DELETE USING (true);

CREATE POLICY \"Public read academic_subjects\" ON public.academic_subjects FOR SELECT USING (true);
CREATE POLICY \"Public insert academic_subjects\" ON public.academic_subjects FOR INSERT WITH CHECK (true);
CREATE POLICY \"Public update academic_subjects\" ON public.academic_subjects FOR UPDATE USING (true);
CREATE POLICY \"Public delete academic_subjects\" ON public.academic_subjects FOR DELETE USING (true);

CREATE POLICY \"Public read teacher_class_roster\" ON public.teacher_class_roster FOR SELECT USING (true);
CREATE POLICY \"Public insert teacher_class_roster\" ON public.teacher_class_roster FOR INSERT WITH CHECK (true);
CREATE POLICY \"Public update teacher_class_roster\" ON public.teacher_class_roster FOR UPDATE USING (true);
CREATE POLICY \"Public delete teacher_class_roster\" ON public.teacher_class_roster FOR DELETE USING (true);

-- ------------------------------------------------------------------------------
-- 8. CLEAN SIGNUP TRIGGER (AUTONOMOUS SHORT ID PRIMARY KEY)
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
        new_short_id,
        new_short_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        u_role,
        u_stage,
        COALESCE(NEW.raw_user_meta_data->>'institution_name', 'University Campus'),
        COALESCE(NEW.raw_user_meta_data->>'program_or_major', NEW.raw_user_meta_data->>'department', 'Software Engineering'),
        3.65
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;

    RETURN NEW;
END;
 LANGUAGE plpgsql SECURITY DEFINER;
