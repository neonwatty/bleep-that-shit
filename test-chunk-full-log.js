const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Collect ALL console messages
  let messageCount = 0;
  page.on('console', msg => {
    const text = msg.text();
    messageCount++;
    // Filter for worker messages with progress
    if (text.includes('Received message from worker') && text.includes('progress')) {
      console.log(`[MSG ${messageCount}] ${text}`);
    }
    // Also log important status messages
    if (text.includes('Starting to process') || text.includes('Processing chunk') || text.includes('chunks')) {
      console.log(`[STATUS] ${text}`);
    }
  });

  try {
    console.log('Loading page...');
    await page.goto('http://localhost:3020/bleep', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('Uploading file...');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/files/test_full_old.mp3');
    await page.waitForTimeout(1000);

    console.log('Starting transcription...\n');
    const startButton = await page.locator('button:has-text("Start Transcription")');
    await startButton.click();

    // Monitor for 30 seconds
    for (let i = 0; i < 15; i++) {
      await page.waitForTimeout(2000);
      
      // Check UI state
      const chunkElement = await page.locator('text=/Chunk:.*of/');
      if (await chunkElement.isVisible()) {
        const text = await chunkElement.textContent();
        console.log(`[UI at ${i*2}s] ${text}`);
      }
    }
    
    console.log(`\nTotal messages processed: ${messageCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();