import { test, expect } from '@playwright/test';
import { BleepPage } from '../helpers';
import { join } from 'path';

// Use bob-ross-15s.mp3 which is known to work in other tests
const AUDIO_FIXTURE = join(__dirname, '../fixtures/files/bob-ross-15s.mp3');

test.describe('Premium CTA', () => {
  let bleepPage: BleepPage;

  test.beforeEach(async ({ page, context }) => {
    // Clear localStorage before each test to reset CTA dismissed state
    await context.addInitScript(() => {
      localStorage.clear();
    });

    bleepPage = new BleepPage(page);
    await bleepPage.goto();
  });

  test('does not show premium CTA before censored result', async () => {
    // Just upload a file, don't complete workflow
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await expect(bleepPage.audioPlayer).toBeVisible({ timeout: 15000 });

    // Premium CTA should not exist anywhere on the page yet
    await expect(bleepPage.premiumCta).not.toBeVisible();
  });

  test('shows premium CTA after successful bleep', async () => {
    // Upload file
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await expect(bleepPage.audioPlayer).toBeVisible({ timeout: 15000 });

    // Add manual censor via timeline
    await bleepPage.switchToTimelineSection();
    await expect(bleepPage.timelineBar).toBeVisible({ timeout: 10000 });
    await bleepPage.createTimelineSegment(10, 30);

    // Switch to bleep tab and apply
    await bleepPage.switchToBleepTab();
    await bleepPage.applyBleepsAndWait({ timeout: 60000 });

    // Verify censored result is visible
    await bleepPage.expectCensoredResultVisible();

    // Verify Pro Waitlist CTA appears
    await bleepPage.expectPremiumCtaVisible();
    await expect(bleepPage.page.getByText('Need to process longer videos?')).toBeVisible();
  });

  test('waitlist CTA link points to home page waitlist section', async () => {
    // Upload and bleep
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await expect(bleepPage.audioPlayer).toBeVisible({ timeout: 15000 });
    await bleepPage.switchToTimelineSection();
    await expect(bleepPage.timelineBar).toBeVisible({ timeout: 10000 });
    await bleepPage.createTimelineSegment(10, 30);
    await bleepPage.switchToBleepTab();
    await bleepPage.applyBleepsAndWait({ timeout: 60000 });

    // Verify link points to waitlist section on home page
    await expect(bleepPage.premiumCtaLink).toHaveAttribute('href', '/#waitlist');
  });

  test('premium CTA can be dismissed and persists to localStorage', async () => {
    // Upload and bleep
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await expect(bleepPage.audioPlayer).toBeVisible({ timeout: 15000 });
    await bleepPage.switchToTimelineSection();
    await expect(bleepPage.timelineBar).toBeVisible({ timeout: 10000 });
    await bleepPage.createTimelineSegment(10, 30);
    await bleepPage.switchToBleepTab();
    await bleepPage.applyBleepsAndWait({ timeout: 60000 });

    // Verify CTA is visible
    await bleepPage.expectPremiumCtaVisible();

    // Dismiss the CTA
    await bleepPage.dismissPremiumCta();

    // Verify it's hidden
    await bleepPage.expectPremiumCtaNotVisible();

    // Check localStorage
    const dismissed = await bleepPage.page.evaluate(() =>
      localStorage.getItem('premium_cta_dismissed')
    );
    expect(dismissed).toBe('true');
  });

  test('does not show old feedback CTA after bleep', async () => {
    // Upload and bleep
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await expect(bleepPage.audioPlayer).toBeVisible({ timeout: 15000 });
    await bleepPage.switchToTimelineSection();
    await expect(bleepPage.timelineBar).toBeVisible({ timeout: 10000 });
    await bleepPage.createTimelineSegment(10, 30);
    await bleepPage.switchToBleepTab();
    await bleepPage.applyBleepsAndWait({ timeout: 60000 });

    // Old feedback CTA text should not appear
    await expect(bleepPage.page.getByText('Was this helpful?')).not.toBeVisible();
    await expect(bleepPage.page.getByText('Share Quick Feedback')).not.toBeVisible();
  });
});
