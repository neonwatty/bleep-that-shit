const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--enable-features=WebGPU', '--enable-unsafe-webgpu']
  });
  const page = await browser.newPage();

  // Collect ALL console messages
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', error => {
    console.error('Page error:', error.message);
  });

  try {
    console.log('Loading page...');
    await page.goto('http://localhost:3020/bleep', { waitUntil: 'networkidle' });
    
    // Check WebGPU in main context
    const mainWebGPU = await page.evaluate(() => {
      return {
        hasNavigatorGPU: 'gpu' in navigator,
        gpu: navigator.gpu ? 'available' : 'not available'
      };
    });
    console.log('\nMain context WebGPU:', mainWebGPU);
    
    await page.waitForTimeout(2000);

    console.log('\nUploading file...');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/files/test_full_old.mp3');
    
    await page.waitForTimeout(1000);

    console.log('Starting transcription...\n');
    await page.click('button:has-text("Start Transcription")');

    // Wait and observe for 15 seconds
    await page.waitForTimeout(15000);
    
    // Check for backend indicator
    const backendText = await page.locator('span.font-mono').textContent().catch(() => 'Not found');
    console.log(`\nBackend indicator in UI: ${backendText}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log('\nKeeping browser open for inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
})();