import { test, expect } from '@playwright/test';
import { BleepPage } from '../helpers';

test.describe('Bleep Page UI - Smoke Tests', () => {
  test.setTimeout(30000); // 30 seconds max per test

  test.beforeEach(async ({ page }) => {
    await page.goto('/bleep');
  });

  test('renders main heading', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();
  });

  test('displays tab navigation and sections in active tab', async ({ page }) => {
    // Check tab navigation is visible
    await expect(page.locator('button[role="tab"]').filter({ hasText: 'Setup & Transcribe' })).toBeVisible();
    await expect(page.locator('button[role="tab"]').filter({ hasText: 'Review & Match' })).toBeVisible();
    await expect(page.locator('button[role="tab"]').filter({ hasText: 'Bleep & Download' })).toBeVisible();

    // Check lock icon on disabled tabs
    const reviewTab = page.locator('button[role="tab"]').filter({ hasText: 'Review & Match' });
    await expect(reviewTab).toContainText('🔒');

    const bleepTab = page.locator('button[role="tab"]').filter({ hasText: 'Bleep & Download' });
    await expect(bleepTab).toContainText('🔒');

    // Check sections in the active (Setup & Transcribe) tab are visible
    const activeSections = [
      'Upload Your File',
      'Select Language & Model',
      'Transcribe',
    ];

    for (const sectionTitle of activeSections) {
      await expect(page.locator('h2').filter({ hasText: sectionTitle })).toBeVisible();
    }

    // Verify sections from other tabs are NOT visible
    await expect(page.locator('h2').filter({ hasText: 'Review & Select Words to Bleep' })).not.toBeVisible();
    await expect(page.locator('h2').filter({ hasText: 'Choose Bleep Sound & Volume' })).not.toBeVisible();
    await expect(page.locator('h2').filter({ hasText: 'Bleep That Sh*t!' })).not.toBeVisible();
  });

  test('file dropzone is visible', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    await expect(bleepPage.fileDropzone).toBeVisible();
  });

  test('file input is present and attached', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    await expect(bleepPage.fileInput).toBeAttached();
  });

  test('language selector is visible with options', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    await expect(bleepPage.languageSelect).toBeVisible();

    // Check it has language options
    const options = bleepPage.languageSelect.locator('option');
    await expect(options).toHaveCount(await options.count()); // At least some options

    // Verify English is an option
    await expect(bleepPage.languageSelect).toContainText('English');
  });

  test('model selector is visible with options', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    await expect(bleepPage.modelSelect).toBeVisible();

    // Check it has model options
    await expect(bleepPage.modelSelect).toContainText('Tiny');
    await expect(bleepPage.modelSelect).toContainText('Base');
  });

  test('transcribe button is disabled without file', async ({ page }) => {
    const bleepPage = new BleepPage(page);

    // Button should be visible but disabled
    await expect(bleepPage.transcribeButton).toBeVisible();
    await expect(bleepPage.transcribeButton).toBeDisabled();
  });

  test('words to match input is visible', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    await expect(bleepPage.wordsToMatchInput).toBeVisible();

    // Check placeholder text
    await expect(bleepPage.wordsToMatchInput).toHaveAttribute(
      'placeholder',
      'e.g., bad, word, curse'
    );
  });

  test('matching checkboxes are visible', async ({ page }) => {
    const bleepPage = new BleepPage(page);

    // All three matching types should be visible
    await expect(bleepPage.exactMatchCheckbox).toBeVisible();
    await expect(bleepPage.partialMatchCheckbox).toBeVisible();
    await expect(bleepPage.fuzzyMatchCheckbox).toBeVisible();
  });

  test('bleep sound selector is visible with options', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    await expect(bleepPage.bleepSoundSelect).toBeVisible();

    // Check it has bleep sound options
    await expect(bleepPage.bleepSoundSelect).toContainText('Classic Bleep');
    await expect(bleepPage.bleepSoundSelect).toContainText('Brown Noise');
    await expect(bleepPage.bleepSoundSelect).toContainText('Dolphin');
  });

  test('volume sliders are visible', async ({ page }) => {
    const bleepPage = new BleepPage(page);

    // Both volume sliders should be visible
    await expect(bleepPage.bleepVolumeSlider).toBeVisible();
    await expect(bleepPage.originalVolumeSlider).toBeVisible();
  });

  test('preview bleep button is visible and enabled initially', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    await expect(bleepPage.previewBleepButton).toBeVisible();
    await expect(bleepPage.previewBleepButton).toBeEnabled();
  });

  test('apply bleeps button is visible but disabled initially', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    await expect(bleepPage.applyBleepsButton).toBeVisible();
    await expect(bleepPage.applyBleepsButton).toBeDisabled();
  });

  test('download button is not visible initially', async ({ page }) => {
    const bleepPage = new BleepPage(page);

    // Download button should not be visible until bleeps are applied
    await expect(bleepPage.downloadButton).not.toBeVisible();
  });

  test('fuzzy distance slider is not visible initially', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    // Fuzzy distance slider only appears when fuzzy match is enabled
    await expect(bleepPage.fuzzyDistanceSlider).not.toBeVisible();
  });

  test('bleep buffer slider is visible', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    await expect(bleepPage.bleepBufferSlider).toBeVisible();
  });

  test('all volume controls have proper labels', async ({ page }) => {
    // Check for volume-related labels
    await expect(page.locator('text=/Bleep Volume/i')).toBeVisible();
    await expect(page.locator('text=/Original Word Volume/i')).toBeVisible();
  });

  test('pattern matching section has proper labels', async ({ page }) => {
    // Check for Pattern Matching section heading
    await expect(page.locator('text=/Pattern Matching \\(Optional\\)/i')).toBeVisible();

    // Check for matching type labels
    await expect(page.locator('text=/Exact Match/i')).toBeVisible();
    await expect(page.locator('text=/Partial Match/i')).toBeVisible();
    await expect(page.locator('text=/Fuzzy Match/i')).toBeVisible();
  });

  test('clear all button is not visible initially', async ({ page }) => {
    const bleepPage = new BleepPage(page);

    // Clear All button should not be visible when no words are selected
    const clearAllButton = page.getByTestId('clear-all-button');
    await expect(clearAllButton).not.toBeVisible();
  });
});
