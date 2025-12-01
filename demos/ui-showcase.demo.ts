/**
 * UI Showcase Demo
 *
 * A quick demo showing the bleep interface without running transcription.
 * Shows upload, UI elements, and navigation.
 * Run with: demo-recorder record demos/ui-showcase.demo.ts -o public/videos
 */

import type { DemoDefinition } from 'demo-recorder';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const demo: DemoDefinition = {
  id: 'ui-showcase',
  name: 'Bleep UI Showcase',
  url: 'http://localhost:3004/bleep',

  run: async ({ page, wait }) => {
    // Wait for page to load
    await wait(2000);

    // Show the interface
    await wait(1000);

    // Upload test audio file
    const testFilePath = join(__dirname, '../tests/fixtures/files/bob-ross-15s.mp3');
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles(testFilePath);
    await wait(2500);

    // Wait for audio player to appear
    await page.locator('audio').first().waitFor({ state: 'visible', timeout: 10000 });
    await wait(1500);

    // Show model selector interaction
    const modelSelect = page.getByTestId('model-select');
    await modelSelect.click();
    await wait(800);
    await modelSelect.selectOption('Xenova/whisper-tiny.en');
    await wait(1000);

    // Hover over transcribe button to show it
    const transcribeButton = page.getByTestId('transcribe-button');
    await transcribeButton.hover();
    await wait(1000);

    // Scroll down to show more of the interface
    await page.evaluate(() => window.scrollTo(0, 200));
    await wait(1500);

    // Scroll back up
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(1000);

    // Final pause
    await wait(1500);

    console.log('UI showcase demo recorded successfully!');
  },
};

export default demo;
