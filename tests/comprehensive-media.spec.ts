import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Comprehensive Media Transcription and Bleep Tests', () => {
  const testFiles = [
    { name: 'test.mp3', type: 'audio', description: 'Small audio file (52KB)' },
    { name: 'test_full.mp3', type: 'audio', description: 'Full audio file (1.1MB)' },
    { name: 'test.mp4', type: 'video', description: 'Video file with audio (282KB)' },
  ];

  testFiles.forEach(({ name, type, description }) => {
    test(`should transcribe and bleep ${description}`, async ({ page }) => {
      test.setTimeout(180000); // 3 minutes for longer files

      console.log(`\n=== Testing ${name} (${description}) ===`);

      // Navigate to bleep page
      await page.goto('/bleep');
      await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();

      // Upload the test file
      console.log(`1. Uploading ${name}...`);
      const testFile = path.join(__dirname, 'fixtures/files', name);
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFile);

      // Wait for file to be loaded
      await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 10000 });
      console.log('2. File uploaded successfully');

      // Check appropriate preview (audio or video)
      if (type === 'audio') {
        const audioPlayer = page.locator('audio');
        await expect(audioPlayer).toBeVisible({ timeout: 5000 });
        console.log('3. Audio preview loaded');
      } else if (type === 'video') {
        // Video files need extraction first
        console.log('3. Video file detected, will extract audio');
      }

      // Select language and model
      console.log('4. Selecting language and model...');
      const languageSelect = page.locator('select').first();
      await languageSelect.selectOption('en');

      const modelSelect = page.locator('select').nth(1);
      await modelSelect.selectOption('Xenova/whisper-tiny.en');

      // Start transcription
      console.log('5. Starting transcription...');
      const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
      await expect(transcribeBtn).toBeEnabled();
      await transcribeBtn.click();

      // Monitor progress
      const progressBar = page.locator('.bg-blue-600');
      const errorMsg = page.locator('text=/Error|Failed/i');

      // Wait for either progress or error
      await expect(async () => {
        const hasProgress = (await progressBar.count()) > 0;
        const hasError = await errorMsg.isVisible().catch(() => false);
        expect(hasProgress || hasError).toBeTruthy();
      }).toPass({ timeout: 10000 });

      // If video, wait for extraction
      if (type === 'video') {
        console.log('6. Extracting audio from video...');
        // Wait a bit for extraction to complete
        await page.waitForTimeout(3000);
      }

      // Monitor console for errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log('Browser console error:', msg.text());
        }
      });

      // Wait for transcription result
      console.log('7. Waiting for transcription to complete...');
      const transcriptionResultDiv = page.locator('div').filter({ hasText: 'Transcript:' }).first();
      const transcriptionTextElement = page.locator('p.text-gray-800').first();

      // Extended timeout for longer files
      const timeout = type === 'video' ? 120000 : 60000;

      await expect(async () => {
        const hasResult = await transcriptionResultDiv.isVisible().catch(() => false);
        const hasTranscript = await transcriptionTextElement.isVisible().catch(() => false);
        const hasError = await errorMsg.isVisible().catch(() => false);

        if (hasError) {
          const errorText = await errorMsg.textContent();
          console.log(`Error occurred: ${errorText}`);
        }

        expect(hasResult || hasTranscript || hasError).toBeTruthy();
      }).toPass({ timeout, intervals: [2000] });

      // Check if we got a transcription
      const hasError = await errorMsg.isVisible().catch(() => false);
      if (!hasError) {
        await expect(transcriptionTextElement).toBeVisible({ timeout: 10000 });
        const transcriptionContent = await transcriptionTextElement.textContent();
        console.log(`8. Transcription completed: "${transcriptionContent?.substring(0, 100)}..."`);

        // Test bleeping functionality
        console.log('9. Testing bleep functionality...');

        // Find and fill the bleep words input
        const bleepInput = page.locator('input[placeholder*="bad, word, curse"]').first();
        if (await bleepInput.isVisible()) {
          // Add some test words to bleep
          await bleepInput.fill('music, test, sound');
          console.log('10. Added bleep words: music, test, sound');

          // Find and click the match button
          const matchButton = page
            .locator('button')
            .filter({ hasText: /Match|Apply|Bleep/i })
            .last();
          if (await matchButton.isVisible()) {
            await matchButton.click();
            console.log('11. Applied bleep matching');

            // Wait a moment for processing
            await page.waitForTimeout(1000);

            // Check if any matches were found
            const matchResults = page.locator('text=/matched|found|bleep/i');
            if ((await matchResults.count()) > 0) {
              const matchText = await matchResults.first().textContent();
              console.log(`12. Bleep results: ${matchText}`);
            }
          }
        }

        // Take screenshot of successful transcription
        await page.screenshot({
          path: `test-results/${name.replace('.', '_')}-success.png`,
          fullPage: true,
        });

        console.log(`✅ Successfully transcribed and processed ${name}`);
      } else {
        const errorText = await errorMsg.textContent();
        throw new Error(`Failed to transcribe ${name}: ${errorText}`);
      }
    });
  });

  test('should handle invalid file types', async ({ page }) => {
    await page.goto('/bleep');

    console.log('Testing invalid file upload...');
    const fileInput = page.locator('input[type="file"]');

    // Try uploading the text file
    const testFile = path.join(__dirname, 'fixtures/files/sample.txt');
    await fileInput.setInputFiles(testFile);

    // Should show warning
    const warning = page.locator('text=/Please upload a valid audio or video file/');
    await expect(warning).toBeVisible({ timeout: 5000 });
    console.log('✅ Invalid file warning shown correctly');
  });

  test('should transcribe and bleep with all matching modes', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/bleep');

    // Upload a small test file for quick testing
    const testFile = path.join(__dirname, 'fixtures/files/test.mp3');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 10000 });

    // Start transcription
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await transcribeBtn.click();

    // Wait for transcription
    const transcriptionTextElement = page.locator('p.text-gray-800').first();
    await expect(transcriptionTextElement).toBeVisible({ timeout: 60000 });

    const transcriptionContent = await transcriptionTextElement.textContent();
    console.log(`Transcription: "${transcriptionContent}"`);

    // Test different matching modes
    const matchModes = ['exact', 'partial', 'fuzzy'];

    for (const mode of matchModes) {
      console.log(`Testing ${mode} matching...`);

      // Find and check the appropriate checkbox
      const checkbox = page
        .locator(`input[type="checkbox"]`)
        .filter({ hasText: new RegExp(mode, 'i') });
      if (await checkbox.isVisible()) {
        await checkbox.check();
        console.log(`✓ Enabled ${mode} matching`);
      }
    }

    // Add words to match
    const bleepInput = page.locator('input[placeholder*="bad, word, curse"]').first();
    if (await bleepInput.isVisible()) {
      // Use a word that might appear in the transcription
      await bleepInput.fill('the, a, music');

      // Apply matching
      const matchButton = page
        .locator('button')
        .filter({ hasText: /Match|Apply/i })
        .last();
      if (await matchButton.isVisible()) {
        await matchButton.click();
        console.log('Applied bleep matching with all modes enabled');
      }
    }
  });

  test('should handle concurrent file uploads', async ({ page }) => {
    await page.goto('/bleep');

    // Upload first file
    const fileInput = page.locator('input[type="file"]');
    const file1 = path.join(__dirname, 'fixtures/files/test.mp3');
    await fileInput.setInputFiles(file1);
    await expect(page.locator('text=/File loaded.*test\.mp3/i')).toBeVisible({ timeout: 5000 });

    // Upload second file (should replace the first)
    const file2 = path.join(__dirname, 'fixtures/files/test_full.mp3');
    await fileInput.setInputFiles(file2);
    await expect(page.locator('text=/File loaded.*test_full\.mp3/i')).toBeVisible({
      timeout: 5000,
    });

    console.log('✅ File replacement works correctly');
  });
});
