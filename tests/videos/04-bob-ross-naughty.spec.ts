/**
 * YouTube Shorts Demo: "Making Bob Ross Naughty"
 *
 * Hook: "What if Bob Ross was... less wholesome?"
 * Flow:
 * 1. Load the sample Bob Ross video (built into app!)
 * 2. Transcribe
 * 3. Censor innocent words: "happy", "trees", "little"
 * 4. Playback sounds hilariously censored
 * 5. "Mode activated"
 *
 * Run: npx playwright test tests/videos/04-bob-ross-naughty.spec.ts --project=videos
 */

import { test, demoPause } from './video-setup';
import { join } from 'path';

// Use local fixture for faster loading in demo
const VIDEO_FIXTURE = join(__dirname, '../fixtures/files/bob-ross-15s.mp4');

test('Bob Ross Naughty Demo', async ({ bleepPage, page }) => {
  // === SCENE 1: Navigate to app ===
  await bleepPage.goto();
  await demoPause(page, 1500);

  // === SCENE 2: Upload the Bob Ross video ===
  await bleepPage.uploadFile(VIDEO_FIXTURE);

  // Wait for video player to appear
  await page.locator('video').first().waitFor({ state: 'visible' });
  await demoPause(page, 2000);

  // === SCENE 3: Configure and start transcription ===
  // Select English language (should be default)
  await bleepPage.selectLanguage('en');
  await demoPause(page, 500);

  // Select Base model (recommended)
  await bleepPage.selectModel('Xenova/whisper-base.en');
  await demoPause(page, 500);

  // Click transcribe button
  await bleepPage.transcribeButton.click();
  await demoPause(page, 1000);

  // Wait for transcription to complete (this is the real deal!)
  // Show the progress happening
  await page.waitForSelector('[data-testid="transcript-result"]', {
    state: 'visible',
    timeout: 180000, // 3 minutes max for transcription
  });
  await demoPause(page, 2000);

  // === SCENE 4: Switch to Review tab and match innocent words ===
  await bleepPage.switchToReviewTab();
  await demoPause(page, 1000);

  // Type the innocent words to censor
  const innocentWords = 'happy, little, tree, paint, beautiful';
  await bleepPage.wordsToMatchInput.click();
  await demoPause(page, 300);

  // Type slowly for visual effect
  for (const char of innocentWords) {
    await bleepPage.wordsToMatchInput.press(char);
    await page.waitForTimeout(50); // Typing animation
  }
  await demoPause(page, 1000);

  // Enable exact match (should be default)
  await bleepPage.setMatchMode({ exact: true });
  await demoPause(page, 500);

  // Click match button
  await bleepPage.runMatchingButton.click();
  await demoPause(page, 1500);

  // Show the matched words appearing
  await page.waitForSelector('[data-testid="matched-word-chip"]', {
    state: 'visible',
    timeout: 5000,
  });
  await demoPause(page, 2000);

  // === SCENE 5: Switch to Bleep tab and apply bleeps ===
  await bleepPage.switchToBleepTab();
  await demoPause(page, 1000);

  // Show bleep settings briefly
  await demoPause(page, 1000);

  // Click Apply Bleeps
  await bleepPage.applyBleepsButton.click();
  await demoPause(page, 1000);

  // Wait for processing to complete
  await page.waitForSelector('a[download]', {
    state: 'visible',
    timeout: 120000, // 2 minutes for video processing
  });
  await demoPause(page, 1500);

  // === SCENE 6: Play the censored result ===
  // Find the censored video player and play it
  const censoredVideo = page.locator('video').last();
  await censoredVideo.scrollIntoViewIfNeeded();
  await demoPause(page, 500);

  // Click play on the censored video
  await censoredVideo.click();
  await demoPause(page, 500);

  // Let it play for the satisfying bleep sounds
  await page.waitForTimeout(8000);

  // === SCENE 7: Show the download button (finale) ===
  const downloadButton = page.getByRole('link', { name: /download/i }).first();
  await downloadButton.scrollIntoViewIfNeeded();
  await demoPause(page, 2000);

  // End with a pause on the result
  await demoPause(page, 2000);
});
