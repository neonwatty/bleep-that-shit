/**
 * Quick Word Selection Demo
 *
 * A short ~15-20 second demo showing word selection in the transcript view.
 * Uses pre-loaded transcript to skip transcription wait time.
 * Run with: demo-recorder video demos/word-selection-quick.demo.ts -o public/videos
 */

import type { DemoDefinition } from 'demo-recorder';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load pre-generated transcript
const transcriptPath = join(
  __dirname,
  '../tests/fixtures/transcripts/bob-ross-15s-audio.transcript.json'
);
const transcriptData = JSON.parse(readFileSync(transcriptPath, 'utf-8'));

const demo: DemoDefinition = {
  id: 'word-selection-quick',
  name: 'Quick Word Selection Demo',
  url: 'http://localhost:3004/bleep',

  run: async ({ page, wait }) => {
    // Wait for page to load
    await wait(1500);

    // Upload test audio file first (needed to enable tabs)
    const testFilePath = join(__dirname, '../tests/fixtures/files/bob-ross-15s.mp3');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(testFilePath);
    await wait(1500);

    // Wait for audio player
    await page.locator('audio').first().waitFor({ state: 'visible', timeout: 15000 });
    await wait(500);

    // Inject pre-loaded transcript to skip transcription
    await page.evaluate(transcript => {
      // Store transcript in localStorage for app to pick up
      localStorage.setItem('__TEST_TRANSCRIPT__', JSON.stringify(transcript));

      // Also try dispatching event
      window.dispatchEvent(new CustomEvent('test:loadTranscript', { detail: transcript }));
    }, transcriptData);

    // Select tiny model and click transcribe (it should complete instantly with cached data)
    const modelSelect = page.getByTestId('model-select');
    await modelSelect.selectOption('Xenova/whisper-tiny.en');
    await wait(300);

    const transcribeButton = page.getByTestId('transcribe-button');
    await transcribeButton.click();

    // Wait for Review tab to be enabled
    const reviewTab = page.getByRole('tab', { name: /review/i });
    await page.waitForFunction(
      () => {
        const tab = document.querySelector('[role="tab"][data-value="review"]');
        return tab && !tab.hasAttribute('disabled') && tab.getAttribute('aria-disabled') !== 'true';
      },
      { timeout: 60000 }
    );
    await wait(500);

    // Navigate to Review tab
    await reviewTab.click();
    await wait(1000);

    // Wait for transcript words to render
    await page.locator('.word-wrapper').first().waitFor({ state: 'visible', timeout: 10000 });
    await wait(800);

    // Scroll to show transcript nicely
    await page.evaluate(() => window.scrollTo(0, 200));
    await wait(500);

    // Click words to demonstrate selection (quick, snappy clicks)
    const words = page.locator('.word-wrapper');
    const wordCount = await words.count();

    if (wordCount > 8) {
      // Click several words quickly
      await words.nth(1).click();
      await wait(300);
      await words.nth(3).click();
      await wait(300);
      await words.nth(6).click();
      await wait(300);
      await words.nth(9).click();
      await wait(500);
    }

    // Scroll to show highlighted words
    await page.evaluate(() => window.scrollTo(0, 150));
    await wait(800);

    // Quick switch to Bleep tab
    const bleepTab = page.getByRole('tab', { name: /bleep/i });
    await bleepTab.click();
    await wait(1000);

    // Show bleep sound selector briefly
    const bleepSoundSelect = page.getByTestId('bleep-sound-select');
    if (await bleepSoundSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      await bleepSoundSelect.focus();
      await wait(500);
    }

    // Final pause
    await wait(1000);

    console.log('Quick word selection demo recorded successfully!');
  },
};

export default demo;
