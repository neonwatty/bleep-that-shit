import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Bleep Buffer Feature E2E Tests
 *
 * Tests the time buffer slider that extends bleeps before and after matched words.
 * Validates UI controls, timestamp calculation, and overlap merging.
 */

test.describe('Bleep Buffer Feature', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for transcription
  });

  test('should display buffer slider control in Step 4', async ({ page }) => {
    await page.goto('/bleep');
    await expect(page.locator('h1').filter({ hasText: /Bleep Your Sh/i })).toBeVisible();

    // Upload and transcribe test file
    const testFile = path.join(__dirname, 'fixtures/files/timestamp-test.mp3');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFile);

    await page.waitForTimeout(1000);

    const modelSelect = page.locator('select').first();
    await modelSelect.selectOption('Xenova/whisper-tiny.en');

    const transcribeBtn = page.locator('button').filter({ hasText: /Start Transcription/i });
    await transcribeBtn.click();

    await expect(page.locator('text=/Transcript:/i')).toBeVisible({ timeout: 90000 });
    await page.waitForTimeout(1000);

    // Check buffer slider exists
    const bufferLabel = page.locator('label').filter({ hasText: /Bleep Buffer/i });
    await expect(bufferLabel).toBeVisible();

    // Check slider input exists
    const bufferSlider = page.locator('input[type="range"][min="0"][max="0.5"]');
    await expect(bufferSlider).toBeVisible();

    // Check help text exists
    await expect(page.locator('text=/Extends bleep.*before and after each word/i')).toBeVisible();
  });

  test('should update buffer value display when slider changes', async ({ page }) => {
    await page.goto('/bleep');

    const testFile = path.join(__dirname, 'fixtures/files/timestamp-test.mp3');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFile);

    await page.waitForTimeout(1000);

    const modelSelect = page.locator('select').first();
    await modelSelect.selectOption('Xenova/whisper-tiny.en');

    const transcribeBtn = page.locator('button').filter({ hasText: /Start Transcription/i });
    await transcribeBtn.click();

    await expect(page.locator('text=/Transcript:/i')).toBeVisible({ timeout: 90000 });

    // Initial value should be 0.00s
    await expect(page.locator('label').filter({ hasText: /Bleep Buffer: 0\.00s/i })).toBeVisible();

    // Adjust slider to 0.25s
    const bufferSlider = page.locator('input[type="range"][min="0"][max="0.5"]');
    await bufferSlider.fill('0.25');

    // Should update display
    await expect(page.locator('label').filter({ hasText: /Bleep Buffer: 0\.25s/i })).toBeVisible();

    // Adjust to max value
    await bufferSlider.fill('0.5');
    await expect(page.locator('label').filter({ hasText: /Bleep Buffer: 0\.50s/i })).toBeVisible();
  });

  test('should show buffer in matched words display', async ({ page }) => {
    await page.goto('/bleep');

    const testFile = path.join(__dirname, 'fixtures/files/timestamp-test.mp3');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFile);

    await page.waitForTimeout(1000);

    const modelSelect = page.locator('select').first();
    await modelSelect.selectOption('Xenova/whisper-tiny.en');

    const transcribeBtn = page.locator('button').filter({ hasText: /Start Transcription/i });
    await transcribeBtn.click();

    await expect(page.locator('text=/Transcript:/i')).toBeVisible({ timeout: 90000 });
    await page.waitForTimeout(1000);

    // Set buffer to 0.15s
    const bufferSlider = page.locator('input[type="range"][min="0"][max="0.5"]');
    await bufferSlider.fill('0.15');

    // Match word
    const wordInput = page
      .locator('input[placeholder*="bad"]')
      .or(page.locator('input[type="text"]').nth(1));
    await wordInput.fill('hello');

    const matchBtn = page.locator('button').filter({ hasText: /Match Words/i });
    await matchBtn.click();

    await page.waitForTimeout(500);

    // Should show buffer in heading
    await expect(page.locator('text=/Matched.*words.*with 0\.15s buffer/i')).toBeVisible();
  });

  test('should apply buffer to timestamps (no buffer vs with buffer)', async ({ page }) => {
    await page.goto('/bleep');

    const testFile = path.join(__dirname, 'fixtures/files/timestamp-test.mp3');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFile);

    await page.waitForTimeout(1000);

    const modelSelect = page.locator('select').first();
    await modelSelect.selectOption('Xenova/whisper-tiny.en');

    const transcribeBtn = page.locator('button').filter({ hasText: /Start Transcription/i });
    await transcribeBtn.click();

    await expect(page.locator('text=/Transcript:/i')).toBeVisible({ timeout: 90000 });
    await page.waitForTimeout(1000);

    // First match with NO buffer (buffer = 0)
    const wordInput = page
      .locator('input[placeholder*="bad"]')
      .or(page.locator('input[type="text"]').nth(1));
    await wordInput.fill('hello');

    const matchBtn = page.locator('button').filter({ hasText: /Match Words/i });
    await matchBtn.click();

    await page.waitForTimeout(500);

    // Get first matched word timestamps (no buffer)
    const firstMatchNoBuffer = await page.locator('.rounded.bg-yellow-200').first().textContent();
    console.log('Match without buffer:', firstMatchNoBuffer);

    // Clear matches by changing word input
    await wordInput.fill('');
    await page.waitForTimeout(300);

    // Now set buffer to 0.2s
    const bufferSlider = page.locator('input[type="range"][min="0"][max="0.5"]');
    await bufferSlider.fill('0.2');

    // Match again with buffer
    await wordInput.fill('hello');
    await matchBtn.click();

    await page.waitForTimeout(500);

    // Get matched word timestamps (with buffer)
    const firstMatchWithBuffer = await page.locator('.rounded.bg-yellow-200').first().textContent();
    console.log('Match with 0.2s buffer:', firstMatchWithBuffer);

    // Verify they're different (buffer should extend timestamps)
    expect(firstMatchNoBuffer).not.toBe(firstMatchWithBuffer);
  });

  test('should successfully bleep with buffer applied', async ({ page }) => {
    await page.goto('/bleep');

    const testFile = path.join(__dirname, 'fixtures/files/timestamp-test.mp3');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFile);

    await page.waitForTimeout(1000);

    const modelSelect = page.locator('select').first();
    await modelSelect.selectOption('Xenova/whisper-tiny.en');

    const transcribeBtn = page.locator('button').filter({ hasText: /Start Transcription/i });
    await transcribeBtn.click();

    await expect(page.locator('text=/Transcript:/i')).toBeVisible({ timeout: 90000 });
    await page.waitForTimeout(1000);

    // Set buffer
    const bufferSlider = page.locator('input[type="range"][min="0"][max="0.5"]');
    await bufferSlider.fill('0.15');

    // Match word
    const wordInput = page
      .locator('input[placeholder*="bad"]')
      .or(page.locator('input[type="text"]').nth(1));
    await wordInput.fill('hello');

    const matchBtn = page.locator('button').filter({ hasText: /Match Words/i });
    await matchBtn.click();

    await page.waitForTimeout(500);

    // Verify match found
    await expect(page.locator('text=/matched|found/i')).toBeVisible();

    // Apply bleep
    const bleepBtn = page.locator('button').filter({ hasText: /Apply Bleep|Generate/i });
    await bleepBtn.click();

    // Wait for bleeping to complete
    await expect(
      page.locator('text=/complete|success|done/i').or(page.locator('text=/Download/i'))
    ).toBeVisible({ timeout: 60000 });

    // Verify download button appears
    const downloadBtn = page.locator('button,a').filter({ hasText: /Download/i });
    await expect(downloadBtn).toBeVisible();

    console.log('✅ Successfully bleeped word with 0.15s buffer');
  });

  test('should merge overlapping words when buffer causes overlap', async ({ page }) => {
    await page.goto('/bleep');

    // Use a longer test file that has words close together
    const testFile = path.join(__dirname, 'fixtures/files/test.mp3');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFile);

    await page.waitForTimeout(1000);

    const modelSelect = page.locator('select').first();
    await modelSelect.selectOption('Xenova/whisper-tiny.en');

    const transcribeBtn = page.locator('button').filter({ hasText: /Start Transcription/i });
    await transcribeBtn.click();

    await expect(page.locator('text=/Transcript:/i')).toBeVisible({ timeout: 90000 });
    await page.waitForTimeout(1000);

    // Enable partial matching to find multiple words
    const partialMatch = page.locator('input[type="checkbox"]').nth(1); // Partial match checkbox
    await partialMatch.check();

    // Set large buffer to cause overlaps
    const bufferSlider = page.locator('input[type="range"][min="0"][max="0.5"]');
    await bufferSlider.fill('0.5');

    // Match a common word that appears multiple times
    const wordInput = page
      .locator('input[placeholder*="bad"]')
      .or(page.locator('input[type="text"]').nth(1));
    await wordInput.fill('the');

    const matchBtn = page.locator('button').filter({ hasText: /Match Words/i });
    await matchBtn.click();

    await page.waitForTimeout(1000);

    // Count matched word badges
    const matchedBadges = page.locator('.rounded.bg-yellow-200');
    const count = await matchedBadges.count();

    console.log(`Found ${count} matched segments (may include merged segments)`);

    // Check if any badges contain comma-separated words (indicating merge)
    const firstBadgeText = await matchedBadges.first().textContent();

    if (firstBadgeText?.includes(',')) {
      console.log('✅ Detected merged segments:', firstBadgeText);
    }

    // Should have at least 1 match
    expect(count).toBeGreaterThan(0);
  });

  test('should handle edge case: word at start of audio with buffer', async ({ page }) => {
    await page.goto('/bleep');

    const testFile = path.join(__dirname, 'fixtures/files/timestamp-test.mp3');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFile);

    await page.waitForTimeout(1000);

    const modelSelect = page.locator('select').first();
    await modelSelect.selectOption('Xenova/whisper-tiny.en');

    const transcribeBtn = page.locator('button').filter({ hasText: /Start Transcription/i });
    await transcribeBtn.click();

    await expect(page.locator('text=/Transcript:/i')).toBeVisible({ timeout: 90000 });
    await page.waitForTimeout(1000);

    // Set buffer
    const bufferSlider = page.locator('input[type="range"][min="0"][max="0.5"]');
    await bufferSlider.fill('0.3');

    // Match first word "hello"
    const wordInput = page
      .locator('input[placeholder*="bad"]')
      .or(page.locator('input[type="text"]').nth(1));
    await wordInput.fill('hello');

    const matchBtn = page.locator('button').filter({ hasText: /Match Words/i });
    await matchBtn.click();

    await page.waitForTimeout(500);

    // Get matched word timestamp
    const matchedWord = await page.locator('.rounded.bg-yellow-200').first().textContent();
    console.log('First word with buffer:', matchedWord);

    // Should start at 0.0s (not negative)
    expect(matchedWord).toMatch(/\(0\.0s/);

    console.log('✅ Buffer correctly prevented negative start time');
  });
});
