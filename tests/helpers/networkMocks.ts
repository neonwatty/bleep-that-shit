import { Page } from '@playwright/test';

/**
 * Sets up network mocks for CI environments to avoid downloading
 * heavy ML model dependencies.
 *
 * Tests should use loadTranscript() to inject pre-generated transcripts
 * instead of running real transcription.
 *
 * Note: FFmpeg WASM is NOT blocked because it's needed for applying bleeps.
 * FFmpeg is only ~10MB and downloads quickly, unlike ML models (~200MB).
 */
export async function setupNetworkMocks(page: Page) {
  // Block Hugging Face model downloads - we'll inject transcripts instead
  await page.route('**/huggingface.co/**', route => {
    route.fulfill({ status: 200, body: '' });
  });

  // Block cdn-lfs.huggingface.co (model weights)
  await page.route('**/cdn-lfs.huggingface.co/**', route => {
    route.fulfill({ status: 200, body: '' });
  });

  // Note: FFmpeg WASM is allowed to load - it's needed for audio/video processing
  // and is much smaller (~10MB) than ML models (~200MB)
}
