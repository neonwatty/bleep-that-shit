import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('CI-Friendly Tests', () => {
  test.describe('Home Page', () => {
    test('should display main elements', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    });
  });

  test.describe('Bleep Page', () => {
    test('should load UI elements', async ({ page }) => {
      await page.goto('/bleep');
      
      // Check main heading
      await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();
      
      // Check file input
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeAttached();
      
      // Check model selector
      const modelSelect = page.locator('select').nth(1);
      await expect(modelSelect).toBeVisible();
      
      // Upload test file
      const testFile = path.join(__dirname, 'fixtures/files/test.mp3');
      await fileInput.setInputFiles(testFile);
      
      // Check file loaded
      await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });
      
      // Check audio player appears
      await expect(page.locator('audio')).toBeVisible();
      
      // Check transcribe button
      const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
      await expect(transcribeBtn).toBeEnabled();
    });
    
    test('should reject invalid files', async ({ page }) => {
      await page.goto('/bleep');
      
      const fileInput = page.locator('input[type="file"]');
      const textFile = path.join(__dirname, 'fixtures/files/sample.txt');
      await fileInput.setInputFiles(textFile);
      
      await expect(page.locator('text=/Please upload a valid audio or video file/')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Sampler Page', () => {
    test('should load UI elements', async ({ page }) => {
      await page.goto('/sampler');
      
      // Check heading
      await expect(page.locator('h1').filter({ hasText: 'Transcription Sampler' })).toBeVisible();
      
      // Check info box
      await expect(page.locator('text=/Why use the sampler?/')).toBeVisible();
      
      // Check file dropzone - use the specific border class
      const dropzone = page.locator('.border-dashed').first();
      await expect(dropzone).toBeVisible();
      
      // Upload file to reveal configuration
      const fileInput = page.locator('input[type="file"]');
      const testFile = path.join(__dirname, 'fixtures/files/test.mp3');
      await fileInput.setInputFiles(testFile);
      
      // Check configuration section appears
      await expect(page.locator('h2').filter({ hasText: 'Step 2: Configure Sample' })).toBeVisible({ timeout: 5000 });
      
      // Check compare button appears
      const compareBtn = page.locator('button').filter({ hasText: 'Compare All Models' });
      await expect(compareBtn).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate between pages', async ({ page }) => {
      await page.goto('/');
      
      // Navigate to Bleep
      await page.locator('a[href="/bleep"]').first().click();
      await expect(page).toHaveURL(/.*\/bleep/);
      await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();
      
      // Navigate to Sampler
      await page.locator('a[href="/sampler"]').first().click();
      await expect(page).toHaveURL(/.*\/sampler/);
      await expect(page.locator('h1').filter({ hasText: 'Transcription Sampler' })).toBeVisible();
      
      // Navigate back home
      await page.locator('a[href="/"]').first().click();
      await expect(page).toHaveURL(/.*\//);
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive', async ({ page }) => {
      // Desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');
      await expect(page.locator('nav')).toBeVisible();
      
      // Tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('nav')).toBeVisible();
      
      // Mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('nav')).toBeVisible();
    });
  });
});

// Skipped tests that require model loading or have known issues
test.describe.skip('Heavy Tests - Manual Testing Required', () => {
  test('transcription with model loading', async ({ page }) => {
    // This test requires Whisper models to be downloaded
    // Run manually with cached models
  });
  
  test('video extraction and transcription', async ({ page }) => {
    // This test has FFmpeg CORS issues in workers
    // Test manually in development environment
  });
  
  test('model comparison in sampler', async ({ page }) => {
    // This test requires multiple model downloads
    // Test manually with extended timeouts
  });
});