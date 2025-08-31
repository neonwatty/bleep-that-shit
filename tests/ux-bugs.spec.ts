import { test, expect } from '@playwright/test';

test.describe('UX and Bug Detection Tests', () => {
  
  test('should handle navigation edge cases', async ({ page }) => {
    // Test rapid navigation
    await page.goto('/');
    await page.goto('/bleep');
    await page.goto('/sampler');
    await page.goBack();
    await page.goBack();
    
    // Should be back at home
    await expect(page).toHaveURL('/');
    
    // Test forward navigation
    await page.goForward();
    await expect(page).toHaveURL(/bleep/);
  });

  test('should detect broken links', async ({ page }) => {
    await page.goto('/');
    
    // Get all links
    const links = await page.locator('a').all();
    const brokenLinks: string[] = [];
    
    for (const link of links) {
      const href = await link.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        // Test internal links
        const response = await page.request.get(href);
        if (!response.ok()) {
          brokenLinks.push(href);
        }
      }
    }
    
    expect(brokenLinks).toHaveLength(0);
  });

  test('should detect console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Navigate through all pages
    await page.goto('/');
    await page.goto('/bleep');
    await page.goto('/sampler');
    
    // Filter out expected errors (like worker loading in test env)
    const criticalErrors = errors.filter(err => 
      !err.includes('Failed to load worker') &&
      !err.includes('NetworkError') &&
      !err.includes('CORS')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should handle missing assets gracefully', async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on('requestfailed', request => {
      failedRequests.push(request.url());
    });
    
    await page.goto('/');
    await page.goto('/bleep');
    await page.goto('/sampler');
    
    // Check for critical failed requests
    const criticalFailures = failedRequests.filter(url => 
      !url.includes('favicon') &&
      !url.includes('worker') // Workers might fail in test env
    );
    
    expect(criticalFailures).toHaveLength(0);
  });

  test('should have consistent UI elements across pages', async ({ page }) => {
    const pages = ['/', '/bleep', '/sampler'];
    
    for (const path of pages) {
      await page.goto(path);
      
      // Check navbar is consistent
      const navbar = page.locator('nav');
      await expect(navbar).toBeVisible();
      
      // Check footer is consistent
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
      
      // Check font loading
      const body = page.locator('body');
      await expect(body).toHaveClass(/font-merriweather/);
    }
  });

  test('should handle form validation properly', async ({ page }) => {
    await page.goto('/bleep');
    
    // Try to transcribe without file
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await expect(transcribeBtn).toBeDisabled();
    
    // Upload invalid file type
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('invalid')
    });
    
    // Should show error
    const error = page.locator('.bg-red-100, text=/Please upload/');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('should have proper loading states', async ({ page }) => {
    await page.goto('/bleep');
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('test')
    });
    
    // Click transcribe
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await transcribeBtn.click();
    
    // Should show loading state
    const loadingIndicator = page.locator('text=/Transcribing/, text=/Loading/, text=/Initializing/, .bg-blue-600');
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 5000 });
  });

  test('should have keyboard accessibility', async ({ page }) => {
    await page.goto('/');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeTruthy();
    
    // Continue tabbing
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Should be able to activate with Enter
    await page.keyboard.press('Enter');
    
    // Check if navigation worked
    const url = page.url();
    expect(url).toContain('bleep'); // Should navigate to bleep or sampler
  });

  test('should handle network offline gracefully', async ({ page, context }) => {
    await page.goto('/');
    
    // Go offline
    await context.setOffline(true);
    
    // Try to navigate
    await page.locator('a[href="/bleep"]').click();
    
    // Should still work (static site)
    await expect(page).toHaveURL(/bleep/);
    
    // Go back online
    await context.setOffline(false);
  });

  test('should detect memory leaks on navigation', async ({ page }) => {
    // Monitor memory usage
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Navigate multiple times
    for (let i = 0; i < 10; i++) {
      await page.goto('/');
      await page.goto('/bleep');
      await page.goto('/sampler');
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if (window.gc) window.gc();
    });
    
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Memory shouldn't grow excessively (allowing 50MB growth)
    const memoryGrowth = finalMemory - initialMemory;
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
  });

  test('should handle rapid user interactions', async ({ page }) => {
    await page.goto('/bleep');
    
    // Rapidly click buttons
    const buttons = await page.locator('button').all();
    for (const button of buttons.slice(0, 3)) {
      if (await button.isEnabled()) {
        await button.click({ clickCount: 3, delay: 100 });
      }
    }
    
    // Page should still be responsive
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');
    
    // Check for ARIA labels on interactive elements
    const buttons = await page.locator('button, a').all();
    let missingAriaCount = 0;
    
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      
      if (!ariaLabel && !text?.trim()) {
        missingAriaCount++;
      }
    }
    
    // Most buttons should have labels
    expect(missingAriaCount).toBeLessThan(3);
  });

  test('should handle viewport resizing', async ({ page }) => {
    await page.goto('/');
    
    const viewports = [
      { width: 320, height: 568 },   // iPhone SE
      { width: 768, height: 1024 },  // iPad
      { width: 1920, height: 1080 }, // Desktop
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      
      // Main content should be visible
      const main = page.locator('main');
      await expect(main).toBeVisible();
      
      // No horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBeFalsy();
    }
  });

  test('should detect z-index issues', async ({ page }) => {
    await page.goto('/bleep');
    
    // Check if dropzone is clickable
    const dropzone = page.locator('div').filter({ hasText: 'Drag and drop your audio or video file here or click to browse' }).first();
    const isClickable = await dropzone.isVisible();
    expect(isClickable).toBeTruthy();
    
    // Check if it's not covered by other elements
    const box = await dropzone.boundingBox();
    if (box) {
      const elementAtPoint = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return el?.textContent;
      }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
      
      expect(elementAtPoint).toContain('Drag');
    }
  });
});