/**
 * E2E Test: Mobile Navigation
 *
 * Tests mobile-specific navigation:
 * - Bottom tab bar visible on mobile
 * - Tab bar links navigate correctly
 * - Mobile navbar header visible at small viewports
 * - Desktop navbar visible at large viewports
 */

import { test, expect } from './e2e-setup';

// Mobile viewport size (iPhone SE)
const MOBILE_VIEWPORT = { width: 375, height: 667 };
// Desktop viewport size
const DESKTOP_VIEWPORT = { width: 1280, height: 720 };

test.describe('Mobile Navigation - Bottom Tab Bar', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/');
  });

  test('should show mobile navbar header on small screens', async ({ page }) => {
    // Mobile nav header should be visible
    const mobileNav = page.getByTestId('mobile-navbar');
    await expect(mobileNav).toBeVisible();

    // Should show the logo
    await expect(page.getByTestId('navbar-logo').first()).toBeVisible();
  });

  test('should show bottom tab bar on mobile', async ({ page }) => {
    // Bottom tab bar should be visible
    const bottomTabBar = page.getByTestId('bottom-tab-bar');
    await expect(bottomTabBar).toBeVisible();

    // Tab bar should have Home, Bleep, and Sampler links
    await expect(bottomTabBar.getByText('Home')).toBeVisible();
    await expect(bottomTabBar.getByText('Bleep')).toBeVisible();
    await expect(bottomTabBar.getByText('Sampler')).toBeVisible();
  });

  test('should navigate to home from tab bar', async ({ page }) => {
    // Go to bleep page first
    await page.goto('/bleep');
    await page.setViewportSize(MOBILE_VIEWPORT);

    // Click Home in tab bar
    const bottomTabBar = page.getByTestId('bottom-tab-bar');
    await bottomTabBar.getByText('Home').click();

    // Should be on home page
    await expect(page).toHaveURL('/');
  });

  test('should navigate to bleep page from tab bar', async ({ page }) => {
    // Click Bleep in tab bar
    const bottomTabBar = page.getByTestId('bottom-tab-bar');
    await bottomTabBar.getByText('Bleep').click();

    // Should be on bleep page
    await expect(page).toHaveURL(/\/bleep$/);
  });

  test('should navigate to sampler page from tab bar', async ({ page }) => {
    // Click Sampler in tab bar
    const bottomTabBar = page.getByTestId('bottom-tab-bar');
    await bottomTabBar.getByText('Sampler').click();

    // Should be on sampler page
    await expect(page).toHaveURL(/\/sampler$/);
  });

  test('should highlight active tab', async ({ page }) => {
    // On home page, Home tab should be active
    const bottomTabBar = page.getByTestId('bottom-tab-bar');
    const homeLink = bottomTabBar.getByRole('link', { name: 'Home' });
    await expect(homeLink).toHaveClass(/text-black/);

    // Navigate to bleep
    await bottomTabBar.getByText('Bleep').click();
    await expect(page).toHaveURL(/\/bleep$/);

    // Bleep tab should now be active
    const bleepLink = bottomTabBar.getByRole('link', { name: 'Bleep' });
    await expect(bleepLink).toHaveClass(/text-black/);
  });
});

test.describe('Desktop Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('/');
  });

  test('should show desktop navbar on large screens', async ({ page }) => {
    // Desktop nav should be visible
    const desktopNav = page.getByTestId('main-navbar');
    await expect(desktopNav).toBeVisible();

    // Navbar logo
    await expect(page.getByTestId('navbar-logo').last()).toBeVisible();

    // Nav links
    await expect(page.getByTestId('navbar-bleep-link')).toBeVisible();
    await expect(page.getByTestId('navbar-sampler-link')).toBeVisible();
  });

  test('should not show bottom tab bar on desktop', async ({ page }) => {
    // Bottom tab bar should be hidden on desktop (md:hidden class)
    const bottomTabBar = page.getByTestId('bottom-tab-bar');
    await expect(bottomTabBar).not.toBeVisible();
  });

  test('should navigate to bleep page from desktop navbar', async ({ page }) => {
    await page.getByTestId('navbar-bleep-link').click();
    await expect(page).toHaveURL(/\/bleep$/);
  });

  test('should navigate to sampler page from desktop navbar', async ({ page }) => {
    await page.getByTestId('navbar-sampler-link').click();
    await expect(page).toHaveURL(/\/sampler$/);
  });

  test('should navigate to home when clicking logo', async ({ page }) => {
    // Go to bleep page first
    await page.goto('/bleep');
    await page.setViewportSize(DESKTOP_VIEWPORT);

    // Click logo
    await page.getByTestId('navbar-logo').last().click();

    // Should be on home page
    await expect(page).toHaveURL('/');
  });
});

test.describe('Responsive Navigation Transition', () => {
  test('should switch between mobile and desktop nav on resize', async ({ page }) => {
    await page.goto('/');

    // Start with mobile - bottom tab bar visible
    await page.setViewportSize(MOBILE_VIEWPORT);
    const bottomTabBar = page.getByTestId('bottom-tab-bar');
    await expect(bottomTabBar).toBeVisible();

    // Switch to desktop - bottom tab bar hidden
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await expect(bottomTabBar).not.toBeVisible();

    // Switch back to mobile - bottom tab bar visible again
    await page.setViewportSize(MOBILE_VIEWPORT);
    await expect(bottomTabBar).toBeVisible();
  });
});
