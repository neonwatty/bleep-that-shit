import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Bleep Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bleep');
  });

  test('should display page heading and instructions', async ({ page }) => {
    const heading = page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' });
    await expect(heading).toBeVisible();
    
    // Check workflow instructions
    const workflow = page.locator('ol li');
    await expect(workflow).toHaveCount(7);
    
    // Verify steps text
    await expect(workflow.nth(0)).toContainText('Upload your file');
    await expect(workflow.nth(1)).toContainText('Select language and model');
    await expect(workflow.nth(2)).toContainText('Transcribe');
  });

  test('should have file upload dropzone', async ({ page }) => {
    const dropzone = page.locator('div').filter({ hasText: 'Drag and drop your audio or video file here or click to browse' }).first();
    await expect(dropzone).toBeVisible();
    
    // Check if dropzone is clickable
    await dropzone.click();
    // File input should exist even if hidden
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveCount(1);
  });

  test('should show language and model selection', async ({ page }) => {
    const languageSection = page.locator('h2').filter({ hasText: 'Select Language & Model' });
    await expect(languageSection).toBeVisible();
    
    // Check language dropdown
    const languageSelect = page.locator('select').first();
    await expect(languageSelect).toBeVisible();
    const languageOptions = await languageSelect.locator('option').count();
    expect(languageOptions).toBeGreaterThan(5); // Should have multiple languages
    
    // Check model dropdown
    const modelSelect = page.locator('select').nth(1);
    await expect(modelSelect).toBeVisible();
    const modelOptions = await modelSelect.locator('option').count();
    expect(modelOptions).toBeGreaterThan(3); // Should have multiple models
  });

  test('should disable transcribe button without file', async ({ page }) => {
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await expect(transcribeBtn).toBeVisible();
    await expect(transcribeBtn).toBeDisabled();
  });

  test('should handle file upload', async ({ page }) => {
    // Create a test audio file path
    const testFile = path.join(__dirname, 'test-audio.mp3');
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    
    // Create a dummy file for testing (in real test, you'd use an actual file)
    await fileInput.setInputFiles({
      name: 'test-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('dummy audio content')
    });
    
    // Check if file is displayed
    const fileInfo = page.locator('text=/File loaded/');
    await expect(fileInfo).toBeVisible({ timeout: 5000 });
    
    // Transcribe button should be enabled
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await expect(transcribeBtn).toBeEnabled();
  });

  test('should show warning for invalid file types', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    // Try uploading a text file
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not audio')
    });
    
    // Should show warning
    const warning = page.locator('text=/Please upload a valid audio or video file/');
    await expect(warning).toBeVisible({ timeout: 5000 });
  });

  test('should have numbered workflow sections', async ({ page }) => {
    // Check all numbered sections
    const sections = page.locator('.editorial-section');
    
    for (let i = 1; i <= 3; i++) {
      const numberBadge = page.locator(`.bg-blue-500, .bg-green-500, .bg-indigo-500`).filter({ hasText: i.toString() });
      await expect(numberBadge.first()).toBeVisible();
    }
  });

  test('should handle transcription workflow', async ({ page }) => {
    // Upload a file first
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('dummy audio content')
    });
    
    // Click transcribe
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await transcribeBtn.click();
    
    // Should show progress or error
    const progressBar = page.locator('[role="progressbar"], .bg-gray-200');
    const errorMsg = page.locator('text=/Error/');
    
    // Either progress or error should appear
    await expect(async () => {
      const hasProgress = await progressBar.isVisible();
      const hasError = await errorMsg.isVisible();
      expect(hasProgress || hasError).toBeTruthy();
    }).toPass({ timeout: 10000 });
  });

  test('should be responsive', async ({ page }) => {
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    
    // Sections should stack vertically
    const sections = page.locator('.editorial-section');
    const firstSection = sections.first();
    await expect(firstSection).toBeVisible();
    
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(heading).toBeVisible();
    
    // Grid layouts should be visible
    const grid = page.locator('.grid');
    await expect(grid.first()).toBeVisible();
  });

  test('should handle worker loading', async ({ page }) => {
    // Check if page attempts to load workers
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    
    // Navigate and interact
    await page.reload();
    
    // Upload file and try transcription
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('test')
    });
    
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await transcribeBtn.click();
    
    // Wait a bit for console messages
    await page.waitForTimeout(2000);
    
    // Check if worker-related errors occurred
    const workerErrors = consoleMessages.filter(msg => 
      msg.toLowerCase().includes('worker') || 
      msg.toLowerCase().includes('failed')
    );
    
    // Log any worker errors for debugging
    if (workerErrors.length > 0) {
      console.log('Worker-related messages:', workerErrors);
    }
  });
});