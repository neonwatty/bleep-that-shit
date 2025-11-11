import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Simple Bleep Page Tests', () => {
  test('should load bleep page and upload file', async ({ page }) => {
    // Navigate to bleep page
    await page.goto('/bleep');

    // Check page loaded
    await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();

    // Check file input exists
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Upload a test file
    const testFile = path.join(__dirname, 'fixtures/files/test.mp3');
    await fileInput.setInputFiles(testFile);

    // Check file loaded message
    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });

    // Check audio player appears
    const audioPlayer = page.locator('audio');
    await expect(audioPlayer).toBeVisible();

    // Check transcription button is enabled
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await expect(transcribeBtn).toBeEnabled();

    // Check model selector exists and has options
    const modelSelect = page.locator('select').nth(1);
    await expect(modelSelect).toBeVisible();
    const options = await modelSelect.locator('option').count();
    expect(options).toBeGreaterThan(0);
  });

  test('should handle invalid file types', async ({ page }) => {
    await page.goto('/bleep');

    const fileInput = page.locator('input[type="file"]');
    const textFile = path.join(__dirname, 'fixtures/files/sample.txt');
    await fileInput.setInputFiles(textFile);

    // Should show warning for invalid file
    const warning = page.locator('text=/Please upload a valid audio or video file/');
    await expect(warning).toBeVisible({ timeout: 5000 });
  });

  test('should handle file replacement', async ({ page }) => {
    await page.goto('/bleep');

    const fileInput = page.locator('input[type="file"]');

    // Upload first file
    const file1 = path.join(__dirname, 'fixtures/files/test.mp3');
    await fileInput.setInputFiles(file1);
    await expect(page.locator('text=/test.mp3/')).toBeVisible();

    // Upload second file
    const file2 = path.join(__dirname, 'fixtures/files/test_full.mp3');
    await fileInput.setInputFiles(file2);
    await expect(page.locator('text=/test_full.mp3/')).toBeVisible();
  });
});
