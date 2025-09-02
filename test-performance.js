const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--enable-features=WebGPU', '--enable-unsafe-webgpu']
  });
  const page = await browser.newPage();

  let transcriptionTime = 0;
  let backend = '';
  
  // Collect console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Performance:')) {
      console.log(`[Performance] ${text}`);
    }
    if (text.includes('Transcription completed in')) {
      const match = text.match(/(\d+\.?\d*)s/);
      if (match) {
        transcriptionTime = parseFloat(match[1]);
      }
    }
  });

  try {
    console.log('=== WebGPU Performance Test ===\n');
    
    await page.goto('http://localhost:3020/bleep', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Upload test file
    console.log('Uploading test file...');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/files/test_full_old.mp3');
    await page.waitForTimeout(1000);

    // Start transcription
    console.log('Starting transcription...');
    const startTime = Date.now();
    await page.click('button:has-text("Start Transcription")');

    // Wait for backend indicator
    await page.waitForTimeout(3000);
    backend = await page.locator('span.font-mono').textContent().catch(() => 'Unknown');
    console.log(`\nBackend: ${backend}`);
    
    // Wait for completion (max 90 seconds)
    console.log('Processing...');
    let completed = false;
    for (let i = 0; i < 45; i++) {
      await page.waitForTimeout(2000);
      const completeText = await page.locator('text=Transcription complete').isVisible().catch(() => false);
      if (completeText) {
        completed = true;
        const totalTime = (Date.now() - startTime) / 1000;
        console.log(`\n✅ Transcription completed in ${totalTime.toFixed(2)} seconds`);
        
        // Check for transcript text
        const hasTranscript = await page.locator('text=/\\w+/').count() > 10;
        if (hasTranscript) {
          console.log('✅ Transcript generated successfully');
        }
        break;
      }
    }
    
    if (!completed) {
      console.log('⚠️ Transcription did not complete within 90 seconds');
    }
    
    // Summary
    console.log('\n=== Summary ===');
    console.log(`Backend used: ${backend}`);
    console.log(`File duration: ~55.6 seconds`);
    if (transcriptionTime > 0) {
      const speedup = 55.6 / transcriptionTime;
      console.log(`Processing time: ${transcriptionTime.toFixed(2)} seconds`);
      console.log(`Speed: ${speedup.toFixed(2)}x real-time`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log('\nTest complete. Closing in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();