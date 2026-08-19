-- ==============================================================================
-- Student Performance Prediction & Analytics System
-- Row Level Security (RLS) Policies
-- ==============================================================================

-- 1. Enable RLS on all relevant tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_registry ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. Profiles Table Policies
-- ------------------------------------------------------------------------------
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Service role bypass for backend administration
CREATE POLICY "Service role full access on profiles"
    ON public.profiles
    FOR ALL
    USING (auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- 3. Student Profiles Policies
-- ------------------------------------------------------------------------------
-- Users can view their own student profiles
CREATE POLICY "Students can view own student_profile"
    ON public.student_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Students can insert their own student profiles
CREATE POLICY "Students can insert own student_profile"
    ON public.student_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Students can update their own student profiles
CREATE POLICY "Students can update own student_profile"
    ON public.student_profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role bypass
CREATE POLICY "Service role full access on student_profiles"
    ON public.student_profiles
    FOR ALL
    USING (auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- 4. Academic Records Policies
-- ------------------------------------------------------------------------------
-- Users can view their own academic records
CREATE POLICY "Users can view own academic_records"
    ON public.academic_records
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own academic records
CREATE POLICY "Users can insert own academic_records"
    ON public.academic_records
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own academic records
CREATE POLICY "Users can update own academic_records"
    ON public.academic_records
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own academic records
CREATE POLICY "Users can delete own academic_records"
    ON public.academic_records
    FOR DELETE
    USING (auth.uid() = user_id);

-- Service role bypass
CREATE POLICY "Service role full access on academic_records"
    ON public.academic_records
    FOR ALL
    USING (auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- 5. Prediction History Policies
-- ------------------------------------------------------------------------------
-- Users can view their own prediction history
CREATE POLICY "Users can view own prediction_history"
    ON public.prediction_history
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users / backend can insert prediction history
CREATE POLICY "Users can insert own prediction_history"
    ON public.prediction_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role bypass
CREATE POLICY "Service role full access on prediction_history"
    ON public.prediction_history
    FOR ALL
    USING (auth.role() = 'service_role');

-- ------------------------------------------------------------------------------
-- 6. Model Registry Policies
-- ------------------------------------------------------------------------------
-- Active models are readable by authenticated users and anonymous visitors
CREATE POLICY "Public read-only access for active models"
    ON public.model_registry
    FOR SELECT
    USING (is_active = TRUE);

-- Only backend service-role can insert/update/delete models
CREATE POLICY "Service role manages model registry"
    ON public.model_registry
    FOR ALL
    USING (auth.role() = 'service_role');
