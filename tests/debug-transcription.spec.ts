import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Debug Transcription', () => {
  test('debug worker loading and transcription', async ({ page }) => {
    test.setTimeout(60000);
    
    // Enable all console logging
    page.on('console', msg => {
      const text = msg.text();
      // Log all messages, especially worker debug messages
      console.log(`[${msg.type()}] ${text}`);
      if (text.includes('[Worker]')) {
        console.log('>>> WORKER MESSAGE:', text);
      }
    });
    
    page.on('pageerror', error => {
      console.log('Page error:', error.message);
    });
    
    console.log('1. Navigating to bleep page...');
    await page.goto('/bleep');
    
    // Wait for page load
    await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();
    
    // Upload small test file
    console.log('2. Uploading test file...');
    const testFile = path.join(__dirname, 'fixtures/files/test.mp3');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);
    
    // Wait for file loaded
    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 10000 });
    console.log('3. File loaded');
    
    // Select model
    const modelSelect = page.locator('select').nth(1);
    await modelSelect.selectOption('Xenova/whisper-tiny.en');
    console.log('4. Model selected');
    
    // Start transcription
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await transcribeBtn.click();
    console.log('5. Transcription started');
    
    // Wait and monitor for 20 seconds
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000);
      
      // Check for progress
      const progressBar = page.locator('.bg-blue-600');
      const hasProgress = await progressBar.count() > 0;
      
      // Check for errors
      const errorMsg = page.locator('.text-red-800, .text-red-700, text=/Error/i');
      const hasError = await errorMsg.isVisible().catch(() => false);
      
      // Check for transcript
      const transcriptDiv = page.locator('div').filter({ hasText: 'Transcript:' });
      const hasTranscript = await transcriptDiv.isVisible().catch(() => false);
      
      console.log(`Second ${i + 1}: Progress=${hasProgress}, Error=${hasError}, Transcript=${hasTranscript}`);
      
      if (hasError) {
        const errorText = await errorMsg.textContent();
        console.log('ERROR FOUND:', errorText);
        throw new Error(`Transcription failed: ${errorText}`);
      }
      
      if (hasTranscript) {
        const transcriptText = page.locator('p.text-gray-800').first();
        const content = await transcriptText.textContent();
        console.log('SUCCESS! Transcript:', content);
        return;
      }
    }
    
    // Take screenshot if we timeout
    await page.screenshot({ path: 'test-results/debug-timeout.png', fullPage: true });
    throw new Error('Transcription timed out after 20 seconds');
  });
});