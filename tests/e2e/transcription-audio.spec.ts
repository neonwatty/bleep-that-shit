/**
 * E2E Test: Audio Transcription
 *
 * Tests the complete audio transcription workflow using the Tiny Whisper model.
 * This test verifies that:
 * - Audio files can be uploaded
 * - Transcription with Tiny model works correctly
 * - Transcript structure is valid (words, timestamps, sentences)
 * - Review and Bleep tabs unlock after transcription
 */

import { test, expect } from '@playwright/test';
import { join } from 'path';
import { BleepPage } from '../helpers/pages/BleepPage';

const AUDIO_FIXTURE = join(__dirname, '../fixtures/files/bob-ross-15s.mp3');

// Skip real transcription tests in CI - they require actual ML model downloads
// Run locally to validate full transcription workflow
test.describe('Audio Transcription with Tiny Model', () => {
  test.skip(process.env.CI === 'true', 'Real transcription tests run locally only');
  let bleepPage: BleepPage;

  test.beforeEach(async ({ page }) => {
    bleepPage = new BleepPage(page);
    await bleepPage.goto();
  });

  test('should transcribe audio file with Tiny English model', async () => {
    // 1. Upload audio file
    await bleepPage.uploadFile(AUDIO_FIXTURE);

    // Verify file is loaded
    await expect(bleepPage.fileInput).toHaveValue(/bob-ross-15s\.mp3/);
    await expect(bleepPage.audioPlayer).toBeVisible();

    // 2. Verify model selection (Tiny should be default or available)
    const modelSelector = bleepPage.modelSelect; // Fixed: was modelSelector
    await expect(modelSelector).toBeVisible();

    // Select Tiny model explicitly
    await modelSelector.selectOption('Xenova/whisper-tiny.en'); // Fixed: removed regex syntax

    // 3. Start transcription
    const transcribeButton = bleepPage.transcribeButton;
    await expect(transcribeButton).toBeEnabled();
    await transcribeButton.click();

    // 4. Wait for transcription to complete
    // This can take 10-30 seconds with Tiny model
    await expect(bleepPage.transcriptResult).toBeVisible({ timeout: 60000 });

    // Look for success message
    await expect(bleepPage.page.getByText(/transcription complete/i)).toBeVisible({
      timeout: 60000,
    });

    // 5. Verify transcript structure
    // Check that transcript text is present
    const transcriptText = await bleepPage.transcriptResult.textContent();
    expect(transcriptText).toBeTruthy();
    expect(transcriptText!.length).toBeGreaterThan(0);

    // 6. Verify that Review and Bleep tabs are now unlocked
    await expect(bleepPage.reviewTab).toBeEnabled();
    await expect(bleepPage.bleepTab).toBeEnabled();

    // Verify tab lock icons are no longer present
    const reviewTabText = await bleepPage.reviewTab.textContent();
    expect(reviewTabText).not.toContain('🔒');

    // 7. Verify we can navigate to Review tab
    await bleepPage.switchToReviewTab();
    await expect(bleepPage.reviewTab).toHaveAttribute('aria-selected', 'true');

    // 8. Verify transcript is displayed in Review tab
    // Expand the Keyword Matching section to see the interface
    await bleepPage.expandKeywordMatching();
    // Should show interactive word selection interface
    await expect(bleepPage.page.getByText(/words to match/i)).toBeVisible();
  });

  test('should show word count and sentence count after transcription', async () => {
    // Upload and transcribe
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await bleepPage.selectModel('Xenova/whisper-tiny.en');
    await bleepPage.transcribeButton.click();

    // Wait for completion
    await expect(bleepPage.transcriptResult).toBeVisible({ timeout: 60000 });

    // Look for word/sentence count in success message
    // Example: "Transcription complete! 45 words in 3 sentences"
    // Use locator targeting the parent <p> element, not the <strong> child
    const successMessage = bleepPage.page.locator('p:has-text("Transcription complete")');
    await expect(successMessage).toBeVisible();

    const messageText = await successMessage.textContent();
    expect(messageText).toMatch(/\d+\s+words?/i);
    expect(messageText).toMatch(/\d+\s+sentences?/i);
  });

  test('should handle timestamp warnings if present', async () => {
    // Upload and transcribe
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await bleepPage.selectModel('Xenova/whisper-tiny.en');
    await bleepPage.transcribeButton.click();

    // Wait for completion
    await expect(bleepPage.transcriptResult).toBeVisible({ timeout: 60000 });

    // Check if timestamp warning appears
    // This is optional - not all transcripts have null timestamps
    const timestampWarning = bleepPage.page.getByText(/timestamp.*warning/i);
    if (await timestampWarning.isVisible()) {
      // If warning is shown, it should contain info about affected words
      const warningText = await timestampWarning.textContent();
      expect(warningText).toMatch(/\d+.*words?/i);
    }
  });

  test('should update progress during transcription', async () => {
    // Upload file
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await bleepPage.selectModel('Xenova/whisper-tiny.en');

    // Start transcription
    await bleepPage.transcribeButton.click();

    // Verify progress indicator appears
    const progressBar = bleepPage.progressBar;
    await expect(progressBar).toBeVisible({ timeout: 5000 });

    // Verify progress text updates
    const progressText = bleepPage.progressText;
    await expect(progressText).toBeVisible();

    // Should see loading/processing messages
    const hasLoadingMessage = await bleepPage.page
      .getByText(/loading model|transcribing|processing/i)
      .first()
      .isVisible();
    expect(hasLoadingMessage).toBeTruthy();

    // Wait for completion
    await expect(bleepPage.transcriptResult).toBeVisible({ timeout: 60000 });

    // Progress should disappear after completion
    await expect(progressBar).not.toBeVisible();
  });
});
