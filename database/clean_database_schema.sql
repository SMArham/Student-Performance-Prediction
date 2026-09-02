-- ==============================================================================
-- EDUMETRICS DATABASE CLEANUP MIGRATION
-- Run this in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. Drop avatar_url from profiles (since avatars are not used)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar_url;

-- 2. Update handle_new_user trigger function to remove avatar_url
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS 
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, stage)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        COALESCE(NEW.raw_user_meta_data->>'stage', 'university')
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        stage = EXCLUDED.stage,
        updated_at = NOW();

    RETURN NEW;
END;
 LANGUAGE plpgsql SECURITY DEFINER;
