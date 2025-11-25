/**
 * E2E Test: File Validation
 *
 * Tests file upload validation:
 * - Invalid file types (TXT, PDF, etc.)
 * - Supported audio formats (MP3, WAV, M4A)
 * - Supported video formats (MP4, MOV, AVI)
 * - Duration warnings for long files
 */

import { test, expect } from './e2e-setup';
import { join } from 'path';
import { BleepPage } from '../helpers/pages/BleepPage';
import { writeFileSync } from 'fs';
import { loadTranscript } from '../helpers/transcriptLoader';

const AUDIO_TRANSCRIPT = 'bob-ross-15s-audio.transcript.json';

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
      bleepPage.page.getByText(/please upload a valid audio or video file/i)
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

  test.skip('should display file duration after upload', async () => {
    // NOTE: Duration is only displayed for files over 10 minutes as a warning
    // The 15s test file won't show duration. This test needs a longer fixture or UI update.
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

  // Skip this test in CI - behavior differs when using loadTranscript vs actual transcription
  test.skip('should clear previous transcription when uploading new file', async ({ page }) => {
    // Upload file and load pre-generated transcript
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await loadTranscript(page, AUDIO_TRANSCRIPT);

    // Wait for tabs to unlock (indicating transcript loaded)
    await expect(bleepPage.reviewTab).toBeEnabled({ timeout: 5000 });

    // Upload a new file
    await bleepPage.uploadFile(VIDEO_FIXTURE);

    // Tabs should be locked again (transcript cleared)
    const reviewTabEnabled = await bleepPage.reviewTab.isEnabled();
    expect(reviewTabEnabled).toBeFalsy();
  });
});
