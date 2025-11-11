import { test, expect } from '@playwright/test';
import { HomePage, NavbarComponent } from './helpers';

test.describe('Home Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main heading', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.expectHeroVisible();

    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Effortlessly bleep out any words or phrases');
  });

  test('should have working navigation links', async ({ page }) => {
    const navbar = new NavbarComponent(page);
    await navbar.expectNavbarVisible();
  });

  test('should display privacy notice', async ({ page }) => {
    const privacyBadge = page.locator('span').filter({ hasText: '100% private' });
    await expect(privacyBadge).toBeVisible();
  });

  test('should navigate to bleep page via hero CTA', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goToBleepPage();
    await expect(page).toHaveURL(/.*\/bleep/);
  });

  test('should navigate to sampler page via hero CTA', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goToSamplerPage();
    await expect(page).toHaveURL(/.*\/sampler/);
  });

  test('should display YouTube demo iframe', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.expectDemoVideoVisible();

    const iframe = page.locator('iframe[src*="youtube.com"]');
    await expect(iframe).toHaveAttribute('src', /wJzTvINvEbo/);
  });

  test('should display all feature sections', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.expectAllSectionsVisible();

    // Check workflow steps
    const steps = page.locator('ol li');
    await expect(steps).toHaveCount(4);
  });

  test('should have responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check if navigation becomes vertical on mobile
    const navbar = page.locator('nav');
    await expect(navbar).toHaveClass(/flex-col/);

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(navbar).toHaveClass(/sm:flex-row/);
  });

  test('should have footer with GitHub link', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    const githubLink = footer.locator('a[href*="github.com"]');
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute('target', '_blank');
  });

  test('should have proper SEO meta tags', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle(/Bleep That Sh\*t!/);

    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /Effortlessly bleep out/);

    // Check favicon - use specific selector for our custom icon
    const favicon = page.locator('link[rel="icon"][href="/icon.png"]');
    await expect(favicon).toHaveCount(1);
  });

  test('should navigate between pages using navbar', async ({ page }) => {
    const navbar = new NavbarComponent(page);

    // Navigate to bleep page
    await navbar.goToBleepPage();
    await expect(page).toHaveURL(/.*\/bleep/);

    // Navigate to sampler page
    await navbar.goToSamplerPage();
    await expect(page).toHaveURL(/.*\/sampler/);

    // Navigate back home
    await navbar.goToHome();
    await expect(page).toHaveURL(/.*\//);
  });
});
