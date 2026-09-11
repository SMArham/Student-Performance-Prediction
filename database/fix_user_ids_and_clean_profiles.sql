-- ==============================================================================
-- DATABASE MIGRATION: STANDARDIZE USER IDs (STU-01, STU-02...) & REMOVE REDUNDANCY
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. DROP UNWANTED COLUMNS FROM PROFILES (current_gpa, updated_at, short_id)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS current_gpa CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS updated_at CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS short_id CASCADE;

-- 2. DROP RESTRICTIVE FOREIGN KEY CONSTRAINTS (Allow clean STU-XX, TCH-XX IDs)
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.academic_records DROP CONSTRAINT IF EXISTS academic_records_user_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.academic_subjects DROP CONSTRAINT IF EXISTS academic_subjects_user_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.teacher_class_roster DROP CONSTRAINT IF EXISTS teacher_class_roster_teacher_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.prediction_history DROP CONSTRAINT IF EXISTS prediction_history_user_id_fkey CASCADE;

-- 3. ENSURE ID COLUMN IN PROFILES IS TEXT
ALTER TABLE public.profiles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT;

-- 4. MIGRATE EXISTING USERS TO SEQUENTIAL STU-XX AND TCH-XX
UPDATE public.profiles
SET id = 'STU-01'
WHERE LOWER(email) = 'fatima@gmail.com' OR id = '9e967bbb-9361-4b32-97d6-80b61a13';

UPDATE public.profiles
SET id = 'STU-02'
WHERE LOWER(email) = 'zzzz@gmail.com' OR id = 'f8b817d6-2fd3-4fe5-ab24-a8be16aaca';

UPDATE public.profiles
SET id = 'STU-03'
WHERE LOWER(email) = 'kkk@gmail.com';

-- Catch any remaining non-standard IDs (like random UUIDs) and convert them sequentially
WITH ranked_users AS (
    SELECT id, role, ROW_NUMBER() OVER (PARTITION BY role ORDER BY created_at ASC) as rnum
    FROM public.profiles
    WHERE id NOT LIKE 'STU-%' AND id NOT LIKE 'TCH-%'
)
UPDATE public.profiles p
SET id = CASE
    WHEN ru.role IN ('instructor', 'teacher') THEN 'TCH-' || LPAD((ru.rnum + 3)::text, 2, '0')
    ELSE 'STU-' || LPAD((ru.rnum + 3)::text, 2, '0')
END
FROM ranked_users ru
WHERE p.id = ru.id;

-- 5. SAFELY UPDATE CHILD TABLES DYNAMICALLY (Only if tables and user_id columns exist)
DO $$
BEGIN
    -- academic_records
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'academic_records' AND column_name = 'id') THEN
        EXECUTE 'ALTER TABLE public.academic_records ALTER COLUMN id DROP DEFAULT';
        EXECUTE 'ALTER TABLE public.academic_records ALTER COLUMN id TYPE TEXT';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'academic_records' AND column_name = 'user_id') THEN
        EXECUTE 'ALTER TABLE public.academic_records ALTER COLUMN user_id TYPE TEXT';
        EXECUTE 'UPDATE public.academic_records SET user_id = ''STU-01'' WHERE user_id = ''9e967bbb-9361-4b32-97d6-80b61a13''';
        EXECUTE 'UPDATE public.academic_records SET user_id = ''STU-02'' WHERE user_id = ''f8b817d6-2fd3-4fe5-ab24-a8be16aaca''';
    END IF;

    -- academic_subjects
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'academic_subjects' AND column_name = 'id') THEN
        EXECUTE 'ALTER TABLE public.academic_subjects ALTER COLUMN id DROP DEFAULT';
        EXECUTE 'ALTER TABLE public.academic_subjects ALTER COLUMN id TYPE TEXT';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'academic_subjects' AND column_name = 'user_id') THEN
        EXECUTE 'ALTER TABLE public.academic_subjects ALTER COLUMN user_id TYPE TEXT';
        EXECUTE 'UPDATE public.academic_subjects SET user_id = ''STU-01'' WHERE user_id = ''9e967bbb-9361-4b32-97d6-80b61a13''';
        EXECUTE 'UPDATE public.academic_subjects SET user_id = ''STU-02'' WHERE user_id = ''f8b817d6-2fd3-4fe5-ab24-a8be16aaca''';
    END IF;

    -- teacher_class_roster
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teacher_class_roster' AND column_name = 'id') THEN
        EXECUTE 'ALTER TABLE public.teacher_class_roster ALTER COLUMN id DROP DEFAULT';
        EXECUTE 'ALTER TABLE public.teacher_class_roster ALTER COLUMN id TYPE TEXT';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teacher_class_roster' AND column_name = 'teacher_id') THEN
        EXECUTE 'ALTER TABLE public.teacher_class_roster ALTER COLUMN teacher_id TYPE TEXT';
    END IF;

    -- prediction_history (only if table and user_id exist)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'prediction_history' AND column_name = 'id') THEN
        EXECUTE 'ALTER TABLE public.prediction_history ALTER COLUMN id DROP DEFAULT';
        EXECUTE 'ALTER TABLE public.prediction_history ALTER COLUMN id TYPE TEXT';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'prediction_history' AND column_name = 'user_id') THEN
        EXECUTE 'ALTER TABLE public.prediction_history ALTER COLUMN user_id TYPE TEXT';
        EXECUTE 'UPDATE public.prediction_history SET user_id = ''STU-01'' WHERE user_id = ''9e967bbb-9361-4b32-97d6-80b61a13''';
        EXECUTE 'UPDATE public.prediction_history SET user_id = ''STU-02'' WHERE user_id = ''f8b817d6-2fd3-4fe5-ab24-a8be16aaca''';
    END IF;
END $$;

-- 6. RECREATE TRIGGER TO AUTO-ASSIGN SEQUENTIAL IDs ON NEW SIGNUPS
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

    -- If client sent a valid STU-XX or TCH-XX id, use it; otherwise compute next sequential
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

    -- Clean insertion without current_gpa, updated_at, or short_id
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

-- Bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. RECREATE CLEAN OPEN POLICIES
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles CASCADE;
DROP POLICY IF EXISTS "Public insert profiles" ON public.profiles CASCADE;
DROP POLICY IF EXISTS "Public update profiles" ON public.profiles CASCADE;
DROP POLICY IF EXISTS "Public delete profiles" ON public.profiles CASCADE;

CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Public delete profiles" ON public.profiles FOR DELETE USING (true);
