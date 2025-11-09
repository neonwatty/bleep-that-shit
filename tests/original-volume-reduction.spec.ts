import { test, expect } from '@playwright/test';

test.describe('Original Word Volume Reduction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bleep');
  });

  // Group 1: Initial Display and Default Values
  test('should display original volume reduction slider with default value', async ({ page }) => {
    // Locate the label with "Original Word Volume:"
    const volumeLabel = page.locator('text=/Original Word Volume:/');
    await expect(volumeLabel).toBeVisible();

    // Check default value is 10% within the Original Word Volume label
    await expect(volumeLabel).toContainText('10%');

    // Locate the original volume reduction slider (second range input in Step 5)
    const step5Section = page.locator('section').filter({
      has: page.locator('text=/Choose Bleep Sound & Volume/'),
    });
    const originalVolumeSlider = step5Section.locator('input[type="range"]').nth(1);
    await expect(originalVolumeSlider).toBeVisible();

    // Check slider value
    const sliderValue = await originalVolumeSlider.getAttribute('value');
    expect(sliderValue).toBe('10');
  });

  test('should have correct slider attributes', async ({ page }) => {
    const step5Section = page.locator('section').filter({
      has: page.locator('text=/Choose Bleep Sound & Volume/'),
    });
    const originalVolumeSlider = step5Section.locator('input[type="range"]').nth(1);

    // Check min, max, and step attributes
    const min = await originalVolumeSlider.getAttribute('min');
    const max = await originalVolumeSlider.getAttribute('max');
    const step = await originalVolumeSlider.getAttribute('step');

    expect(min).toBe('0');
    expect(max).toBe('100');
    expect(step).toBe('10');
  });

  test('should show removed/original labels', async ({ page }) => {
    // Check that descriptive labels are present near the original volume slider
    const step5Section = page.locator('section').filter({
      has: page.locator('text=/Choose Bleep Sound & Volume/'),
    });

    // Look for the slider container and its labels
    await expect(step5Section.locator('text=Removed').first()).toBeVisible();
    await expect(step5Section.locator('text=Original').last()).toBeVisible();
  });

  // Group 2: Slider Interaction and Display Updates
  test('should update volume display when slider changes', async ({ page }) => {
    const step5Section = page.locator('section').filter({
      has: page.locator('text=/Choose Bleep Sound & Volume/'),
    });
    const originalVolumeSlider = step5Section.locator('input[type="range"]').nth(1);
    const volumeLabel = page.locator('text=/Original Word Volume:/');

    // Change to 50%
    await originalVolumeSlider.fill('50');
    await expect(volumeLabel).toContainText('50%');

    // Change to 100%
    await originalVolumeSlider.fill('100');
    await expect(volumeLabel).toContainText('100%');

    // Change to 0%
    await originalVolumeSlider.fill('0');
    await expect(volumeLabel).toContainText('0%');
  });

  test('should maintain volume setting during workflow', async ({ page }) => {
    // Upload a test audio file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('dummy audio content for testing'),
    });

    // Wait for file to be loaded
    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });

    // Set original volume reduction to 70%
    const step5Section = page.locator('section').filter({
      has: page.locator('text=/Choose Bleep Sound & Volume/'),
    });
    const originalVolumeSlider = step5Section.locator('input[type="range"]').nth(1);
    const volumeLabel = page.locator('text=/Original Word Volume:/');

    await originalVolumeSlider.fill('70');
    await expect(volumeLabel).toContainText('70%');

    // Select a different bleep sound (locate it within Step 5)
    const bleepSound = step5Section.locator('select');
    await bleepSound.selectOption({ value: 'brown' });

    // Volume should still be 70%
    await expect(volumeLabel).toContainText('70%');
  });

  // Group 3: Section Placement and Context
  test('should be in Step 5 section with other bleep controls', async ({ page }) => {
    const step5Section = page.locator('section').filter({
      has: page.locator('text=/Choose Bleep Sound & Volume/'),
    });
    await expect(step5Section).toBeVisible();

    // Check that both bleep sound selector and volume sliders are in same section
    const bleepSoundSelect = step5Section.locator('select');
    const bleepVolumeSlider = step5Section.locator('input[type="range"]').nth(0);
    const originalVolumeSlider = step5Section.locator('input[type="range"]').nth(1);

    await expect(bleepSoundSelect).toBeVisible();
    await expect(bleepVolumeSlider).toBeVisible();
    await expect(originalVolumeSlider).toBeVisible();
  });

  test('original volume slider should be disabled when no words matched', async ({ page }) => {
    // Step 5 section should have opacity-50 class when no matched words
    const step5Section = page.locator('section').filter({
      has: page.locator('text=/Choose Bleep Sound & Volume/'),
    });

    // Check if section has opacity-50 class (disabled state)
    const hasOpacity = await step5Section.evaluate(el => el.classList.contains('opacity-50'));

    expect(hasOpacity).toBeTruthy();

    // But original volume slider is still visible (just dimmed)
    const originalVolumeSlider = step5Section.locator('input[type="range"]').nth(1);
    await expect(originalVolumeSlider).toBeVisible();
  });

  // Group 4: Accessibility and Responsiveness
  test('should be keyboard accessible', async ({ page }) => {
    const step5Section = page.locator('section').filter({
      has: page.locator('text=/Choose Bleep Sound & Volume/'),
    });
    const originalVolumeSlider = step5Section.locator('input[type="range"]').nth(1);

    // Focus the slider
    await originalVolumeSlider.focus();

    // Check it's focused
    const isFocused = await originalVolumeSlider.evaluate(el => el === document.activeElement);
    expect(isFocused).toBeTruthy();
  });

  test('should update UI responsively on different viewports', async ({ page }) => {
    const step5Section = page.locator('section').filter({
      has: page.locator('text=/Choose Bleep Sound & Volume/'),
    });
    const originalVolumeSlider = step5Section.locator('input[type="range"]').nth(1);

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(originalVolumeSlider).toBeVisible();

    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(originalVolumeSlider).toBeVisible();
  });

  // Group 5: Label and Display Formatting
  test('section title should reflect volume controls', async ({ page }) => {
    // Check that Step 5 title mentions both sound and volume
    const step5Title = page.locator('h2').filter({ hasText: /Choose Bleep Sound & Volume/ });
    await expect(step5Title).toBeVisible();
  });
});
