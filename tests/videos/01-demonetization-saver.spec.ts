/**
 * YouTube Shorts Demo: "The Demonetization Saver"
 *
 * Hook: "YouTube flagged my video for ONE word..."
 * Flow:
 * 1. Show demonetization scenario (implied in hook)
 * 2. Upload video to Bleep That Sh*t
 * 3. Auto-transcribe -> click the offending word
 * 4. Apply bleep -> download
 * 5. "Back to monetized!" (end screen)
 *
 * Run: npx playwright test tests/videos/01-demonetization-saver.spec.ts --project=videos
 */

import { test, demoPause } from './video-setup';
import { join } from 'path';
import { loadTranscript } from '../helpers/transcriptLoader';

const VIDEO_FIXTURE = join(__dirname, '../fixtures/files/bob-ross-15s.mp4');
const VIDEO_TRANSCRIPT = 'bob-ross-15s-video.transcript.json';

test('Demonetization Saver Demo', async ({ bleepPage, page }) => {
  // === SCENE 1: Navigate to the app ===
  await bleepPage.goto();
  await demoPause(page, 1500);

  // === SCENE 2: Upload the "problem" video ===
  await bleepPage.uploadFile(VIDEO_FIXTURE);
  await page.locator('video').first().waitFor({ state: 'visible' });
  await demoPause(page, 2000);

  // === SCENE 3: Quick transcription ===
  // Use pre-loaded transcript for demo speed
  await loadTranscript(page, VIDEO_TRANSCRIPT);
  await demoPause(page, 1500);

  // === SCENE 4: Find and click the "offending" word ===
  await bleepPage.switchToReviewTab();
  await demoPause(page, 1000);

  // Wait for transcript words to render
  await page.locator('.word-wrapper').first().waitFor({ state: 'visible' });
  await demoPause(page, 1000);

  // Scroll to show the transcript
  await page.locator('.word-wrapper').first().scrollIntoViewIfNeeded();
  await demoPause(page, 500);

  // Click on a specific word to censor (simulate finding "the word")
  // We'll click on "happy" as if it's the problem word
  const targetWord = page
    .locator('.word-wrapper')
    .filter({ hasText: /^happy$/i })
    .first();

  if (await targetWord.isVisible()) {
    // Dramatic pause before clicking
    await demoPause(page, 800);

    // Click to select the word
    await targetWord.click();
    await demoPause(page, 1000);

    // Show it's selected
    await demoPause(page, 1500);
  } else {
    // Fallback: use the input method
    await bleepPage.wordsToMatchInput.fill('happy');
    await demoPause(page, 500);
    await bleepPage.runMatchingButton.click();
    await demoPause(page, 1500);
  }

  // === SCENE 5: Apply the bleep ===
  await bleepPage.switchToBleepTab();
  await demoPause(page, 1000);

  // Show that just ONE word is being bleeped
  await demoPause(page, 1000);

  // Click Apply Bleeps
  await bleepPage.applyBleepsButton.click();
  await demoPause(page, 500);

  // Wait for processing
  await page.waitForSelector('a[download]', {
    state: 'visible',
    timeout: 120000,
  });
  await demoPause(page, 1500);

  // === SCENE 6: Show the clean result ===
  // Play the censored video briefly
  const censoredVideo = page.locator('video').last();
  await censoredVideo.scrollIntoViewIfNeeded();
  await demoPause(page, 500);
  await censoredVideo.click();
  await page.waitForTimeout(4000);

  // === SCENE 7: Show download button (victory!) ===
  const downloadButton = page.getByRole('link', { name: /download/i }).first();
  await downloadButton.scrollIntoViewIfNeeded();
  await demoPause(page, 2000);

  // End card pause - "Back to monetized!"
  await demoPause(page, 3000);
});
