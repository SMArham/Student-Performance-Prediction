-- ==============================================================================
-- COMPLETE REPAIR & POPULATION SCRIPT FOR ALL 5 SUPABASE TABLES
-- Run this in your Supabase Dashboard -> SQL Editor
-- Tables configured:
--   1. profiles (Cleaned up, STU-01/02/03 & TCH-01)
--   2. academic_records (Populated with semester GPA & attendance)
--   3. academic_subjects (Populated with enrolled courses & scores)
--   4. prediction_history (Populated with verified AI forecasts)
--   5. teacher_class_roster (Populated with student roster under TCH-01)
-- Removes: model_registry (obsolete), current_gpa, updated_at, short_id
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DROP OBSOLETE TABLES & UNWANTED COLUMNS
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.model_registry CASCADE;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS current_gpa CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS updated_at CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS short_id CASCADE;

-- Drop foreign key constraints to allow clean text IDs
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.academic_records DROP CONSTRAINT IF EXISTS academic_records_user_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.academic_subjects DROP CONSTRAINT IF EXISTS academic_subjects_user_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.teacher_class_roster DROP CONSTRAINT IF EXISTS teacher_class_roster_teacher_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.prediction_history DROP CONSTRAINT IF EXISTS prediction_history_user_id_fkey CASCADE;

-- ------------------------------------------------------------------------------
-- 2. ENSURE ALL TABLES EXIST WITH UNIFIED TEXT COLUMNS & COMPATIBLE SCHEMAS
-- ------------------------------------------------------------------------------

-- 2A. PROFILES
ALTER TABLE public.profiles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT;

-- 2B. ACADEMIC_RECORDS
CREATE TABLE IF NOT EXISTS public.academic_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'university',
    term_name TEXT NOT NULL,
    gpa NUMERIC(4,2) NOT NULL,
    cgpa NUMERIC(4,2) NOT NULL,
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
    
    -- Add columns if missing
    ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS attendance_pct NUMERIC(5,2) DEFAULT 85;
    ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS credit_hours NUMERIC(5,2) DEFAULT 18;
    ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS midterm_score NUMERIC(5,2) DEFAULT 80;
    ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS backlogs INTEGER DEFAULT 0;
    ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS study_hours NUMERIC(4,2) DEFAULT 4.5;
    ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS subjects JSONB DEFAULT '[]'::jsonb;
    
    -- Drop NOT NULL on legacy columns if they exist
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

-- 2C. ACADEMIC_SUBJECTS
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

-- 2D. PREDICTION_HISTORY
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
    
    -- Drop NOT NULL on legacy model_name, model_version if present
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prediction_history' AND column_name='model_name') THEN
        ALTER TABLE public.prediction_history ALTER COLUMN model_name DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prediction_history' AND column_name='model_version') THEN
        ALTER TABLE public.prediction_history ALTER COLUMN model_version DROP NOT NULL;
    END IF;
END $$;

-- 2E. TEACHER_CLASS_ROSTER
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

-- ------------------------------------------------------------------------------
-- 3. MIGRATE / STANDARDIZE USER PROFILES (STU-01, STU-02, STU-03, TCH-01)
-- ------------------------------------------------------------------------------
UPDATE public.profiles
SET id = 'STU-01'
WHERE LOWER(email) = 'fatima@gmail.com' OR id = '9e967bbb-9361-4b32-97d6-80b61a13';

UPDATE public.profiles
SET id = 'STU-02'
WHERE LOWER(email) = 'zzzz@gmail.com' OR id = 'f8b817d6-2fd3-4fe5-ab24-a8be16aaca';

UPDATE public.profiles
SET id = 'STU-03'
WHERE LOWER(email) = 'kkk@gmail.com';

-- Ensure instructor profile TCH-01 exists
INSERT INTO public.profiles (
    id, full_name, email, role, stage,
    institution_name, department_or_program, created_at
)
VALUES (
    'TCH-01', 'Dr. Tariq Mahmood', 'tariq.teacher@gmail.com', 'instructor', 'university',
    'Faculty of Computer Science', 'Software Engineering', NOW()
)
ON CONFLICT (id) DO UPDATE SET
    role = 'instructor',
    full_name = EXCLUDED.full_name;

-- ------------------------------------------------------------------------------
-- 4. POPULATE DATA ACROSS ALL TABLES
-- ------------------------------------------------------------------------------

