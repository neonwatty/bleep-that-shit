// Supabase Edge Function: Process Transcription Jobs
// Reads from PGMQ queue, calls Groq API, updates job status

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

interface QueueMessage {
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  vt: string;
  message: {
    job_id: string;
    project_id: string;
    signed_url: string;
  };
}

interface GroqWord {
  word: string;
  start: number;
  end: number;
}

interface GroqSegment {
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
}

interface GroqTranscriptionResult {
  task: string;
  language: string;
  duration: number;
  text: string;
  words?: GroqWord[];
  segments?: GroqSegment[];
}

// Convert Groq output to bleep editor format (TranscriptChunk[])
function formatForBleepEditor(result: GroqTranscriptionResult) {
  // Convert Groq words to TranscriptChunk format expected by the app
  // App expects: { text: string, timestamp: [start, end] }
  const chunks = (result.words || []).map((word) => ({
    text: word.word.trim(),
    timestamp: [word.start, word.end] as [number, number],
  }));

  return {
    text: result.text,
    chunks, // TranscriptChunk[] format for the bleep editor
    words: (result.words || []).map((word) => ({
      word: word.word.trim(),
      start: word.start,
      end: word.end,
      confidence: 0.95,
    })),
    segments: result.segments || [],
    language: result.language,
    duration: result.duration,
  };
}

async function transcribeWithGroq(
  audioUrl: string,
  groqApiKey: string
): Promise<GroqTranscriptionResult> {
  const formData = new FormData();

  formData.append('url', audioUrl);
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');
  formData.append('temperature', '0');
  formData.append('language', 'en');

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Groq API error (${response.status})`;

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch {
      errorMessage = `${errorMessage}: ${errorText}`;
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as GroqTranscriptionResult;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const groqApiKey = Deno.env.get('GROQ_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!groqApiKey) {
      throw new Error('Missing GROQ_API_KEY');
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read messages from the queue (visibility timeout: 5 minutes = 300 seconds)
    const { data: messages, error: readError } = await supabase.rpc('pgmq_read', {
      queue_name: 'transcription_jobs',
      vt: 300, // 5 minute visibility timeout
      qty: 1, // Process one at a time
    });

    if (readError) {
      console.error('Error reading from queue:', readError);
      throw readError;
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ message: 'No jobs in queue' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const queueMsg = messages[0] as QueueMessage;
    const { job_id, project_id, signed_url } = queueMsg.message;

    console.log(`Processing job ${job_id} for project ${project_id}`);

    // Update job status to processing
    await supabase
      .from('jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        queue_msg_id: queueMsg.msg_id.toString(),
      })
      .eq('id', job_id);

    try {
      const startTime = Date.now();

      // Call Groq API
      const groqResult = await transcribeWithGroq(signed_url, groqApiKey);

      const processingTime = (Date.now() - startTime) / 1000;
      const processingMinutes = groqResult.duration / 60;

      // Format for bleep editor
      const transcription = formatForBleepEditor(groqResult);

      // Update job as completed
      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          output_data: transcription,
          processing_minutes: processingMinutes,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job_id);

      // Update project with transcription
      await supabase
        .from('projects')
        .update({
          status: 'ready',
          transcription: transcription,
          processing_minutes: processingMinutes,
          duration_seconds: Math.round(groqResult.duration),
        })
        .eq('id', project_id);

      // Delete message from queue (successful processing)
      await supabase.rpc('pgmq_delete', {
        queue_name: 'transcription_jobs',
        msg_id: queueMsg.msg_id,
      });

      console.log(
        `Job ${job_id} completed: ${groqResult.duration.toFixed(1)}s audio in ${processingTime.toFixed(1)}s`
      );

      return new Response(
        JSON.stringify({
          success: true,
          job_id,
          duration: groqResult.duration,
          processing_time: processingTime,
          word_count: transcription.words.length,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (processingError) {
      console.error(`Job ${job_id} failed:`, processingError);

      // Increment retry count
      const { data: job } = await supabase
        .from('jobs')
        .select('retry_count')
        .eq('id', job_id)
        .single();

      const retryCount = (job?.retry_count || 0) + 1;
      const maxRetries = 3;

      if (retryCount >= maxRetries) {
        // Max retries reached - mark as failed and delete from queue
        await supabase
          .from('jobs')
          .update({
            status: 'failed',
            error_message:
              processingError instanceof Error ? processingError.message : 'Unknown error',
            retry_count: retryCount,
            completed_at: new Date().toISOString(),
          })
          .eq('id', job_id);

        await supabase.from('projects').update({ status: 'error' }).eq('id', project_id);

        // Archive the message (remove from queue but keep record)
        await supabase.rpc('pgmq_archive', {
          queue_name: 'transcription_jobs',
          msg_id: queueMsg.msg_id,
        });

        console.log(`Job ${job_id} permanently failed after ${maxRetries} retries`);
      } else {
        // Update retry count - message will become visible again after VT expires
        await supabase
          .from('jobs')
          .update({
            status: 'pending',
            retry_count: retryCount,
            error_message: `Retry ${retryCount}/${maxRetries}: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`,
          })
          .eq('id', job_id);

        console.log(`Job ${job_id} will retry (attempt ${retryCount + 1}/${maxRetries})`);
      }

      throw processingError;
    }
  } catch (error) {
    console.error('Edge function error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
