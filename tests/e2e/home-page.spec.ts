/**
 * E2E Test: Home Page
 *
 * Tests the landing page:
 * - All sections render correctly
 * - CTA buttons navigate to correct pages
 * - External links are valid
 * - Bob Ross sample link works
 */

import { test, expect } from './e2e-setup';

test.describe('Home Page - Sections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display hero section with main headline', async ({ page }) => {
    await expect(page.getByTestId('hero-section')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Effortlessly bleep out any words/i })
    ).toBeVisible();
  });

  test('should display privacy badge', async ({ page }) => {
    await expect(page.getByText(/100% private/i)).toBeVisible();
    await expect(page.getByText(/Everything happens in your browser/i)).toBeVisible();
  });

  test('should display file limit notice', async ({ page }) => {
    await expect(page.getByText(/Currently supports files up to 10 minutes/i)).toBeVisible();
  });

  test('should display How It Works section', async ({ page }) => {
    await expect(page.getByTestId('how-it-works-section')).toBeVisible();
    await expect(page.getByRole('heading', { name: /How It Works/i })).toBeVisible();

    // Check the 4 steps (use .first() to avoid strict mode violations when text appears multiple times)
    await expect(page.getByText(/Upload.*your audio.*or video/i).first()).toBeVisible();
    await expect(page.getByText(/Transcribe.*with your chosen model/i).first()).toBeVisible();
    await expect(page.getByText(/Censor.*by picking words/i).first()).toBeVisible();
    await expect(page.getByText(/Preview & Download/i).first()).toBeVisible();
  });

  test('should display Privacy section', async ({ page }) => {
    const privacySection = page.getByTestId('privacy-section');
    await expect(privacySection).toBeVisible();
    await expect(page.getByRole('heading', { name: /Privacy & Local Processing/i })).toBeVisible();
    // Scope to privacy section to avoid matching FAQ schema JSON-LD
    await expect(privacySection.getByText(/Your files never leave your device/i)).toBeVisible();
  });

  test('should display Technology section', async ({ page }) => {
    await expect(page.getByTestId('technology-section')).toBeVisible();
    await expect(page.getByText(/huggingface\.js/i)).toBeVisible();
    await expect(page.getByText(/ffmpeg\.wasm/i)).toBeVisible();
    await expect(page.getByText(/Web Audio API/i)).toBeVisible();
    await expect(page.getByText(/Plyr/i)).toBeVisible();
  });

  test('should display Waitlist section', async ({ page }) => {
    await expect(page.getByTestId('waitlist-section')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Need to process longer videos/i })).toBeVisible();
    await expect(page.getByTestId('waitlist-email-input')).toBeVisible();
    await expect(page.getByTestId('waitlist-submit-button')).toBeVisible();
  });

  test('should display demo video', async ({ page }) => {
    const demoVideo = page.getByTestId('demo-video');
    await expect(demoVideo).toBeVisible();

    // Verify it's a YouTube embed
    await expect(demoVideo).toHaveAttribute('src', /youtube\.com\/embed/);
  });
});

test.describe('Home Page - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to /bleep when clicking Bleep button', async ({ page }) => {
    const bleepButton = page.getByTestId('bleep-button');
    await expect(bleepButton).toBeVisible();
    await expect(bleepButton).toHaveText(/Bleep Your Sh\*t/i);

    await bleepButton.click();
    await expect(page).toHaveURL(/\/bleep$/);
  });

  test('should navigate to /sampler when clicking Test Transcription button', async ({ page }) => {
    const samplerButton = page.getByTestId('sampler-button');
    await expect(samplerButton).toBeVisible();
    await expect(samplerButton).toHaveText(/Test Transcription/i);

    await samplerButton.click();
    await expect(page).toHaveURL(/\/sampler$/);
  });

  test('should navigate to /bleep with sample parameter for Bob Ross', async ({ page }) => {
    const bobRossLink = page.getByRole('link', { name: /Bob Ross Video/i });
    await expect(bobRossLink).toBeVisible();

    await bobRossLink.click();
    await expect(page).toHaveURL(/\/bleep\?sample=bob-ross/);
  });
});

test.describe('Home Page - External Links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have GitHub link with correct URL', async ({ page }) => {
    const githubLink = page.getByTestId('github-link');
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute('href', /github\.com\/neonwatty\/bleep-that-shit/);
    await expect(githubLink).toHaveAttribute('target', '_blank');
  });

});

test.describe('Home Page - Hero CTA Interaction', () => {
  test('should load Bob Ross sample in bleep page', async ({ page }) => {
    await page.goto('/');

    // Click Bob Ross sample link
    await page.getByRole('link', { name: /Bob Ross Video/i }).click();

    // Should navigate to bleep page with sample parameter
    await expect(page).toHaveURL(/\/bleep\?sample=bob-ross/);

    // Wait for bleep page to load - target desktop tab specifically to avoid mobile dropdown match
    await expect(
      page.locator('button[role="tab"]').filter({ hasText: /Setup & Transcribe/i })
    ).toBeVisible({ timeout: 10000 });

    // The sample should start loading (look for loading indicator or player)
    // Note: In CI the actual download may be blocked, but the URL parameter should work
  });
});
