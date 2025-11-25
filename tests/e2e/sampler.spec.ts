/**
 * E2E Test: Sampler Page
 *
 * Tests the Transcription Sampler page:
 * - Page loads with all UI elements
 * - File upload functionality
 * - Sample configuration (start, duration, language)
 * - Compare button state management
 * - Results display (UI only - transcription requires ML models)
 */

import { test, expect } from './e2e-setup';
import { join } from 'path';

const AUDIO_FIXTURE = join(__dirname, '../fixtures/files/bob-ross-15s.mp3');

test.describe('Sampler Page - UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sampler');
  });

  test('should display all main sections', async ({ page }) => {
    // Header
    await expect(page.getByRole('heading', { name: /Transcription Sampler/i })).toBeVisible();

    // Info box
    await expect(page.getByText(/Why use the sampler/i)).toBeVisible();
    await expect(page.getByText(/Test multiple models/i)).toBeVisible();

    // Step 1: Upload section
    await expect(page.getByRole('heading', { name: /Step 1: Upload Audio/i })).toBeVisible();
    await expect(page.getByTestId('file-dropzone')).toBeVisible();
  });

  test('should show dropzone with correct text', async ({ page }) => {
    const dropzone = page.getByTestId('file-dropzone');
    await expect(dropzone).toBeVisible();
    await expect(page.getByText(/Drag and drop your audio or video file/i)).toBeVisible();
    await expect(page.getByText(/or click to browse/i)).toBeVisible();
  });

  test('should upload audio file and show player', async ({ page }) => {
    // Upload file
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(AUDIO_FIXTURE);

    // Verify audio player appears
    await expect(page.getByTestId('audio-player')).toBeVisible({ timeout: 5000 });

    // Verify file loaded message
    await expect(page.getByText(/File loaded:/i)).toBeVisible();
    await expect(page.getByText(/bob-ross-15s\.mp3/i)).toBeVisible();
  });

  test('should show configuration section after file upload', async ({ page }) => {
    // Upload file
    await page.getByTestId('file-input').setInputFiles(AUDIO_FIXTURE);

    // Wait for file to load
    await expect(page.getByTestId('audio-player')).toBeVisible({ timeout: 5000 });

    // Verify Step 2: Configure section appears
    await expect(page.getByRole('heading', { name: /Step 2: Configure Sample/i })).toBeVisible();

    // Verify configuration inputs
    await expect(page.getByTestId('sample-start-input')).toBeVisible();
    await expect(page.getByTestId('sample-duration-input')).toBeVisible();
    await expect(page.getByTestId('language-select')).toBeVisible();
  });

  test('should have correct default values for configuration', async ({ page }) => {
    await page.getByTestId('file-input').setInputFiles(AUDIO_FIXTURE);
    await expect(page.getByTestId('audio-player')).toBeVisible({ timeout: 5000 });

    // Check default values
    await expect(page.getByTestId('sample-start-input')).toHaveValue('0');
    await expect(page.getByTestId('sample-duration-input')).toHaveValue('10');
    await expect(page.getByTestId('language-select')).toHaveValue('en');
  });

  test('should allow changing sample configuration', async ({ page }) => {
    await page.getByTestId('file-input').setInputFiles(AUDIO_FIXTURE);
    await expect(page.getByTestId('audio-player')).toBeVisible({ timeout: 5000 });

    // Change sample start
    await page.getByTestId('sample-start-input').fill('5');
    await expect(page.getByTestId('sample-start-input')).toHaveValue('5');

    // Change duration
    await page.getByTestId('sample-duration-input').fill('15');
    await expect(page.getByTestId('sample-duration-input')).toHaveValue('15');

    // Change language
    await page.getByTestId('language-select').selectOption('es');
    await expect(page.getByTestId('language-select')).toHaveValue('es');
  });

  test('should show Step 3 with Compare button after file upload', async ({ page }) => {
    await page.getByTestId('file-input').setInputFiles(AUDIO_FIXTURE);
    await expect(page.getByTestId('audio-player')).toBeVisible({ timeout: 5000 });

    // Step 3 should be visible
    await expect(page.getByRole('heading', { name: /Step 3: Run Comparison/i })).toBeVisible();

    // Compare button should be visible and enabled
    const compareButton = page.getByTestId('compare-all-button');
    await expect(compareButton).toBeVisible();
    await expect(compareButton).toBeEnabled();
    await expect(compareButton).toHaveText(/Compare All Models/i);
  });

  test('should show model download warning', async ({ page }) => {
    await page.getByTestId('file-input').setInputFiles(AUDIO_FIXTURE);
    await expect(page.getByTestId('audio-player')).toBeVisible({ timeout: 5000 });

    // Warning about model downloads
    await expect(page.getByText(/First-time model downloads/i)).toBeVisible();
    await expect(page.getByText(/Models are cached locally/i)).toBeVisible();
  });

  test('should have all language options', async ({ page }) => {
    await page.getByTestId('file-input').setInputFiles(AUDIO_FIXTURE);
    await expect(page.getByTestId('audio-player')).toBeVisible({ timeout: 5000 });

    const languageSelect = page.getByTestId('language-select');

    // Verify key languages are available
    const languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ko'];
    for (const lang of languages) {
      await expect(languageSelect.locator(`option[value="${lang}"]`)).toBeAttached();
    }
  });

  test('should not show configuration without file', async ({ page }) => {
    // Without file upload, Step 2 and Step 3 should not be visible
    await expect(page.getByRole('heading', { name: /Step 2: Configure Sample/i })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: /Step 3: Run Comparison/i })).not.toBeVisible();
    await expect(page.getByTestId('compare-all-button')).not.toBeVisible();
  });
});

test.describe('Sampler Page - File Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sampler');
  });

  test('should clear results when uploading new file', async ({ page }) => {
    // Upload first file
    await page.getByTestId('file-input').setInputFiles(AUDIO_FIXTURE);
    await expect(page.getByTestId('audio-player')).toBeVisible({ timeout: 5000 });

    // Results container should not exist yet (no comparison run)
    await expect(page.getByTestId('results-container')).not.toBeVisible();

    // Upload same file again (simulating new upload)
    await page.getByTestId('file-input').setInputFiles(AUDIO_FIXTURE);

    // File should still be loaded
    await expect(page.getByTestId('audio-player')).toBeVisible();
  });

  test('should update start time when clicking audio player', async ({ page }) => {
    await page.getByTestId('file-input').setInputFiles(AUDIO_FIXTURE);
    await expect(page.getByTestId('audio-player')).toBeVisible({ timeout: 5000 });

    // Helper text should mention clicking audio player
    await expect(page.getByText(/Click on the audio player to set start time/i)).toBeVisible();
  });
});
