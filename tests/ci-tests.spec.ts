import { test, expect } from '@playwright/test';
import path from 'path';
import { HomePage, BleepPage, SamplerPage, NavbarComponent } from './helpers';

test.describe('CI-Friendly Tests', () => {
  test.describe('Home Page', () => {
    test('should display main elements', async ({ page }) => {
      const homePage = new HomePage(page);
      await homePage.goto();

      await expect(page.locator('h1').first()).toBeVisible();
      // Desktop viewport (default) shows desktop nav
      await expect(page.locator('nav.md\\:flex')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    });
  });

  test.describe('Bleep Page', () => {
    test('should load UI elements', async ({ page }) => {
      const bleepPage = new BleepPage(page);
      await bleepPage.goto();

      // Check main heading
      await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();

      // Check file input using page object
      await expect(bleepPage.fileInput).toBeAttached();
      await expect(bleepPage.fileDropzone).toBeVisible();

      // Check model selector using page object
      await expect(bleepPage.modelSelect).toBeVisible();

      // Upload test file
      const testFile = path.join(__dirname, 'fixtures/files/test.mp3');
      await bleepPage.fileInput.setInputFiles(testFile);

      // Check file loaded
      await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });

      // Check audio player appears
      await expect(page.locator('audio')).toBeVisible();

      // Check transcribe button using page object
      await expect(bleepPage.transcribeButton).toBeEnabled();
    });

    test('should reject invalid files', async ({ page }) => {
      const bleepPage = new BleepPage(page);
      await bleepPage.goto();

      const textFile = path.join(__dirname, 'fixtures/files/sample.txt');
      await bleepPage.fileInput.setInputFiles(textFile);

      // Check file warning using page object
      await expect(bleepPage.fileWarning).toBeVisible({ timeout: 5000 });
    });

    test('should allow language and model selection', async ({ page }) => {
      const bleepPage = new BleepPage(page);
      await bleepPage.goto();

      // Test language selection
      await bleepPage.selectLanguage('es');
      await expect(bleepPage.languageSelect).toHaveValue('es');

      // Test model selection
      await bleepPage.selectModel('Xenova/whisper-base.en');
      await expect(bleepPage.modelSelect).toHaveValue('Xenova/whisper-base.en');
    });
  });

  test.describe('Sampler Page', () => {
    test('should load UI elements', async ({ page }) => {
      const samplerPage = new SamplerPage(page);
      await samplerPage.goto();

      // Check heading
      await expect(page.locator('h1').filter({ hasText: 'Transcription Sampler' })).toBeVisible();

      // Check info box
      await expect(page.locator('text=/Why use the sampler?/')).toBeVisible();

      // Check file dropzone using page object
      await expect(samplerPage.fileDropzone).toBeVisible();

      // Upload file to reveal configuration
      const testFile = path.join(__dirname, 'fixtures/files/test.mp3');
      await samplerPage.fileInput.setInputFiles(testFile);

      // Check configuration section appears
      await expect(page.locator('h2').filter({ hasText: 'Step 2: Configure Sample' })).toBeVisible({
        timeout: 5000,
      });

      // Check compare button using page object
      await expect(samplerPage.compareAllButton).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate between pages', async ({ page }) => {
      const navbar = new NavbarComponent(page);
      await page.goto('/');

      // Navigate to Bleep using page object
      await navbar.goToBleepPage();
      await expect(page).toHaveURL(/.*\/bleep/);
      await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();

      // Navigate to Sampler using page object
      await navbar.goToSamplerPage();
      await expect(page).toHaveURL(/.*\/sampler/);
      await expect(page.locator('h1').filter({ hasText: 'Transcription Sampler' })).toBeVisible();

      // Navigate back home using page object
      await navbar.goToHome();
      await expect(page).toHaveURL(/.*\//);
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive', async ({ page }) => {
      // Desktop - desktop nav visible
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');
      await expect(page.locator('nav.md\\:flex')).toBeVisible();

      // Tablet (768px is the md breakpoint) - desktop nav visible
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('nav.md\\:flex')).toBeVisible();

      // Mobile - mobile nav visible
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('nav.md\\:hidden')).toBeVisible();
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
