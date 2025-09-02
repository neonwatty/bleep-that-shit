const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Collect console messages
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    // Filter for relevant messages
    if (text.includes('chunk') || text.includes('Chunk') || 
        text.includes('Worker') || text.includes('Main') ||
        text.includes('duration') || text.includes('Processing')) {
      console.log(text);
    }
  });

  try {
    console.log('Navigating to bleep page...');
    await page.goto('http://localhost:3020/bleep', { waitUntil: 'networkidle' });
    
    // Wait for page to be ready
    await page.waitForTimeout(2000);

    // Upload file
    console.log('\nUploading test file...');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/files/test_full_old.mp3');
    
    // Wait for file to load
    await page.waitForTimeout(1000);

    // Start transcription
    console.log('\nStarting transcription...');
    const startButton = await page.locator('button:has-text("Start Transcription")');
    await startButton.click();

    // Watch for chunk progress for 15 seconds
    console.log('\nMonitoring chunk progress...\n');
    
    // Check for chunk progress UI every 2 seconds
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(2000);
      
      // Check if chunk progress is visible
      const chunkProgressVisible = await page.locator('text=/Chunk:.*of/').isVisible();
      if (chunkProgressVisible) {
        const chunkText = await page.locator('text=/Chunk:.*of/').textContent();
        console.log(`UI shows: ${chunkText}`);
        
        // Take screenshot of progress
        await page.screenshot({ path: `chunk-progress-${i}.png` });
      }
    }

    console.log('\nTest complete. Check screenshots for visual confirmation.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Keep browser open for manual inspection
    console.log('\nKeeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
})();