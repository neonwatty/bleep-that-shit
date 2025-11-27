import { test, expect } from '@playwright/test';
import { BleepPage } from './helpers';
import { uploadFile } from './helpers/fileHelpers';
import path from 'path';

// Path to test audio file - a real short audio file for testing
const TEST_AUDIO_PATH = path.join(__dirname, 'fixtures/files/short-test.mp3');

test.describe('Manual Timeline Feature', () => {
  let bleepPage: BleepPage;

  test.beforeEach(async ({ page }) => {
    bleepPage = new BleepPage(page);
    await bleepPage.goto();
  });

  test.describe('Tab Accessibility', () => {
    test('Review tab should be disabled without a file', async ({ page }) => {
      // Review tab should be disabled initially (no file, no transcript)
      await expect(bleepPage.reviewTab).toBeDisabled();
    });

    test('Review tab should be enabled after file upload', async ({ page }) => {
      // Upload a real audio file
      await uploadFile(page, {
        fileName: 'short-test.mp3',
        mimeType: 'audio/mpeg',
        filePath: TEST_AUDIO_PATH,
      });

      // Wait for file to be processed
      await expect(bleepPage.audioPlayer).toBeVisible({ timeout: 10000 });

      // Review tab should now be enabled (file uploaded)
      await bleepPage.expectReviewTabEnabled();
    });
  });

  test.describe('Timeline Section Content', () => {
    test.beforeEach(async ({ page }) => {
      // Upload a real audio file to enable the Review tab
      await uploadFile(page, {
        fileName: 'short-test.mp3',
        mimeType: 'audio/mpeg',
        filePath: TEST_AUDIO_PATH,
      });
      await expect(bleepPage.audioPlayer).toBeVisible({ timeout: 10000 });
      await bleepPage.switchToTimelineSection();
    });

    test('should display timeline section header', async ({ page }) => {
      await expect(page.getByText('Manual Timeline Censoring')).toBeVisible();
    });

    test('should show media player in timeline section', async ({ page }) => {
      // Media player should be visible in the timeline section
      await expect(bleepPage.audioPlayer).toBeVisible();
    });

    test('should display help text for Shift+drag', async ({ page }) => {
      // Wait for timeline bar (which triggers help text visibility)
      await expect(bleepPage.timelineBar).toBeVisible({ timeout: 10000 });
      // The text includes a <strong> tag, so look for partial match
      await expect(page.locator('text=Hold Shift + drag')).toBeVisible();
    });

    test('should show no segments initially', async ({ page }) => {
      // Wait for timeline bar to be visible first
      await expect(bleepPage.timelineBar).toBeVisible({ timeout: 10000 });
      // No segment chips should be visible initially
      const segmentCount = await bleepPage.getTimelineSegmentCount();
      expect(segmentCount).toBe(0);
    });
  });

  test.describe('Shift+Drag Segment Creation', () => {
    test.beforeEach(async ({ page }, testInfo) => {
      // Skip on mobile - Shift+drag is desktop-only
      if (testInfo.project.name.includes('Mobile')) {
        test.skip();
        return;
      }
      // Upload a real audio file to enable the Review tab
      await uploadFile(page, {
        fileName: 'short-test.mp3',
        mimeType: 'audio/mpeg',
        filePath: TEST_AUDIO_PATH,
      });
      await expect(bleepPage.audioPlayer).toBeVisible({ timeout: 10000 });
      await bleepPage.switchToTimelineSection();

      // Wait for timeline to be visible (needs media duration to load)
      await expect(bleepPage.timelineBar).toBeVisible({ timeout: 10000 });
    });

    test('should create a segment with Shift+drag', async ({ page }) => {
      // Create a segment from 10% to 30%
      await bleepPage.createTimelineSegment(10, 30);

      // Should have one segment chip
      const segmentCount = await bleepPage.getTimelineSegmentCount();
      expect(segmentCount).toBe(1);
    });

    test('should create multiple segments', async ({ page }) => {
      // Create first segment
      await bleepPage.createTimelineSegment(10, 20);

      // Create second segment
      await bleepPage.createTimelineSegment(50, 70);

      // Should have two segment chips
      const segmentCount = await bleepPage.getTimelineSegmentCount();
      expect(segmentCount).toBe(2);
    });

    test('should not create segment on regular click (no Shift)', async ({ page }) => {
      // Get timeline bounds
      const box = await bleepPage.timelineBar.boundingBox();
      if (!box) throw new Error('Timeline bar not found');

      // Click without Shift
      await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);

      // Should have no segments (click should seek, not create)
      const segmentCount = await bleepPage.getTimelineSegmentCount();
      expect(segmentCount).toBe(0);
    });
  });

  test.describe('Segment Management', () => {
    test.beforeEach(async ({ page }, testInfo) => {
      // Skip on mobile - relies on Shift+drag to create segments
      if (testInfo.project.name.includes('Mobile')) {
        test.skip();
        return;
      }
      // Upload a real audio file and navigate to timeline section
      await uploadFile(page, {
        fileName: 'short-test.mp3',
        mimeType: 'audio/mpeg',
        filePath: TEST_AUDIO_PATH,
      });
      await expect(bleepPage.audioPlayer).toBeVisible({ timeout: 10000 });
      await bleepPage.switchToTimelineSection();
      await expect(bleepPage.timelineBar).toBeVisible({ timeout: 10000 });
    });

    test('should delete a segment via chip X button', async ({ page }) => {
      // Create a segment
      await bleepPage.createTimelineSegment(20, 40);
      expect(await bleepPage.getTimelineSegmentCount()).toBe(1);

      // Delete it
      await bleepPage.deleteTimelineSegment(0);

      // Should have no segments
      expect(await bleepPage.getTimelineSegmentCount()).toBe(0);
    });

    test('should clear all segments', async ({ page }) => {
      // Create multiple segments
      await bleepPage.createTimelineSegment(10, 20);
      await bleepPage.createTimelineSegment(50, 60);
      expect(await bleepPage.getTimelineSegmentCount()).toBe(2);

      // Clear all
      await bleepPage.clearTimelineSegments();

      // Should have no segments
      expect(await bleepPage.getTimelineSegmentCount()).toBe(0);
    });

    test('segment chips should show time range', async ({ page }) => {
      // Create a segment
      await bleepPage.createTimelineSegment(10, 30);

      // Chip should contain time format (e.g., "0:XX - 0:XX")
      const chip = bleepPage.timelineChips.first();
      const chipText = await chip.textContent();
      expect(chipText).toMatch(/\d+:\d+\s*-\s*\d+:\d+/);
    });
  });

  test.describe('Integration with Bleep Tab', () => {
    test.beforeEach(async ({ page }, testInfo) => {
      // Skip on mobile - relies on Shift+drag to create segments
      if (testInfo.project.name.includes('Mobile')) {
        test.skip();
        return;
      }
      // Upload a real audio file
      await uploadFile(page, {
        fileName: 'short-test.mp3',
        mimeType: 'audio/mpeg',
        filePath: TEST_AUDIO_PATH,
      });
      await expect(bleepPage.audioPlayer).toBeVisible({ timeout: 10000 });
    });

    test('Bleep tab should be enabled when manual censors exist', async ({ page }) => {
      // Initially, bleep tab should be disabled (no transcript or manual censors)
      await expect(bleepPage.bleepTab).toBeDisabled();

      // Add a manual censor
      await bleepPage.switchToTimelineSection();
      await expect(bleepPage.timelineBar).toBeVisible({ timeout: 10000 });
      await bleepPage.createTimelineSegment(20, 40);

      // Bleep tab should now be enabled
      await expect(bleepPage.bleepTab).not.toBeDisabled();
    });

    test('Manual censors should appear in Bleep tab', async ({ page }) => {
      // Add manual censors
      await bleepPage.switchToTimelineSection();
      await expect(bleepPage.timelineBar).toBeVisible({ timeout: 10000 });
      await bleepPage.createTimelineSegment(10, 20);
      await bleepPage.createTimelineSegment(50, 60);

      // Switch to bleep tab
      await bleepPage.switchToBleepTab();

      // Should show censor count (may include manual timeline in matched words display)
      await expect(page.getByText(/2.*censor/i)).toBeVisible();
    });
  });
});
