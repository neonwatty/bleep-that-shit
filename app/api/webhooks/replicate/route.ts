import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature, parseTranscriptionToWords } from '@/lib/replicate/service';
import type { Database } from '@/types/supabase';

type Job = Database['public']['Tables']['jobs']['Row'];

export const dynamic = 'force-dynamic';

// Use service role client for webhook handling (bypasses RLS)
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey);
}

interface ReplicateWebhookPayload {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: {
    text: string;
    segments: Array<{
      id: number;
      seek: number;
      start: number;
      end: number;
      text: string;
      tokens: number[];
      temperature: number;
      avg_logprob: number;
      compression_ratio: number;
      no_speech_prob: number;
    }>;
    language: string;
  };
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  metrics?: {
    predict_time?: number;
  };
}

/**
 * POST /api/webhooks/replicate
 * Handle webhook callbacks from Replicate when transcription completes
 */
export async function POST(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');

  if (!jobId) {
    console.error('Webhook missing jobId parameter');
    return NextResponse.json({ error: 'Missing jobId parameter' }, { status: 400 });
  }

  // Get raw body for signature verification
  const rawBody = await request.text();

  // Verify webhook signature if secret is configured
  const webhookSecret = process.env.REPLICATE_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = request.headers.get('webhook-signature') || '';
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  // Parse webhook payload
  let payload: ReplicateWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error('Invalid JSON in webhook payload');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log(`[Webhook] Received for job ${jobId}, status: ${payload.status}`);

  const supabase = getServiceClient();

  // Get the job record
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single<Job>();

  if (jobError || !job) {
    console.error('Job not found:', jobId);
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const projectId = job.project_id;

  // Handle different prediction statuses
  if (payload.status === 'succeeded' && payload.output) {
    // Parse transcription into word-level timestamps
    const words = parseTranscriptionToWords(payload.output);

    // Calculate processing minutes from duration
    const processingMinutes = payload.metrics?.predict_time
      ? payload.metrics.predict_time / 60
      : null;

    // Update job as completed
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        output_data: {
          text: payload.output.text,
          segments: payload.output.segments,
          language: payload.output.language,
          words, // Word-level timestamps for bleep editor
        },
        processing_minutes: processingMinutes,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Update project with transcription
    await supabase
      .from('projects')
      .update({
        status: 'ready',
        transcription: {
          text: payload.output.text,
          segments: payload.output.segments,
          language: payload.output.language,
          words,
        },
        processing_minutes: processingMinutes,
      })
      .eq('id', projectId);

    console.log(`[Webhook] Job ${jobId} completed successfully`);

    // TODO: Send notification to user (Phase 5)

    return NextResponse.json({ success: true, status: 'completed' });
  } else if (payload.status === 'failed' || payload.status === 'canceled') {
    // Update job as failed
    await supabase
      .from('jobs')
      .update({
        status: payload.status === 'canceled' ? 'cancelled' : 'failed',
        error_message: payload.error || 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Update project status
    await supabase.from('projects').update({ status: 'error' }).eq('id', projectId);

    console.log(`[Webhook] Job ${jobId} failed: ${payload.error}`);

    return NextResponse.json({ success: true, status: 'failed' });
  }

  // For other statuses (starting, processing), just acknowledge
  return NextResponse.json({ success: true, status: payload.status });
}
