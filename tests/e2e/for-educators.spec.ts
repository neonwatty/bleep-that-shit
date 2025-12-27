/**
 * E2E Test: For Educators Page
 *
 * Tests the educators landing page:
 * - All sections render correctly
 * - CTA buttons navigate to correct pages
 * - FAQ accordions work
 * - SEO meta tags are present
 */

import { test, expect } from '@playwright/test';

test.describe('For Educators Page - Sections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/for-educators');
  });

  test('should display hero section with main headline', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Make Any Video Classroom-Appropriate/i })
    ).toBeVisible();
  });

  test('should display privacy badge', async ({ page }) => {
    await expect(page.getByText(/100% private/i)).toBeVisible();
    await expect(page.getByText(/Your files never leave your device/i)).toBeVisible();
  });

  test('should display Perfect For section with use cases', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Perfect For/i })).toBeVisible();

    // Check use cases - use .first() to avoid strict mode violations
    await expect(page.getByText('Documentary Clips').first()).toBeVisible();
    await expect(page.getByText('YouTube Educational Videos').first()).toBeVisible();
    await expect(page.getByText('TED Talks & Lectures').first()).toBeVisible();
    await expect(page.getByText('Film Clips for English Class').first()).toBeVisible();
    await expect(page.getByText('News & Current Events').first()).toBeVisible();
    await expect(page.getByText('Primary Source Recordings').first()).toBeVisible();
  });

  test('should display Why Educators Choose Us section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Why Educators Choose Us/i })).toBeVisible();

    // Check benefits - use .first() to avoid strict mode violations
    await expect(page.getByText('Works on Chromebooks').first()).toBeVisible();
    await expect(page.getByText('FERPA-Compliant Privacy').first()).toBeVisible();
    await expect(page.getByText('No IT Approval Needed').first()).toBeVisible();
    await expect(page.getByText('Free for Educators').first()).toBeVisible();
  });

  test('should display How It Works section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /How It Works/i })).toBeVisible();

    // Check the 4 steps
    await expect(page.getByText(/Upload.*your video.*or audio/i).first()).toBeVisible();
    await expect(page.getByText(/Transcribe.*with AI/i).first()).toBeVisible();
    await expect(page.getByText(/Select.*words to censor/i).first()).toBeVisible();
    await expect(page.getByText(/Preview & Download/i).first()).toBeVisible();
  });

  test('should display demo video', async ({ page }) => {
    const demoVideo = page.locator('iframe[src*="youtube.com/embed"]');
    await expect(demoVideo).toBeVisible();
    await expect(demoVideo).toHaveAttribute('src', /youtube\.com\/embed/);
  });

  test('should display FAQ section with educator-specific questions', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Frequently Asked Questions/i })
    ).toBeVisible();

    // Check FAQ questions are present
    await expect(page.getByText(/Does this work on school Chromebooks/i)).toBeVisible();
    await expect(page.getByText(/Is my student data safe/i)).toBeVisible();
    await expect(page.getByText(/How long does it take to censor/i)).toBeVisible();
  });

  test('should display final CTA section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Ready to Make Your Next Video Classroom-Appropriate/i })
    ).toBeVisible();
  });
});

test.describe('For Educators Page - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/for-educators');
  });

  test('should navigate to /bleep when clicking Start Censoring button', async ({ page }) => {
    // Use the main content area CTA, not navigation
    const ctaButton = page.locator('main a.btn').filter({ hasText: /Start Censoring/i }).first();
    await expect(ctaButton).toBeVisible();

    await ctaButton.click();
    await expect(page).toHaveURL(/\/bleep$/);
  });

  test('should navigate to /bleep with sample parameter for sample video', async ({ page }) => {
    const sampleLink = page.locator('a[href="/bleep?sample=bob-ross"]');
    await expect(sampleLink).toBeVisible();

    await sampleLink.click();
    await expect(page).toHaveURL(/\/bleep\?sample=bob-ross/);
  });

  test('should scroll to How It Works section when clicking See How It Works', async ({
    page,
  }) => {
    const howItWorksLink = page.getByRole('link', { name: /See How It Works/i });
    await expect(howItWorksLink).toBeVisible();

    await howItWorksLink.click();
    await expect(page).toHaveURL(/.*#how-it-works/);
  });
});

test.describe('For Educators Page - FAQ Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/for-educators');
  });

  test('should expand FAQ accordion when clicked', async ({ page }) => {
    // Find the first FAQ item
    const faqSummary = page.getByText(/Does this work on school Chromebooks/i);
    await expect(faqSummary).toBeVisible();

    // Click to expand
    await faqSummary.click();

    // Check that the answer is now visible
    await expect(page.getByText(/No software installation or IT approval needed/i)).toBeVisible();
  });

  test('should collapse FAQ accordion when clicked again', async ({ page }) => {
    // Find and click the first FAQ item
    const faqSummary = page.getByText(/Does this work on school Chromebooks/i);
    await faqSummary.click();

    // Answer should be visible
    const answer = page.getByText(/No software installation or IT approval needed/i);
    await expect(answer).toBeVisible();

    // Click again to collapse
    await faqSummary.click();

    // Answer should be hidden
    await expect(answer).toBeHidden();
  });
});

test.describe('For Educators Page - SEO', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/for-educators');
  });

  test('should have proper page title', async ({ page }) => {
    await expect(page).toHaveTitle(/For Educators/i);
  });

  test('should have proper meta description', async ({ page }) => {
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /teachers.*censor/i);
  });

  test('should have canonical URL', async ({ page }) => {
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /\/for-educators/);
  });

  test('should have JSON-LD structured data', async ({ page }) => {
    // Get all JSON-LD scripts and check their combined content
    const jsonLdScripts = page.locator('script[type="application/ld+json"]');
    const count = await jsonLdScripts.count();
    expect(count).toBeGreaterThan(0);

    // Collect all JSON-LD content
    let allContent = '';
    for (let i = 0; i < count; i++) {
      const content = await jsonLdScripts.nth(i).textContent();
      allContent += content || '';
    }

    expect(allContent).toContain('FAQPage');
    expect(allContent).toContain('BreadcrumbList');
  });
});

test.describe('For Educators Page - Responsive', () => {
  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/for-educators');

    // Hero should be visible
    await expect(
      page.getByRole('heading', { name: /Make Any Video Classroom-Appropriate/i })
    ).toBeVisible();

    // CTA buttons should be visible
    await expect(page.getByRole('link', { name: /Start Censoring - Free/i }).first()).toBeVisible();
  });

  test('should display correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/for-educators');

    // Hero should be visible
    await expect(
      page.getByRole('heading', { name: /Make Any Video Classroom-Appropriate/i })
    ).toBeVisible();
  });

  test('should display correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/for-educators');

    // Hero should be visible
    await expect(
      page.getByRole('heading', { name: /Make Any Video Classroom-Appropriate/i })
    ).toBeVisible();

    // Use cases grid should be visible - use .first() to avoid strict mode
    await expect(page.getByText('Documentary Clips').first()).toBeVisible();
  });
});
