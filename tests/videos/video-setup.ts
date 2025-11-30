/**
 * Video Recording Setup for YouTube Shorts Demos
 *
 * This setup extends Playwright's test fixture for creating demo videos.
 * Unlike E2E tests, these scripts:
 * - Run with real network (no mocks)
 * - Use slower interactions for better visibility
 * - Don't assert, just perform actions
 * - Record to vertical 9:16 format for YouTube Shorts
 *
 * Run with: npx playwright test --project=videos
 */

import { test as base } from '@playwright/test';
import { BleepPage } from '../helpers/pages/BleepPage';

/**
 * Extended test fixture with BleepPage helper
 */
export const test = base.extend<{ bleepPage: BleepPage }>({
  // eslint-disable-next-line react-hooks/rules-of-hooks
  bleepPage: async ({ page }, use) => {
    const bleepPage = new BleepPage(page);
    await use(bleepPage);
  },
});

/**
 * Helper to add visible pauses for demo effect
 */
export async function demoPause(page: BleepPage['page'], ms: number = 1000) {
  await page.waitForTimeout(ms);
}

/**
 * Helper to scroll element into view smoothly
 */
export async function scrollIntoView(page: BleepPage['page'], selector: string) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await demoPause(page, 300);
}

/**
 * Helper to highlight an element briefly (for visual effect)
 */
export async function highlightElement(page: BleepPage['page'], selector: string) {
  await page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (el) {
      const originalOutline = (el as HTMLElement).style.outline;
      (el as HTMLElement).style.outline = '3px solid #f59e0b';
      setTimeout(() => {
        (el as HTMLElement).style.outline = originalOutline;
      }, 800);
    }
  }, selector);
  await demoPause(page, 500);
}

export { expect } from '@playwright/test';
