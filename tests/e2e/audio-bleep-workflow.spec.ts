/**
 * E2E Test: Complete Audio Bleeping Workflow
 *
 * Tests the end-to-end workflow for bleeping audio files:
 * 1. Upload audio
 * 2. Load pre-generated transcript (or transcribe)
 * 3. Match words
 * 4. Select bleep sound
 * 5. Apply bleeps
 * 6. Download censored audio
 */

import { test, expect } from './e2e-setup';
import { join } from 'path';
import { BleepPage } from '../helpers/pages/BleepPage';
import { loadTranscript } from '../helpers/transcriptLoader';

const AUDIO_FIXTURE = join(__dirname, '../fixtures/files/bob-ross-15s.mp3');
const AUDIO_TRANSCRIPT = 'bob-ross-15s-audio.transcript.json';

test.describe('Audio Bleeping Complete Workflow', () => {
  let bleepPage: BleepPage;

  test.beforeEach(async ({ page }) => {
    bleepPage = new BleepPage(page);
    await bleepPage.goto();
  });

  test('should complete full audio bleeping workflow with pre-loaded transcript', async ({
    page,
  }) => {
    // 1. Upload audio file
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await expect(bleepPage.audioPlayer).toBeVisible();

    // 2. Load pre-generated transcript (bypasses actual transcription)
    await loadTranscript(page, AUDIO_TRANSCRIPT);

    // Wait for tabs to unlock
    await expect(bleepPage.reviewTab).toBeEnabled({ timeout: 5000 });

    // 3. Switch to Review tab
    await bleepPage.switchToReviewTab();
    // Wait for transcript words to render
    await expect(page.locator('.word-wrapper').first()).toBeVisible({ timeout: 5000 });

    // 4. Enter words to match
    const wordsInput = bleepPage.wordsToMatchInput;
    await wordsInput.fill('the,and,of');

    // 5. Click Match Words button
    const matchButton = bleepPage.page.getByRole('button', { name: /match words/i });
    await matchButton.click();

    // Wait for matched words to appear
    await expect(bleepPage.page.getByText(/words selected/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Verify matched count shows
    const matchedCount = bleepPage.page.locator('[data-testid="matched-count"]');
    if (await matchedCount.isVisible()) {
      const count = await matchedCount.textContent();
      expect(parseInt(count || '0')).toBeGreaterThan(0);
    }

    // 6. Switch to Bleep tab
    await bleepPage.switchToBleepTab();

    // 7. Select bleep sound
    const bleepSoundSelector = bleepPage.bleepSoundSelect;
    await bleepSoundSelector.selectOption('bleep'); // Fixed: removed regex syntax

    // 8. Apply bleeps
    const applyButton = bleepPage.page.getByRole('button', { name: /apply bleeps/i });
    await expect(applyButton).toBeEnabled();
    await applyButton.click();

    // 9. Wait for download link to appear (processing may be fast)
    const downloadLink = bleepPage.page.getByRole('link', { name: /download/i });
    await expect(downloadLink).toBeVisible({ timeout: 60000 });
  });

  test('should work with different bleep sounds', async ({ page }) => {
    // Upload and load transcript
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await loadTranscript(page, AUDIO_TRANSCRIPT);
    await expect(bleepPage.reviewTab).toBeEnabled({ timeout: 5000 });

    // Match words
    await bleepPage.switchToReviewTab();
    // Wait for transcript words to render
    await expect(page.locator('.word-wrapper').first()).toBeVisible({ timeout: 5000 });
    await bleepPage.wordsToMatchInput.fill('happy');
    await bleepPage.page.getByRole('button', { name: /match words/i }).click();
    await bleepPage.page.waitForTimeout(1000);

    // Try different bleep sounds
    await bleepPage.switchToBleepTab();

    // Fixed: Map display names to actual option values
    const bleepSounds = [
      { display: 'Classic Bleep', value: 'bleep' },
      { display: 'Brown Noise', value: 'brown' },
      { display: 'Dolphin Sounds', value: 'dolphin' },
      { display: 'T-Rex Roar', value: 'trex' },
    ];

    for (const sound of bleepSounds) {
      // Select sound
      const selector = bleepPage.bleepSoundSelect;
      await selector.selectOption(sound.value); // Fixed: use value instead of label regex

      // Verify selection
      const selected = await selector.inputValue();
      expect(selected).toBe(sound.value);
    }
  });

  test('should allow adjusting bleep volume', async ({ page }) => {
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await loadTranscript(page, AUDIO_TRANSCRIPT);
    await expect(bleepPage.reviewTab).toBeEnabled({ timeout: 5000 });

    // Match words
    await bleepPage.switchToReviewTab();
    // Wait for transcript words to render
    await expect(page.locator('.word-wrapper').first()).toBeVisible({ timeout: 5000 });
    await bleepPage.wordsToMatchInput.fill('paint');
    await bleepPage.page.getByRole('button', { name: /match words/i }).click();

    // Go to bleep tab
    await bleepPage.switchToBleepTab();

    // Find volume slider
    const volumeSlider = bleepPage.bleepVolumeSlider;
    await expect(volumeSlider).toBeVisible();

    // Test different volume levels
    await volumeSlider.fill('50'); // 50%
    let value = await volumeSlider.inputValue();
    expect(parseInt(value)).toBe(50);

    await volumeSlider.fill('100'); // 100%
    value = await volumeSlider.inputValue();
    expect(parseInt(value)).toBe(100);
  });

  test('should show re-apply button after settings change', async ({ page }) => {
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await loadTranscript(page, AUDIO_TRANSCRIPT);
    await expect(bleepPage.reviewTab).toBeEnabled({ timeout: 5000 });

    // Match words - use "happy" which appears multiple times in transcript
    await bleepPage.switchToReviewTab();
    // Wait for transcript words to render
    await expect(page.locator('.word-wrapper').first()).toBeVisible({ timeout: 5000 });
    await bleepPage.wordsToMatchInput.fill('happy');
    await bleepPage.page.getByRole('button', { name: /match words/i }).click();

    // Wait for matched words to appear (use .first() to avoid strict mode violation)
    await expect(bleepPage.page.getByText(/words selected/i).first()).toBeVisible({
      timeout: 10000,
    });

    // Apply bleeps first time
    await bleepPage.switchToBleepTab();
    const applyButton = bleepPage.page.getByRole('button', { name: /apply bleeps/i });
    await expect(applyButton).toBeEnabled({ timeout: 15000 });
    await applyButton.click();

    // Wait for completion - download is a link, not a button
    await expect(bleepPage.page.getByRole('link', { name: /download/i })).toBeVisible({
      timeout: 60000,
    });

    // Change volume
    const volumeSlider = bleepPage.bleepVolumeSlider;
    await volumeSlider.fill('75');

    // Verify re-apply button appears or text changes
    const reApplyButton = bleepPage.page.getByRole('button', { name: /re.*apply|apply.*again/i });
    await expect(reApplyButton).toBeVisible({ timeout: 5000 });
  });
});
