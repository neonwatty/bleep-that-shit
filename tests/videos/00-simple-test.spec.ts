/**
 * Simple test to verify video recording works
 * Run: npx playwright test tests/videos/00-simple-test.spec.ts --project=videos
 */

import { test, demoPause } from './video-setup';

test('Simple browser test', async ({ page }) => {
  console.log('Test starting...');

  // Just navigate to the app
  await page.goto('/');
  console.log('Navigated to app');

  // Wait a moment
  await demoPause(page, 2000);
  console.log('Done!');
});
