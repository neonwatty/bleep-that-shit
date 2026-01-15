/**
 * Test script for Groq Whisper API
 *
 * Usage:
 *   1. Set GROQ_API_KEY environment variable
 *   2. Run: npx ts-node scripts/test-groq.ts <audio-file-path>
 *
 * Example:
 *   GROQ_API_KEY=your-key npx ts-node scripts/test-groq.ts ./test-audio.mp3
 */

import * as fs from 'fs';
import * as path from 'path';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

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

interface GroqTranscriptionResponse {
  task: string;
  language: string;
  duration: number;
  text: string;
  words?: GroqWord[];
  segments?: GroqSegment[];
}

async function transcribeWithGroq(filePath: string): Promise<GroqTranscriptionResponse> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is required');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  // Create form data
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), fileName);
  formData.append('model', 'whisper-large-v3-turbo'); // Faster and cheaper
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');
  formData.append('language', 'en');
  formData.append('temperature', '0');

  console.log(`\n📁 Transcribing: ${fileName}`);
  console.log(`📊 File size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  const startTime = Date.now();

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  const elapsed = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as GroqTranscriptionResponse;

  console.log(`\n✅ Transcription completed in ${elapsed}ms`);
  console.log(`⏱️  Audio duration: ${result.duration?.toFixed(1)}s`);
  console.log(`🚀 Speed: ${(result.duration / (elapsed / 1000)).toFixed(0)}x real-time`);

  return result;
}

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.log(`
Usage: GROQ_API_KEY=your-key npx ts-node scripts/test-groq.ts <audio-file>

Example:
  GROQ_API_KEY=gsk_xxx npx ts-node scripts/test-groq.ts ./test-audio.mp3

Supported formats: mp3, mp4, wav, m4a, ogg, flac, webm
Max file size: 25MB (free tier), 100MB (dev tier)
`);
    process.exit(1);
  }

  try {
    const result = await transcribeWithGroq(filePath);

    console.log('\n📝 Transcript:');
    console.log('─'.repeat(50));
    console.log(result.text);
    console.log('─'.repeat(50));

    if (result.words && result.words.length > 0) {
      console.log(`\n🔤 Word-level timestamps (first 10 words):`);
      result.words.slice(0, 10).forEach((word, i) => {
        console.log(
          `  ${i + 1}. "${word.word}" [${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s]`
        );
      });
      console.log(`  ... and ${result.words.length - 10} more words`);
    }

    if (result.segments && result.segments.length > 0) {
      console.log(`\n📑 Segments: ${result.segments.length}`);
      console.log(
        `   Avg confidence: ${((result.segments.reduce((sum, s) => sum + Math.exp(s.avg_logprob), 0) / result.segments.length) * 100).toFixed(1)}%`
      );
    }

    // Save full result to file
    const outputPath = filePath.replace(/\.[^/.]+$/, '_groq_result.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Full result saved to: ${outputPath}`);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