-- 4A. POPULATE ACADEMIC_RECORDS (Semesters for STU-03 "kk", STU-01 "Fatima", STU-02 "Zzz")
INSERT INTO public.academic_records (
    id, user_id, stage, term_name, gpa, cgpa, attendance_pct, credit_hours, midterm_score, backlogs, study_hours, subjects, created_at
)
VALUES
-- STU-03 (kk)
(
    'rec_STU-03_sem1', 'STU-03', 'university', 'Semester 1 (Freshman)', 3.45, 3.45, 88.0, 18, 82.0, 0, 4.5,
    '[{"name": "Programming Fundamentals", "grade": "A-", "marks": 84, "total": 100}, {"name": "Calculus & Analytical Geometry", "grade": "B+", "marks": 79, "total": 100}, {"name": "Applied Physics", "grade": "A", "marks": 87, "total": 100}, {"name": "English Composition", "grade": "A", "marks": 90, "total": 100}]'::jsonb,
    NOW() - INTERVAL '120 days'
),
(
    'rec_STU-03_sem2', 'STU-03', 'university', 'Semester 2 (Freshman)', 3.65, 3.55, 92.0, 18, 86.0, 0, 5.0,
    '[{"name": "Object-Oriented Programming", "grade": "A", "marks": 89, "total": 100}, {"name": "Digital Logic Design", "grade": "A-", "marks": 85, "total": 100}, {"name": "Discrete Structures", "grade": "B+", "marks": 80, "total": 100}, {"name": "Communication Skills", "grade": "A", "marks": 92, "total": 100}]'::jsonb,
    NOW() - INTERVAL '30 days'
),
-- STU-01 (Fatima)
(
    'rec_STU-01_sem1', 'STU-01', 'university', 'Semester 1 (Freshman)', 3.75, 3.75, 94.0, 18, 88.0, 0, 5.5,
    '[{"name": "Programming Fundamentals", "grade": "A", "marks": 91, "total": 100}, {"name": "Calculus", "grade": "A-", "marks": 86, "total": 100}]'::jsonb,
    NOW() - INTERVAL '120 days'
),
(
    'rec_STU-01_sem2', 'STU-01', 'university', 'Semester 2 (Freshman)', 3.85, 3.80, 96.0, 18, 91.0, 0, 6.0,
    '[{"name": "Data Structures", "grade": "A", "marks": 94, "total": 100}, {"name": "Database Systems", "grade": "A", "marks": 92, "total": 100}]'::jsonb,
    NOW() - INTERVAL '30 days'
),
-- STU-02 (Zzz)
(
    'rec_STU-02_sem1', 'STU-02', 'university', 'Semester 1 (Freshman)', 2.95, 2.95, 79.0, 17, 72.0, 1, 3.5,
    '[{"name": "Intro to Computing", "grade": "B-", "marks": 71, "total": 100}, {"name": "Mathematics", "grade": "B", "marks": 75, "total": 100}]'::jsonb,
    NOW() - INTERVAL '120 days'
),
(
    'rec_STU-02_sem2', 'STU-02', 'university', 'Semester 2 (Freshman)', 3.10, 3.03, 82.0, 18, 76.0, 0, 4.0,
    '[{"name": "Programming", "grade": "B+", "marks": 78, "total": 100}, {"name": "Digital Systems", "grade": "B", "marks": 76, "total": 100}]'::jsonb,
    NOW() - INTERVAL '30 days'
)
ON CONFLICT (id) DO UPDATE SET
    gpa = EXCLUDED.gpa,
    cgpa = EXCLUDED.cgpa,
    subjects = EXCLUDED.subjects,
    attendance_pct = EXCLUDED.attendance_pct;

