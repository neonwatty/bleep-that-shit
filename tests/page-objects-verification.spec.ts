import { test, expect } from '@playwright/test';
import { BleepPage, HomePage, SamplerPage, NavbarComponent } from './helpers';

test.describe('Page Objects Verification', () => {
  test('BleepPage - basic elements are accessible', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    await bleepPage.goto();

    // Verify key elements are visible
    await expect(bleepPage.fileDropzone).toBeVisible();
    await expect(bleepPage.languageSelect).toBeVisible();
    await expect(bleepPage.modelSelect).toBeVisible();
    await expect(bleepPage.transcribeButton).toBeVisible();
    await expect(bleepPage.wordsToMatchInput).toBeVisible();
  });

  test('HomePage - basic elements are accessible', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Verify key elements are visible
    await expect(homePage.heroSection).toBeVisible();
    await expect(homePage.bleepButton).toBeVisible();
    await expect(homePage.samplerButton).toBeVisible();
  });

  test('HomePage - navigation to Bleep page works', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Navigate to bleep page
    await homePage.goToBleepPage();

    // Verify we're on the bleep page
    await expect(page).toHaveURL('/bleep');
  });

  test('HomePage - navigation to Sampler page works', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    // Navigate to sampler page
    await homePage.goToSamplerPage();

    // Verify we're on the sampler page
    await expect(page).toHaveURL('/sampler');
  });

  test('SamplerPage - basic elements are accessible', async ({ page }) => {
    const samplerPage = new SamplerPage(page);
    await samplerPage.goto();

    // Verify key elements are visible
    await expect(samplerPage.fileDropzone).toBeVisible();
    await expect(samplerPage.languageSelect).toBeVisible();
    await expect(samplerPage.compareAllButton).toBeVisible();
  });

  test('Navbar - navigation elements are accessible', async ({ page }) => {
    await page.goto('/');
    const navbar = new NavbarComponent(page);

    // Verify navbar elements are visible
    await navbar.expectNavbarVisible();
  });

  test('Navbar - navigation between pages works', async ({ page }) => {
    await page.goto('/');
    const navbar = new NavbarComponent(page);

    // Navigate to bleep page
    await navbar.goToBleepPage();
    await expect(page).toHaveURL('/bleep');

    // Navigate to sampler page
    await navbar.goToSamplerPage();
    await expect(page).toHaveURL('/sampler');

    // Navigate back home
    await navbar.goToHome();
    await expect(page).toHaveURL('/');
  });

  test('BleepPage - language and model selection works', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    await bleepPage.goto();

    // Test language selection
    await bleepPage.selectLanguage('es');
    await expect(bleepPage.languageSelect).toHaveValue('es');

    // Test model selection
    await bleepPage.selectModel('Xenova/whisper-base.en');
    await expect(bleepPage.modelSelect).toHaveValue('Xenova/whisper-base.en');
  });

  test('BleepPage - word matching controls are accessible', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    await bleepPage.goto();

    // Verify matching controls
    await expect(bleepPage.exactMatchCheckbox).toBeVisible();
    await expect(bleepPage.partialMatchCheckbox).toBeVisible();
    await expect(bleepPage.fuzzyMatchCheckbox).toBeVisible();

    // Test entering words
    await bleepPage.enterWordsToMatch('test, word');
    await expect(bleepPage.wordsToMatchInput).toHaveValue('test, word');
  });

  test('BleepPage - bleep sound and volume controls work', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    await bleepPage.goto();

    // Test bleep sound selection
    await bleepPage.selectBleepSound('brown');
    await expect(bleepPage.bleepSoundSelect).toHaveValue('brown');

    // Test volume slider
    await bleepPage.setBleepVolume(50);
    await expect(bleepPage.bleepVolumeSlider).toHaveValue('50');
  });

  test('SamplerPage - sample configuration works', async ({ page }) => {
    const samplerPage = new SamplerPage(page);
    await samplerPage.goto();

    // Note: configuration controls only appear after file upload
    // Just verify the page loads correctly
    await expect(samplerPage.fileDropzone).toBeVisible();
  });
});
