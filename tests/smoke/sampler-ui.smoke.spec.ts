import { test, expect } from '@playwright/test';
import { SamplerPage } from '../helpers';
import path from 'path';

test.describe('Sampler Page UI - Smoke Tests', () => {
  test.setTimeout(30000); // 30 seconds max per test

  test.beforeEach(async ({ page }) => {
    await page.goto('/sampler');
  });

  test('renders main heading', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Transcription Sampler' })).toBeVisible();
  });

  test('displays info section explaining sampler purpose', async ({ page }) => {
    // Check for the "Why use the sampler?" info box
    await expect(page.locator('text=/Why use the sampler?/i')).toBeVisible();
    await expect(page.locator('text=/Compare different Whisper models/i')).toBeVisible();
  });

  test('file dropzone is visible', async ({ page }) => {
    const samplerPage = new SamplerPage(page);
    await expect(samplerPage.fileDropzone).toBeVisible();
  });

  test('file input is present and attached', async ({ page }) => {
    const samplerPage = new SamplerPage(page);
    await expect(samplerPage.fileInput).toBeAttached();
  });

  test('language selector is visible with options', async ({ page }) => {
    const samplerPage = new SamplerPage(page);
    await expect(samplerPage.languageSelect).toBeVisible();

    // Check it has language options
    await expect(samplerPage.languageSelect).toContainText('English');
  });

  test('compare all button is visible but disabled initially', async ({ page }) => {
    const samplerPage = new SamplerPage(page);
    await expect(samplerPage.compareAllButton).toBeVisible();

    // Button should be disabled without file upload
    await expect(samplerPage.compareAllButton).toBeDisabled();
  });

  test('results container is not visible initially', async ({ page }) => {
    const samplerPage = new SamplerPage(page);

    // Results should not be visible until comparison is run
    await expect(samplerPage.resultsContainer).not.toBeVisible();
  });

  test('configuration section appears after file upload', async ({ page }) => {
    const samplerPage = new SamplerPage(page);

    // Upload a test file
    const testFile = path.join(__dirname, '../fixtures/files/test.mp3');
    await samplerPage.fileInput.setInputFiles(testFile);

    // Configuration section should appear
    await expect(page.locator('h2').filter({ hasText: 'Step 2: Configure Sample' })).toBeVisible({
      timeout: 5000,
    });

    // Compare button should become enabled (but DON'T click it!)
    await expect(samplerPage.compareAllButton).toBeEnabled();
  });

  test('sample configuration inputs appear after file upload', async ({ page }) => {
    const samplerPage = new SamplerPage(page);

    // Upload a test file
    const testFile = path.join(__dirname, '../fixtures/files/test.mp3');
    await samplerPage.fileInput.setInputFiles(testFile);

    // Wait for configuration section
    await expect(page.locator('h2').filter({ hasText: 'Step 2: Configure Sample' })).toBeVisible({
      timeout: 5000,
    });

    // Check sample start and duration inputs are visible
    await expect(samplerPage.sampleStartInput).toBeVisible();
    await expect(samplerPage.sampleDurationInput).toBeVisible();
  });
});
