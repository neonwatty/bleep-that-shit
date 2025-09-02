const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--enable-unsafe-webgpu'] // Enable WebGPU if needed
  });
  const page = await browser.newPage();

  // Collect console messages
  page.on('console', msg => {
    const text = msg.text();
    // Log messages about backend selection
    if (text.includes('WebGPU') || text.includes('WASM') || text.includes('backend') || text.includes('Performance')) {
      console.log(`[Console] ${text}`);
    }
  });

  try {
    console.log('=== Testing WebGPU Backend ===\n');
    
    // Check if WebGPU is available in the browser
    const hasWebGPU = await page.evaluate(() => {
      return 'gpu' in navigator;
    });
    console.log(`Browser WebGPU support: ${hasWebGPU ? 'YES' : 'NO'}`);
    
    // Navigate to the page
    await page.goto('http://localhost:3020/bleep', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Upload test file
    console.log('\nUploading test file...');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/files/test_full_old.mp3');
    await page.waitForTimeout(1000);

    // Start transcription
    console.log('Starting transcription...\n');
    const startButton = await page.locator('button:has-text("Start Transcription")');
    await startButton.click();

    // Wait for backend message
    await page.waitForTimeout(3000);
    
    // Check for backend indicator in UI
    const backendIndicator = await page.locator('span.font-mono').textContent().catch(() => null);
    if (backendIndicator) {
      console.log(`\n✅ UI shows backend: ${backendIndicator}`);
    }
    
    // Wait for transcription to complete (max 60 seconds)
    console.log('\nWaiting for transcription to complete...');
    let completed = false;
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(2000);
      const completeText = await page.locator('text=Transcription complete').isVisible().catch(() => false);
      if (completeText) {
        completed = true;
        console.log('✅ Transcription completed!');
        break;
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'webgpu-test.png' });
    console.log('\nScreenshot saved to webgpu-test.png');
    
    if (!completed) {
      console.log('⚠️ Transcription did not complete within 60 seconds');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log('\nTest complete. Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();