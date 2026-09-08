-- ==============================================================================
-- FIX PROFILES TABLE: CONVERT id FROM UUID TO SHORT READABLE IDs (STU-01, TCH-01)
-- Run this in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Drop all policies on profiles and dependent tables
DROP POLICY IF EXISTS \"Users can view own profile\" ON public.profiles CASCADE;
DROP POLICY IF EXISTS \"Users can update own profile\" ON public.profiles CASCADE;
DROP POLICY IF EXISTS \"Users can insert own profile\" ON public.profiles CASCADE;
DROP POLICY IF EXISTS \"Public profiles are viewable by everyone\" ON public.profiles CASCADE;
DROP POLICY IF EXISTS \"Service role full access on profiles\" ON public.profiles CASCADE;
DROP POLICY IF EXISTS \"Public read profiles\" ON public.profiles CASCADE;
DROP POLICY IF EXISTS \"Public update profiles\" ON public.profiles CASCADE;
DROP POLICY IF EXISTS \"Public insert profiles\" ON public.profiles CASCADE;
DROP POLICY IF EXISTS \"Public delete profiles\" ON public.profiles CASCADE;

-- 2. Drop foreign key constraints that bind profiles.id
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.teacher_class_roster DROP CONSTRAINT IF EXISTS teacher_class_roster_teacher_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.academic_records DROP CONSTRAINT IF EXISTS academic_records_user_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.academic_subjects DROP CONSTRAINT IF EXISTS academic_subjects_user_id_fkey CASCADE;

-- 3. Convert child table columns to TEXT
ALTER TABLE public.teacher_class_roster ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.teacher_class_roster ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.teacher_class_roster ALTER COLUMN teacher_id TYPE TEXT;

ALTER TABLE public.academic_records ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.academic_records ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.academic_records ALTER COLUMN user_id TYPE TEXT;

ALTER TABLE public.academic_subjects ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.academic_subjects ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.academic_subjects ALTER COLUMN user_id TYPE TEXT;

-- 4. Convert profiles.id to TEXT
ALTER TABLE public.profiles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT;

-- 5. Update profiles.id to clean short readable IDs (STU-01, STU-02, TCH-01, TCH-02...)
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

-- 6. Recreate clean open policies on profiles
CREATE POLICY \"Public read profiles\" ON public.profiles FOR SELECT USING (true);
CREATE POLICY \"Public insert profiles\" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY \"Public update profiles\" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY \"Public delete profiles\" ON public.profiles FOR DELETE USING (true);

-- 7. Update signup trigger to auto-assign short IDs as the primary key
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
