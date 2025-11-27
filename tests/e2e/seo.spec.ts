/**
 * E2E Test: SEO Elements
 *
 * Tests that SEO meta tags and structured data are present on all pages:
 * - Open Graph tags
 * - Twitter Card tags
 * - Canonical URLs
 * - JSON-LD structured data
 */

import { test, expect } from './e2e-setup';

const SITE_URL = 'https://bleep-that-sht.com';

test.describe('SEO - Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have Open Graph meta tags', async ({ page }) => {
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      /Bleep That Sh\*t!/
    );
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      'content',
      /bleep out any words/i
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      /og-image\.png/
    );
  });

  test('should have Twitter Card meta tags', async ({ page }) => {
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image'
    );
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      'content',
      /Bleep That Sh\*t!/
    );
  });

  test('should have canonical URL', async ({ page }) => {
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', SITE_URL);
  });

  test('should have JSON-LD structured data', async ({ page }) => {
    const jsonLdScripts = page.locator('script[type="application/ld+json"]');
    await expect(jsonLdScripts.first()).toBeAttached();

    // Verify content contains expected schemas
    const content = await jsonLdScripts.first().textContent();
    expect(content).toContain('@context');
    expect(content).toContain('schema.org');
  });

  test('should have Organization schema in JSON-LD', async ({ page }) => {
    const jsonLdScripts = page.locator('script[type="application/ld+json"]');
    const content = await jsonLdScripts.first().textContent();
    expect(content).toContain('Organization');
    expect(content).toContain('Bleep That Sh*t!');
  });

  test('should have WebApplication schema in JSON-LD', async ({ page }) => {
    const jsonLdScripts = page.locator('script[type="application/ld+json"]');
    const allContent = await jsonLdScripts.allTextContents();
    const combined = allContent.join('');
    expect(combined).toContain('WebApplication');
  });

  test('should have HowTo schema in JSON-LD', async ({ page }) => {
    const jsonLdScripts = page.locator('script[type="application/ld+json"]');
    const allContent = await jsonLdScripts.allTextContents();
    const combined = allContent.join('');
    expect(combined).toContain('HowTo');
    expect(combined).toContain('HowToStep');
  });
});

test.describe('SEO - Bleep Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bleep');
  });

  test('should have page-specific Open Graph tags', async ({ page }) => {
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      /Bleep Your Audio/i
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      `${SITE_URL}/bleep`
    );
  });

  test('should have canonical URL for bleep page', async ({ page }) => {
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${SITE_URL}/bleep`
    );
  });

  test('should have SoftwareApplication schema in JSON-LD', async ({ page }) => {
    const jsonLdScripts = page.locator('script[type="application/ld+json"]');
    const allContent = await jsonLdScripts.allTextContents();
    const combined = allContent.join('');
    expect(combined).toContain('SoftwareApplication');
  });

  test('should have BreadcrumbList schema in JSON-LD', async ({ page }) => {
    const jsonLdScripts = page.locator('script[type="application/ld+json"]');
    const allContent = await jsonLdScripts.allTextContents();
    const combined = allContent.join('');
    expect(combined).toContain('BreadcrumbList');
  });
});

test.describe('SEO - Sampler Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sampler');
  });

  test('should have page-specific Open Graph tags', async ({ page }) => {
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      /Transcription Sampler/i
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      `${SITE_URL}/sampler`
    );
  });

  test('should have canonical URL for sampler page', async ({ page }) => {
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${SITE_URL}/sampler`
    );
  });

  test('should have SoftwareApplication schema in JSON-LD', async ({ page }) => {
    const jsonLdScripts = page.locator('script[type="application/ld+json"]');
    const allContent = await jsonLdScripts.allTextContents();
    const combined = allContent.join('');
    expect(combined).toContain('SoftwareApplication');
    expect(combined).toContain('Whisper');
  });
});
