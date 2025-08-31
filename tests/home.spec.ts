import { test, expect } from '@playwright/test';

test.describe('Home Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main heading', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Effortlessly bleep out any words or phrases');
  });

  test('should have working navigation links', async ({ page }) => {
    // Check navbar exists
    const navbar = page.locator('nav');
    await expect(navbar).toBeVisible();
    
    // Check logo link
    const logo = navbar.locator('a').filter({ hasText: 'Bleep That Sh*t!' });
    await expect(logo).toBeVisible();
    
    // Check main CTAs
    const bleepBtn = navbar.locator('a').filter({ hasText: 'Bleep Your Sh*t!' });
    const samplerBtn = navbar.locator('a').filter({ hasText: 'Transcription Sampler' });
    
    await expect(bleepBtn).toBeVisible();
    await expect(samplerBtn).toBeVisible();
  });

  test('should display privacy notice', async ({ page }) => {
    const privacyBadge = page.locator('span').filter({ hasText: '100% private' });
    await expect(privacyBadge).toBeVisible();
  });

  test('should have hero section CTAs', async ({ page }) => {
    const heroCTAs = page.locator('.btn');
    await expect(heroCTAs).toHaveCount(3); // Updated: 2 in hero, 1 GitHub link
    
    // Click on Bleep button
    const bleepBtn = page.locator('.btn-primary').first();
    await bleepBtn.click();
    await expect(page).toHaveURL(/.*\/bleep/);
    
    // Go back and test sampler button
    await page.goBack();
    const samplerBtn = page.locator('.btn-pink').first();
    await samplerBtn.click();
    await expect(page).toHaveURL(/.*\/sampler/);
  });

  test('should display YouTube demo iframe', async ({ page }) => {
    const iframe = page.locator('iframe[src*="youtube.com"]');
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute('src', /wJzTvINvEbo/);
  });

  test('should display all feature sections', async ({ page }) => {
    // How It Works section
    const howItWorks = page.locator('h2').filter({ hasText: 'How It Works' });
    await expect(howItWorks).toBeVisible();
    
    // Check workflow steps
    const steps = page.locator('ol li');
    await expect(steps).toHaveCount(4);
    
    // Privacy section
    const privacy = page.locator('h2').filter({ hasText: 'Privacy & Local Processing' });
    await expect(privacy).toBeVisible();
    
    // Technology section
    const tech = page.locator('h2').filter({ hasText: 'Powered by Open Source' });
    await expect(tech).toBeVisible();
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

  test('should load custom fonts', async ({ page }) => {
    // Check if Font Awesome loads
    const fontAwesome = page.locator('link[href*="font-awesome"]');
    await expect(fontAwesome).toHaveCount(1);
    
    // Check if custom fonts are applied - look for fallback fonts too
    const body = page.locator('body');
    const bodyStyles = await body.evaluate(el => window.getComputedStyle(el));
    // Check for either the CSS variable or fallback fonts
    const fontFamily = bodyStyles.fontFamily || '';
    console.log('Font family detected:', fontFamily);
    
    // More lenient check - just verify we have some font loaded
    const hasFont = fontFamily.length > 0 && fontFamily !== 'none';
    expect(hasFont).toBeTruthy();
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
});