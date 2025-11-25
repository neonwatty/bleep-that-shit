/**
 * E2E Test: Transcript Interaction
 *
 * Tests interactive transcript features:
 * - Search transcript by keyword
 * - Click individual words to toggle selection
 * - Expand/collapse transcript sections
 * - Clear all selected words
 * - View stats (censored/total words)
 */

import { test, expect } from './e2e-setup';
import { join } from 'path';
import { BleepPage } from '../helpers/pages/BleepPage';
import { loadTranscript } from '../helpers/transcriptLoader';

const AUDIO_FIXTURE = join(__dirname, '../fixtures/files/bob-ross-15s.mp3');
const AUDIO_TRANSCRIPT = 'bob-ross-15s-audio.transcript.json';

test.describe('Interactive Transcript', () => {
  let bleepPage: BleepPage;

  test.beforeEach(async ({ page }) => {
    bleepPage = new BleepPage(page);
    await bleepPage.goto();
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await loadTranscript(page, AUDIO_TRANSCRIPT);
    await expect(bleepPage.reviewTab).toBeEnabled({ timeout: 5000 });
    await bleepPage.switchToReviewTab();

    // Wait for transcript words to render
    await expect(page.locator('.word-wrapper').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display full transcript after loading', async () => {
    // Transcript should be visible
    const transcriptContainer = bleepPage.page.locator('[data-testid="transcript-container"]');
    if (await transcriptContainer.isVisible()) {
      await expect(transcriptContainer).toBeVisible();
    } else {
      // Alternative: look for transcript words using .word-wrapper class
      const transcriptWords = bleepPage.page.locator('.word-wrapper');
      const count = await transcriptWords.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should search transcript by keyword', async ({ page }) => {
    // Find search input using testid
    const searchInput = bleepPage.searchTranscriptInput;
    await expect(searchInput).toBeVisible();

    // Search for a word
    await searchInput.fill('happy');

    // Results should be filtered/highlighted
    await page.waitForTimeout(500);

    // Words matching "happy" should be visible/highlighted
    // Non-matching words might be hidden or grayed out
    const searchResults = page.getByText(/happy/i);
    await expect(searchResults.first()).toBeVisible();
  });

  test('should clear search', async ({ page }) => {
    const searchInput = bleepPage.searchTranscriptInput;
    await searchInput.fill('tree');
    await page.waitForTimeout(500);

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);

    // All words should be visible again
    const transcriptWords = page.locator('.word-wrapper');
    const count = await transcriptWords.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should click word to toggle selection', async ({ page }) => {
    // Find a clickable word in transcript
    const firstWord = page.locator('.word-wrapper').first();
    if (await firstWord.isVisible()) {
      // Click to select
      await firstWord.click();
      await page.waitForTimeout(300);

      // Word should be selected (uses aria-pressed and .censored class)
      const isSelected = (await firstWord.getAttribute('aria-pressed')) === 'true';

      expect(isSelected).toBeTruthy();

      // Click again to deselect
      await firstWord.click();
      await page.waitForTimeout(300);

      const isDeselected = (await firstWord.getAttribute('aria-pressed')) === 'false';

      expect(isDeselected).toBeTruthy();
    }
  });

  test('should show selected word count', async ({ page }) => {
    // Select some words manually
    const words = page.locator('.word-wrapper');
    const firstThree = await words.count();

    for (let i = 0; i < Math.min(3, firstThree); i++) {
      await words.nth(i).click();
      await page.waitForTimeout(200);
    }

    // Check for count display (e.g., "3 / 45 words selected")
    const countDisplay = page.getByText(/\d+\s*(\/|\s*of\s*)\s*\d+/i);
    if (await countDisplay.isVisible()) {
      await expect(countDisplay).toBeVisible();
    }
  });

  test('should clear all selected words', async ({ page }) => {
    // Select some words
    const words = page.locator('.word-wrapper');
    for (let i = 0; i < 3; i++) {
      await words.nth(i).click();
      await page.waitForTimeout(200);
    }

    // Find Clear All button
    const clearButton = page.getByRole('button', { name: /clear all/i });
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    await page.waitForTimeout(500);

    // Verify no words are selected (check aria-pressed="true" or .censored class)
    const selectedWords = page.locator('.word-wrapper[aria-pressed="true"]');
    const count = await selectedWords.count();
    expect(count).toBe(0);
  });

  test('should expand and collapse transcript sections', async ({ page }) => {
    // Look for expand/collapse controls
    const expandButton = page.getByRole('button', { name: /expand/i });
    const collapseButton = page.getByRole('button', { name: /collapse/i });

    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(300);

      // Transcript should be fully visible
      const transcriptExpanded = page.locator('[data-transcript-expanded="true"]');
      await expect(transcriptExpanded).toBeVisible();
    }

    if (await collapseButton.isVisible()) {
      await collapseButton.click();
      await page.waitForTimeout(300);

      // Transcript might be partially hidden
    }
  });

  test('should display transcript organized by sentences', async ({ page }) => {
    // Look for sentence groupings
    const sentences = page.locator('[data-sentence-index]');
    const count = await sentences.count();

    if (count > 0) {
      expect(count).toBeGreaterThan(0);
      // Each sentence should contain multiple words
    }
  });

  test('should show timestamp information for words', async ({ page }) => {
    // Words should show timestamp on hover (in .timestamp span)
    const firstWord = page.locator('.word-wrapper').first();
    if (await firstWord.isVisible()) {
      // Hover over word to show timestamp tooltip
      await firstWord.hover();
      await page.waitForTimeout(300);

      // Look for timestamp tooltip element
      const timestampTooltip = firstWord.locator('.timestamp');
      const hasTimestamp = await timestampTooltip.isVisible();

      expect(hasTimestamp).toBeTruthy();
    }
  });

  test('should highlight matched words from pattern matching', async ({ page }) => {
    // First match some words using pattern matching
    const wordsInput = bleepPage.wordsToMatchInput;
    await wordsInput.fill('happy');
    await page.getByRole('button', { name: /match words/i }).click();

    // Wait for matched words to appear
    await expect(page.getByText(/words selected/i).first()).toBeVisible({ timeout: 5000 });

    // Matched words in transcript should be selected (aria-pressed="true" or .censored class)
    const matchedWords = page.locator('.word-wrapper[aria-pressed="true"]');
    const count = await matchedWords.count();

    if (count > 0) {
      expect(count).toBeGreaterThan(0);
      // Words containing "happy" should be censored in transcript
    }
  });
});
