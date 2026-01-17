import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createClient } from '@/lib/supabase/server';
import { checkUsageLimit, recordUsage } from '@/lib/usage/tracking';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for transcription

/**
 * POST /api/transcribe/cloud
 * Cloud transcription with premium subscription gating and usage tracking.
 *
 * Accepts an audio file and returns transcription with word-level timestamps.
 * Uses Groq's whisper-large-v3-turbo model.
 *
 * Requires:
 * - Authenticated user
 * - Premium subscription (starter, pro, or team tier with active status)
 * - Available usage minutes in current billing period
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required. Please sign in to use cloud transcription.' },
      { status: 401 }
    );
  }

  // Fetch profile to check subscription
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status, subscription_ends_at')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Could not verify subscription status.' }, { status: 500 });
  }

  // Check premium subscription
  const isPremium =
    profile.subscription_tier !== 'free' &&
    profile.subscription_status === 'active' &&
    (!profile.subscription_ends_at || new Date(profile.subscription_ends_at) > new Date());

  if (!isPremium) {
    return NextResponse.json(
      {
        error: 'Premium subscription required for cloud transcription.',
        code: 'PREMIUM_REQUIRED',
      },
      { status: 403 }
    );
  }

  // Check usage limits
  const tier = profile.subscription_tier as 'starter' | 'pro' | 'team';
  const usageCheck = await checkUsageLimit(supabase, user.id, tier);

  if (!usageCheck.allowed) {
    return NextResponse.json(
      {
        error: `You've used all your cloud transcription minutes for this month. ${usageCheck.usedMinutes.toFixed(1)} of ${usageCheck.limitMinutes} minutes used.`,
        code: 'USAGE_LIMIT_EXCEEDED',
        usage: {
          used: usageCheck.usedMinutes,
          limit: usageCheck.limitMinutes,
          remaining: usageCheck.remainingMinutes,
        },
      },
      { status: 429 }
    );
  }

  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    return NextResponse.json(
      { error: 'Cloud transcription is not configured. GROQ_API_KEY is missing.' },
      { status: 500 }
    );
  }

  // Parse the multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const language = (formData.get('language') as string) || 'en';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate file type
  const validTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/webm',
    'audio/mp4',
    'audio/m4a',
  ];
  if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
    return NextResponse.json(
      { error: `Invalid file type: ${file.type}. Supported: MP3, WAV, WebM, M4A` },
      { status: 400 }
    );
  }

  // Check file size (max 25MB for Groq API)
  const maxSize = 25 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'File too large. Maximum size is 25MB.' }, { status: 400 });
  }

  try {
    const groq = new Groq({ apiKey: groqApiKey });

    // Call Groq's Whisper API with word-level timestamps
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: 'whisper-large-v3-turbo',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
      language: language,
    });

    // Transform to the format expected by the frontend
    const words =
      (transcription as unknown as { words?: Array<{ word: string; start: number; end: number }> })
        .words || [];

    // Calculate duration from the last word's end timestamp
    const durationSeconds = words.length > 0 ? words[words.length - 1].end : 0;
    const durationMinutes = durationSeconds / 60;

    // Record usage
    await recordUsage(supabase, user.id, tier, durationMinutes);

    // Get updated usage info
    const updatedUsage = await checkUsageLimit(supabase, user.id, tier);

    const result = {
      text: transcription.text,
      chunks: words.map(word => ({
        text: word.word,
        timestamp: [word.start, word.end] as [number, number],
      })),
      metadata: {
        nullTimestampCount: 0,
        totalChunks: words.length,
        model: 'whisper-large-v3-turbo',
        source: 'cloud',
        durationMinutes: durationMinutes,
      },
    };

    return NextResponse.json({
      success: true,
      result,
      usage: {
        used: updatedUsage.usedMinutes,
        limit: updatedUsage.limitMinutes,
        remaining: updatedUsage.remainingMinutes,
      },
    });
  } catch (error) {
    console.error('Cloud transcription error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    // Handle specific Groq API errors
    if (message.includes('rate_limit')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: `Transcription failed: ${message}` }, { status: 500 });
  }
}
