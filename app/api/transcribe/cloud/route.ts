import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for transcription

/**
 * POST /api/transcribe/cloud
 * Direct cloud transcription without authentication (for the /bleep page)
 *
 * Accepts an audio file and returns transcription with word-level timestamps.
 * Uses Groq's whisper-large-v3-turbo model.
 */
export async function POST(request: NextRequest) {
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
  const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/m4a'];
  if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
    return NextResponse.json(
      { error: `Invalid file type: ${file.type}. Supported: MP3, WAV, WebM, M4A` },
      { status: 400 }
    );
  }

  // Check file size (max 25MB for Groq API)
  const maxSize = 25 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 25MB.' },
      { status: 400 }
    );
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
    const words = (transcription as unknown as { words?: Array<{ word: string; start: number; end: number }> }).words || [];

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
      },
    };

    return NextResponse.json({ success: true, result });
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

    return NextResponse.json(
      { error: `Transcription failed: ${message}` },
      { status: 500 }
    );
  }
}
