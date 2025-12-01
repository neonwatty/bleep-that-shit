/**
 * Mobile Screenshots Demo
 *
 * Captures screenshots for blog posts at each step of the bleep workflow.
 * Run with: demo-recorder screenshot demos/mobile-blog-screenshots.demo.ts --viewport iphone-15-pro -o public/images/blog
 *
 * Note: This demo performs actual transcription which takes ~30-60 seconds.
 * For faster iterations, use a short test audio file.
 */

import type { DemoDefinition } from 'demo-recorder';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const demo: DemoDefinition = {
  id: 'mobile-blog-screenshots',
  name: 'Mobile Blog Screenshots',
  url: 'http://localhost:3004/bleep',

  run: async ({ page, wait, screenshot }) => {
    // Wait for page to fully load
    await wait(3000);

    // Upload test audio file
    const testFilePath = join(__dirname, '../tests/fixtures/files/bob-ross-15s.mp3');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(testFilePath);
    await wait(2000);

    // Wait for audio player to appear
    await page.locator('audio').first().waitFor({ state: 'visible', timeout: 15000 });
    await wait(1000);

    // Screenshot: Step 2 - Transcribe (after file upload, showing model selection)
    await screenshot('step2-transcribe-mobile');

    // Select tiny model for faster transcription
    const modelSelect = page.getByTestId('model-select');
    await modelSelect.selectOption('Xenova/whisper-tiny.en');
    await wait(500);

    // Click transcribe button and wait for transcription to complete
    const transcribeButton = page.getByTestId('transcribe-button');
    await transcribeButton.click();

    // Wait for transcription to complete (up to 90 seconds)
    // The Review tab becomes enabled when transcription is done
    const reviewTab = page.getByRole('tab', { name: /review/i });
    await reviewTab.waitFor({ state: 'visible', timeout: 120000 });

    // Wait for it to be enabled (not disabled)
    await page.waitForFunction(
      () => {
        const tab = document.querySelector('[role="tab"][data-value="review"]');
        return tab && !tab.hasAttribute('disabled') && tab.getAttribute('aria-disabled') !== 'true';
      },
      { timeout: 120000 }
    );
    await wait(1000);

    // Click Review tab
    await reviewTab.click();
    await wait(1500);

    // Wait for transcript words to render
    await page.locator('.word-wrapper').first().waitFor({ state: 'visible', timeout: 10000 });
    await wait(1000);

    // Screenshot: Step 3 - Transcript view
    await screenshot('step3-transcript-mobile');

    // Scroll up to show word lists section (it's at the top)
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(500);

    // Look for Word Lists accordion/section
    const wordListHeader = page.locator('text=Word Lists').first();
    if (await wordListHeader.isVisible({ timeout: 2000 }).catch(() => false)) {
      await wordListHeader.scrollIntoViewIfNeeded();
      await wait(500);
      // Screenshot: Step 3 - Word Lists
      await screenshot('step3-wordlists-mobile');
    }

    // Scroll to pattern matching section
    const patternInput = page.getByTestId('words-to-match-input');
    await patternInput.scrollIntoViewIfNeeded();
    await wait(500);
    // Screenshot: Step 3 - Pattern Matching
    await screenshot('step3-pattern-mobile');

    // Scroll to timeline section
    const timelineToggle = page.getByTestId('timeline-section-toggle');
    if (await timelineToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await timelineToggle.scrollIntoViewIfNeeded();
      await wait(300);
      // Expand timeline if collapsed
      await timelineToggle.click();
      await wait(500);
      // Screenshot: Step 3 - Timeline
      await screenshot('step3-timeline-mobile');
    }

    // Enter some words to match
    await patternInput.scrollIntoViewIfNeeded();
    await patternInput.fill('happy,little');
    const matchButton = page.getByRole('button', { name: /match words/i });
    await matchButton.click();
    await wait(1500);

    // Switch to Bleep tab
    const bleepTab = page.getByRole('tab', { name: /bleep/i });
    await bleepTab.click();
    await wait(1500);

    // Screenshot: Step 4 - Bleep options and preview
    await screenshot('step4-preview-mobile');

    console.log('Mobile screenshots captured successfully!');
  },
};

export default demo;
