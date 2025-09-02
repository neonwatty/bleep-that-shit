const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Collect console messages
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', error => {
    console.error('Page error:', error.message);
  });

  try {
    // Navigate to the page
    console.log('Navigating to http://localhost:3020/bleep...');
    await page.goto('http://localhost:3020/bleep', { waitUntil: 'networkidle' });
    console.log('Page loaded');

    // Wait for the page to be ready
    await page.waitForTimeout(3000);

    // Upload file
    console.log('Uploading file...');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/files/test_full_old.mp3');
    console.log('File uploaded');

    // Wait for file loaded message
    await page.waitForTimeout(2000);

    // Start transcription
    console.log('Starting transcription...');
    const startButton = await page.locator('button:has-text("Start Transcription")');
    await startButton.click();
    console.log('Transcription started');

    // Keep observing for 30 seconds
    console.log('Observing for 30 seconds...');
    await page.waitForTimeout(30000);

    // Take screenshot
    await page.screenshot({ path: 'debug-final.png' });
    console.log('Screenshot saved to debug-final.png');

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'debug-error.png' });
  } finally {
    await browser.close();
  }
})();