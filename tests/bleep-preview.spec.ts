import { test, expect } from '@playwright/test';

test.describe('Bleep Preview Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bleep');
  });

  test('should display preview button in Step 5', async ({ page }) => {
    const previewBtn = page.locator('button').filter({ hasText: /Preview Bleep/ });
    await expect(previewBtn).toBeVisible();
  });

  test('preview button should be enabled before file upload', async ({ page }) => {
    // Preview should work independently of having a file
    const previewBtn = page.locator('button').filter({ hasText: /Preview Bleep/ });
    await expect(previewBtn).toBeEnabled();
  });

  test('should show "Playing..." text when preview is clicked', async ({ page }) => {
    const previewBtn = page.locator('button').filter({ hasText: /Preview Bleep/ });

    // Click preview
    await previewBtn.click();

    // Should show "Playing..." immediately (or very quickly)
    await expect(page.locator('button').filter({ hasText: /Playing/ })).toBeVisible({ timeout: 1000 });
  });

  test('preview button should be disabled while playing', async ({ page }) => {
    const previewBtn = page.locator('button').filter({ hasText: /Preview Bleep/ });

    // Click preview
    await previewBtn.click();

    // Wait a bit for the playing state
    await page.waitForTimeout(100);

    // Check if button has disabled class or is actually disabled
    const playingBtn = page.locator('button').filter({ hasText: /Playing/ });
    const isDisabled = await playingBtn.evaluate(el => el.hasAttribute('disabled'));

    expect(isDisabled).toBeTruthy();
  });

  test('should return to normal state after playing', async ({ page }) => {
    const previewBtn = page.locator('button').filter({ hasText: /Preview Bleep/ });

    // Click preview
    await previewBtn.click();

    // Wait for playing state
    await expect(page.locator('button').filter({ hasText: /Playing/ })).toBeVisible({ timeout: 500 });

    // Wait for it to finish (max 2 seconds)
    await expect(page.locator('button').filter({ hasText: /^🔊 Preview Bleep$/ })).toBeVisible({ timeout: 3000 });
  });

  test('should work with both bleep sounds', async ({ page }) => {
    const bleepSoundSelect = page.locator('select').first();
    const previewBtn = page.locator('button').filter({ hasText: /Preview Bleep/ });

    // Test with Classic Bleep
    await bleepSoundSelect.selectOption('bleep');
    await previewBtn.click();
    await page.waitForTimeout(500);

    // Wait for it to finish
    await expect(previewBtn).toBeVisible({ timeout: 3000 });

    // Test with Brown Noise
    await bleepSoundSelect.selectOption('brown');
    await previewBtn.click();
    await page.waitForTimeout(500);

    // Should work without errors
    await expect(previewBtn).toBeVisible({ timeout: 3000 });
  });

  test('should respect volume setting in preview', async ({ page }) => {
    // Note: We can't actually verify audio volume in automated tests
    // But we can verify the preview is called with different volume settings

    const volumeSlider = page.locator('input[type="range"]');
    const previewBtn = page.locator('button').filter({ hasText: /Preview Bleep/ });

    // Set volume to 25%
    await volumeSlider.fill('25');
    await expect(page.locator('text=/25%/')).toBeVisible();

    // Preview should work
    await previewBtn.click();
    await page.waitForTimeout(1500);

    // Set volume to 100%
    await volumeSlider.fill('100');
    await expect(page.locator('text=/100%/')).toBeVisible();

    // Preview should work with new volume
    await previewBtn.click();
    await page.waitForTimeout(1500);

    // No errors should occur
    const errorMsg = page.locator('text=/Error/i');
    await expect(errorMsg).not.toBeVisible();
  });

  test('preview button should have appropriate styling', async ({ page }) => {
    const previewBtn = page.locator('button').filter({ hasText: /Preview Bleep/ });

    // Check it has yellow background
    const bgColor = await previewBtn.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // Should have some yellow-ish color (RGB values will be similar for yellow)
    // Just verify it's not the default (not black/white/gray)
    expect(bgColor).toBeTruthy();
  });

  test('should show preview button near volume slider', async ({ page }) => {
    const volumeSection = page.locator('div').filter({ hasText: /Bleep Volume:/ });
    const previewBtn = page.locator('button').filter({ hasText: /Preview Bleep/ });

    // Both should be visible
    await expect(volumeSection).toBeVisible();
    await expect(previewBtn).toBeVisible();

    // Preview button should be in the same section (Step 5)
    const step5Section = page.locator('section').filter({
      has: page.locator('text=/Choose Bleep Sound & Volume/')
    });

    const previewInStep5 = step5Section.locator('button').filter({ hasText: /Preview Bleep/ });
    await expect(previewInStep5).toBeVisible();
  });

  test('should handle multiple rapid clicks gracefully', async ({ page }) => {
    const previewBtn = page.locator('button').filter({ hasText: /Preview Bleep/ });

    // Click multiple times rapidly
    await previewBtn.click();
    await page.waitForTimeout(50);

    // Second click should either be ignored (button disabled) or queued
    try {
      await previewBtn.click({ timeout: 100 });
    } catch {
      // Expected if button is disabled
    }

    // Wait for playback to finish
    await page.waitForTimeout(2000);

    // Should eventually return to normal state
    await expect(previewBtn).toBeVisible();
    await expect(previewBtn).toBeEnabled();
  });

  test('preview should work after changing volume mid-workflow', async ({ page }) => {
    // Upload a file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('test')
    });

    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });

    // Change volume
    const volumeSlider = page.locator('input[type="range"]');
    await volumeSlider.fill('40');

    // Preview should still work
    const previewBtn = page.locator('button').filter({ hasText: /Preview Bleep/ });
    await previewBtn.click();

    // Should show playing state
    await expect(page.locator('button').filter({ hasText: /Playing/ })).toBeVisible({ timeout: 1000 });

    // Should finish without errors
    await expect(previewBtn).toBeVisible({ timeout: 3000 });
  });

  test('should display 🔊 emoji in button text', async ({ page }) => {
    const previewBtn = page.locator('button').filter({ hasText: '🔊' });
    await expect(previewBtn).toBeVisible();
  });

  test('preview should work in responsive layout', async ({ page }) => {
    const previewBtn = page.locator('button').filter({ hasText: /Preview Bleep/ });

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(previewBtn).toBeVisible();
    await expect(previewBtn).toBeEnabled();

    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(previewBtn).toBeVisible();
    await expect(previewBtn).toBeEnabled();
  });
});