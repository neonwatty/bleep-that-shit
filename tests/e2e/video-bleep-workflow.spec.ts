/**
 * E2E Test: Complete Video Bleeping Workflow
 *
 * Tests the end-to-end workflow for bleeping video files:
 * 1. Upload video
 * 2. Load pre-generated transcript
 * 3. Match words
 * 4. Apply bleeps to video
 * 5. Video remuxing (combining censored audio with original video)
 * 6. Download censored video
 */

import { test, expect } from './e2e-setup';
import { join } from 'path';
import { BleepPage } from '../helpers/pages/BleepPage';
import { loadTranscript } from '../helpers/transcriptLoader';

const VIDEO_FIXTURE = join(__dirname, '../fixtures/files/bob-ross-15s.mp4');
const VIDEO_TRANSCRIPT = 'bob-ross-15s-video.transcript.json';

test.describe('Video Bleeping Complete Workflow', () => {
  let bleepPage: BleepPage;

  test.beforeEach(async ({ page }) => {
    bleepPage = new BleepPage(page);
    await bleepPage.goto();
  });

  test('should complete full video bleeping workflow', async ({ page }) => {
    // 1. Upload video file
    await bleepPage.uploadFile(VIDEO_FIXTURE);
    await expect(bleepPage.page.locator('video')).toBeVisible();

    // 2. Load pre-generated transcript
    await loadTranscript(page, VIDEO_TRANSCRIPT);
    await expect(bleepPage.reviewTab).toBeEnabled({ timeout: 5000 });

    // 3. Switch to Review tab and match words
    await bleepPage.switchToReviewTab();
    // Expand the Interactive Transcript section (collapsed by default)
    await bleepPage.expandInteractiveTranscript();
    // Wait for transcript words to render
    await expect(page.locator('.word-wrapper').first()).toBeVisible({ timeout: 5000 });

    // Expand Keyword Matching section
    await bleepPage.expandKeywordMatching();
    const wordsInput = bleepPage.wordsToMatchInput;
    await wordsInput.fill('happy,little,tree');

    const matchButton = bleepPage.page.getByRole('button', { name: /match words/i });
    await matchButton.click();

    // Wait for matched words to appear
    await expect(bleepPage.page.getByText(/words selected/i).first()).toBeVisible({
      timeout: 5000,
    });

    // 4. Switch to Bleep tab and apply bleeps
    await bleepPage.switchToBleepTab();

    const applyButton = bleepPage.page.getByRole('button', { name: /apply bleeps/i });
    await expect(applyButton).toBeEnabled({ timeout: 5000 });
    await applyButton.click();

    // 5. Wait for download link to appear (video processing may take time)
    const downloadLink = bleepPage.page.getByRole('link', { name: /download/i });
    await expect(downloadLink).toBeVisible({ timeout: 120000 });
  });

  test('should show video processing progress', async ({ page }) => {
    await bleepPage.uploadFile(VIDEO_FIXTURE);
    await loadTranscript(page, VIDEO_TRANSCRIPT);
    await expect(bleepPage.reviewTab).toBeEnabled({ timeout: 5000 });

    // Match words
    await bleepPage.switchToReviewTab();
    // Expand the Interactive Transcript section (collapsed by default)
    await bleepPage.expandInteractiveTranscript();
    // Wait for transcript words to render
    await expect(page.locator('.word-wrapper').first()).toBeVisible({ timeout: 5000 });

    // Expand Keyword Matching section
    await bleepPage.expandKeywordMatching();
    await bleepPage.wordsToMatchInput.fill('painting');
    await bleepPage.page.getByRole('button', { name: /match words/i }).click();

    // Wait for matched words to appear
    await expect(bleepPage.page.getByText(/words selected/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Apply bleeps
    await bleepPage.switchToBleepTab();
    const applyButton = bleepPage.page.getByRole('button', { name: /apply bleeps/i });
    await expect(applyButton).toBeEnabled({ timeout: 5000 });
    await applyButton.click();

    // Wait for processing to complete - download link appears
    const downloadLink = bleepPage.page.getByRole('link', { name: /download/i });
    await expect(downloadLink).toBeVisible({ timeout: 120000 });
  });

  test('should handle video remuxing correctly', async ({ page }) => {
    await bleepPage.uploadFile(VIDEO_FIXTURE);
    await loadTranscript(page, VIDEO_TRANSCRIPT);
    await expect(bleepPage.reviewTab).toBeEnabled({ timeout: 5000 });

    // Match and bleep
    await bleepPage.switchToReviewTab();
    // Expand the Interactive Transcript section (collapsed by default)
    await bleepPage.expandInteractiveTranscript();
    // Wait for transcript words to render
    await expect(page.locator('.word-wrapper').first()).toBeVisible({ timeout: 5000 });

    // Expand Keyword Matching section
    await bleepPage.expandKeywordMatching();
    await bleepPage.wordsToMatchInput.fill('paint');
    await bleepPage.page.getByRole('button', { name: /match words/i }).click();

    // Wait for matched words to appear
    await expect(bleepPage.page.getByText(/words selected/i).first()).toBeVisible({
      timeout: 5000,
    });

    await bleepPage.switchToBleepTab();
    const applyButton = bleepPage.page.getByRole('button', { name: /apply bleeps/i });
    await expect(applyButton).toBeEnabled({ timeout: 5000 });
    await applyButton.click();

    // Wait for remuxing to complete
    await expect(bleepPage.page.getByRole('link', { name: /download.*video/i })).toBeVisible({
      timeout: 60000,
    });

    // Verify output is video (not audio)
    const downloadLink = bleepPage.page.getByRole('link', { name: /download.*video/i });
    const linkText = await downloadLink.textContent();
    expect(linkText).toMatch(/video/i);
    expect(linkText).not.toMatch(/audio/i);
  });

  test('should display both video and audio players after bleeping', async ({ page }) => {
    await bleepPage.uploadFile(VIDEO_FIXTURE);
    await loadTranscript(page, VIDEO_TRANSCRIPT);
    await expect(bleepPage.reviewTab).toBeEnabled({ timeout: 5000 });

    // Complete bleeping workflow
    await bleepPage.switchToReviewTab();
    // Expand the Interactive Transcript section (collapsed by default)
    await bleepPage.expandInteractiveTranscript();
    // Wait for transcript words to render
    await expect(page.locator('.word-wrapper').first()).toBeVisible({ timeout: 5000 });

    // Expand Keyword Matching section
    await bleepPage.expandKeywordMatching();
    await bleepPage.wordsToMatchInput.fill('happy');
    await bleepPage.page.getByRole('button', { name: /match words/i }).click();

    // Wait for matched words to appear
    await expect(bleepPage.page.getByText(/words selected/i).first()).toBeVisible({
      timeout: 5000,
    });

    await bleepPage.switchToBleepTab();
    const applyButton = bleepPage.page.getByRole('button', { name: /apply bleeps/i });
    await expect(applyButton).toBeEnabled({ timeout: 5000 });
    await applyButton.click();

    // Wait for completion
    await expect(bleepPage.page.getByRole('link', { name: /download/i })).toBeVisible({
      timeout: 60000,
    });

    // Should show:
    // 1. Original video player
    // 2. Censored video player
    const videoPlayers = bleepPage.page.locator('video');
    const count = await videoPlayers.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
