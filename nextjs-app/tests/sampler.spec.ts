import { test, expect } from '@playwright/test';

test.describe('Sampler Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sampler');
  });

  test('should display page heading and description', async ({ page }) => {
    const heading = page.locator('h1').filter({ hasText: 'Transcription Sampler' });
    await expect(heading).toBeVisible();
    
    const description = page.locator('p').filter({ hasText: 'Compare different Whisper models' });
    await expect(description).toBeVisible();
  });

  test('should show info box with benefits', async ({ page }) => {
    const infoBox = page.locator('.bg-blue-50');
    await expect(infoBox).toBeVisible();
    
    // Check benefit list items
    const benefits = infoBox.locator('li');
    await expect(benefits).toHaveCount(4);
    await expect(benefits.first()).toContainText('Test multiple models');
  });

  test('should have file upload section', async ({ page }) => {
    const uploadSection = page.locator('h2').filter({ hasText: 'Step 1: Upload Audio/Video' });
    await expect(uploadSection).toBeVisible();
    
    const dropzone = page.locator('div').filter({ hasText: 'Drag and drop your audio or video file here' }).first();
    await expect(dropzone).toBeVisible();
  });

  test('should show configuration section after file upload', async ({ page }) => {
    // Upload a file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('dummy audio content')
    });
    
    // Configuration section should appear
    const configSection = page.locator('h2').filter({ hasText: 'Step 2: Configure Sample' });
    await expect(configSection).toBeVisible({ timeout: 5000 });
    
    // Check configuration inputs
    const startInput = page.locator('input[type="number"]').first();
    const durationInput = page.locator('input[type="number"]').nth(1);
    const languageSelect = page.locator('select');
    
    await expect(startInput).toBeVisible();
    await expect(durationInput).toBeVisible();
    await expect(languageSelect).toBeVisible();
  });

  test('should validate sample duration', async ({ page }) => {
    // Upload a file first
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('dummy audio content')
    });
    
    // Find duration input
    const durationInput = page.locator('input[type="number"]').nth(1);
    await expect(durationInput).toBeVisible();
    
    // Check min/max attributes
    await expect(durationInput).toHaveAttribute('min', '5');
    await expect(durationInput).toHaveAttribute('max', '30');
  });

  test('should show compare button after file upload', async ({ page }) => {
    // Initially no compare button
    let compareBtn = page.locator('button').filter({ hasText: 'Compare All Models' });
    await expect(compareBtn).toHaveCount(0);
    
    // Upload a file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('dummy audio content')
    });
    
    // Compare button should appear
    compareBtn = page.locator('button').filter({ hasText: 'Compare All Models' });
    await expect(compareBtn).toBeVisible({ timeout: 5000 });
    await expect(compareBtn).toBeEnabled();
  });

  test('should display model comparison workflow', async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('dummy audio content')
    });
    
    // Click compare
    const compareBtn = page.locator('button').filter({ hasText: 'Compare All Models' });
    await compareBtn.click();
    
    // Should show results section
    const resultsSection = page.locator('h2').filter({ hasText: 'Results' });
    await expect(resultsSection).toBeVisible({ timeout: 10000 });
    
    // Should show model cards (even if they error)
    const modelCards = page.locator('.border.rounded-lg');
    expect(await modelCards.count()).toBeGreaterThan(0);
  });

  test('should show model download warning', async ({ page }) => {
    const warningText = page.locator('text=/First-time model downloads may take longer/');
    await expect(warningText).toBeVisible();
    
    const cacheText = page.locator('text=/Models are cached locally/');
    await expect(cacheText).toBeVisible();
  });

  test('should handle audio player interaction', async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('dummy audio content')
    });
    
    // Audio player should appear
    const audioPlayer = page.locator('audio');
    await expect(audioPlayer).toBeVisible({ timeout: 5000 });
    
    // Check if controls are present
    await expect(audioPlayer).toHaveAttribute('controls');
  });

  test('should be responsive', async ({ page }) => {
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(heading).toBeVisible();
    
    // Upload file to see grid layout
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('test')
    });
    
    // Grid should be responsive
    const grid = page.locator('.grid');
    await expect(grid.first()).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Monitor console for errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Upload and try to compare
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('test')
    });
    
    const compareBtn = page.locator('button').filter({ hasText: 'Compare All Models' });
    await compareBtn.click();
    
    // Wait for potential errors
    await page.waitForTimeout(3000);
    
    // Check if UI handles errors gracefully (shows error states)
    const errorStates = page.locator('.border-red-400, .bg-red-50, text=/Error/');
    const errorCount = await errorStates.count();
    
    // If there are worker errors, UI should show them
    if (errors.length > 0) {
      expect(errorCount).toBeGreaterThan(0);
      console.log('Detected errors:', errors);
    }
  });
});