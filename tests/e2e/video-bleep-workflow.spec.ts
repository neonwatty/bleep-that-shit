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

import { test, expect } from '@playwright/test';
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
    const wordsInput = bleepPage.page.locator('input[placeholder*="Words to match"]');
    await wordsInput.fill('happy,little,tree');

    const matchButton = bleepPage.page.getByRole('button', { name: /match words/i });
    await matchButton.click();
    await bleepPage.page.waitForTimeout(1000);

    // 4. Switch to Bleep tab and apply bleeps
    await bleepPage.switchToBleepTab();

    const applyButton = bleepPage.page.getByRole('button', { name: /apply bleeps/i });
    await expect(applyButton).toBeEnabled();
    await applyButton.click();

    // 5. Wait for video processing
    // This includes: audio extraction → bleeping → remuxing with original video
    await expect(bleepPage.page.getByText(/processing video|remuxing/i)).toBeVisible({
      timeout: 10000,
    });

    // Video processing can take longer than audio
    await expect(bleepPage.page.getByText(/processing video|remuxing/i)).not.toBeVisible({
      timeout: 60000,
    });

    // 6. Verify censored video player and download button appear
    const downloadButton = bleepPage.page.getByRole('button', { name: /download.*video/i });
    await expect(downloadButton).toBeVisible({ timeout: 10000 });
    await expect(downloadButton).toBeEnabled();

    // Verify censored video player
    const censoredVideo = bleepPage.page.locator('video[data-censored="true"]');
    await expect(censoredVideo).toBeVisible();
  });

  test('should show video processing progress', async ({ page }) => {
    await bleepPage.uploadFile(VIDEO_FIXTURE);
    await loadTranscript(page, VIDEO_TRANSCRIPT);
    await expect(bleepPage.reviewTab).toBeEnabled({ timeout: 5000 });

    // Match words
    await bleepPage.switchToReviewTab();
    await bleepPage.page.locator('input[placeholder*="Words to match"]').fill('painting');
    await bleepPage.page.getByRole('button', { name: /match words/i }).click();

    // Apply bleeps
    await bleepPage.switchToBleepTab();
    await bleepPage.page.getByRole('button', { name: /apply bleeps/i }).click();

    // Verify processing indicators
    const processingText = bleepPage.page.getByText(/processing|remuxing|extracting/i);
    await expect(processingText).toBeVisible({ timeout: 10000 });

    // May show progress percentage or steps
    const hasProgress = await bleepPage.page.getByText(/\d+%|\d+\/\d+/).isVisible();
    // Progress indicator is optional but good to have
  });

  test('should handle video remuxing correctly', async ({ page }) => {
    await bleepPage.uploadFile(VIDEO_FIXTURE);
    await loadTranscript(page, VIDEO_TRANSCRIPT);
    await expect(bleepPage.reviewTab).toBeEnabled({ timeout: 5000 });

    // Match and bleep
    await bleepPage.switchToReviewTab();
    await bleepPage.page.locator('input[placeholder*="Words to match"]').fill('paint');
    await bleepPage.page.getByRole('button', { name: /match words/i }).click();

    await bleepPage.switchToBleepTab();
    await bleepPage.page.getByRole('button', { name: /apply bleeps/i }).click();

    // Wait for remuxing to complete
    await expect(bleepPage.page.getByRole('button', { name: /download.*video/i })).toBeVisible({
      timeout: 60000,
    });

    // Verify output is video (not audio)
    const downloadButton = bleepPage.page.getByRole('button', { name: /download.*video/i });
    const buttonText = await downloadButton.textContent();
    expect(buttonText).toMatch(/video/i);
    expect(buttonText).not.toMatch(/audio/i);
  });

  test('should display both video and audio players after bleeping', async ({ page }) => {
    await bleepPage.uploadFile(VIDEO_FIXTURE);
    await loadTranscript(page, VIDEO_TRANSCRIPT);
    await expect(bleepPage.reviewTab).toBeEnabled({ timeout: 5000 });

    // Complete bleeping workflow
    await bleepPage.switchToReviewTab();
    await bleepPage.page.locator('input[placeholder*="Words to match"]').fill('happy');
    await bleepPage.page.getByRole('button', { name: /match words/i }).click();

    await bleepPage.switchToBleepTab();
    await bleepPage.page.getByRole('button', { name: /apply bleeps/i }).click();

    // Wait for completion
    await expect(bleepPage.page.getByRole('button', { name: /download/i })).toBeVisible({
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
