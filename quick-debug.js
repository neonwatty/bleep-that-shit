const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Collect console messages
  const logs = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    logs.push(text);
    console.log(text);
  });

  page.on('pageerror', error => {
    console.error('Page error:', error.message);
  });

  try {
    // Go to the page
    await page.goto('http://localhost:3020/bleep');
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    // Upload file
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/files/test_full_old.mp3');

    // Wait for file loaded message
    await page.waitForSelector('text=File loaded', { timeout: 5000 });
    console.log('File uploaded successfully');

    // Check chunking checkbox
    const useChunking = await page.locator('#useChunking').isChecked();
    console.log('Chunking enabled:', useChunking);

    // Start transcription
    await page.click('button:has-text("Start Transcription")');
    console.log('Transcription started');

    // Wait a moment
    await page.waitForTimeout(3000);

    // Check for chunk progress
    const chunkProgress = await page.locator('text=/Chunk:.*of/').isVisible();
    console.log('Chunk progress visible:', chunkProgress);

    // Check console logs for debugging info
    console.log('\n=== Relevant Console Logs ===');
    logs.filter(log => 
      log.includes('File size') || 
      log.includes('chunking') || 
      log.includes('duration') ||
      log.includes('chunks') ||
      log.includes('[Worker]')
    ).forEach(log => console.log(log));

    // Take screenshot
    await page.screenshot({ path: 'debug-state.png' });
    console.log('\nScreenshot saved to debug-state.png');

    // Keep browser open for 5 seconds to observe
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();