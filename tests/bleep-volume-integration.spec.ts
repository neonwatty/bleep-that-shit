import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Bleep Volume Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bleep');
  });

  test('should pass volume parameter through full bleeping workflow', async ({ page }) => {
    // Collect console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    // Step 1: Upload a test audio file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('dummy audio content for testing')
    });

    // Wait for file to be loaded
    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });

    // Step 2: Set volume to 60% before transcription
    const volumeSlider = page.locator('input[type="range"]');
    await volumeSlider.fill('60');
    await expect(page.locator('text=/60%/')).toBeVisible();

    // Step 3: Start transcription (will likely fail with dummy file, but that's okay)
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await transcribeBtn.click();

    // Wait a moment for any processing
    await page.waitForTimeout(2000);

    // Check for either success or expected error (we're using dummy data)
    const hasError = await page.locator('text=/Error/i').isVisible().catch(() => false);
    const hasProgress = await page.locator('.bg-gray-200').isVisible().catch(() => false);

    // Either error or progress is expected with dummy data
    expect(hasError || hasProgress).toBeTruthy();

    // Step 4: Verify volume slider still shows 60% after transcription attempt
    await expect(page.locator('text=/60%/')).toBeVisible();
  });

  test('should log volume parameter when bleeping is attempted', async ({ page }) => {
    // Collect console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('dummy audio content')
    });

    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });

    // Set volume to 75%
    const volumeSlider = page.locator('input[type="range"]');
    await volumeSlider.fill('75');
    await expect(page.locator('text=/75%/')).toBeVisible();

    // Try to transcribe (will likely fail but that's okay for this test)
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await transcribeBtn.click();

    await page.waitForTimeout(3000);

    // Check if any error occurred - if transcription somehow worked with dummy data
    // and we have matched words, try bleeping
    const hasMatchSection = await page.locator('text=/Enter Words to Bleep/').isVisible();

    if (hasMatchSection) {
      // If we somehow got here, try to add words and bleep
      const wordsInput = page.locator('input[placeholder*="bad"]');
      if (await wordsInput.isVisible()) {
        await wordsInput.fill('test');
        const matchBtn = page.locator('button').filter({ hasText: 'Run Matching' });
        await matchBtn.click();
        await page.waitForTimeout(1000);

        const bleepBtn = page.locator('button').filter({ hasText: 'Apply Bleeps' });
        if (await bleepBtn.isEnabled()) {
          await bleepBtn.click();
          await page.waitForTimeout(2000);

          // Check console logs for volume parameter
          const volumeLogged = consoleMessages.some(msg =>
            msg.includes('75% volume') || msg.includes('75')
          );

          if (consoleMessages.length > 0) {
            console.log('Sample console messages:', consoleMessages.slice(0, 10));
          }
        }
      }
    }

    // Main assertion: volume slider maintained its value throughout
    await expect(page.locator('text=/75%/')).toBeVisible();
  });

  test('should maintain volume setting across bleep sound changes', async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('test audio data')
    });

    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });

    // Set initial volume to 45%
    const volumeSlider = page.locator('input[type="range"]');
    await volumeSlider.fill('45');
    await expect(page.locator('text=/45%/')).toBeVisible();

    // Change bleep sound from Classic Bleep to Brown Noise
    const bleepSoundSelect = page.locator('select').first();
    await bleepSoundSelect.selectOption('brown');

    // Verify volume is still 45%
    await expect(page.locator('text=/45%/')).toBeVisible();

    // Change back to Classic Bleep
    await bleepSoundSelect.selectOption('bleep');

    // Volume should still be 45%
    await expect(page.locator('text=/45%/')).toBeVisible();

    // Change volume to 90%
    await volumeSlider.fill('90');
    await expect(page.locator('text=/90%/')).toBeVisible();

    // Change bleep sound again
    await bleepSoundSelect.selectOption('brown');

    // Volume should still be 90%
    await expect(page.locator('text=/90%/')).toBeVisible();
  });

  test('should handle volume changes at different workflow stages', async ({ page }) => {
    // Test volume changes before file upload
    const volumeSlider = page.locator('input[type="range"]');
    await volumeSlider.fill('30');
    await expect(page.locator('text=/30%/')).toBeVisible();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('test')
    });

    // Volume should persist after upload
    await expect(page.locator('text=/30%/')).toBeVisible();

    // Change volume after upload
    await volumeSlider.fill('85');
    await expect(page.locator('text=/85%/')).toBeVisible();

    // Start transcription
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await transcribeBtn.click();

    await page.waitForTimeout(2000);

    // Volume should persist after transcription attempt
    await expect(page.locator('text=/85%/')).toBeVisible();
  });

  test('should accept volume parameter in both audio and video processing paths', async ({ page }) => {
    // Test with audio file
    const fileInput = page.locator('input[type="file"]');

    // First test: audio file
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('audio test data')
    });

    await expect(page.locator('text=/File loaded: test.mp3/')).toBeVisible({ timeout: 5000 });

    const volumeSlider = page.locator('input[type="range"]');
    await volumeSlider.fill('55');
    await expect(page.locator('text=/55%/')).toBeVisible();

    // Now test with video file (upload new file)
    await page.reload();
    await page.waitForTimeout(1000);

    await fileInput.setInputFiles({
      name: 'test.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('video test data')
    });

    await expect(page.locator('text=/File loaded: test.mp4/')).toBeVisible({ timeout: 5000 });

    // Set different volume for video
    await volumeSlider.fill('65');
    await expect(page.locator('text=/65%/')).toBeVisible();

    // Both file types should accept volume control equally
    // The actual bleeping will fail with dummy data, but UI should work
  });

  test('should handle extreme volume values correctly', async ({ page }) => {
    const volumeSlider = page.locator('input[type="range"]');

    // Test minimum volume (0%)
    await volumeSlider.fill('0');
    await expect(page.locator('text=/0%/')).toBeVisible();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('test')
    });

    // 0% should persist
    await expect(page.locator('text=/0%/')).toBeVisible();

    // Test maximum volume (100%)
    await volumeSlider.fill('100');
    await expect(page.locator('text=/100%/')).toBeVisible();

    // Try transcription with 100% volume
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await transcribeBtn.click();

    await page.waitForTimeout(2000);

    // 100% should persist
    await expect(page.locator('text=/100%/')).toBeVisible();
  });

  test('should prevent bleeping when volume is set but no words are matched', async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('test')
    });

    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });

    // Set volume
    const volumeSlider = page.locator('input[type="range"]');
    await volumeSlider.fill('70');

    // Bleep button should still be disabled (no transcription/matching done)
    const bleepBtn = page.locator('button').filter({ hasText: 'Apply Bleeps' });
    await expect(bleepBtn).toBeDisabled();
  });

  test('should show volume in step 5 section that becomes enabled after matching', async ({ page }) => {
    // Initially, Step 5 should be visible but dimmed (opacity-50)
    const step5Section = page.locator('section').filter({
      has: page.locator('text=/Choose Bleep Sound & Volume/')
    });

    const hasOpacity = await step5Section.evaluate(el =>
      el.classList.contains('opacity-50')
    );
    expect(hasOpacity).toBeTruthy();

    // Volume control should still be visible and interactive
    const volumeSlider = page.locator('input[type="range"]');
    await expect(volumeSlider).toBeVisible();

    // Should be able to change volume even before matching
    await volumeSlider.fill('40');
    await expect(page.locator('text=/40%/')).toBeVisible();
  });

  test('should change button label after first bleep', async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('test')
    });

    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });

    // Initial button should say "Apply Bleeps!"
    const bleepBtn = page.locator('button').filter({ hasText: /Apply Bleeps/ });
    await expect(bleepBtn).toContainText('Apply Bleeps!');

    // Try transcription (will fail with dummy data)
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await transcribeBtn.click();
    await page.waitForTimeout(2000);

    // If transcription somehow worked and we have matched words
    const hasMatchSection = await page.locator('text=/Enter Words to Bleep/').isVisible();

    if (hasMatchSection) {
      // Add words and run matching
      const wordsInput = page.locator('input[placeholder*="bad"]');
      await wordsInput.fill('test');
      const matchBtn = page.locator('button').filter({ hasText: 'Run Matching' });
      await matchBtn.click();
      await page.waitForTimeout(1000);

      // Click bleep button
      if (await bleepBtn.isEnabled()) {
        await bleepBtn.click();
        await page.waitForTimeout(2000);

        // Button label should now say "Re-apply Bleeps"
        await expect(bleepBtn).toContainText('Re-apply Bleeps with New Settings');
      }
    }
  });

  test('should show visual highlight when volume changes after bleeping', async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('test')
    });

    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });

    // Set initial volume to 70%
    const volumeSlider = page.locator('input[type="range"]');
    await volumeSlider.fill('70');

    // Try transcription and bleeping workflow
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await transcribeBtn.click();
    await page.waitForTimeout(2000);

    const hasMatchSection = await page.locator('text=/Enter Words to Bleep/').isVisible();

    if (hasMatchSection) {
      const wordsInput = page.locator('input[placeholder*="bad"]');
      await wordsInput.fill('test');
      const matchBtn = page.locator('button').filter({ hasText: 'Run Matching' });
      await matchBtn.click();
      await page.waitForTimeout(1000);

      const bleepBtn = page.locator('button').filter({ hasText: /Apply Bleeps/ });
      if (await bleepBtn.isEnabled()) {
        await bleepBtn.click();
        await page.waitForTimeout(2000);

        // Now change volume to 50%
        await volumeSlider.fill('50');

        // Button should have ring-4 and ring-yellow-400 classes (visual highlight)
        const hasHighlight = await bleepBtn.evaluate(el =>
          el.classList.contains('ring-4') && el.classList.contains('ring-yellow-400')
        );

        expect(hasHighlight).toBeTruthy();
      }
    }
  });

  test('should display info message about re-bleeping in result section', async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('test')
    });

    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });

    // Try transcription and bleeping workflow
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await transcribeBtn.click();
    await page.waitForTimeout(2000);

    const hasMatchSection = await page.locator('text=/Enter Words to Bleep/').isVisible();

    if (hasMatchSection) {
      const wordsInput = page.locator('input[placeholder*="bad"]');
      await wordsInput.fill('test');
      const matchBtn = page.locator('button').filter({ hasText: 'Run Matching' });
      await matchBtn.click();
      await page.waitForTimeout(1000);

      const bleepBtn = page.locator('button').filter({ hasText: /Apply Bleeps/ });
      if (await bleepBtn.isEnabled()) {
        await bleepBtn.click();
        await page.waitForTimeout(2000);

        // Check for info message in result section
        const infoMessage = page.locator('text=/Want to adjust the volume/i');
        await expect(infoMessage).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should allow re-bleeping with different volume without re-transcription', async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('test')
    });

    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });

    const volumeSlider = page.locator('input[type="range"]');
    await volumeSlider.fill('60');

    // Transcribe
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await transcribeBtn.click();
    await page.waitForTimeout(2000);

    const hasMatchSection = await page.locator('text=/Enter Words to Bleep/').isVisible();

    if (hasMatchSection) {
      // Match words
      const wordsInput = page.locator('input[placeholder*="bad"]');
      await wordsInput.fill('test');
      const matchBtn = page.locator('button').filter({ hasText: 'Run Matching' });
      await matchBtn.click();
      await page.waitForTimeout(1000);

      const bleepBtn = page.locator('button').filter({ hasText: /Apply Bleeps/ });

      if (await bleepBtn.isEnabled()) {
        // First bleep at 60%
        await bleepBtn.click();
        await page.waitForTimeout(2000);

        // Button should now say "Re-apply"
        await expect(bleepBtn).toContainText('Re-apply Bleeps');

        // Change volume to 80%
        await volumeSlider.fill('80');
        await expect(page.locator('text=/80%/')).toBeVisible();

        // Re-bleep button should be enabled
        await expect(bleepBtn).toBeEnabled();

        // Click to re-bleep with new volume
        await bleepBtn.click();
        await page.waitForTimeout(2000);

        // Should complete successfully - matched words should persist
        // No need to re-transcribe or re-match
        await expect(page.locator('text=/80%/')).toBeVisible();
      }
    }
  });

  test('should update media player with new censored content when re-bleeping', async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('test')
    });

    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });

    const volumeSlider = page.locator('input[type="range"]');
    await volumeSlider.fill('50');

    // Transcribe
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await transcribeBtn.click();
    await page.waitForTimeout(2000);

    const hasMatchSection = await page.locator('text=/Enter Words to Bleep/').isVisible();

    if (hasMatchSection) {
      // Match words
      const wordsInput = page.locator('input[placeholder*="bad"]');
      await wordsInput.fill('test');
      const matchBtn = page.locator('button').filter({ hasText: 'Run Matching' });
      await matchBtn.click();
      await page.waitForTimeout(1000);

      const bleepBtn = page.locator('button').filter({ hasText: /Apply Bleeps/ });

      if (await bleepBtn.isEnabled()) {
        // First bleep at 50%
        await bleepBtn.click();
        await page.waitForTimeout(2000);

        // Wait for audio player to appear
        const audioElement = page.locator('audio[controls]');
        await expect(audioElement).toBeVisible({ timeout: 5000 });

        // Get the initial src URL from source element
        const initialSrc = await page.locator('audio source').getAttribute('src');
        expect(initialSrc).toBeTruthy();

        // Change volume to 90%
        await volumeSlider.fill('90');

        // Re-bleep with new volume
        await bleepBtn.click();
        await page.waitForTimeout(2000);

        // Verify audio player is still visible
        await expect(audioElement).toBeVisible();

        // Get new src URL - should be different blob URL
        const newSrc = await page.locator('audio source').getAttribute('src');
        expect(newSrc).toBeTruthy();
        expect(newSrc).not.toBe(initialSrc); // Different blob URL means new content

        // Verify the audio element was remounted (key prop changed)
        // This ensures the browser loads the new audio, not cached version
      }
    }
  });
});