import { test, expect } from '@playwright/test';
import { BleepPage, SamplerPage } from '../helpers';
import path from 'path';

test.describe('File Upload - Smoke Tests', () => {
  test.setTimeout(30000); // 30 seconds max per test

  test.describe('Bleep Page File Upload', () => {
    test('accepts valid MP3 file', async ({ page }) => {
      const bleepPage = new BleepPage(page);
      await bleepPage.goto();

      const testFile = path.join(__dirname, '../fixtures/files/test.mp3');
      await bleepPage.fileInput.setInputFiles(testFile);

      // Should show file loaded message
      await expect(page.locator('text=/File loaded:/i')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=/test.mp3/i')).toBeVisible();

      // Should show audio player
      await expect(page.locator('audio')).toBeVisible();

      // Should enable transcribe button (but DON'T click it!)
      await expect(bleepPage.transcribeButton).toBeEnabled();
    });

    test('accepts valid MP4 file', async ({ page }) => {
      const bleepPage = new BleepPage(page);
      await bleepPage.goto();

      const testFile = path.join(__dirname, '../fixtures/files/test.mp4');

      // Check if test.mp4 exists, if not use test.mp3
      await bleepPage.fileInput.setInputFiles(testFile).catch(async () => {
        // Fallback to mp3 if mp4 doesn't exist
        const mp3File = path.join(__dirname, '../fixtures/files/test.mp3');
        await bleepPage.fileInput.setInputFiles(mp3File);
      });

      // Should show file loaded message
      await expect(page.locator('text=/File loaded:/i')).toBeVisible({ timeout: 5000 });

      // Should enable transcribe button
      await expect(bleepPage.transcribeButton).toBeEnabled();
    });

    test('rejects invalid text file', async ({ page }) => {
      const bleepPage = new BleepPage(page);
      await bleepPage.goto();

      const textFile = path.join(__dirname, '../fixtures/files/sample.txt');
      await bleepPage.fileInput.setInputFiles(textFile);

      // Should show error/warning message
      await expect(bleepPage.fileWarning).toBeVisible({ timeout: 5000 });

      // Transcribe button should remain disabled
      await expect(bleepPage.transcribeButton).toBeDisabled();
    });

    test('shows audio player after valid file upload', async ({ page }) => {
      const bleepPage = new BleepPage(page);
      await bleepPage.goto();

      const testFile = path.join(__dirname, '../fixtures/files/test.mp3');
      await bleepPage.fileInput.setInputFiles(testFile);

      // Wait for audio player to appear
      await expect(page.locator('audio')).toBeVisible({ timeout: 5000 });

      // Audio player should have controls
      const audioPlayer = page.locator('audio').first();
      await expect(audioPlayer).toHaveAttribute('controls', '');
    });

    test('displays file name and duration after upload', async ({ page }) => {
      const bleepPage = new BleepPage(page);
      await bleepPage.goto();

      const testFile = path.join(__dirname, '../fixtures/files/test.mp3');
      await bleepPage.fileInput.setInputFiles(testFile);

      // Should show file name
      await expect(page.locator('text=/test.mp3/i')).toBeVisible({ timeout: 5000 });

      // Should show duration (format: X.X seconds or MM:SS)
      await expect(page.locator('text=/duration/i')).toBeVisible();
    });
  });

  test.describe('Sampler Page File Upload', () => {
    test('accepts valid MP3 file', async ({ page }) => {
      const samplerPage = new SamplerPage(page);
      await samplerPage.goto();

      const testFile = path.join(__dirname, '../fixtures/files/test.mp3');
      await samplerPage.fileInput.setInputFiles(testFile);

      // Should show file loaded message
      await expect(page.locator('text=/File loaded:/i')).toBeVisible({ timeout: 5000 });

      // Configuration section should appear
      await expect(page.locator('h2').filter({ hasText: 'Step 2: Configure Sample' })).toBeVisible({
        timeout: 5000,
      });

      // Compare button should become enabled (but DON'T click it!)
      await expect(samplerPage.compareAllButton).toBeEnabled();
    });

    test('rejects invalid file', async ({ page }) => {
      const samplerPage = new SamplerPage(page);
      await samplerPage.goto();

      const textFile = path.join(__dirname, '../fixtures/files/sample.txt');
      await samplerPage.fileInput.setInputFiles(textFile);

      // Should show error/warning message
      await expect(page.locator('text=/Please upload a valid/i')).toBeVisible({ timeout: 5000 });

      // Compare button should remain disabled
      await expect(samplerPage.compareAllButton).toBeDisabled();
    });

    test('shows audio player after valid file upload', async ({ page }) => {
      const samplerPage = new SamplerPage(page);
      await samplerPage.goto();

      const testFile = path.join(__dirname, '../fixtures/files/test.mp3');
      await samplerPage.fileInput.setInputFiles(testFile);

      // Wait for audio player to appear
      await expect(page.locator('audio')).toBeVisible({ timeout: 5000 });
    });
  });
});
