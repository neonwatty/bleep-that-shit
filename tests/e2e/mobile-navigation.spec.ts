/**
 * E2E Test: Mobile Navigation
 *
 * Tests mobile-specific navigation:
 * - Hamburger menu opens/closes
 * - Menu links navigate correctly
 * - Mobile navbar visible at small viewports
 * - Desktop navbar visible at large viewports
 */

import { test, expect } from './e2e-setup';

// Mobile viewport size (iPhone SE)
const MOBILE_VIEWPORT = { width: 375, height: 667 };
// Desktop viewport size
const DESKTOP_VIEWPORT = { width: 1280, height: 720 };

test.describe('Mobile Navigation - Hamburger Menu', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');
  });

  test('should show mobile navbar on small screens', async ({ page }) => {
    // Mobile nav should be visible
    const mobileNav = page.locator('nav').filter({ hasText: 'Bleep That Sh*t!' }).first();
    await expect(mobileNav).toBeVisible();

    // Hamburger button should be visible
    const hamburgerButton = page.getByRole('button', { name: /toggle menu/i });
    await expect(hamburgerButton).toBeVisible();
  });

  test('should open menu when clicking hamburger', async ({ page }) => {
    // Click hamburger
    await page.getByRole('button', { name: /toggle menu/i }).click();

    // Menu drawer should be visible - look for the drawer element
    const menuDrawer = page
      .locator('[data-testid="mobile-menu-drawer"]')
      .or(page.locator('div[role="dialog"]'))
      .or(page.locator('.fixed.inset-0'));
    await expect(menuDrawer.first()).toBeVisible();

    // Menu items should be visible (use role-based selectors in menu context)
    await expect(page.getByRole('link', { name: /home/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /bleep/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /sampler/i }).first()).toBeVisible();
  });

  test('should close menu when clicking X button', async ({ page }) => {
    // Open menu
    await page.getByRole('button', { name: /toggle menu/i }).click();

    // Wait for menu to open
    await expect(page.getByRole('link', { name: /home/i }).first()).toBeVisible();

    // Click close button
    await page.getByRole('button', { name: /close menu/i }).click();

    // Menu should be hidden - hamburger should be visible again
    await expect(page.getByRole('button', { name: /toggle menu/i })).toBeVisible();
  });

  test('should close menu when clicking overlay', async ({ page }) => {
    // Open menu
    await page.getByRole('button', { name: /toggle menu/i }).click();

    // Wait for menu to open
    await expect(page.getByRole('link', { name: /home/i }).first()).toBeVisible();

    // Click overlay (click outside the menu drawer)
    await page.mouse.click(50, 300);

    // Menu should close - hamburger should be visible
    await expect(page.getByRole('button', { name: /toggle menu/i })).toBeVisible();
  });

  test('should navigate to home from menu', async ({ page }) => {
    // Go to bleep page first
    await page.goto('/bleep');
    await page.setViewportSize(MOBILE_VIEWPORT);

    // Open menu
    await page.getByRole('button', { name: /toggle menu/i }).click();

    // Click Home link
    await page.getByRole('link', { name: /home/i }).click();

    // Should be on home page
    await expect(page).toHaveURL('/');
  });

  test('should navigate to bleep page from menu', async ({ page }) => {
    // Open menu
    await page.getByRole('button', { name: /toggle menu/i }).click();

    // Wait for menu to open
    await expect(page.getByRole('link', { name: /home/i }).first()).toBeVisible();

    // Click Bleep link (in mobile menu) - use first matching link
    await page.locator('a[href="/bleep"]').first().click();

    // Should be on bleep page
    await expect(page).toHaveURL(/\/bleep$/);
  });

  test('should navigate to sampler page from menu', async ({ page }) => {
    // Open menu
    await page.getByRole('button', { name: /toggle menu/i }).click();

    // Wait for menu to open
    await expect(page.getByRole('link', { name: /home/i }).first()).toBeVisible();

    // Click Sampler link (in mobile menu) - use first matching link
    await page.locator('a[href="/sampler"]').first().click();

    // Should be on sampler page
    await expect(page).toHaveURL(/\/sampler$/);
  });

  test('should show social links in menu drawer', async ({ page }) => {
    // Open menu
    await page.getByRole('button', { name: /toggle menu/i }).click();

    // Wait for menu to open
    await expect(page.getByRole('link', { name: /home/i }).first()).toBeVisible();

    // Social links should be present (use first() to avoid strict mode)
    await expect(page.getByRole('link', { name: /github/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /discord/i }).first()).toBeVisible();
  });
});

test.describe('Desktop Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/');
  });

  test('should show desktop navbar on large screens', async ({ page }) => {
    // Desktop nav should be visible (hidden md:flex class)
    const desktopNav = page.locator('nav.hidden.md\\:flex');
    await expect(desktopNav).toBeVisible();

    // Navbar logo (use last() to get desktop nav version, first is hidden mobile nav)
    await expect(page.getByTestId('navbar-logo').last()).toBeVisible();

    // Nav links (use last() to get visible desktop versions)
    await expect(page.getByTestId('navbar-bleep-link').last()).toBeVisible();
    await expect(page.getByTestId('navbar-sampler-link').last()).toBeVisible();
  });

  test('should not show hamburger on desktop', async ({ page }) => {
    // Hamburger should be hidden on desktop
    const hamburgerButton = page.getByRole('button', { name: /toggle menu/i });
    await expect(hamburgerButton).not.toBeVisible();
  });

  test('should navigate to bleep page from desktop navbar', async ({ page }) => {
    // Use last() to get visible desktop nav link
    await page.getByTestId('navbar-bleep-link').last().click();
    await expect(page).toHaveURL(/\/bleep$/);
  });

  test('should navigate to sampler page from desktop navbar', async ({ page }) => {
    // Use last() to get visible desktop nav link
    await page.getByTestId('navbar-sampler-link').last().click();
    await expect(page).toHaveURL(/\/sampler$/);
  });

  test('should navigate to home when clicking logo', async ({ page }) => {
    // Go to bleep page first
    await page.goto('/bleep');
    await page.setViewportSize(DESKTOP_VIEWPORT);

    // Click logo (use last() to get visible desktop nav logo)
    await page.getByTestId('navbar-logo').last().click();

    // Should be on home page
    await expect(page).toHaveURL('/');
  });
});

test.describe('Responsive Navigation Transition', () => {
  test('should switch between mobile and desktop nav on resize', async ({ page }) => {
    await page.goto('/');

    // Start with mobile
    await page.setViewportSize(MOBILE_VIEWPORT);
    const hamburger = page.getByRole('button', { name: /toggle menu/i });
    await expect(hamburger).toBeVisible();

    // Switch to desktop
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await expect(hamburger).not.toBeVisible();

    // Switch back to mobile
    await page.setViewportSize(MOBILE_VIEWPORT);
    await expect(hamburger).toBeVisible();
  });
});
