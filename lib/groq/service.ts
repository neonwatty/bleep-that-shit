/**
 * Groq Speech-to-Text Service
 *
 * Uses Groq's Whisper API for fast, accurate transcription.
 * API docs: https://console.groq.com/docs/speech-to-text
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

// Available models - turbo is faster and cheaper, large-v3 is more accurate
export type GroqWhisperModel = 'whisper-large-v3-turbo' | 'whisper-large-v3';

export interface GroqWord {
  word: string;
  start: number;
  end: number;
}

export interface GroqSegment {
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

export interface GroqTranscriptionResult {
  task: string;
  language: string;
  duration: number;
  text: string;
  words?: GroqWord[];
  segments?: GroqSegment[];
}

export interface TranscriptionOptions {
  /** Model to use (default: whisper-large-v3-turbo) */
  model?: GroqWhisperModel;
  /** Language code in ISO-639-1 format (e.g., 'en') - improves accuracy */
  language?: string;
  /** Prompt to guide transcription style (max 224 tokens) */
  prompt?: string;
  /** Temperature for sampling (0-1, default: 0) */
  temperature?: number;
}

/**
 * Transcribe audio using Groq's Whisper API
 *
 * @param audioBuffer - Audio file as Buffer or ArrayBuffer
 * @param fileName - Original filename (used for MIME type detection)
 * @param options - Transcription options
 * @returns Transcription result with word-level timestamps
 */
export async function transcribeAudio(
  audioBuffer: Buffer | ArrayBuffer,
  fileName: string,
  options: TranscriptionOptions = {}
): Promise<GroqTranscriptionResult> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is required');
  }

  const { model = 'whisper-large-v3-turbo', language = 'en', prompt, temperature = 0 } = options;

  // Create form data for multipart upload
  const formData = new FormData();

  // Convert to Blob for upload - handle both Buffer and ArrayBuffer
  // Use Array.from to create a plain array that works with Blob
  const bytes =
    audioBuffer instanceof ArrayBuffer
      ? new Uint8Array(audioBuffer)
      : new Uint8Array(Array.from(audioBuffer));
  const blob = new Blob([bytes]);

  formData.append('file', blob, fileName);
  formData.append('model', model);
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');
  formData.append('temperature', temperature.toString());

  if (language) {
    formData.append('language', language);
  }

  if (prompt) {
    formData.append('prompt', prompt);
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
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

  const result = (await response.json()) as GroqTranscriptionResult;
  return result;
}

/**
 * Transcribe audio from a URL using Groq's Whisper API
 *
 * @param audioUrl - URL to the audio file
 * @param options - Transcription options
 * @returns Transcription result with word-level timestamps
 */
export async function transcribeFromUrl(
  audioUrl: string,
  options: TranscriptionOptions = {}
): Promise<GroqTranscriptionResult> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is required');
  }

  const { model = 'whisper-large-v3-turbo', language = 'en', prompt, temperature = 0 } = options;

  // Create form data
  const formData = new FormData();

  formData.append('url', audioUrl);
  formData.append('model', model);
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');
  formData.append('temperature', temperature.toString());

  if (language) {
    formData.append('language', language);
  }

  if (prompt) {
    formData.append('prompt', prompt);
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
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

  const result = (await response.json()) as GroqTranscriptionResult;
  return result;
}

/**
 * Convert Groq transcription result to the format expected by the bleep editor
 */
export function formatForBleepEditor(result: GroqTranscriptionResult): {
  text: string;
  words: Array<{ word: string; start: number; end: number; confidence: number }>;
  segments: GroqSegment[];
  language: string;
  duration: number;
} {
  // Convert words with confidence scores
  const words = (result.words || []).map(word => ({
    word: word.word.trim(),
    start: word.start,
    end: word.end,
    // Groq doesn't provide per-word confidence, estimate from segment avg_logprob
    confidence: 0.95, // Default high confidence for Whisper
  }));

  return {
    text: result.text,
    words,
    segments: result.segments || [],
    language: result.language,
    duration: result.duration,
  };
}

/**
 * Get estimated cost for transcription
 * Based on Groq pricing: https://console.groq.com/docs/speech-to-text
 */
export function estimateCost(
  durationSeconds: number,
  model: GroqWhisperModel = 'whisper-large-v3-turbo'
): number {
  const hourlyRates: Record<GroqWhisperModel, number> = {
    'whisper-large-v3-turbo': 0.04, // $0.04/hour
    'whisper-large-v3': 0.111, // $0.111/hour
  };

  const hours = durationSeconds / 3600;
  return hours * hourlyRates[model];
}
