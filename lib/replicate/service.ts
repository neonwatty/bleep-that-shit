import Replicate from 'replicate';

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Whisper model for transcription
const WHISPER_MODEL =
  'openai/whisper:4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2';

export interface TranscriptionSegment {
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

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
}

export interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: TranscriptionResult;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  urls: {
    get: string;
    cancel: string;
  };
}

/**
 * Start a transcription job on Replicate
 * Uses async mode with webhook for completion notification
 */
export async function startTranscription(
  audioUrl: string,
  webhookUrl: string,
  projectId: string
): Promise<ReplicatePrediction> {
  const prediction = await replicate.predictions.create({
    version: WHISPER_MODEL.split(':')[1],
    input: {
      audio: audioUrl,
      model: 'large-v3',
      language: 'en',
      translate: false,
      temperature: 0,
      transcription: 'plain text',
      suppress_tokens: '-1',
      logprob_threshold: -1,
      no_speech_threshold: 0.6,
      condition_on_previous_text: true,
      compression_ratio_threshold: 2.4,
      temperature_increment_on_fallback: 0.2,
    },
    webhook: webhookUrl,
    webhook_events_filter: ['completed'],
  });

  return prediction as ReplicatePrediction;
}

/**
 * Get the status of a prediction
 */
export async function getPredictionStatus(predictionId: string): Promise<ReplicatePrediction> {
  const prediction = await replicate.predictions.get(predictionId);
  return prediction as ReplicatePrediction;
}

/**
 * Cancel a running prediction
 */
export async function cancelPrediction(predictionId: string): Promise<void> {
  await replicate.predictions.cancel(predictionId);
}

/**
 * Verify webhook signature from Replicate
 * Replicate uses HMAC-SHA256 with the webhook signing secret
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(`sha256=${expectedSignature}`)
    );
  } catch {
    return false;
  }
}

/**
 * Parse transcription output into word-level timestamps
 * Converts Whisper segments into format compatible with bleep editor
 */
export function parseTranscriptionToWords(result: TranscriptionResult): Array<{
  word: string;
  start: number;
  end: number;
  confidence: number;
}> {
  const words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }> = [];

  for (const segment of result.segments) {
    // Split segment text into words and estimate timing
    const segmentWords = segment.text.trim().split(/\s+/);
    const segmentDuration = segment.end - segment.start;
    const wordDuration = segmentDuration / segmentWords.length;

    segmentWords.forEach((word, index) => {
      const wordStart = segment.start + index * wordDuration;
      const wordEnd = wordStart + wordDuration;

      words.push({
        word: word.replace(/[^\w'-]/g, ''), // Clean punctuation but keep apostrophes/hyphens
        start: wordStart,
        end: wordEnd,
        confidence: Math.exp(segment.avg_logprob), // Convert log prob to confidence
      });
    });
  }

  return words.filter(w => w.word.length > 0);
}
