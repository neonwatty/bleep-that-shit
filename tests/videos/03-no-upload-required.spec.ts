/**
 * YouTube Shorts Demo: "No Upload Required" (Privacy Focus)
 *
 * Hook: "Sensitive content? Watch this..."
 * Flow:
 * 1. Show file staying on computer (visual indicator)
 * 2. Open Network tab in DevTools - "0 requests to servers"
 * 3. Quick transcribe + bleep workflow
 * 4. "Your files never leave your device"
 *
 * Note: DevTools overlay would be added in post-production.
 * This script demonstrates the workflow happening locally.
 *
 * Run: npx playwright test tests/videos/03-no-upload-required.spec.ts --project=videos
 */

import { test, demoPause } from './video-setup';
import { join } from 'path';
import { loadTranscript } from '../helpers/transcriptLoader';

const VIDEO_FIXTURE = join(__dirname, '../fixtures/files/bob-ross-15s.mp4');
const VIDEO_TRANSCRIPT = 'bob-ross-15s-video.transcript.json';

test('No Upload Required Demo', async ({ bleepPage, page }) => {
  // === SCENE 1: Navigate to app - show the home page privacy message ===
  await page.goto('/');
  await demoPause(page, 1500);

  // Scroll to show the privacy section on home page
  const privacySection = page.locator('text=100% private');
  if (await privacySection.isVisible()) {
    await privacySection.scrollIntoViewIfNeeded();
    await demoPause(page, 2000);
  }

  // === SCENE 2: Navigate to bleep page ===
  await bleepPage.goto();
  await demoPause(page, 1000);

  // === SCENE 3: Upload file - emphasize it's LOCAL ===
  // Show the file input area
  await bleepPage.fileDropzone.scrollIntoViewIfNeeded();
  await demoPause(page, 1000);

  // Upload the file
  await bleepPage.uploadFile(VIDEO_FIXTURE);
  await page.locator('video').first().waitFor({ state: 'visible' });
  await demoPause(page, 1500);

  // === SCENE 4: Load transcript (simulating local processing) ===
  // In reality, we'd show the transcription running locally
  // For demo speed, we'll use pre-loaded transcript
  await loadTranscript(page, VIDEO_TRANSCRIPT);
  await demoPause(page, 1000);

  // === SCENE 5: Show the transcript is ready - all done locally ===
  await bleepPage.switchToReviewTab();
  await page.locator('.word-wrapper').first().waitFor({ state: 'visible' });
  await demoPause(page, 1500);

  // Quick match some words
  await bleepPage.wordsToMatchInput.fill('happy, little');
  await demoPause(page, 500);
  await bleepPage.runMatchingButton.click();
  await demoPause(page, 1500);

  // === SCENE 6: Apply bleeps - still local! ===
  await bleepPage.switchToBleepTab();
  await demoPause(page, 800);

  await bleepPage.applyBleepsButton.click();

  // Wait for processing (this happens in browser!)
  await page.waitForSelector('a[download]', {
    state: 'visible',
    timeout: 120000,
  });
  await demoPause(page, 1500);

  // === SCENE 7: Show download - file never left the device ===
  const downloadButton = page.getByRole('link', { name: /download/i }).first();
  await downloadButton.scrollIntoViewIfNeeded();
  await demoPause(page, 1500);

  // === SCENE 8: Scroll to show footer with privacy message ===
  await page.locator('footer').scrollIntoViewIfNeeded();
  await demoPause(page, 2000);

  // Final pause - "Your files never leave your device"
  await demoPause(page, 3000);
});
