import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transcribeFromUrl, formatForBleepEditor } from '@/lib/groq/service';
import type { Database } from '@/types/supabase';

type Project = Database['public']['Tables']['projects']['Row'];
type Job = Database['public']['Tables']['jobs']['Row'];
type JobInsert = Database['public']['Tables']['jobs']['Insert'];

export const dynamic = 'force-dynamic';

// Increase timeout for transcription (Vercel Pro allows up to 300s)
export const maxDuration = 60;

/**
 * POST /api/process/start
 * Start cloud transcription processing for a project using Groq Whisper
 *
 * Groq is fast enough (~1-3 seconds for most files) that we can process
 * synchronously and return the result directly.
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

  // Create job record
  const jobInsert: JobInsert = {
    project_id: projectId,
    user_id: user.id,
    job_type: 'transcription',
    status: 'processing',
    input_file_path: project.original_file_path,
    started_at: new Date().toISOString(),
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

  try {
    const startTime = Date.now();

    // Transcribe using Groq (synchronous - typically 1-3 seconds)
    const groqResult = await transcribeFromUrl(signedUrlData.signedUrl, {
      model: 'whisper-large-v3-turbo',
      language: 'en',
    });

    const processingTime = (Date.now() - startTime) / 1000;
    const processingMinutes = groqResult.duration / 60;

    // Format for bleep editor
    const transcription = formatForBleepEditor(groqResult);

    // Serialize transcription for JSON storage (cast to Json-compatible type)
    const transcriptionJson = JSON.parse(JSON.stringify(transcription));

    // Update job as completed
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        output_data: transcriptionJson,
        processing_minutes: processingMinutes,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    // Update project with transcription
    await supabase
      .from('projects')
      .update({
        status: 'ready',
        transcription: transcriptionJson,
        processing_minutes: processingMinutes,
        duration_seconds: Math.round(groqResult.duration),
      })
      .eq('id', projectId);

    console.log(
      `[Groq] Transcribed ${groqResult.duration.toFixed(1)}s audio in ${processingTime.toFixed(1)}s ` +
        `(${(groqResult.duration / processingTime).toFixed(0)}x real-time)`
    );

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: 'completed',
        processingTime,
      },
      transcription: {
        text: transcription.text,
        wordCount: transcription.words.length,
        duration: groqResult.duration,
        language: groqResult.language,
      },
    });
  } catch (error) {
    console.error('Error transcribing:', error);

    // Mark job as failed
    await supabase
      .from('jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    // Update project status
    await supabase.from('projects').update({ status: 'error' }).eq('id', projectId);

    return NextResponse.json(
      {
        error: 'Failed to transcribe audio',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
