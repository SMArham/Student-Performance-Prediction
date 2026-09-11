-- ==============================================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO ENSURE ALL ACADEMIC COLUMNS EXIST
-- ==============================================================================
ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS attendance_pct NUMERIC(5,2) DEFAULT 85;
ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS credit_hours NUMERIC(5,2) DEFAULT 18;
ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS midterm_score NUMERIC(5,2) DEFAULT 80;
ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS backlogs INTEGER DEFAULT 0;
ALTER TABLE public.academic_records ADD COLUMN IF NOT EXISTS study_hours NUMERIC(4,2) DEFAULT 4.5;

-- Reload Supabase PostgREST schema cache
NOTIFY pgrst, 'reload schema';
