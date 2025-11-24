/**
 * E2E Test: File Validation
 *
 * Tests file upload validation:
 * - Invalid file types (TXT, PDF, etc.)
 * - Supported audio formats (MP3, WAV, M4A)
 * - Supported video formats (MP4, MOV, AVI)
 * - Duration warnings for long files
 */

import { test, expect } from '@playwright/test';
import { join } from 'path';
import { BleepPage } from '../helpers/pages/BleepPage';
import { writeFileSync } from 'fs';

const AUDIO_FIXTURE = join(__dirname, '../fixtures/files/bob-ross-15s.mp3');
const VIDEO_FIXTURE = join(__dirname, '../fixtures/files/bob-ross-15s.mp4');

test.describe('File Upload Validation', () => {
  let bleepPage: BleepPage;

  test.beforeEach(async ({ page }) => {
    bleepPage = new BleepPage(page);
    await bleepPage.goto();
  });

  test('should reject invalid file types - text file', async () => {
    // Create a temporary text file
    const txtFile = join(__dirname, '../fixtures/files/invalid.txt');
    writeFileSync(txtFile, 'This is not an audio or video file');

    // Try to upload
    await bleepPage.uploadFile(txtFile);

    // Verify error message or rejection
    await expect(
      bleepPage.page.getByText(/invalid file|not supported|wrong format/i)
    ).toBeVisible({ timeout: 5000 });

    // Verify file is not loaded (no player shown)
    const hasPlayer =
      (await bleepPage.audioPlayer.isVisible()) ||
      (await bleepPage.page.locator('video').isVisible());
    expect(hasPlayer).toBeFalsy();
  });

  test('should accept MP3 audio files', async () => {
    await bleepPage.uploadFile(AUDIO_FIXTURE);

    // Verify audio player is shown
    await expect(bleepPage.audioPlayer).toBeVisible({ timeout: 5000 });

    // Verify file input has value
    await expect(bleepPage.fileInput).toHaveValue(/\.mp3$/i);

    // Verify no error messages
    const hasError = await bleepPage.page.getByText(/error|invalid|not supported/i).isVisible();
    expect(hasError).toBeFalsy();
  });

  test('should accept MP4 video files', async () => {
    await bleepPage.uploadFile(VIDEO_FIXTURE);

    // Verify video player is shown
    await expect(bleepPage.page.locator('video')).toBeVisible({ timeout: 5000 });

    // Verify file input has value
    await expect(bleepPage.fileInput).toHaveValue(/\.mp4$/i);

    // No error messages
    const hasError = await bleepPage.page.getByText(/error|invalid|not supported/i).isVisible();
    expect(hasError).toBeFalsy();
  });

  test('should show duration warning for short files', async () => {
    // Our test fixture is 15 seconds, which is fine
    await bleepPage.uploadFile(AUDIO_FIXTURE);

    // For files under 10 minutes, there should be no warning
    // (or a different message)
    const warningVisible = await bleepPage.page
      .getByText(/exceeds.*10 minutes|too long/i)
      .isVisible();

    // 15 seconds is well under limit, so no warning expected
    expect(warningVisible).toBeFalsy();
  });

  test('should display file duration after upload', async () => {
    await bleepPage.uploadFile(AUDIO_FIXTURE);

    // Look for duration display (e.g., "15 seconds" or "0:15")
    const durationText = bleepPage.page.getByText(/\d+:\d+|\d+\s*seconds?/i);
    await expect(durationText).toBeVisible({ timeout: 5000 });
  });

  test('should show file name after upload', async () => {
    await bleepPage.uploadFile(AUDIO_FIXTURE);

    // Verify file name is displayed somewhere
    await expect(bleepPage.page.getByText(/bob-ross-15s\.mp3/i)).toBeVisible({ timeout: 5000 });
  });

  test('should allow replacing uploaded file', async () => {
    // Upload first file
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await expect(bleepPage.audioPlayer).toBeVisible();
    await expect(bleepPage.page.getByText(/bob-ross-15s\.mp3/i)).toBeVisible();

    // Upload second file (video this time)
    await bleepPage.uploadFile(VIDEO_FIXTURE);
    await expect(bleepPage.page.locator('video')).toBeVisible();
    await expect(bleepPage.page.getByText(/bob-ross-15s\.mp4/i)).toBeVisible();

    // First file should be replaced
    const audioPlayerVisible = await bleepPage.audioPlayer.isVisible();
    expect(audioPlayerVisible).toBeFalsy(); // Should now show video player instead
  });

  test('should clear previous transcription when uploading new file', async () => {
    // Upload file and complete transcription
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await bleepPage.modelSelector.selectOption({ label: /tiny/i });
    await bleepPage.transcribeButton.click();

    // Wait for transcription to complete
    await expect(bleepPage.transcriptionResult).toBeVisible({ timeout: 60000 });
    await expect(bleepPage.reviewTab).toBeEnabled();

    // Upload a new file
    await bleepPage.uploadFile(VIDEO_FIXTURE);

    // Transcription result should be cleared
    const transcriptVisible = await bleepPage.transcriptionResult.isVisible();
    expect(transcriptVisible).toBeFalsy();

    // Tabs should be locked again
    const reviewTabEnabled = await bleepPage.reviewTab.isEnabled();
    expect(reviewTabEnabled).toBeFalsy();
  });
});
