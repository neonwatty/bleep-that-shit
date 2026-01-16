-- Add missing columns to jobs table
-- These columns were defined in 00003 but not applied correctly

-- Add user_id column with foreign key to profiles
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add job_type column
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS job_type text NOT NULL DEFAULT 'transcription';

-- Add input_file_path column
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS input_file_path text;

-- Add output_data column for storing transcription results
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS output_data jsonb;

-- Add processing_minutes column
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS processing_minutes numeric;

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS jobs_user_id_idx ON public.jobs(user_id);

-- Add RLS policy for user_id (update existing policies to use new column)
DROP POLICY IF EXISTS "Users can view own jobs" ON public.jobs;
CREATE POLICY "Users can view own jobs"
  ON public.jobs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own jobs" ON public.jobs;
CREATE POLICY "Users can create own jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own jobs" ON public.jobs;
CREATE POLICY "Users can update own jobs"
  ON public.jobs FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own jobs" ON public.jobs;
CREATE POLICY "Users can delete own jobs"
  ON public.jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Also add a service role policy for Edge Functions to update jobs
DROP POLICY IF EXISTS "Service role can update all jobs" ON public.jobs;
CREATE POLICY "Service role can update all jobs"
  ON public.jobs FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
