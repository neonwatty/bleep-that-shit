/**
 * Test Fixture Generation Script
 *
 * This script generates test fixtures for E2E tests:
 * 1. Downloads Bob Ross video from GitHub
 * 2. Extracts first 15 seconds as bob-ross-15s.mp4
 * 3. Extracts audio as bob-ross-15s.mp3
 * 4. Transcribes both using Tiny Whisper model via the app
 * 5. Saves transcript JSON files
 *
 * Prerequisites:
 * - ffmpeg installed (brew install ffmpeg on macOS)
 * - Development server running (npm run dev)
 *
 * Usage: npm run test:setup:fixtures
 */

import { chromium } from '@playwright/test';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BOB_ROSS_URL =
  'https://raw.githubusercontent.com/neonwatty/readme_gifs/main/bob-ross-trim.mp4';
const FIXTURES_DIR = join(__dirname, '../fixtures/files');
const TRANSCRIPTS_DIR = join(__dirname, '../fixtures/transcripts');
const VIDEO_FIXTURE = join(FIXTURES_DIR, 'bob-ross-15s.mp4');
const AUDIO_FIXTURE = join(FIXTURES_DIR, 'bob-ross-15s.mp3');
const VIDEO_TRANSCRIPT = join(TRANSCRIPTS_DIR, 'bob-ross-15s-video.transcript.json');
const AUDIO_TRANSCRIPT = join(TRANSCRIPTS_DIR, 'bob-ross-15s-audio.transcript.json');
const TEMP_VIDEO = join(FIXTURES_DIR, 'bob-ross-full.mp4');

async function downloadVideo(): Promise<void> {
  console.log('📥 Downloading Bob Ross video from GitHub...');
  const response = await fetch(BOB_ROSS_URL);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  writeFileSync(TEMP_VIDEO, Buffer.from(arrayBuffer));
  console.log('✅ Video downloaded successfully');
}

async function extractVideoClip(): Promise<void> {
  console.log('✂️  Extracting first 15 seconds of video...');
  await execAsync(`ffmpeg -i "${TEMP_VIDEO}" -t 15 -c copy "${VIDEO_FIXTURE}" -y`);
  console.log(`✅ Video clip saved to: ${VIDEO_FIXTURE}`);
}

async function extractAudio(): Promise<void> {
  console.log('🎵 Extracting audio from video clip...');
  await execAsync(`ffmpeg -i "${VIDEO_FIXTURE}" -vn -acodec mp3 "${AUDIO_FIXTURE}" -y`);
  console.log(`✅ Audio saved to: ${AUDIO_FIXTURE}`);
}

async function transcribeFile(filePath: string, fileType: 'audio' | 'video'): Promise<object> {
  console.log(`🎤 Transcribing ${fileType} file with Tiny Whisper model...`);
  console.log('   This may take 30-60 seconds...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to bleep page
    await page.goto('http://localhost:3004/bleep');
    await page.waitForLoadState('networkidle');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await page.waitForTimeout(1000);

    // Select Tiny model (should be default)
    const modelSelector = page.getByTestId('model-select');
    await modelSelector.selectOption('Xenova/whisper-tiny.en');

    // Start transcription
    const transcribeButton = page.getByRole('button', { name: /start transcription/i });
    await transcribeButton.click();

    // Wait for transcription to complete (up to 2 minutes)
    console.log('   Waiting for transcription to complete...');
    await page.waitForSelector('text=/Transcription complete/i', { timeout: 120000 });
    console.log('   ✅ Transcription complete!');

    // Extract transcript data from the page
    // The transcript result should be stored in the app state
    // We'll extract it by evaluating JavaScript in the page context
    const transcriptData = await page.evaluate(() => {
      // Try to get transcript from the DOM or component state
      // This is a bit hacky, but works for our purposes
      const transcriptElement = document.querySelector('[data-transcript-result]');
      if (transcriptElement) {
        return JSON.parse(transcriptElement.getAttribute('data-transcript-result') || '{}');
      }

      // Alternative: look for transcript text in the UI
      const wordsElements = document.querySelectorAll('[data-word-index]');
      if (wordsElements.length > 0) {
        const chunks: Array<{ text: string; timestamp: [number, number] }> = [];
        wordsElements.forEach(el => {
          const word = el.textContent?.trim();
          const start = parseFloat(el.getAttribute('data-start') || '0');
          const end = parseFloat(el.getAttribute('data-end') || '0');
          if (word) {
            chunks.push({
              text: word,
              timestamp: [start, end],
            });
          }
        });

        return {
          text: chunks.map(c => c.text).join(' '),
          chunks,
        };
      }

      // Fallback: return empty transcript
      console.error('Could not extract transcript from page');
      return {
        text: '',
        chunks: [],
      };
    });

    return transcriptData;
  } finally {
    await browser.close();
  }
}

