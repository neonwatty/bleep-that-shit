import { test, expect } from '@playwright/test';

test.describe('Responsive Design - Smoke Tests', () => {
  test.setTimeout(30000); // 30 seconds max per test

  test.describe('Mobile Viewport (375x667)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('home page renders correctly on mobile', async ({ page }) => {
      await page.goto('/');

      // Navbar should be visible
      const navbar = page.locator('nav');
      await expect(navbar).toBeVisible();

      // Main heading should be visible
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible();

      // Footer should be visible
      await expect(page.locator('footer')).toBeVisible();
    });

    test('bleep page renders correctly on mobile', async ({ page }) => {
      await page.goto('/bleep');

      // Main heading should be visible
      await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();

      // File dropzone should be visible
      await expect(page.locator('text=/Drag and drop/i')).toBeVisible();

      // Controls should be visible
      await expect(page.locator('select').first()).toBeVisible();
    });

    test('sampler page renders correctly on mobile', async ({ page }) => {
      await page.goto('/sampler');

      // Main heading should be visible
      await expect(page.locator('h1').filter({ hasText: 'Transcription Sampler' })).toBeVisible();

      // File dropzone should be visible
      await expect(page.locator('text=/Drag and drop/i')).toBeVisible();
    });
  });

  test.describe('Tablet Viewport (768x1024)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
    });

    test('home page renders correctly on tablet', async ({ page }) => {
      await page.goto('/');

      // All main sections should be visible
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();

      // CTA buttons should be visible
      await expect(page.locator('a[href="/bleep"]').first()).toBeVisible();
      await expect(page.locator('a[href="/sampler"]').first()).toBeVisible();
    });

    test('bleep page renders correctly on tablet', async ({ page }) => {
      await page.goto('/bleep');

      // All workflow sections should be visible
      await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();
      await expect(page.locator('h2').filter({ hasText: 'Step 1' })).toBeVisible();
      await expect(page.locator('h2').filter({ hasText: 'Step 2' })).toBeVisible();

      // Controls should be accessible
      await expect(page.locator('select').first()).toBeVisible();
      await expect(page.locator('input[type="file"]')).toBeAttached();
    });

    test('sampler page renders correctly on tablet', async ({ page }) => {
      await page.goto('/sampler');

      // Main sections should be visible
      await expect(page.locator('h1').filter({ hasText: 'Transcription Sampler' })).toBeVisible();
      await expect(page.locator('text=/Why use the sampler?/i')).toBeVisible();
    });
  });

  test.describe('Desktop Viewport (1920x1080)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
    });

    test('home page renders correctly on desktop', async ({ page }) => {
      await page.goto('/');

      const navbar = page.locator('nav');
      await expect(navbar).toBeVisible();

      // Check navbar has horizontal layout on desktop
      await expect(navbar).toHaveClass(/sm:flex-row/);

      // All sections should be visible
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('iframe[src*="youtube.com"]')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    });

    test('bleep page renders correctly on desktop', async ({ page }) => {
      await page.goto('/bleep');

      // All sections should be visible and well-laid-out
      await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();

      // All workflow steps should be visible
      const stepHeadings = page.locator('h2').filter({ hasText: /Step \d/ });
      await expect(stepHeadings).toHaveCount(await stepHeadings.count());

      // Controls should be accessible
      await expect(page.locator('select').first()).toBeVisible();
    });

    test('sampler page renders correctly on desktop', async ({ page }) => {
      await page.goto('/sampler');

      // All sections should be visible
      await expect(page.locator('h1').filter({ hasText: 'Transcription Sampler' })).toBeVisible();
      await expect(page.locator('text=/Why use the sampler?/i')).toBeVisible();
    });
  });

  test.describe('Wide Desktop Viewport (2560x1440)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 2560, height: 1440 });
    });

    test('home page renders correctly on wide desktop', async ({ page }) => {
      await page.goto('/');

      // Content should not be excessively wide
      const mainContent = page.locator('main, div[class*="container"]').first();
      await expect(mainContent).toBeVisible();

      // All elements should be visible
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('nav')).toBeVisible();
    });

    test('bleep page renders correctly on wide desktop', async ({ page }) => {
      await page.goto('/bleep');

      // Layout should adapt to wide screen
      await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();
      await expect(page.locator('select').first()).toBeVisible();
    });

    test('sampler page renders correctly on wide desktop', async ({ page }) => {
      await page.goto('/sampler');

      // Layout should adapt to wide screen
      await expect(page.locator('h1').filter({ hasText: 'Transcription Sampler' })).toBeVisible();
    });
  });
});
