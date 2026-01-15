-- Enable PGMQ extension for message queue functionality
-- PGMQ provides a lightweight, Postgres-native message queue

-- Enable the pgmq extension
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create the transcription jobs queue
SELECT pgmq.create('transcription_jobs');

-- Update jobs table: rename replicate_id to queue_msg_id for clarity
ALTER TABLE public.jobs
  RENAME COLUMN replicate_id TO queue_msg_id;

-- Update the index name as well
DROP INDEX IF EXISTS jobs_replicate_id_idx;
CREATE INDEX IF NOT EXISTS jobs_queue_msg_id_idx ON public.jobs(queue_msg_id);

-- Add a retry_count column to track retries
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;

-- Add a column to store the signed URL (so edge function can access file)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS signed_url text;

-- Add a column to store when the signed URL expires
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS signed_url_expires_at timestamptz;

-- Comment on the queue for documentation
COMMENT ON EXTENSION pgmq IS 'Lightweight message queue for async job processing';

-- Create wrapper functions for PGMQ operations (callable via RPC)
-- These allow Edge Functions to interact with the queue

-- Send a message to the queue
CREATE OR REPLACE FUNCTION pgmq_send(
  queue_name text,
  message jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.send(queue_name, message);
END;
$$;

-- Read messages from the queue
CREATE OR REPLACE FUNCTION pgmq_read(
  queue_name text,
  vt integer,
  qty integer
)
RETURNS SETOF pgmq.message_record
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT * FROM pgmq.read(queue_name, vt, qty);
END;
$$;

-- Delete a message from the queue
CREATE OR REPLACE FUNCTION pgmq_delete(
  queue_name text,
  msg_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, msg_id);
END;
$$;

-- Archive a message (for failed jobs history)
CREATE OR REPLACE FUNCTION pgmq_archive(
  queue_name text,
  msg_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.archive(queue_name, msg_id);
END;
$$;

-- Grant execute permissions to authenticated users (for API routes)
-- and service_role (for Edge Functions)
GRANT EXECUTE ON FUNCTION pgmq_send TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION pgmq_read TO service_role;
GRANT EXECUTE ON FUNCTION pgmq_delete TO service_role;
GRANT EXECUTE ON FUNCTION pgmq_archive TO service_role;

-- Enable pg_cron and pg_net for scheduled Edge Function invocation
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to invoke the Edge Function via HTTP
-- This is called by pg_cron to process pending jobs
CREATE OR REPLACE FUNCTION invoke_process_transcription()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url text;
  service_role_key text;
BEGIN
  -- Get the Edge Function URL from Supabase config
  -- Format: https://<project-ref>.supabase.co/functions/v1/process-transcription
  edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/process-transcription';
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Only invoke if there are messages in the queue
  IF EXISTS (SELECT 1 FROM pgmq.q_transcription_jobs LIMIT 1) THEN
    PERFORM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || service_role_key,
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  END IF;
END;
$$;

-- Schedule the job processor to run every 15 seconds
-- This ensures jobs are processed promptly while not overwhelming the system
-- Note: pg_cron minimum interval is 1 minute, so we use a different approach
-- Instead, we'll use a database trigger on job creation

-- Create a trigger that fires when a new job is inserted
-- This immediately invokes the Edge Function to start processing
CREATE OR REPLACE FUNCTION trigger_process_on_job_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url text;
  service_role_key text;
BEGIN
  -- Only trigger for pending transcription jobs
  IF NEW.status = 'pending' AND NEW.job_type = 'transcription' THEN
    edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/process-transcription';
    service_role_key := current_setting('app.settings.service_role_key', true);

    -- Fire and forget - don't wait for response
    PERFORM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || service_role_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('job_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger to the jobs table
DROP TRIGGER IF EXISTS on_job_insert_trigger ON public.jobs;
CREATE TRIGGER on_job_insert_trigger
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_process_on_job_insert();

-- Also set up a pg_cron job to run every minute as a backup
-- This catches any jobs that might have been missed
SELECT cron.schedule(
  'process-transcription-backup',
  '* * * * *', -- Every minute
  $$SELECT invoke_process_transcription()$$
);
