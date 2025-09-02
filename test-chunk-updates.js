const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const chunkUpdates = [];
  
  // Collect console messages
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    if (text.includes('Processing chunk') || text.includes('chunks')) {
      console.log(text);
      chunkUpdates.push(text);
    }
  });

  try {
    console.log('Loading bleep page...');
    await page.goto('http://localhost:3020/bleep', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('Uploading test file...');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/files/test_full_old.mp3');
    await page.waitForTimeout(1000);

    console.log('Starting transcription...\n');
    const startButton = await page.locator('button:has-text("Start Transcription")');
    await startButton.click();

    console.log('Monitoring chunk progress for 20 seconds...\n');
    
    let lastChunkText = '';
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(2000);
      
      // Check if chunk progress is visible
      const chunkProgressElement = await page.locator('text=/Chunk:.*of/');
      const isVisible = await chunkProgressElement.isVisible();
      
      if (isVisible) {
        const chunkText = await chunkProgressElement.textContent();
        if (chunkText !== lastChunkText) {
          console.log(`[${new Date().toISOString().split('T')[1].slice(0, 8)}] UI Update: ${chunkText}`);
          lastChunkText = chunkText;
        }
      }
      
      // Also check the status text
      const statusElement = await page.locator('text=/Processing chunk.*of/');
      if (await statusElement.isVisible()) {
        const statusText = await statusElement.textContent();
        console.log(`Status: ${statusText}`);
      }
    }

    console.log(`\n✅ Total chunk updates captured: ${chunkUpdates.length}`);
    
    // Take final screenshot
    await page.screenshot({ path: 'final-chunk-progress.png' });
    console.log('Screenshot saved to final-chunk-progress.png');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log('\nTest complete. Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();