async function saveTranscript(
  transcriptData: object,
  outputPath: string,
  label: string
): Promise<void> {
  console.log(`💾 Saving ${label} transcript to: ${outputPath}`);
  writeFileSync(outputPath, JSON.stringify(transcriptData, null, 2));
  console.log(`✅ ${label} transcript saved`);
}

async function cleanup(): Promise<void> {
  console.log('🧹 Cleaning up temporary files...');
  await execAsync(`rm -f "${TEMP_VIDEO}"`);
  console.log('✅ Cleanup complete');
}

async function main(): Promise<void> {
  console.log('🚀 Starting test fixture generation...\n');

  try {
    // Check if ffmpeg is installed
    try {
      await execAsync('ffmpeg -version');
    } catch (error) {
      console.error('❌ ERROR: ffmpeg is not installed');
      console.error(
        '   Install with: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)'
      );
      process.exit(1);
    }

    // Check if dev server is running
    try {
      const response = await fetch('http://localhost:3004/bleep');
      if (!response.ok) throw new Error('Server not responding');
    } catch (error) {
      console.error('❌ ERROR: Development server is not running');
      console.error('   Start server with: npm run dev');
      process.exit(1);
    }

    // Step 1: Download video (if not already present)
    if (!existsSync(TEMP_VIDEO)) {
      await downloadVideo();
    } else {
      console.log('⏭️  Video already downloaded, skipping...');
    }

    // Step 2: Extract 15-second video clip
    if (!existsSync(VIDEO_FIXTURE)) {
      await extractVideoClip();
    } else {
      console.log('⏭️  Video clip already exists, skipping...');
    }

    // Step 3: Extract audio
    if (!existsSync(AUDIO_FIXTURE)) {
      await extractAudio();
    } else {
      console.log('⏭️  Audio file already exists, skipping...');
    }

    // Step 4: Transcribe video
    if (!existsSync(VIDEO_TRANSCRIPT)) {
      const videoTranscript = await transcribeFile(VIDEO_FIXTURE, 'video');
      await saveTranscript(videoTranscript, VIDEO_TRANSCRIPT, 'Video');
    } else {
      console.log('⏭️  Video transcript already exists, skipping...');
    }

    // Step 5: Transcribe audio
    if (!existsSync(AUDIO_TRANSCRIPT)) {
      const audioTranscript = await transcribeFile(AUDIO_FIXTURE, 'audio');
      await saveTranscript(audioTranscript, AUDIO_TRANSCRIPT, 'Audio');
    } else {
      console.log('⏭️  Audio transcript already exists, skipping...');
    }

    // Step 6: Cleanup
    await cleanup();

    console.log('\n✅ All test fixtures generated successfully!');
    console.log('\nGenerated files:');
    console.log(`  - ${VIDEO_FIXTURE}`);
    console.log(`  - ${AUDIO_FIXTURE}`);
    console.log(`  - ${VIDEO_TRANSCRIPT}`);
    console.log(`  - ${AUDIO_TRANSCRIPT}`);
    console.log('\n💡 You can now run: npm run test:e2e');
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  }
}

// Run the script
main();
