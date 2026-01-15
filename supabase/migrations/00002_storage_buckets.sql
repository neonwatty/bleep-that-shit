-- Storage buckets for project files
-- Run this migration in Supabase SQL Editor or via CLI

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('originals', 'originals', false, 2147483648, ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'video/mp4', 'video/quicktime', 'video/webm']),
  ('processed', 'processed', false, 2147483648, ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'video/mp4', 'video/quicktime', 'video/webm'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for originals bucket
-- Users can only access files in their own folder (folder name = user ID)

CREATE POLICY "Users can upload to own folder in originals"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'originals' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own files in originals"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'originals' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own files in originals"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'originals' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files in originals"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'originals' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS policies for processed bucket (same pattern)

CREATE POLICY "Users can upload to own folder in processed"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'processed' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own files in processed"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'processed' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own files in processed"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'processed' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files in processed"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'processed' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
