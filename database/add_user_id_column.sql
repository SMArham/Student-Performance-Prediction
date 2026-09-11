-- ==============================================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO ADD user_id COLUMN TO prediction_history
-- ==============================================================================
ALTER TABLE public.prediction_history ADD COLUMN IF NOT EXISTS user_id TEXT;
NOTIFY pgrst, 'reload schema';
