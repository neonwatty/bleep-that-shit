const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Collect ALL console messages
  page.on('console', msg => {
    const text = msg.text();
    console.log(`[${msg.type()}] ${text}`);
  });

  try {
    console.log('\n=== Loading page ===');
    await page.goto('http://localhost:3020/bleep', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('\n=== Uploading file ===');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/files/test_full_old.mp3');
    await page.waitForTimeout(1000);

    console.log('\n=== Starting transcription ===');
    const startButton = await page.locator('button:has-text("Start Transcription")');
    await startButton.click();

    console.log('\n=== Waiting for 25 seconds to see chunk updates ===\n');
    await page.waitForTimeout(25000);
    
    // Check final state
    const chunkProgressVisible = await page.locator('text=/Chunk:.*of/').isVisible();
    console.log(`\n=== Final chunk progress visible: ${chunkProgressVisible} ===`);
    
    await page.screenshot({ path: 'debug-chunk-state.png' });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();