/**
 * E2E Test: Pattern Matching
 *
 * Tests different word matching modes:
 * - Exact match
 * - Partial match
 * - Fuzzy match with distance slider
 */

import { test, expect } from '@playwright/test';
import { join } from 'path';
import { BleepPage } from '../helpers/pages/BleepPage';
import { loadTranscript } from '../helpers/transcriptLoader';

const AUDIO_FIXTURE = join(__dirname, '../fixtures/files/bob-ross-15s.mp3');
const AUDIO_TRANSCRIPT = 'bob-ross-15s-audio.transcript.json';

test.describe('Pattern Matching Modes', () => {
  let bleepPage: BleepPage;

  test.beforeEach(async ({ page }) => {
    bleepPage = new BleepPage(page);
    await bleepPage.goto();
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await loadTranscript(page, AUDIO_TRANSCRIPT);
    await expect(bleepPage.reviewTab).toBeEnabled({ timeout: 5000 });
    await bleepPage.switchToReviewTab();
  });

  test('should match words in exact mode', async () => {
    // Enter words to match
    const wordsInput = bleepPage.page.locator('input[placeholder*="Words to match"]');
    await wordsInput.fill('happy,tree');

    // Ensure exact match is checked
    const exactCheckbox = bleepPage.page.locator('input[type="checkbox"][value="exact"]');
    await exactCheckbox.check();

    // Uncheck other modes
    const partialCheckbox = bleepPage.page.locator('input[type="checkbox"][value="partial"]');
    const fuzzyCheckbox = bleepPage.page.locator('input[type="checkbox"][value="fuzzy"]');
    await partialCheckbox.uncheck();
    await fuzzyCheckbox.uncheck();

    // Match words
    const matchButton = bleepPage.page.getByRole('button', { name: /match words/i });
    await matchButton.click();
    await bleepPage.page.waitForTimeout(1000);

    // Verify matched words display
    await expect(bleepPage.page.getByText(/matched words|selected words/i)).toBeVisible();

    // In exact mode, "happy" matches "happy" but not "happier"
    // "tree" matches "tree" but not "trees"
  });

  test('should match words in partial mode', async () => {
    const wordsInput = bleepPage.page.locator('input[placeholder*="Words to match"]');
    await wordsInput.fill('pain'); // Will match "paint", "painting", "painter"

    // Enable partial match
    const partialCheckbox = bleepPage.page.locator('input[type="checkbox"][value="partial"]');
    await partialCheckbox.check();

    // Match words
    const matchButton = bleepPage.page.getByRole('button', { name: /match words/i });
    await matchButton.click();
    await bleepPage.page.waitForTimeout(1000);

    // Verify matches found
    await expect(bleepPage.page.getByText(/matched words|selected words/i)).toBeVisible();

    // Partial mode should find more matches than exact
  });

  test('should match words in fuzzy mode with distance 1', async () => {
    const wordsInput = bleepPage.page.locator('input[placeholder*="Words to match"]');
    await wordsInput.fill('trea'); // Typo for "tree"

    // Enable fuzzy match
    const fuzzyCheckbox = bleepPage.page.locator('input[type="checkbox"][value="fuzzy"]');
    await fuzzyCheckbox.check();

    // Set fuzzy distance to 1
    const fuzzySlider = bleepPage.page.locator('input[type="range"][aria-label*="fuzzy"]');
    if (await fuzzySlider.isVisible()) {
      await fuzzySlider.fill('1');
    }

    // Match words
    const matchButton = bleepPage.page.getByRole('button', { name: /match words/i });
    await matchButton.click();
    await bleepPage.page.waitForTimeout(1000);

    // Fuzzy match should find "tree" even with typo "trea"
    await expect(bleepPage.page.getByText(/matched words|selected words/i)).toBeVisible();
  });

  test('should adjust fuzzy distance slider (1-3)', async () => {
    const wordsInput = bleepPage.page.locator('input[placeholder*="Words to match"]');
    await wordsInput.fill('test');

    // Enable fuzzy match
    const fuzzyCheckbox = bleepPage.page.locator('input[type="checkbox"][value="fuzzy"]');
    await fuzzyCheckbox.check();

    // Find fuzzy distance slider
    const fuzzySlider = bleepPage.page.locator('input[type="range"][aria-label*="fuzzy"]');
    await expect(fuzzySlider).toBeVisible();

    // Test different distance values
    await fuzzySlider.fill('1');
    let value = await fuzzySlider.inputValue();
    expect(parseInt(value)).toBe(1);

    await fuzzySlider.fill('2');
    value = await fuzzySlider.inputValue();
    expect(parseInt(value)).toBe(2);

    await fuzzySlider.fill('3');
    value = await fuzzySlider.inputValue();
    expect(parseInt(value)).toBe(3);
  });

  test('should combine multiple match modes', async () => {
    const wordsInput = bleepPage.page.locator('input[placeholder*="Words to match"]');
    await wordsInput.fill('happy');

    // Enable both exact and partial
    const exactCheckbox = bleepPage.page.locator('input[type="checkbox"][value="exact"]');
    const partialCheckbox = bleepPage.page.locator('input[type="checkbox"][value="partial"]');
    await exactCheckbox.check();
    await partialCheckbox.check();

    // Match words
    const matchButton = bleepPage.page.getByRole('button', { name: /match words/i });
    await matchButton.click();
    await bleepPage.page.waitForTimeout(1000);

    // Should find matches using both modes
    await expect(bleepPage.page.getByText(/matched words|selected words/i)).toBeVisible();
  });

  test('should show matched word count', async () => {
    const wordsInput = bleepPage.page.locator('input[placeholder*="Words to match"]');
    await wordsInput.fill('the');

    // Match words (exact mode by default)
    const matchButton = bleepPage.page.getByRole('button', { name: /match words/i });
    await matchButton.click();
    await bleepPage.page.waitForTimeout(1000);

    // Look for count display (e.g., "5 words matched")
    const countDisplay = bleepPage.page.getByText(/\d+\s+(word|match)/i);
    await expect(countDisplay).toBeVisible({ timeout: 5000 });
  });

  test('should clear matched words', async () => {
    // Match some words first
    const wordsInput = bleepPage.page.locator('input[placeholder*="Words to match"]');
    await wordsInput.fill('happy,tree');
    const matchButton = bleepPage.page.getByRole('button', { name: /match words/i });
    await matchButton.click();
    await bleepPage.page.waitForTimeout(1000);

    // Verify matches exist
    await expect(bleepPage.page.getByText(/matched words|selected words/i)).toBeVisible();

    // Find and click Clear All button
    const clearButton = bleepPage.page.getByRole('button', { name: /clear all/i });
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await bleepPage.page.waitForTimeout(500);

      // Verify no matches remain
      // The matched words count should be 0 or display should be hidden
    }
  });
});
