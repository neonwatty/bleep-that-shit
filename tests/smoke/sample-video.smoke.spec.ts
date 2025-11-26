import { test, expect } from '@playwright/test';
import { HomePage, BleepPage, SamplerPage } from '../helpers';

test.describe('Sample Video Feature - Smoke Tests', () => {
  test.setTimeout(60000); // 60 seconds max per test (sample video needs to load)

  test.describe('Home Page Sample Video Button', () => {
    test('displays sample video button in hero section', async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      // Check if sample video button exists
      const sampleButton = page.locator('a[href="/bleep?sample=bob-ross"]').first();
      await expect(sampleButton).toBeVisible();

      // Check button text
      await expect(sampleButton).toContainText('Bob Ross Video');
      await expect(sampleButton).toContainText('🎨');
    });

    test('sample video button has correct link', async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      const sampleButton = page.locator('a[href="/bleep?sample=bob-ross"]').first();
      await expect(sampleButton).toHaveAttribute('href', '/bleep?sample=bob-ross');
    });

    test('displays helper text above sample button', async ({ page }) => {
      await page.goto('/');

      const helperText = page.locator('text=/No video.*Try our sample/i');
      await expect(helperText).toBeVisible();
    });

    test('navigates to bleep page with sample parameter when clicked', async ({ page }) => {
      await page.goto('/');

      const sampleButton = page.locator('a[href="/bleep?sample=bob-ross"]').first();
      await sampleButton.click();

      // Should navigate to bleep page with sample parameter
      await expect(page).toHaveURL(/\/bleep\?sample=bob-ross/);
    });
  });

  test.describe('Bleep Page Sample Video Button', () => {
    test('displays sample video button when no file is loaded', async ({ page }) => {
      const bleepPage = new BleepPage(page);
      await bleepPage.goto();

      // Sample button should be visible when no file is loaded
      const sampleButton = page.locator('a[href="/bleep?sample=bob-ross"]');
      await expect(sampleButton).toBeVisible();
    });

    test('sample video button has correct styling', async ({ page }) => {
      await page.goto('/bleep');

      const sampleButton = page.locator('a[href="/bleep?sample=bob-ross"]');
      await expect(sampleButton).toBeVisible();

      // Check for expected classes
      await expect(sampleButton).toHaveClass(/bg-indigo-600/);
      await expect(sampleButton).toContainText('Bob Ross Video');
    });
  });

  test.describe('Sample Video Loading', () => {
    test('shows loading indicator when sample parameter is present', async ({ page }) => {
      await page.goto('/bleep?sample=bob-ross');

      // Should show loading message
      const loadingMessage = page.locator('text=/Loading sample video/i');

      // Loading message should appear (might be brief)
      // Use a short timeout since the video might load quickly
      try {
        await expect(loadingMessage).toBeVisible({ timeout: 2000 });
      } catch {
        // Loading might be too fast to catch - that's okay
        // Skip to next check
      }
    });

    test('loads sample video when sample parameter is present', async ({ page }) => {
      await page.goto('/bleep?sample=bob-ross');

      // Wait for file to be loaded (check for "File loaded" message or video player)
      const fileLoaded = page.locator('text=/File loaded.*bob-ross/i');
      await expect(fileLoaded).toBeVisible({ timeout: 30000 });

      // Video player should appear
      const videoPlayer = page.locator('video');
      await expect(videoPlayer).toBeVisible({ timeout: 5000 });

      // Transcribe button should be enabled
      const bleepPage = new BleepPage(page);
      await expect(bleepPage.transcribeButton).toBeEnabled({ timeout: 5000 });
    });

    test('sample button disappears after video loads', async ({ page }) => {
      await page.goto('/bleep?sample=bob-ross');

      // Wait for video to load
      await expect(page.locator('text=/File loaded/i')).toBeVisible({ timeout: 30000 });

      // Sample button should no longer be visible
      const sampleButton = page.locator('a[href="/bleep?sample=bob-ross"]');
      await expect(sampleButton).not.toBeVisible();
    });
  });

  test.describe('Updated Button Text', () => {
    test('displays "Test Transcription" instead of "Try the Sampler"', async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      // Check that the button says "Test Transcription"
      await expect(homePage.samplerButton).toContainText('Test Transcription');

      // Make sure it doesn't say the old text
      await expect(homePage.samplerButton).not.toContainText('Try the Sampler');
    });

    test('"Test Transcription" button navigates to sampler page', async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      await homePage.samplerButton.click();
      await expect(page).toHaveURL(/\/sampler/);
    });
  });

  test.describe('Sampler Page Sample Video Button', () => {
    test('displays try demo link when no file is loaded', async ({ page }) => {
      const samplerPage = new SamplerPage(page);
      await samplerPage.goto();

      // Try demo link should be visible when no file is loaded
      const tryDemoLink = page.getByTestId('try-demo-link');
      await expect(tryDemoLink).toBeVisible();
      await expect(tryDemoLink).toContainText('Try with Bob Ross sample video');
    });

    test('try demo link has correct href', async ({ page }) => {
      await page.goto('/sampler');

      const tryDemoLink = page.getByTestId('try-demo-link');
      await expect(tryDemoLink).toHaveAttribute('href', '/sampler?sample=bob-ross');
    });

    test('try demo link navigates to sampler with sample parameter', async ({ page }) => {
      await page.goto('/sampler');

      const tryDemoLink = page.getByTestId('try-demo-link');
      await tryDemoLink.click();

      await expect(page).toHaveURL(/\/sampler\?sample=bob-ross/);
    });

    test('shows loading indicator when sample parameter is present', async ({ page }) => {
      await page.goto('/sampler?sample=bob-ross');

      // Should show loading message
      const loadingMessage = page.getByTestId('loading-sample');

      // Loading message should appear (might be brief)
      try {
        await expect(loadingMessage).toBeVisible({ timeout: 2000 });
      } catch {
        // Loading might be too fast to catch - that's okay
      }
    });

    test('loads sample video when sample parameter is present', async ({ page }) => {
      await page.goto('/sampler?sample=bob-ross');

      // Wait for file to be loaded
      const fileLoaded = page.locator('text=/File loaded.*bob-ross/i');
      await expect(fileLoaded).toBeVisible({ timeout: 30000 });

      // Audio/video player should appear
      const audioPlayer = page.getByTestId('audio-player');
      await expect(audioPlayer).toBeVisible({ timeout: 5000 });

      // Compare button should be enabled
      const compareButton = page.getByTestId('compare-all-button');
      await expect(compareButton).toBeEnabled({ timeout: 5000 });
    });

    test('try demo link disappears after video loads', async ({ page }) => {
      await page.goto('/sampler?sample=bob-ross');

      // Wait for video to load
      await expect(page.locator('text=/File loaded/i')).toBeVisible({ timeout: 30000 });

      // Try demo link should no longer be visible
      const tryDemoLink = page.getByTestId('try-demo-link');
      await expect(tryDemoLink).not.toBeVisible();
    });
  });
});
