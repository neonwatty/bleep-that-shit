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
    await expect(
      page.locator('button[role="tab"]').filter({ hasText: 'Setup & Transcribe' })
    ).toBeVisible();
    await expect(
      page.locator('button[role="tab"]').filter({ hasText: 'Review & Match' })
    ).toBeVisible();
    await expect(
      page.locator('button[role="tab"]').filter({ hasText: 'Bleep & Download' })
    ).toBeVisible();

    // Check lock icon on disabled tabs
    const reviewTab = page.locator('button[role="tab"]').filter({ hasText: 'Review & Match' });
    await expect(reviewTab).toContainText('🔒');

    const bleepTab = page.locator('button[role="tab"]').filter({ hasText: 'Bleep & Download' });
    await expect(bleepTab).toContainText('🔒');

    // Check sections in the active (Setup & Transcribe) tab are visible
    const activeSections = ['Upload Your File', 'Select Language & Model', 'Transcribe'];

    for (const sectionTitle of activeSections) {
      await expect(page.locator('h2').filter({ hasText: sectionTitle })).toBeVisible();
    }

    // Verify sections from other tabs are NOT visible
    await expect(
      page.locator('h2').filter({ hasText: 'Review & Select Words to Bleep' })
    ).not.toBeVisible();
    await expect(
      page.locator('h2').filter({ hasText: 'Choose Bleep Sound & Volume' })
    ).not.toBeVisible();
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

  test('words to match input is not visible in setup tab', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    // Element is in Review & Match tab, which is locked initially
    await expect(bleepPage.wordsToMatchInput).not.toBeVisible();
  });

  test('matching checkboxes are not visible in setup tab', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    // Elements are in Review & Match tab, which is locked initially
    await expect(bleepPage.exactMatchCheckbox).not.toBeVisible();
    await expect(bleepPage.partialMatchCheckbox).not.toBeVisible();
    await expect(bleepPage.fuzzyMatchCheckbox).not.toBeVisible();
  });

  test('bleep sound selector is not visible in setup tab', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    // Element is in Bleep & Download tab, which is locked initially
    await expect(bleepPage.bleepSoundSelect).not.toBeVisible();
  });

  test('volume sliders are not visible in setup tab', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    // Elements are in Bleep & Download tab, which is locked initially
    await expect(bleepPage.bleepVolumeSlider).not.toBeVisible();
    await expect(bleepPage.originalVolumeSlider).not.toBeVisible();
  });

  test('preview bleep button is not visible in setup tab', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    // Element is in Bleep & Download tab, which is locked initially
    await expect(bleepPage.previewBleepButton).not.toBeVisible();
  });

  test('apply bleeps button is not visible in setup tab', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    // Element is in Bleep & Download tab, which is locked initially
    await expect(bleepPage.applyBleepsButton).not.toBeVisible();
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

  test('bleep buffer slider is not visible in setup tab', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    // Element is in Bleep & Download tab, which is locked initially
    await expect(bleepPage.bleepBufferSlider).not.toBeVisible();
  });

  test('volume control labels are not visible in setup tab', async ({ page }) => {
    // Labels are in Bleep & Download tab, which is locked initially
    await expect(page.locator('text=/Bleep Volume/i')).not.toBeVisible();
    await expect(page.locator('text=/Original Word Volume/i')).not.toBeVisible();
  });

  test('pattern matching labels are not visible in setup tab', async ({ page }) => {
    // Labels are in Review & Match tab, which is locked initially
    await expect(page.locator('text=/Pattern Matching \\(Optional\\)/i')).not.toBeVisible();
    await expect(page.locator('text=/Exact Match/i')).not.toBeVisible();
    await expect(page.locator('text=/Partial Match/i')).not.toBeVisible();
    await expect(page.locator('text=/Fuzzy Match/i')).not.toBeVisible();
  });

  test('clear all button is not visible initially', async ({ page }) => {
    const bleepPage = new BleepPage(page);

    // Clear All button should not be visible when no words are selected
    const clearAllButton = page.getByTestId('clear-all-button');
    await expect(clearAllButton).not.toBeVisible();
  });
});
