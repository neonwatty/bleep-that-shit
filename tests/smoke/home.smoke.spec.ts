import { test, expect } from '@playwright/test';
import { HomePage, NavbarComponent } from '../helpers';

test.describe('Home Page - Smoke Tests', () => {
  test.setTimeout(30000); // 30 seconds max per test

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders main hero heading', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.expectHeroVisible();

    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(
      'Effortlessly bleep out any words or phrases from your audio or video'
    );
  });

  test('displays privacy badge', async ({ page }) => {
    const privacyBadge = page.locator('span').filter({ hasText: '100% private' });
    await expect(privacyBadge).toBeVisible();
  });

  test('shows call-to-action buttons', async ({ page }) => {
    const homePage = new HomePage(page);
    await expect(homePage.bleepButton).toBeVisible();
    await expect(homePage.samplerButton).toBeVisible();
  });

  test('displays YouTube demo iframe', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.expectDemoVideoVisible();

    const iframe = page.locator('iframe[src*="youtube.com"]').first();
    await expect(iframe).toHaveAttribute('src', /wJzTvINvEbo/);
  });

  test('shows all feature sections', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.expectAllSectionsVisible();

    // Verify key section headings exist
    await expect(page.locator('h2').filter({ hasText: /How It Works/i })).toBeVisible();
    await expect(
      page.locator('h2').filter({ hasText: /Privacy.*Local Processing/i })
    ).toBeVisible();
  });

  test('displays workflow steps', async ({ page }) => {
    // Check workflow steps are present in the ordered list
    const steps = page.locator('ol li');
    await expect(steps).toHaveCount(4);

    // Verify step content within the ordered list specifically
    await expect(
      page
        .locator('ol li')
        .filter({ hasText: /Upload.*audio/i })
        .first()
    ).toBeVisible();
    await expect(
      page
        .locator('ol li')
        .filter({ hasText: /Censor/i })
        .first()
    ).toBeVisible();
  });

  test('has footer with GitHub link', async ({ page }) => {
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();

    const githubLink = footer.locator('a[href*="github.com"]').first();
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute('target', '_blank');
  });

  test('has proper SEO meta tags', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle(/Bleep That Sh\*t!/);

    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /Effortlessly bleep out/);

    // Check favicon
    const favicon = page.locator('link[rel="icon"][href="/icon.png"]');
    await expect(favicon).toHaveCount(1);
  });

  test('navbar is visible and has correct links', async ({ page }) => {
    const navbar = new NavbarComponent(page);
    await navbar.expectNavbarVisible();

    // Verify navbar contains expected links (use visible nav)
    await expect(page.locator('nav:visible a[href="/"]')).toBeVisible();
    await expect(page.locator('nav:visible a[href="/bleep"]')).toBeVisible();
    await expect(page.locator('nav:visible a[href="/sampler"]')).toBeVisible();
  });

  test('hero CTA buttons have correct href attributes', async ({ page }) => {
    const homePage = new HomePage(page);

    // Check button links without clicking
    await expect(homePage.bleepButton).toHaveAttribute('href', '/bleep');
    await expect(homePage.samplerButton).toHaveAttribute('href', '/sampler');
  });

  test('responsive design - mobile viewport', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check navbar is still visible on mobile (use visible nav)
    const navbar = page.locator('nav:visible');
    await expect(navbar).toBeVisible();

    // Check hero section is visible
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('responsive design - tablet viewport', async ({ page }) => {
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Verify main elements are visible (use visible nav since mobile and desktop navs both exist)
    await expect(page.locator('nav:visible')).toBeVisible();
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('footer').first()).toBeVisible();
  });

  test('responsive design - desktop viewport', async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Verify layout is properly displayed (use visible nav)
    const navbar = page.locator('nav:visible');
    await expect(navbar).toBeVisible();

    // Check navbar has horizontal layout on desktop
    await expect(navbar).toHaveClass(/sm:flex-row/);
  });
});
