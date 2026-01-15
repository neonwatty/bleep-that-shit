import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { startTranscription } from '@/lib/replicate/service';
import type { Database } from '@/types/supabase';

type Project = Database['public']['Tables']['projects']['Row'];
type Job = Database['public']['Tables']['jobs']['Row'];
type JobInsert = Database['public']['Tables']['jobs']['Insert'];

export const dynamic = 'force-dynamic';

/**
 * POST /api/process/start
 * Start cloud transcription processing for a project
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
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('originals')
    .createSignedUrl(project.original_file_path, 3600);

  if (signedUrlError || !signedUrlData) {
    console.error('Error creating signed URL:', signedUrlError);
    return NextResponse.json({ error: 'Failed to access file' }, { status: 500 });
  }

  // Build webhook URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: 'Server configuration error: Missing base URL' },
      { status: 500 }
    );
  }
  const webhookUrl = `${baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`}/api/webhooks/replicate`;

  // Create job record
  const jobInsert: JobInsert = {
    project_id: projectId,
    user_id: user.id,
    job_type: 'transcription',
    status: 'pending',
    input_file_path: project.original_file_path,
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

  try {
    // Start Replicate prediction
    const prediction = await startTranscription(
      signedUrlData.signedUrl,
      `${webhookUrl}?jobId=${job.id}`,
      projectId
    );

    // Update job with Replicate prediction ID
    await supabase
      .from('jobs')
      .update({
        replicate_id: prediction.id,
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    // Update project status
    await supabase.from('projects').update({ status: 'processing' }).eq('id', projectId);

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        replicate_id: prediction.id,
        status: 'processing',
      },
    });
  } catch (error) {
    console.error('Error starting transcription:', error);

    // Mark job as failed
    await supabase
      .from('jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', job.id);

    return NextResponse.json(
      {
        error: 'Failed to start transcription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
