-- Jobs table for tracking cloud processing jobs
-- This tracks Replicate predictions and their status

CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  replicate_id text,
  job_type text NOT NULL DEFAULT 'transcription', -- 'transcription' | 'processing'
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  error_message text,
  input_file_path text,
  output_data jsonb, -- Store transcription result or processing output
  processing_minutes numeric,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index for querying jobs by project
CREATE INDEX IF NOT EXISTS jobs_project_id_idx ON public.jobs(project_id);

-- Index for querying jobs by user
CREATE INDEX IF NOT EXISTS jobs_user_id_idx ON public.jobs(user_id);

-- Index for querying jobs by status
CREATE INDEX IF NOT EXISTS jobs_status_idx ON public.jobs(status);

-- Index for querying by replicate_id (for webhook lookups)
CREATE INDEX IF NOT EXISTS jobs_replicate_id_idx ON public.jobs(replicate_id);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view own jobs"
  ON public.jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create jobs for their own projects
CREATE POLICY "Users can create own jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own jobs
CREATE POLICY "Users can update own jobs"
  ON public.jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own jobs
CREATE POLICY "Users can delete own jobs"
  ON public.jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