-- 4B. POPULATE ACADEMIC_SUBJECTS (Course Breakdown)
INSERT INTO public.academic_subjects (
    id, user_id, stage, subject_name, subject_category, assessment_period, obtained_marks, total_marks, percentage, created_at
)
VALUES
-- STU-03 (kk)
('sub_STU-03_oop', 'STU-03', 'university', 'Object-Oriented Programming', 'Core Theory', 'Semester 2 (Freshman)', 89.0, 100, 89.0, NOW() - INTERVAL '30 days'),
('sub_STU-03_dld', 'STU-03', 'university', 'Digital Logic Design', 'Core Lab', 'Semester 2 (Freshman)', 85.0, 100, 85.0, NOW() - INTERVAL '30 days'),
('sub_STU-03_disc', 'STU-03', 'university', 'Discrete Mathematics', 'Theory', 'Semester 2 (Freshman)', 80.0, 100, 80.0, NOW() - INTERVAL '30 days'),
('sub_STU-03_prog', 'STU-03', 'university', 'Programming Fundamentals', 'Core Theory', 'Semester 1 (Freshman)', 84.0, 100, 84.0, NOW() - INTERVAL '120 days'),
-- STU-01 (Fatima)
('sub_STU-01_dsa', 'STU-01', 'university', 'Data Structures & Algorithms', 'Core Theory', 'Semester 2 (Freshman)', 94.0, 100, 94.0, NOW() - INTERVAL '30 days'),
('sub_STU-01_dbms', 'STU-01', 'university', 'Database Management Systems', 'Core Lab', 'Semester 2 (Freshman)', 92.0, 100, 92.0, NOW() - INTERVAL '30 days'),
-- STU-02 (Zzz)
('sub_STU-02_intro', 'STU-02', 'university', 'Intro to Computing', 'Theory', 'Semester 1 (Freshman)', 71.0, 100, 71.0, NOW() - INTERVAL '120 days'),
('sub_STU-02_prog', 'STU-02', 'university', 'Computer Programming', 'Core Theory', 'Semester 2 (Freshman)', 78.0, 100, 78.0, NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO UPDATE SET
    obtained_marks = EXCLUDED.obtained_marks,
    percentage = EXCLUDED.percentage;

-- 4C. POPULATE PREDICTION_HISTORY (AI Forecasts)
INSERT INTO public.prediction_history (
    id, user_id, stage, input_features, predicted_score, predicted_grade, status_badge, created_at
)
VALUES
-- STU-03 (kk)
(
    'pred-301', 'STU-03', 'university',
    '{"current_cgpa": 3.45, "attendance": 88, "study_hours": 4.5, "midterm_score": 82}'::jsonb,
    3.55, 'Exemplary / Distinction', 'Exemplary', NOW() - INTERVAL '25 days'
),
(
    'pred-302', 'STU-03', 'university',
    '{"current_cgpa": 3.55, "attendance": 92, "study_hours": 5.0, "midterm_score": 86}'::jsonb,
    3.72, 'Exemplary / Distinction', 'Exemplary', NOW() - INTERVAL '2 days'
),
-- STU-01 (Fatima)
(
    'pred-101', 'STU-01', 'university',
    '{"current_cgpa": 3.80, "attendance": 96, "study_hours": 6.0, "midterm_score": 91}'::jsonb,
    3.88, 'Exemplary / Distinction', 'Exemplary', NOW() - INTERVAL '10 days'
),
-- STU-02 (Zzz)
(
    'pred-201', 'STU-02', 'university',
    '{"current_cgpa": 3.03, "attendance": 82, "study_hours": 4.0, "midterm_score": 76}'::jsonb,
    3.15, 'Good Standing', 'On Track', NOW() - INTERVAL '15 days'
)
ON CONFLICT (id) DO UPDATE SET
    predicted_score = EXCLUDED.predicted_score,
    predicted_grade = EXCLUDED.predicted_grade,
    status_badge = EXCLUDED.status_badge;

-- 4D. POPULATE TEACHER_CLASS_ROSTER (Managed under Teacher TCH-01)
INSERT INTO public.teacher_class_roster (
    id, teacher_id, student_id, student_id_code, student_name, email,
    stage, department_or_program, current_gpa, predicted_score,
    predicted_grade, status_badge, risk_level, attendance_pct, avg_marks, study_hours, notes, created_at
)
VALUES
(
    'RST-01', 'TCH-01', 'STU-03', 'STU-03', 'kk', 'kkk@gmail.com',
    'university', 'Software Engineering', 3.55, 3.72,
    'Grade A', 'Exemplary', 'Low Risk', 92.0, 87.0, 5.0,
    'Consistent academic growth and positive course progression.', NOW()
),
(
    'RST-02', 'TCH-01', 'STU-01', 'STU-01', 'Fatima', 'fatima@gmail.com',
    'university', 'Software Engineering', 3.80, 3.88,
    'Grade A+', 'Exemplary', 'Low Risk', 96.0, 93.0, 6.0,
    'Top tier academic milestone performer.', NOW()
),
(
    'RST-03', 'TCH-01', 'STU-02', 'STU-02', 'Zzz', 'zzzz@gmail.com',
    'university', 'Software Engineering', 3.03, 3.15,
    'Grade B+', 'On Track', 'Moderate Risk', 82.0, 77.0, 4.0,
    'Advised to maintain higher attendance in theory courses.', NOW()
)
ON CONFLICT (id) DO UPDATE SET
    student_name = EXCLUDED.student_name,
    current_gpa = EXCLUDED.current_gpa,
    predicted_score = EXCLUDED.predicted_score,
    attendance_pct = EXCLUDED.attendance_pct;

-- ------------------------------------------------------------------------------
-- 5. RECREATE CLEAN OPEN POLICIES ACROSS ALL 5 TABLES
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 6. RECREATE CLEAN SEQUENTIAL SIGNUP TRIGGER
-- ------------------------------------------------------------------------------
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
