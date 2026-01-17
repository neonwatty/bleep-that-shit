import { test, expect } from '@playwright/test';

test.describe('Premium Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/premium');
  });

  test('should display the hero section with headline', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Bleep');
  });

  test('should display custom header with navigation links', async ({ page }) => {
    // Check logo link
    const logoLink = page.locator('header a[href="/"]');
    await expect(logoLink).toBeVisible();
    await expect(logoLink).toContainText('Bleep That Sh*t!');

    // Check demo button
    const demoButton = page.locator('header a[href="/bleep"]');
    await expect(demoButton).toBeVisible();
    await expect(demoButton).toContainText('Try Free Demo');
  });

  test('should navigate to bleep page via Try Free Demo button', async ({ page }) => {
    const demoButton = page.locator('header a[href="/bleep"]');
    await demoButton.click();
    await expect(page).toHaveURL(/.*\/bleep/);
  });

  test('should display Premium badge', async ({ page }) => {
    const badge = page.locator('span').filter({ hasText: 'Premium' });
    await expect(badge).toBeVisible();
  });

  test('should display all premium features in hero', async ({ page }) => {
    // Check feature cards by heading role
    await expect(page.getByRole('heading', { name: '10x Faster Processing' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '2+ Hour Files' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Saved Projects' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Project History' })).toBeVisible();
  });

  test('should display stats bar', async ({ page }) => {
    await expect(page.getByText('10K+')).toBeVisible();
    await expect(page.getByText('Files Processed')).toBeVisible();
    await expect(page.getByText('Discord Members')).toBeVisible();
    await expect(page.getByText('Privacy First')).toBeVisible();
  });

  test('should display use cases section', async ({ page }) => {
    await expect(page.getByText('Built For Creators')).toBeVisible();
    await expect(page.getByText('Teachers & Educators')).toBeVisible();
    await expect(page.getByText('Podcasters')).toBeVisible();
    await expect(page.getByText('YouTube Creators')).toBeVisible();
    await expect(page.getByText('Production Teams')).toBeVisible();
  });

  test('should display Free vs Premium comparison', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Free Stays Free' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Free Forever' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Premium Adds' })).toBeVisible();
  });

  test('should display pricing section', async ({ page }) => {
    const pricingSection = page.locator('#pricing');
    await expect(pricingSection).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Choose Your Plan' })).toBeVisible();
  });

  test('should display pricing cards for all tiers', async ({ page }) => {
    // Check tier headings exist (use exact match to avoid partial matches like "Processing", "Project")
    await expect(page.getByRole('heading', { name: 'Starter', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pro', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Team', exact: true })).toBeVisible();
    // Check prices are displayed
    await expect(page.getByText('$9')).toBeVisible();
    await expect(page.getByText('$19')).toBeVisible();
    await expect(page.getByText('$39')).toBeVisible();
  });

  test('should have hero View Plans CTA', async ({ page }) => {
    const heroPricingLink = page.locator('a[href="#pricing"]');
    await expect(heroPricingLink).toBeVisible();
    await expect(heroPricingLink).toContainText('View Plans');
  });

  test('should navigate to pricing section via hero CTA', async ({ page }) => {
    const heroPricingLink = page.locator('a[href="#pricing"]').first();
    await heroPricingLink.click();
    await expect(page).toHaveURL(/.*#pricing/);
  });

  test('should have See Features link and navigate to features section', async ({ page }) => {
    const featuresLink = page.locator('a[href="#features"]');
    await expect(featuresLink).toBeVisible();
    await expect(featuresLink).toContainText('See Features');
    await featuresLink.click();
    await expect(page).toHaveURL(/.*#features/);
  });

  test('should have back to home link in footer', async ({ page }) => {
    const backLink = page.locator('a').filter({ hasText: 'Back to Bleep That' });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', '/');
  });

  test('should navigate back to home page', async ({ page }) => {
    const backLink = page.locator('a').filter({ hasText: 'Back to Bleep That' });
    await backLink.click();
    await expect(page).toHaveURL(/.*\//);
    await expect(page).not.toHaveURL(/.*\/premium/);
  });

  test('should have proper SEO meta tags', async ({ page }) => {
    await expect(page).toHaveTitle(/Premium/);

    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /cloud processing/i);
  });

  test('should have Discord link in footer', async ({ page }) => {
    const discordLink = page.locator('footer a[aria-label="Join our Discord"]');
    await expect(discordLink).toHaveAttribute('href', /discord/);
    await expect(discordLink).toHaveAttribute('target', '_blank');
  });

  test('should have responsive hero section', async ({ page }) => {
    // Desktop view - side by side
    await page.setViewportSize({ width: 1920, height: 1080 });
    const heroSection = page.locator('section').first();
    await expect(heroSection).toHaveClass(/lg:flex-row/);

    // Mobile view - stacked
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(heroSection).toHaveClass(/flex-col/);
  });
});
