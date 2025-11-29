/**
 * YouTube Shorts Demo: "3 Ways to Censor"
 *
 * Hook: "Pick your weapon..."
 * Flow:
 * 1. Upload video and transcribe
 * 2. Demo Exact Match - finds exact word
 * 3. Demo Partial Match - finds substrings
 * 4. Demo Fuzzy Match - catches variations
 *
 * Run: npx playwright test tests/videos/02-three-ways-to-censor.spec.ts --project=videos
 */

import { test, demoPause } from './video-setup';
import { join } from 'path';
import { loadTranscript } from '../helpers/transcriptLoader';

const VIDEO_FIXTURE = join(__dirname, '../fixtures/files/bob-ross-15s.mp4');
const VIDEO_TRANSCRIPT = 'bob-ross-15s-video.transcript.json';

test('Three Ways to Censor Demo', async ({ bleepPage, page }) => {
  // === SCENE 1: Navigate and upload ===
  await bleepPage.goto();
  await demoPause(page, 1000);

  await bleepPage.uploadFile(VIDEO_FIXTURE);
  await page.locator('video').first().waitFor({ state: 'visible' });
  await demoPause(page, 1500);

  // Load pre-generated transcript for speed (this is a demo!)
  await loadTranscript(page, VIDEO_TRANSCRIPT);
  await demoPause(page, 1000);

  // === SCENE 2: Switch to Review tab ===
  await bleepPage.switchToReviewTab();
  await demoPause(page, 1000);

  // Wait for transcript words to render
  await page.locator('.word-wrapper').first().waitFor({ state: 'visible' });
  await demoPause(page, 1000);

  // === SCENE 3: Demo EXACT MATCH ===
  // Clear any existing input
  await bleepPage.wordsToMatchInput.clear();
  await demoPause(page, 300);

  // Type "happy" for exact match
  await bleepPage.wordsToMatchInput.fill('happy');
  await demoPause(page, 800);

  // Ensure only exact match is checked
  await bleepPage.setMatchMode({ exact: true, partial: false, fuzzy: false });
  await demoPause(page, 500);

  // Run matching
  await bleepPage.runMatchingButton.click();
  await demoPause(page, 1500);

  // Show the result
  await demoPause(page, 2000);

  // === SCENE 4: Demo PARTIAL MATCH ===
  // Clear and try partial match
  await bleepPage.wordsToMatchInput.clear();
  await bleepPage.wordsToMatchInput.fill('paint');
  await demoPause(page, 800);

  // Enable partial match
  await bleepPage.setMatchMode({ exact: false, partial: true, fuzzy: false });
  await demoPause(page, 500);

  // Run matching - should catch "paint", "painting", "paintings" etc.
  await bleepPage.runMatchingButton.click();
  await demoPause(page, 1500);

  // Show the expanded results
  await demoPause(page, 2000);

  // === SCENE 5: Demo FUZZY MATCH ===
  // Clear and try fuzzy match
  await bleepPage.wordsToMatchInput.clear();
  await bleepPage.wordsToMatchInput.fill('litle'); // Intentional misspelling!
  await demoPause(page, 800);

  // Enable fuzzy match
  await bleepPage.setMatchMode({ exact: false, partial: false, fuzzy: true });
  await demoPause(page, 500);

  // Show fuzzy distance slider
  await bleepPage.fuzzyDistanceSlider.scrollIntoViewIfNeeded();
  await demoPause(page, 500);

  // Run matching - should catch "little" despite misspelling
  await bleepPage.runMatchingButton.click();
  await demoPause(page, 1500);

  // Show that it caught "little" even with the typo
  await demoPause(page, 2500);

  // === SCENE 6: Finale - show all three modes can work together ===
  await bleepPage.wordsToMatchInput.clear();
  await bleepPage.wordsToMatchInput.fill('happy, paint, tree');
  await demoPause(page, 800);

  // Enable all three modes
  await bleepPage.setMatchMode({ exact: true, partial: true, fuzzy: true });
  await demoPause(page, 1000);

  await bleepPage.runMatchingButton.click();
  await demoPause(page, 2000);

  // End on the comprehensive result
  await demoPause(page, 3000);
});
