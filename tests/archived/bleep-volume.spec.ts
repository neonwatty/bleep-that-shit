import { test, expect } from '@playwright/test';

test.describe('Bleep Volume Control', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bleep');
  });

  test('should display volume slider with default value', async ({ page }) => {
    const volumeSlider = page.locator('input[type="range"]');
    await expect(volumeSlider).toBeVisible();

    // Check default value is 80%
    const sliderValue = await volumeSlider.getAttribute('value');
    expect(sliderValue).toBe('80');

    // Check volume label displays correctly
    const volumeLabel = page.locator('text=/Bleep Volume:/');
    await expect(volumeLabel).toBeVisible();
    await expect(page.locator('text=/80%/')).toBeVisible();
  });

  test('should update volume display when slider changes', async ({ page }) => {
    const volumeSlider = page.locator('input[type="range"]');

    // Change to 50%
    await volumeSlider.fill('50');
    await expect(page.locator('text=/50%/')).toBeVisible();

    // Change to 100%
    await volumeSlider.fill('100');
    await expect(page.locator('text=/100%/')).toBeVisible();

    // Change to 0%
    await volumeSlider.fill('0');
    await expect(page.locator('text=/0%/')).toBeVisible();
  });

  test('should have correct slider attributes', async ({ page }) => {
    const volumeSlider = page.locator('input[type="range"]');

    // Check min, max, and step attributes
    const min = await volumeSlider.getAttribute('min');
    const max = await volumeSlider.getAttribute('max');
    const step = await volumeSlider.getAttribute('step');

    expect(min).toBe('0');
    expect(max).toBe('100');
    expect(step).toBe('5');
  });

  test('should show quiet/loud labels', async ({ page }) => {
    await expect(page.locator('text=/Quiet/i')).toBeVisible();
    await expect(page.locator('text=/Loud/i')).toBeVisible();
  });

  test('should be in Step 5 section with bleep sound selector', async ({ page }) => {
    const step5Section = page.locator('section', {
      has: page.locator('text=/Choose Bleep Sound & Volume/'),
    });
    await expect(step5Section).toBeVisible();

    // Check that both bleep sound selector and volume slider are in same section
    const bleepSoundSelect = step5Section.locator('select');
    const volumeSlider = step5Section.locator('input[type="range"]');

    await expect(bleepSoundSelect).toBeVisible();
    await expect(volumeSlider).toBeVisible();
  });

  test('volume slider should be disabled when no words matched', async ({ page }) => {
    // Step 5 section should have opacity-50 class when no matched words
    const step5Section = page
      .locator('section')
      .filter({ has: page.locator('text=/Choose Bleep Sound & Volume/') });

    // Check if section has opacity-50 class (disabled state)
    const hasOpacity = await step5Section.evaluate(el => el.classList.contains('opacity-50'));

    expect(hasOpacity).toBeTruthy();
  });

  test('should maintain volume setting during workflow', async ({ page }) => {
    // Upload a file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('dummy audio content'),
    });

    // Wait for file to be loaded
    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });

    // Set volume to 60%
    const volumeSlider = page.locator('input[type="range"]');
    await volumeSlider.fill('60');

    // Verify volume persists
    await expect(page.locator('text=/60%/')).toBeVisible();

    // Select a different bleep sound
    const bleepSound = page.locator('select').first();
    await bleepSound.selectOption('brown');

    // Volume should still be 60%
    await expect(page.locator('text=/60%/')).toBeVisible();
  });

  test('should be keyboard accessible', async ({ page }) => {
    const volumeSlider = page.locator('input[type="range"]');

    // Focus the slider
    await volumeSlider.focus();

    // Check it's focused
    const isFocused = await volumeSlider.evaluate(el => el === document.activeElement);
    expect(isFocused).toBeTruthy();
  });

  test('should update UI responsively on different viewports', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    const volumeSlider = page.locator('input[type="range"]');
    await expect(volumeSlider).toBeVisible();

    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(volumeSlider).toBeVisible();
  });

  test('section title should reflect new feature', async ({ page }) => {
    // Check that Step 5 title mentions both sound and volume
    const step5Title = page.locator('h2').filter({ hasText: /Choose Bleep Sound & Volume/ });
    await expect(step5Title).toBeVisible();
  });
});
