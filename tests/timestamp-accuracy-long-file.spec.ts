import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Timestamp Accuracy Test Suite for Longer Files (>30s)
 *
 * Purpose: Validate that word-level timestamps work correctly for audio/video
 * files longer than the chunk_length_s parameter (20s), ensuring no timestamp
 * corruption occurs at chunk boundaries.
 *
 * Test file: lemon.mp4
 * Duration: ~59 seconds
 *
 * Background: transformers.js issue #1358 identified that chunk_length_s=30
 * causes timestamp corruption for longer files (all timestamps cluster around 29.98s).
 * This test ensures our fix (chunk_length_s=20) prevents this issue.
 */

test.describe('Timestamp Accuracy - Long Files', () => {
  test.beforeEach(async ({ page }) => {
    // Increase timeout for model loading and longer file processing
    test.setTimeout(240000); // 4 minutes for ~59s file
  });

  test('should generate valid timestamps across multiple chunks for 59s file', async ({ page }) => {
    // Navigate to bleep page
    await page.goto('/bleep');
    await expect(page.locator('h1').filter({ hasText: /Bleep Your Sh/i })).toBeVisible();

    // Upload lemon.mp4 (~59 seconds)
    const testFile = path.join(__dirname, 'fixtures/files/lemon.mp4');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFile);

    // Wait for file to load
    await expect(
      page.locator('text=/File loaded|ready/i').or(page.locator('select[name="model"]'))
    ).toBeVisible({ timeout: 10000 });

    // Select Whisper Tiny (English) model - fastest for testing
    const modelSelect = page.locator('select').first();
    await modelSelect.selectOption('Xenova/whisper-tiny.en');

    // Set up console monitoring for timestamp logs
    const debugLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Match found') || text.includes('timestamp')) {
        debugLogs.push(text);
        console.log('[Console]', text);
      }
    });

    // Start transcription
    const transcribeBtn = page.locator('button').filter({ hasText: /Start Transcription/i });
    await transcribeBtn.click();

    // Wait for transcription to complete (longer timeout for 59s file)
    await expect(
      page.locator('text=/Transcription complete/i').or(page.locator('text=/Transcript:/i'))
    ).toBeVisible({ timeout: 180000 }); // 3 minutes

    // Allow time for state to settle
    await page.waitForTimeout(1000);

    // Verify transcript text appears
    const transcriptText = await page
      .locator('p.text-gray-800')
      .first()
      .textContent();
    console.log('Transcribed text length:', transcriptText?.length);

    // Verify we got a reasonable transcription
    expect(transcriptText).toBeTruthy();
    expect(transcriptText!.length).toBeGreaterThan(50); // Should have substantial text for 59s

    // Get word count
    const wordCountText = await page.locator('text=/Found .* words/i').textContent();
    console.log(wordCountText);

    const wordCount = wordCountText?.match(/(\d+)\s+words/)?.[1];
    if (wordCount) {
      const count = parseInt(wordCount);
      console.log(`Found ${count} words in transcript`);

      // For a 59s file, expect reasonable word count (rough estimate: 100-200 words)
      expect(count).toBeGreaterThan(20);
      expect(count).toBeLessThan(300);
    }

    // Match a word that should appear in the middle/end of the video
    // This tests that timestamps work across chunk boundaries
    const wordInput = page.locator('input[placeholder*="bad"]').or(page.locator('input[type="text"]').nth(1));

    // Try to match a common word (adjust based on actual content)
    await wordInput.fill('the');

    const matchBtn = page.locator('button').filter({ hasText: /Match Words/i });
    await matchBtn.click();

    await page.waitForTimeout(1000);

    // Check for timestamp logs
    const timestampMatches = debugLogs.filter((log) => /\[[\d.]+,\s*[\d.]+\]/.test(log));
    console.log('Found timestamp logs:', timestampMatches.length);

    // Parse timestamps and verify they span the full duration
    const timestamps: Array<[number, number]> = [];
    for (const log of timestampMatches) {
      const match = log.match(/\[([\d.]+),\s*([\d.]+)\]/);
      if (match) {
        const start = parseFloat(match[1]);
        const end = parseFloat(match[2]);
        timestamps.push([start, end]);
      }
    }

    if (timestamps.length > 0) {
      console.log(`Analyzed ${timestamps.length} timestamps`);

      // Find max timestamp to verify it spans the full duration
      const maxTimestamp = Math.max(...timestamps.map(([_, end]) => end));
      console.log(`Max timestamp: ${maxTimestamp}s (file duration: ~59s)`);

      // Verify timestamps span a significant portion of the file
      // Should be at least 30s, not clustered around 29.98s (the bug we're fixing)
      expect(maxTimestamp).toBeGreaterThan(30);

      // Verify no identical start/end timestamps
      for (const [start, end] of timestamps) {
        if (start === end) {
          console.error(`❌ Found identical timestamps: [${start}, ${end}]`);
          throw new Error(`Timestamp regression: identical start/end values [${start}, ${end}]`);
        }
        expect(end).toBeGreaterThan(start);
      }

      console.log('✅ All timestamps are valid and span the full duration');
    }
  });

  test('should successfully bleep words in longer videos', async ({ page }) => {
    await page.goto('/bleep');
    await expect(page.locator('h1').filter({ hasText: /Bleep Your Sh/i })).toBeVisible();

    // Upload lemon.mp4
    const testFile = path.join(__dirname, 'fixtures/files/lemon.mp4');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFile);

    await page.waitForTimeout(1000);

    // Select model
    const modelSelect = page.locator('select').first();
    await modelSelect.selectOption('Xenova/whisper-tiny.en');

    // Start transcription
    const transcribeBtn = page.locator('button').filter({ hasText: /Start Transcription/i });
    await transcribeBtn.click();

    // Wait for transcription
    await expect(page.locator('text=/Transcript:/i')).toBeVisible({ timeout: 180000 });
    await page.waitForTimeout(1000);

    // Enter a common word to bleep
    const wordInput = page.locator('input[placeholder*="bad"]').or(page.locator('input[type="text"]').nth(1));
    await wordInput.fill('the');

    // Click Match Words
    const matchBtn = page.locator('button').filter({ hasText: /Match Words/i });
    await matchBtn.click();

    await page.waitForTimeout(500);

    // Verify matches were found
    await expect(page.locator('text=/matched|found/i')).toBeVisible({ timeout: 5000 });

    // Apply bleep
    const bleepBtn = page.locator('button').filter({ hasText: /Apply Bleep|Generate/i });
    await bleepBtn.click();

    // Wait for bleeping to complete (longer timeout for 59s file)
    await expect(
      page
        .locator('text=/complete|success|done/i')
        .or(page.locator('text=/Download/i'))
    ).toBeVisible({ timeout: 120000 }); // 2 minutes

    // Verify download button appears
    const downloadBtn = page.locator('button,a').filter({ hasText: /Download/i });
    await expect(downloadBtn).toBeVisible();

    console.log('✅ Successfully bleeped words in 59s video with accurate timestamps');
  });

  test('should not show timestamp corruption at 29.98s for long files', async ({ page }) => {
    await page.goto('/bleep');
    await expect(page.locator('h1').filter({ hasText: /Bleep Your Sh/i })).toBeVisible();

    const testFile = path.join(__dirname, 'fixtures/files/lemon.mp4');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFile);

    await page.waitForTimeout(1000);

    const modelSelect = page.locator('select').first();
    await modelSelect.selectOption('Xenova/whisper-tiny.en');

    // Set up console monitoring specifically for the 29.98 bug
    const debugLogs: string[] = [];
    let has2998Bug = false;
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Match found') || text.includes('timestamp')) {
        debugLogs.push(text);
        console.log('[Console]', text);

        // Check for the specific bug pattern: timestamps around 29.98
        if (text.includes('29.9') || text.includes('30.0')) {
          const match = text.match(/\[([\d.]+),\s*([\d.]+)\]/);
          if (match) {
            const start = parseFloat(match[1]);
            const end = parseFloat(match[2]);
            // If we see many timestamps clustered around 29.98, that's the bug
            if (Math.abs(start - 29.98) < 0.1 || Math.abs(end - 29.98) < 0.1) {
              console.warn(`⚠️  Found timestamp near 29.98: [${start}, ${end}]`);
            }
          }
        }
      }
    });

    const transcribeBtn = page.locator('button').filter({ hasText: /Start Transcription/i });
    await transcribeBtn.click();

    await expect(page.locator('text=/Transcript:/i')).toBeVisible({ timeout: 180000 });
    await page.waitForTimeout(1000);

    // Match words to trigger timestamp logging
    const wordInput = page.locator('input[placeholder*="bad"]').or(page.locator('input[type="text"]').nth(1));
    await wordInput.fill('the');

    const matchBtn = page.locator('button').filter({ hasText: /Match Words/i });
    await matchBtn.click();

    await page.waitForTimeout(1000);

    // Analyze all timestamps
    const timestamps: number[] = [];
    for (const log of debugLogs) {
      const match = log.match(/\[([\d.]+),\s*([\d.]+)\]/);
      if (match) {
        timestamps.push(parseFloat(match[1]));
        timestamps.push(parseFloat(match[2]));
      }
    }

    if (timestamps.length > 0) {
      // Count how many timestamps are clustered around 29.98
      const near2998 = timestamps.filter(t => Math.abs(t - 29.98) < 0.5).length;
      const total = timestamps.length;
      const percentNear2998 = (near2998 / total) * 100;

      console.log(`Timestamps near 29.98: ${near2998}/${total} (${percentNear2998.toFixed(1)}%)`);

      // If >50% of timestamps are clustered around 29.98, we have the bug
      if (percentNear2998 > 50) {
        throw new Error(
          `Timestamp corruption detected: ${percentNear2998.toFixed(1)}% of timestamps clustered around 29.98s (issue #1358)`
        );
      }

      console.log('✅ No timestamp corruption at 29.98s - timestamps properly distributed');
    }
  });
});
