/**
 * YouTube Shorts Demo: "Speed Run: Upload to Download"
 *
 * Hook: "How fast can we bleep a video?"
 * Flow:
 * 1. Timer on screen (added in post-processing)
 * 2. Upload -> Select model -> Transcribe
 * 3. Apply word list -> Bleep -> Download
 * 4. Show total time
 *
 * Note: This demo moves FAST to show speed. Timer overlay added in post.
 *
 * Run: npx playwright test tests/videos/05-speed-run.spec.ts --project=videos
 */

import { test, demoPause } from './video-setup';
import { join } from 'path';

const VIDEO_FIXTURE = join(__dirname, '../fixtures/files/bob-ross-15s.mp4');

test('Speed Run Demo', async ({ bleepPage, page }) => {
  // === START: Navigate to app ===
  await bleepPage.goto();
  await demoPause(page, 800);

  // === STEP 1: Upload file (FAST) ===
  await bleepPage.uploadFile(VIDEO_FIXTURE);
  await page.locator('video').first().waitFor({ state: 'visible' });
  await demoPause(page, 500);

  // === STEP 2: Quick model selection ===
  // Use Tiny model for fastest transcription
  await bleepPage.selectModel('Xenova/whisper-tiny.en');
  await demoPause(page, 300);

  // === STEP 3: Transcribe ===
  await bleepPage.transcribeButton.click();

  // Wait for transcription (this is the main wait)
  await page.waitForSelector('[data-testid="transcript-result"]', {
    state: 'visible',
    timeout: 180000,
  });
  await demoPause(page, 500);

  // === STEP 4: Quick word matching ===
  await bleepPage.switchToReviewTab();
  await page.locator('.word-wrapper').first().waitFor({ state: 'visible' });
  await demoPause(page, 300);

  // Fast fill common words
  await bleepPage.wordsToMatchInput.fill('happy, little, tree, paint');
  await demoPause(page, 300);

  await bleepPage.runMatchingButton.click();
  await page.waitForSelector('[data-testid="matched-word-chip"]', {
    state: 'visible',
    timeout: 5000,
  });
  await demoPause(page, 500);

  // === STEP 5: Apply bleeps ===
  await bleepPage.switchToBleepTab();
  await demoPause(page, 300);

  await bleepPage.applyBleepsButton.click();

  // Wait for processing
  await page.waitForSelector('a[download]', {
    state: 'visible',
    timeout: 120000,
  });
  await demoPause(page, 500);

  // === FINISH: Show download ready ===
  const downloadButton = page.getByRole('link', { name: /download/i }).first();
  await downloadButton.scrollIntoViewIfNeeded();

  // Highlight the download button (timer stops here in post)
  await demoPause(page, 2000);

  // Victory pause
  await demoPause(page, 2000);
});
