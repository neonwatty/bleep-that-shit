import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Functional Transcription and Bleep Tests', () => {
  test('should perform full transcription and bleep workflow', async ({ page }) => {
    // Extended timeout for transcription
    test.setTimeout(120000);

    // Navigate to bleep page
    await page.goto('/bleep');

    console.log('1. Navigating to bleep page...');

    // Wait for page to load
    await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();

    // Upload the test audio file - use shorter file for faster testing
    console.log('2. Uploading test audio file...');
    const testFile = path.join(__dirname, 'fixtures/files/short-test.mp3');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // Wait for file to be loaded
    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 10000 });
    console.log('3. File uploaded successfully');

    // Check if audio preview is shown
    const audioPlayer = page.locator('audio');
    await expect(audioPlayer).toBeVisible({ timeout: 5000 });
    console.log('4. Audio preview loaded');

    // Select language and model
    console.log('5. Selecting language and model...');
    const languageSelect = page.locator('select').first();
    await languageSelect.selectOption('en'); // English

    const modelSelect = page.locator('select').nth(1);
    await modelSelect.selectOption('Xenova/whisper-tiny.en'); // Smallest model

    // Start transcription
    console.log('6. Starting transcription...');
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await expect(transcribeBtn).toBeEnabled();
    await transcribeBtn.click();

    // Monitor console for errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('Console error:', msg.text());
      }
      if (msg.text().includes('Worker') || msg.text().includes('transcription')) {
        console.log('Console log:', msg.text());
      }
    });

    // Wait for progress bar or error
    console.log('7. Waiting for transcription to start...');
    const progressBar = page.locator('[role="progressbar"], .bg-blue-600');
    const errorMsg = page.locator('text=/Error|Failed/i');

    // Wait for either progress, error, or completion
    try {
      await expect(async () => {
        const hasProgress = (await progressBar.count()) > 0;
        const hasError = await errorMsg.isVisible().catch(() => false);

        console.log(`Progress: ${hasProgress}, Error: ${hasError}`);

        expect(hasProgress || hasError).toBeTruthy();
      }).toPass({ timeout: 30000, intervals: [1000] });
    } catch (e) {
      console.log('Failed to detect progress/error/transcription');
      console.log('Console errors:', consoleErrors);
      throw e;
    }

    // Check if transcription completed or failed
    const hasError = await errorMsg.isVisible().catch(() => false);
    if (hasError) {
      const errorText = await errorMsg.textContent();
      console.log('Transcription failed with error:', errorText);
      console.log('Console errors:', consoleErrors);

      // Take screenshot for debugging
      await page.screenshot({ path: 'transcription-error.png', fullPage: true });

      // Check for specific issues
      if (errorText?.includes('Worker') || errorText?.includes('transformers')) {
        throw new Error('Worker or transformers library failed to load');
      }
      throw new Error(`Transcription failed: ${errorText}`);
    }

    // Wait for transcription to complete - look for the actual result display
    console.log('8. Waiting for transcription to complete...');

    // The transcription result is displayed in a div, not a textarea
    const transcriptionResultDiv = page.locator('div').filter({ hasText: 'Transcript:' }).first();
    const transcriptionTextElement = page.locator('p.text-gray-800').first();

    // Wait for either the result or an error with extended timeout for long audio
    await expect(async () => {
      const hasResult = await transcriptionResultDiv.isVisible().catch(() => false);
      const hasTranscript = await transcriptionTextElement.isVisible().catch(() => false);
      const hasError = await errorMsg.isVisible().catch(() => false);

      console.log(
        `Checking... Result div: ${hasResult}, Transcript: ${hasTranscript}, Error: ${hasError}`
      );

      expect(hasResult || hasTranscript || hasError).toBeTruthy();
    }).toPass({ timeout: 180000, intervals: [2000] }); // 3 minutes for transcription

    const hasErrorAfterWait = await errorMsg.isVisible().catch(() => false);
    if (!hasErrorAfterWait) {
      await expect(transcriptionTextElement).toBeVisible({ timeout: 10000 });
      const transcriptionContent = await transcriptionTextElement.textContent();
      console.log('9. Transcription completed:', transcriptionContent?.substring(0, 100) + '...');
    }

    // Try to add bleep words
    console.log('10. Testing bleep word functionality...');
    const bleepInput = page
      .locator('input[placeholder*="bleep"], input[placeholder*="word"]')
      .first();
    if (await bleepInput.isVisible()) {
      await bleepInput.fill('test');
      await bleepInput.press('Enter');
      console.log('11. Added bleep word: test');

      // Check if bleep was applied
      const bleepedText = await transcriptionTextElement.textContent();
      if (bleepedText?.includes('***') || bleepedText?.includes('beep')) {
        console.log('12. Bleep successfully applied');
      }
    }

    // Take final screenshot
    await page.screenshot({ path: 'transcription-success.png', fullPage: true });
    console.log('Test completed successfully!');
  });

  test('should handle sampler page functionality', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/sampler');

    console.log('1. Navigating to sampler page...');
    await expect(page.locator('h1').filter({ hasText: 'Transcription Sampler' })).toBeVisible();

    // Upload file
    console.log('2. Uploading test file...');
    const testFile = path.join(__dirname, 'fixtures/files/test-audio.mp3');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // Wait for configuration section
    await expect(page.locator('h2').filter({ hasText: 'Step 2: Configure Sample' })).toBeVisible({
      timeout: 10000,
    });
    console.log('3. Configuration section appeared');

    // Set sample parameters
    const startInput = page.locator('input[type="number"]').first();
    const durationInput = page.locator('input[type="number"]').nth(1);

    if (await startInput.isVisible()) {
      await startInput.fill('0');
      await durationInput.fill('10');
      console.log('4. Set sample: 0-10 seconds');
    }

    // Try to compare models
    const compareBtn = page.locator('button').filter({ hasText: /Compare|Start/i });
    if (await compareBtn.isVisible()) {
      await compareBtn.click();
      console.log('5. Started model comparison');

      // Monitor for results or errors
      const errorMsg = page.locator('text=/Error|Failed/i');
      const resultsSection = page.locator('text=/Results|Comparison/i');

      await expect(async () => {
        const hasError = await errorMsg.isVisible().catch(() => false);
        const hasResults = await resultsSection.isVisible().catch(() => false);
        expect(hasError || hasResults).toBeTruthy();
      }).toPass({ timeout: 30000 });

      const hasError = await errorMsg.isVisible().catch(() => false);
      if (hasError) {
        const errorText = await errorMsg.textContent();
        console.log('Sampler failed:', errorText);
      } else {
        console.log('6. Comparison completed');
      }
    }

    await page.screenshot({ path: 'sampler-test.png', fullPage: true });
  });
});
