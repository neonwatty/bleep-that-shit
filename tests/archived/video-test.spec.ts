import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Video Transcription Test', () => {
  test('should extract and transcribe video file', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes

    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
      if (
        msg.text().includes('Worker') ||
        msg.text().includes('extract') ||
        msg.text().includes('video')
      ) {
        console.log('Console log:', msg.text());
      }
    });

    console.log('1. Navigating to bleep page...');
    await page.goto('/bleep');
    await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();

    // Upload video file
    console.log('2. Uploading video file...');
    const videoFile = path.join(__dirname, 'fixtures/files/test.mp4');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(videoFile);

    // Wait for file to be loaded
    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 10000 });
    console.log('3. Video file uploaded successfully');

    // Check if video preview appears (if implemented)
    const videoPlayer = page.locator('video');
    const hasVideoPreview = (await videoPlayer.count()) > 0;
    console.log(`4. Video preview: ${hasVideoPreview ? 'Yes' : 'No'}`);

    // Select model
    console.log('5. Selecting model...');
    const modelSelect = page.locator('select').nth(1);
    await modelSelect.selectOption('Xenova/whisper-tiny.en');

    // Start transcription
    console.log('6. Starting transcription (video extraction + transcription)...');
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await expect(transcribeBtn).toBeEnabled();
    await transcribeBtn.click();

    // Monitor progress
    console.log('7. Monitoring progress...');
    const progressBar = page.locator('.bg-blue-600');
    const errorMsg = page.locator('.text-red-800, .text-red-700');
    const progressText = page
      .locator('.text-gray-600')
      .filter({ hasText: /Loading|Processing|Extracting|Decoding/i });

    // Check progress updates
    for (let i = 0; i < 60; i++) {
      // Check for 2 minutes
      await page.waitForTimeout(2000);

      const hasError = await errorMsg.isVisible().catch(() => false);
      if (hasError) {
        const errorText = await errorMsg.textContent();
        console.log(`Error detected: ${errorText}`);
        break;
      }

      const hasProgress = (await progressBar.count()) > 0;
      const progressMsg = await progressText.textContent().catch(() => '');

      if (progressMsg) {
        console.log(`Progress: ${progressMsg}`);
      }

      // Check if transcription result appeared
      const transcriptionDiv = page.locator('div').filter({ hasText: 'Transcript:' });
      const hasResult = await transcriptionDiv.isVisible().catch(() => false);

      if (hasResult) {
        console.log('8. Transcription completed!');
        const transcriptionText = page.locator('p.text-gray-800').first();
        const content = await transcriptionText.textContent();
        console.log(`Result: "${content}"`);

        // Take screenshot
        await page.screenshot({
          path: 'test-results/video-transcription-success.png',
          fullPage: true,
        });

        console.log('✅ Video transcription successful!');
        return; // Test passed
      }
    }

    // If we get here, transcription didn't complete
    await page.screenshot({
      path: 'test-results/video-transcription-timeout.png',
      fullPage: true,
    });

    throw new Error('Video transcription timed out or failed');
  });
});
