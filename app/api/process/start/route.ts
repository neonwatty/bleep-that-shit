import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type Project = Database['public']['Tables']['projects']['Row'];
type Job = Database['public']['Tables']['jobs']['Row'];
type JobInsert = Database['public']['Tables']['jobs']['Insert'];

export const dynamic = 'force-dynamic';

/**
 * POST /api/process/start
 * Start cloud transcription processing for a project
 *
 * This endpoint:
 * 1. Creates a job record
 * 2. Generates a signed URL for the audio file
 * 3. Enqueues the job to PGMQ for async processing
 * 4. Returns immediately with job ID (client polls for status)
 *
 * The actual transcription is handled by a Supabase Edge Function
 * that reads from the queue and calls the Groq API.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request body
  let body: { projectId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { projectId } = body;

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
  }

  // Verify project exists and belongs to user
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single<Project>();

  if (projectError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Verify project has a file
  if (!project.original_file_path) {
    return NextResponse.json({ error: 'Project has no uploaded file' }, { status: 400 });
  }

  // Check if there's already a processing job
  const { data: existingJob } = await supabase
    .from('jobs')
    .select('*')
    .eq('project_id', projectId)
    .in('status', ['pending', 'processing'])
    .single<Job>();

  if (existingJob) {
    return NextResponse.json(
      { error: 'Project already has a processing job in progress', job: existingJob },
      { status: 409 }
    );
  }

  // Get a signed URL for the file (valid for 1 hour)
  const signedUrlExpiresAt = new Date(Date.now() + 3600 * 1000);
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('originals')
    .createSignedUrl(project.original_file_path, 3600);

  if (signedUrlError || !signedUrlData) {
    console.error('Error creating signed URL:', signedUrlError);
    return NextResponse.json({ error: 'Failed to access file' }, { status: 500 });
  }

  // Create job record
  const jobInsert: JobInsert = {
    project_id: projectId,
    user_id: user.id,
    job_type: 'transcription',
    status: 'pending',
    input_file_path: project.original_file_path,
    signed_url: signedUrlData.signedUrl,
    signed_url_expires_at: signedUrlExpiresAt.toISOString(),
    retry_count: 0,
  };

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert(jobInsert)
    .select()
    .single<Job>();

  if (jobError || !job) {
    console.error('Error creating job:', jobError);
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }

  // Update project status to processing
  await supabase.from('projects').update({ status: 'processing' }).eq('id', projectId);

  // Enqueue job to PGMQ for async processing
  const { error: queueError } = await supabase.rpc('pgmq_send', {
    queue_name: 'transcription_jobs',
    message: {
      job_id: job.id,
      project_id: projectId,
      signed_url: signedUrlData.signedUrl,
    },
  });

  if (queueError) {
    console.error('Error enqueueing job:', queueError);
    // Mark job as failed if we couldn't enqueue
    await supabase
      .from('jobs')
      .update({
        status: 'failed',
        error_message: 'Failed to enqueue job for processing',
      })
      .eq('id', job.id);
    await supabase.from('projects').update({ status: 'error' }).eq('id', projectId);
    return NextResponse.json({ error: 'Failed to enqueue job' }, { status: 500 });
  }

  console.log(`[Queue] Job ${job.id} enqueued for project ${projectId}`);

  return NextResponse.json({
    success: true,
    job: {
      id: job.id,
      status: 'pending',
      message: 'Job enqueued for processing',
    },
  });
}
