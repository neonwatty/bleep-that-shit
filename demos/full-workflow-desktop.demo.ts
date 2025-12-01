/**
 * Full Workflow Desktop Demo
 *
 * Records a complete bleep workflow demonstration at desktop resolution.
 * Run with: demo-recorder video demos/full-workflow-desktop.demo.ts -o public/videos
 *
 * Note: This demo performs actual transcription (~30-60 seconds).
 * The transcription section can be sped up in post with ffmpeg.
 */

import type { DemoDefinition } from 'demo-recorder';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const demo: DemoDefinition = {
  id: 'full-workflow-desktop',
  name: 'Full Bleep Workflow - Desktop',
  url: 'http://localhost:3004/bleep',

  run: async ({ page, wait }) => {
    // Wait for page to fully load
    await wait(2000);

    // Step 1: Upload test audio file
    const testFilePath = join(__dirname, '../tests/fixtures/files/bob-ross-15s.mp3');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(testFilePath);
    await wait(2000);

    // Wait for audio player to appear
    await page.locator('audio').first().waitFor({ state: 'visible', timeout: 15000 });
    await wait(1500);

    // Step 2: Select model and transcribe
    const modelSelect = page.getByTestId('model-select');
    await modelSelect.selectOption('Xenova/whisper-tiny.en');
    await wait(1000);

    // Click transcribe button
    const transcribeButton = page.getByTestId('transcribe-button');
    await transcribeButton.click();

    // Wait for transcription to complete (this is the section to speed up in post)
    const reviewTab = page.getByRole('tab', { name: /review/i });
    await reviewTab.waitFor({ state: 'visible', timeout: 120000 });

    // Wait for tab to be enabled
    await page.waitForFunction(
      () => {
        const tab = document.querySelector('[role="tab"][data-value="review"]');
        return tab && !tab.hasAttribute('disabled') && tab.getAttribute('aria-disabled') !== 'true';
      },
      { timeout: 120000 }
    );
    await wait(1500);

    // Step 3: Navigate to Review tab
    await reviewTab.click();
    await wait(2000);

    // Wait for transcript to render
    await page.locator('.word-wrapper').first().waitFor({ state: 'visible', timeout: 10000 });
    await wait(1500);

    // Scroll to show transcript
    await page.evaluate(() => window.scrollTo(0, 300));
    await wait(1000);

    // Click a few words to demonstrate selection
    const words = page.locator('.word-wrapper');
    const wordCount = await words.count();
    if (wordCount > 5) {
      await words.nth(2).click();
      await wait(500);
      await words.nth(5).click();
      await wait(500);
      await words.nth(8).click();
      await wait(1000);
    }

    // Scroll back up to show word lists
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(1000);

    // Expand word lists and apply one
    const wordListToggle = page.locator('text=Word Lists').first();
    if (await wordListToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await wordListToggle.click();
      await wait(1000);
    }

    // Step 4: Switch to Bleep tab
    const bleepTab = page.getByRole('tab', { name: /bleep/i });
    await bleepTab.click();
    await wait(2000);

    // Show bleep sound selection
    const bleepSoundSelect = page.getByTestId('bleep-sound-select');
    if (await bleepSoundSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await bleepSoundSelect.click();
      await wait(500);
      await bleepSoundSelect.selectOption({ index: 1 });
      await wait(1000);
    }

    // Click apply bleeps button
    const applyButton = page.getByRole('button', { name: /apply bleeps/i });
    if (await applyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await applyButton.click();
      await wait(3000);
    }

    // Final pause to show result
    await wait(2000);

    console.log('Desktop workflow demo recorded successfully!');
  },
};

export default demo;
