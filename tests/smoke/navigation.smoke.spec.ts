import { test, expect } from '@playwright/test';
import { HomePage, NavbarComponent, skipOnboardingWizard } from '../helpers';

test.describe('Navigation - Smoke Tests', () => {
  test.setTimeout(30000); // 30 seconds max per test

  test.beforeEach(async ({ page }) => {
    // Skip onboarding wizard on bleep page (simulates returning user)
    await page.addInitScript(skipOnboardingWizard);
  });

  test('navigates from home to bleep page via navbar', async ({ page }) => {
    await page.goto('/');
    const navbar = new NavbarComponent(page);

    await navbar.goToBleepPage();

    // Verify URL changed
    await expect(page).toHaveURL(/.*\/bleep/);

    // Verify bleep page content loaded
    await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();
  });

  test('navigates from home to sampler page via navbar', async ({ page }) => {
    await page.goto('/');
    const navbar = new NavbarComponent(page);

    await navbar.goToSamplerPage();

    // Verify URL changed
    await expect(page).toHaveURL(/.*\/sampler/);

    // Verify sampler page content loaded
    await expect(page.locator('h1').filter({ hasText: 'Transcription Sampler' })).toBeVisible();
  });

  test('navigates from home to bleep page via hero CTA', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await homePage.goToBleepPage();

    // Verify navigation
    await expect(page).toHaveURL(/.*\/bleep/);
    await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();
  });

  test('navigates from home to sampler page via hero CTA', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await homePage.goToSamplerPage();

    // Verify navigation
    await expect(page).toHaveURL(/.*\/sampler/);
    await expect(page.locator('h1').filter({ hasText: 'Transcription Sampler' })).toBeVisible();
  });

  test('navigates from bleep to sampler using navbar', async ({ page }) => {
    await page.goto('/bleep');
    const navbar = new NavbarComponent(page);

    await navbar.goToSamplerPage();

    // Verify navigation
    await expect(page).toHaveURL(/.*\/sampler/);
    await expect(page.locator('h1').filter({ hasText: 'Transcription Sampler' })).toBeVisible();
  });

  test('navigates from sampler to bleep using navbar', async ({ page }) => {
    await page.goto('/sampler');
    const navbar = new NavbarComponent(page);

    await navbar.goToBleepPage();

    // Verify navigation
    await expect(page).toHaveURL(/.*\/bleep/);
    await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();
  });

  test('navigates back to home from bleep page', async ({ page }) => {
    await page.goto('/bleep');
    const navbar = new NavbarComponent(page);

    await navbar.goToHome();

    // Verify navigation to home
    await expect(page).toHaveURL(/^.*\/$|^.*\/$/); // Matches root path
    await expect(page.locator('h1').first()).toContainText('Effortlessly bleep out');
  });

  test('navigates back to home from sampler page', async ({ page }) => {
    await page.goto('/sampler');
    const navbar = new NavbarComponent(page);

    await navbar.goToHome();

    // Verify navigation to home
    await expect(page).toHaveURL(/^.*\/$|^.*\/$/);
    await expect(page.locator('h1').first()).toContainText('Effortlessly bleep out');
  });

  test('navbar is present and visible on all pages', async ({ page }) => {
    const pages = ['/', '/bleep', '/sampler'];

    for (const pagePath of pages) {
      await page.goto(pagePath);

      const navbar = new NavbarComponent(page);
      await navbar.expectNavbarVisible();

      // Check navbar links are present (use visible nav)
      await expect(page.locator('nav:visible a[href="/"]')).toBeVisible();
      await expect(page.locator('nav:visible a[href="/bleep"]')).toBeVisible();
      await expect(page.locator('nav:visible a[href="/sampler"]')).toBeVisible();
    }
  });

  test('footer is present on all pages', async ({ page }) => {
    const pages = ['/', '/bleep', '/sampler'];

    for (const pagePath of pages) {
      await page.goto(pagePath);

      // Verify footer is visible
      const footer = page.locator('footer').first();
      await expect(footer).toBeVisible();

      // Verify GitHub link is present
      const githubLink = footer.locator('a[href*="github.com"]').first();
      await expect(githubLink).toBeVisible();
    }
  });
});
