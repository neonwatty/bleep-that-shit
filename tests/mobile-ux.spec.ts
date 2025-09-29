import { test, expect } from '@playwright/test';

test.describe('Mobile UX Improvements', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('should have mobile-optimized navigation', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that mobile nav is visible (should be visible on mobile, hidden on desktop)
    const mobileNav = page.locator('nav.md\\:hidden');
    await expect(mobileNav).toBeVisible();

    // Check hamburger menu button
    const hamburgerButton = page.locator('button[aria-label="Toggle menu"]');
    await expect(hamburgerButton).toBeVisible();

    // Test hamburger menu functionality
    await hamburgerButton.click();

    // Wait for animation and check mobile menu drawer appears
    await page.waitForTimeout(300);
    const menuDrawer = page.locator('div[class*="translate-x-0"]:not([class*="translate-x-full"])');
    await expect(menuDrawer).toBeVisible();

    // Check menu items are present in the drawer
    await expect(page.locator('text=Home')).toBeVisible();
    await expect(page.locator('text=Bleep Your Sh*t!')).toBeVisible();
    await expect(page.locator('text=Transcription Sampler')).toBeVisible();

    // Close menu
    await page.locator('button[aria-label="Close menu"]').click();
  });

  test('should have proper touch targets on bleep page', async ({ page }) => {
    await page.goto('/bleep');

    // Check file upload area has proper size
    const dropzone = page.locator('[role="presentation"]').first();
    const dropzoneBox = await dropzone.boundingBox();
    expect(dropzoneBox?.height).toBeGreaterThan(100); // Minimum 100px height

    // Check buttons have minimum touch target size (44px)
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  test('should have mobile-optimized typography', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    // Check main title is visible and not too large on mobile
    const mainTitle = page.locator('h1').first();
    await expect(mainTitle).toBeVisible();

    // Check that text is readable (not too small)
    const bodyText = page.locator('p').first();
    if ((await bodyText.count()) > 0) {
      const fontSize = await bodyText.evaluate(el => window.getComputedStyle(el).fontSize);
      const fontSizeNum = parseFloat(fontSize);
      expect(fontSizeNum).toBeGreaterThanOrEqual(14); // At least 14px
    }
  });

  test('should have mobile-optimized form inputs', async ({ page }) => {
    await page.goto('/bleep');
    await page.waitForLoadState('networkidle');

    // Check file input exists and is touch-friendly
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();

    // Check dropzone area has proper touch size
    const dropzone = page.locator('[role="presentation"]').first();
    if ((await dropzone.count()) > 0) {
      const dropzoneBox = await dropzone.boundingBox();
      if (dropzoneBox) {
        expect(dropzoneBox.height).toBeGreaterThan(100); // Minimum touch area
      }
    }

    // Check select elements have proper height if they exist
    const selects = await page.locator('select').all();
    for (const select of selects) {
      if (await select.isVisible()) {
        const box = await select.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }

    // Check button elements have proper touch targets
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  test('should have proper mobile spacing', async ({ page }) => {
    await page.goto('/bleep');

    // Check that sections don't have excessive margin on mobile
    const sections = await page.locator('section').all();
    for (const section of sections.slice(0, 3)) {
      // Test first 3 sections
      const marginBottom = await section.evaluate(el =>
        parseInt(window.getComputedStyle(el).marginBottom, 10)
      );
      expect(marginBottom).toBeLessThan(80); // Not too much space on mobile
    }
  });

  test('should handle viewport changes gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test different mobile viewport sizes
    const viewports = [
      { width: 320, height: 568 }, // iPhone SE
      { width: 375, height: 667 }, // iPhone 8
      { width: 414, height: 896 }, // iPhone 11
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(100); // Allow viewport to adjust

      // Check main content is visible
      const main = page.locator('main');
      await expect(main).toBeVisible();

      // Check no horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBeFalsy();
    }
  });

  test('should have accessible mobile interactions', async ({ page }) => {
    await page.goto('/bleep');

    // Test keyboard navigation on mobile (accessibility)
    await page.keyboard.press('Tab');

    // Check that focused elements are visible
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();

    // Test that buttons can be activated with Enter
    const firstButton = page.locator('button').first();
    if (await firstButton.isVisible()) {
      await firstButton.focus();
      // Just check focus works, don't actually trigger action
      expect(await firstButton.evaluate(el => el === document.activeElement)).toBeTruthy();
    }
  });

  test('should have mobile-optimized media players', async ({ page }) => {
    await page.goto('/bleep');
    await page.waitForLoadState('networkidle');

    // Check that the page structure supports media players
    // Look for media player container or iframe elements
    const mediaContainers = page.locator('video, iframe, audio, [class*="player"]');

    // If media players exist on the page, check they're mobile-optimized
    const mediaCount = await mediaContainers.count();
    if (mediaCount > 0) {
      const firstMedia = mediaContainers.first();
      const mediaBox = await firstMedia.boundingBox();
      if (mediaBox) {
        const viewportWidth = 375; // Our test viewport
        expect(mediaBox.width).toBeLessThanOrEqual(viewportWidth - 32); // Account for padding
      }
    }

    // Check for responsive video containers
    const responsiveContainers = page.locator(
      '[class*="responsive"], [class*="embed"], [class*="video"]'
    );
    const containerCount = await responsiveContainers.count();
    if (containerCount > 0) {
      const container = responsiveContainers.first();
      const containerBox = await container.boundingBox();
      if (containerBox) {
        const viewportWidth = 375;
        expect(containerBox.width).toBeLessThanOrEqual(viewportWidth);
      }
    }
  });

  test('should load quickly on mobile', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should load within reasonable time (mobile networks are slower)
    expect(loadTime).toBeLessThan(10000); // 10 seconds max for realistic mobile loading

    // Check critical content is visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('nav.md\\:hidden')).toBeVisible(); // Mobile nav specifically
  });
});
