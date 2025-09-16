import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Video Bleeping Test', () => {
  test('should process video and return censored video (not just audio)', async ({ page }) => {
    test.setTimeout(240000); // 4 minutes for full video processing

    // Enable console logging
    page.on('console', msg => {
      console.log(`[${msg.type()}] ${msg.text()}`);
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

    // Verify video preview
    const videoPreview = page.locator('video').first();
    await expect(videoPreview).toBeVisible();
    console.log('4. Video preview is visible');

    // Select model
    console.log('5. Selecting model...');
    const modelSelect = page.locator('select').nth(1);
    await modelSelect.selectOption('Xenova/whisper-tiny.en');

    // Start transcription
    console.log('6. Starting transcription...');
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await expect(transcribeBtn).toBeEnabled();
    await transcribeBtn.click();

    // Wait for transcription to complete
    console.log('7. Waiting for transcription...');
    const transcriptDiv = await page.waitForSelector('text=/Transcript:/', { timeout: 120000 });
    const transcriptText = await page.locator('p.text-gray-800').first().textContent();
    console.log(`Transcript: "${transcriptText}"`);

    // Enter words to bleep (simple test words)
    console.log('8. Setting words to bleep...');
    await page.fill('input[placeholder*="bad, word, curse"]', 'the, a, and');

    // Enable exact matching
    await page.check('input[type="checkbox"]', { hasText: /Exact match/ });

    // Run matching
    console.log('9. Running word matching...');
    const matchBtn = page.locator('button').filter({ hasText: 'Run Matching' });
    await matchBtn.click();

    // Wait for matched words
    await expect(page.locator('text=/Matched.*words:/')).toBeVisible({ timeout: 10000 });
    const matchedCount = await page.locator('.bg-yellow-200').count();
    console.log(`10. Matched ${matchedCount} words`);

    // Apply bleeps
    console.log('11. Applying bleeps to video...');
    const bleepBtn = page.locator('button').filter({ hasText: 'Apply Bleeps!' });
    await bleepBtn.click();

    // Wait for processing (this is where video remuxing happens)
    console.log('12. Waiting for video processing...');

    // Check for processing indicator
    const processingText = page.locator('text=/Processing video/');
    if (await processingText.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Video processing indicator detected');
    }

    // Wait for censored result
    const censoredResult = await page.waitForSelector('h3:has-text("Censored Result:")', { timeout: 120000 });
    console.log('13. Censored result available');

    // CRITICAL: Check if we have a video player for the output (not just audio)
    const censoredVideo = page.locator('video').last();
    const censoredAudio = page.locator('audio').last();

    const hasVideoOutput = await censoredVideo.isVisible().catch(() => false);
    const hasAudioOutput = await censoredAudio.isVisible().catch(() => false);

    console.log(`Output type: Video=${hasVideoOutput}, Audio=${hasAudioOutput}`);

    // Check download button text
    const downloadBtn = page.locator('a[download]').last();
    const downloadText = await downloadBtn.textContent();
    const downloadFileName = await downloadBtn.getAttribute('download');

    console.log(`Download button: "${downloadText}", filename: "${downloadFileName}"`);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/video-bleeping-result.png',
      fullPage: true
    });

    // Assertions
    expect(hasVideoOutput).toBe(true);
    expect(downloadText).toContain('Download Censored Video');
    expect(downloadFileName).toContain('.mp4');

    console.log('✅ Video bleeping test passed - returns video, not just audio!');
  });
});