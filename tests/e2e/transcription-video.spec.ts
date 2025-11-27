/**
 * E2E Test: Video Transcription
 *
 * Tests the complete video transcription workflow using the Tiny Whisper model.
 * Similar to audio transcription but with MP4 file input.
 */

import { test, expect } from '@playwright/test';
import { join } from 'path';
import { BleepPage } from '../helpers/pages/BleepPage';

const VIDEO_FIXTURE = join(__dirname, '../fixtures/files/bob-ross-15s.mp4');

// Skip real transcription tests in CI - they require actual ML model downloads
// Run locally to validate full transcription workflow
test.describe('Video Transcription with Tiny Model', () => {
  test.skip(process.env.CI === 'true', 'Real transcription tests run locally only');
  let bleepPage: BleepPage;

  test.beforeEach(async ({ page }) => {
    bleepPage = new BleepPage(page);
    await bleepPage.goto();
  });

  test('should transcribe video file with Tiny English model', async () => {
    // Upload video file
    await bleepPage.uploadFile(VIDEO_FIXTURE);

    // Verify file is loaded with video player
    await expect(bleepPage.fileInput).toHaveValue(/bob-ross-15s\.mp4/);
    await expect(bleepPage.page.locator('video')).toBeVisible();

    // Select Tiny model
    await bleepPage.selectModel('Xenova/whisper-tiny.en');

    // Start transcription
    await bleepPage.transcribeButton.click();

    // Wait for completion (video transcription uses extracted audio)
    await expect(bleepPage.transcriptResult).toBeVisible({ timeout: 60000 });
    await expect(bleepPage.page.getByText(/transcription complete/i)).toBeVisible({
      timeout: 60000,
    });

    // Verify tabs unlocked
    await expect(bleepPage.reviewTab).toBeEnabled();
    await expect(bleepPage.bleepTab).toBeEnabled();

    // Verify transcript has content
    const transcriptText = await bleepPage.transcriptResult.textContent();
    expect(transcriptText).toBeTruthy();
    expect(transcriptText!.length).toBeGreaterThan(0);
  });

  test('should show video player with controls', async () => {
    await bleepPage.uploadFile(VIDEO_FIXTURE);

    // Verify video player is displayed
    const videoPlayer = bleepPage.page.locator('video');
    await expect(videoPlayer).toBeVisible();

    // Verify player has controls
    await expect(videoPlayer).toHaveAttribute('controls');

    // Verify we can see video source (source is in nested <source> element)
    const sourceElement = videoPlayer.locator('source');
    const videoSrc = await sourceElement.getAttribute('src');
    expect(videoSrc).toBeTruthy();
  });
});
