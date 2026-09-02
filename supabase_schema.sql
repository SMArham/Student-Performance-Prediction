-- ==============================================================================
-- 1. DROP EXISTING TABLES SAFELY (CASCADE REMOVES ALL CONSTRAINTS)
-- ==============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

DROP TABLE IF EXISTS public.teacher_class_roster CASCADE;
DROP TABLE IF EXISTS public.prediction_history CASCADE;
DROP TABLE IF EXISTS public.academic_subjects CASCADE;
DROP TABLE IF EXISTS public.student_courses CASCADE;
DROP TABLE IF EXISTS public.student_predictions CASCADE;
DROP TABLE IF EXISTS public.class_roster CASCADE;
DROP TABLE IF EXISTS public.academic_records CASCADE;
DROP TABLE IF EXISTS public.model_registry CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. USER PROFILES TABLE (Linked directly with auth.users)
-- ==============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'instructor')),
  stage TEXT NOT NULL DEFAULT 'university' CHECK (stage IN ('university', 'intermediate', 'matric', 'secondary', 'primary')),
  gender TEXT NOT NULL DEFAULT 'male' CHECK (gender IN ('male', 'female')),
  institution_name TEXT DEFAULT 'University Campus',
  program TEXT DEFAULT 'General Studies',
  student_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. ACADEMIC SUBJECTS TABLE (Entered by Students)
-- ==============================================================================
CREATE TABLE public.academic_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('university', 'intermediate', 'matric', 'secondary', 'primary')),
  subject_name TEXT NOT NULL,
  subject_category TEXT NOT NULL CHECK (subject_category IN ('Theory', 'Lab')),
  assessment_period TEXT NOT NULL,
  obtained_marks NUMERIC(6, 2) NOT NULL CHECK (obtained_marks >= 0),
  total_marks NUMERIC(6, 2) NOT NULL CHECK (total_marks > 0),
  percentage NUMERIC(5, 2) GENERATED ALWAYS AS (ROUND((obtained_marks / total_marks) * 100, 2)) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. PREDICTION HISTORY TABLE (Real Forecast Runs)
-- ==============================================================================
CREATE TABLE public.prediction_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  predicted_score NUMERIC(6, 2) NOT NULL,
  predicted_grade TEXT,
  status_badge TEXT,
  confidence_min NUMERIC(6, 2),
  confidence_max NUMERIC(6, 2),
  positive_factors JSONB DEFAULT '[]'::jsonb,
  growth_factors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. TEACHER CLASS ROSTER TABLE
-- ==============================================================================
CREATE TABLE public.teacher_class_roster (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_id_code TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'university',
  attendance_pct NUMERIC(5, 2) DEFAULT 0.00,
  avg_marks NUMERIC(5, 2) DEFAULT 0.00,
  study_hours NUMERIC(4, 1) DEFAULT 0.0,
  risk_level TEXT DEFAULT 'Low Risk',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_academic_subjects_user_id ON public.academic_subjects(user_id);
CREATE INDEX idx_prediction_history_user_id ON public.prediction_history(user_id);
CREATE INDEX idx_teacher_class_roster_teacher_id ON public.teacher_class_roster(teacher_id);

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_class_roster ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Academic Subjects: Users manage only their own records
CREATE POLICY "Users can view own subjects" ON public.academic_subjects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subjects" ON public.academic_subjects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subjects" ON public.academic_subjects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own subjects" ON public.academic_subjects FOR DELETE USING (auth.uid() = user_id);

-- Prediction History: Users manage only their own predictions
CREATE POLICY "Users can view own predictions" ON public.prediction_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own predictions" ON public.prediction_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own predictions" ON public.prediction_history FOR DELETE USING (auth.uid() = user_id);

-- Teacher Class Roster: Teachers manage their own class roster
CREATE POLICY "Teachers can view own roster" ON public.teacher_class_roster FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can insert into roster" ON public.teacher_class_roster FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can update roster" ON public.teacher_class_roster FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete from roster" ON public.teacher_class_roster FOR DELETE USING (auth.uid() = teacher_id);

-- ==============================================================================
-- 8. AUTOMATIC USER CREATION TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_unique_code INT := FLOOR(100 + RANDOM() * 900);
  v_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  v_id_code TEXT := COALESCE(NEW.raw_user_meta_data->>'student_id', CASE WHEN v_role = 'teacher' THEN 'TCH-2026-' || v_unique_code ELSE 'STU-2026-' || v_unique_code END);
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    stage,
    gender,
    institution_name,
    program,
    student_id
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'stage', 'university'),
    COALESCE(NEW.raw_user_meta_data->>'gender', 'male'),
    COALESCE(NEW.raw_user_meta_data->>'institution_name', NEW.raw_user_meta_data->>'institution', 'Faculty of Engineering'),
    COALESCE(NEW.raw_user_meta_data->>'program', NEW.raw_user_meta_data->>'major', 'Software Engineering'),
    v_id_code
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    stage = EXCLUDED.stage,
    gender = EXCLUDED.gender,
    institution_name = EXCLUDED.institution_name,
    program = EXCLUDED.program,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
