/**
 * Transcript Loader Helper
 *
 * Provides utilities to inject pre-generated transcripts into the app state
 * for E2E tests, bypassing the actual transcription process for speed.
 */

import { Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface TranscriptionResult {
  text: string;
  chunks: Array<{
    text: string;
    timestamp: [number, number];
  }>;
  metadata?: {
    nullTimestampCount: number;
    totalChunks: number;
  };
}

/**
 * Load a pre-generated transcript and inject it into the page
 *
 * @param page - Playwright page object
 * @param transcriptFilename - Name of the transcript file (e.g., 'bob-ross-15s-video.transcript.json')
 * @returns Promise that resolves when transcript is loaded
 *
 * Usage:
 * ```typescript
 * await loadTranscript(page, 'bob-ross-15s-audio.transcript.json');
 * ```
 */
export async function loadTranscript(page: Page, transcriptFilename: string): Promise<void> {
  // Load transcript JSON from fixtures
  const transcriptPath = join(__dirname, '../fixtures/transcripts', transcriptFilename);
  const transcriptData: TranscriptionResult = JSON.parse(readFileSync(transcriptPath, 'utf-8'));

  // Inject transcript into page using window object
  // This approach uses a global test helper that we'll add to the app
  await page.evaluate(transcript => {
    // Store in window for test access
    (window as any).__TEST_TRANSCRIPT__ = transcript;

    // Dispatch a custom event that the app can listen for
    window.dispatchEvent(
      new CustomEvent('test:loadTranscript', {
        detail: transcript,
      })
    );
  }, transcriptData);

  // Alternative approach: Use localStorage
  // This is more reliable if the app doesn't have the event listener
  await page.evaluate(transcript => {
    localStorage.setItem('__TEST_TRANSCRIPT__', JSON.stringify(transcript));
  }, transcriptData);

  // Wait for React to process and update state
  // Increased timeout to ensure state updates complete
  await page.waitForTimeout(1500);
}

/**
 * Clear any loaded test transcript
 *
 * @param page - Playwright page object
 */
export async function clearTranscript(page: Page): Promise<void> {
  await page.evaluate(() => {
    delete (window as any).__TEST_TRANSCRIPT__;
    localStorage.removeItem('__TEST_TRANSCRIPT__');
  });
}

/**
 * Check if a transcript is currently loaded
 *
 * @param page - Playwright page object
 * @returns True if a test transcript is loaded
 */
export async function hasTranscript(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return !!(window as any).__TEST_TRANSCRIPT__ || !!localStorage.getItem('__TEST_TRANSCRIPT__');
  });
}

/**
 * Get the currently loaded transcript
 *
 * @param page - Playwright page object
 * @returns The transcript data or null if none loaded
 */
export async function getLoadedTranscript(page: Page): Promise<TranscriptionResult | null> {
  return page.evaluate(() => {
    const fromWindow = (window as any).__TEST_TRANSCRIPT__;
    if (fromWindow) return fromWindow;

    const fromStorage = localStorage.getItem('__TEST_TRANSCRIPT__');
    return fromStorage ? JSON.parse(fromStorage) : null;
  });
}

/**
 * Helper to inject transcript directly into component state
 * This is a more advanced version that manipulates React state directly
 *
 * Note: This requires the app to be running and the bleep page to be loaded
 *
 * @param page - Playwright page object
 * @param transcript - Transcript data to inject
 */
export async function injectTranscriptIntoState(
  page: Page,
  transcript: TranscriptionResult
): Promise<void> {
  await page.evaluate(transcriptData => {
    // Try to find the React Fiber node and update state
    // This is a bit hacky but works for testing purposes

    // Method 1: Use the window test helper if available
    if (typeof (window as any).__setTestTranscript === 'function') {
      (window as any).__setTestTranscript(transcriptData);
      return;
    }

    // Method 2: Dispatch custom event for app to handle
    window.dispatchEvent(
      new CustomEvent('test:setTranscript', {
        detail: transcriptData,
      })
    );

    // Method 3: Store in sessionStorage as fallback
    sessionStorage.setItem('test:transcript', JSON.stringify(transcriptData));
  }, transcript);

  // Wait for state to update
  await page.waitForTimeout(1000);
}

/**
 * Verify that transcript tabs are unlocked after loading
 *
 * @param page - Playwright page object
 * @returns True if Review and Bleep tabs are unlocked
 */
export async function verifyTabsUnlocked(page: Page): Promise<boolean> {
  // Check if Review tab is accessible (not disabled)
  const reviewTab = page.getByRole('tab', { name: /review/i });
  const bleepTab = page.getByRole('tab', { name: /bleep/i });

  const reviewEnabled = await reviewTab.isEnabled();
  const bleepEnabled = await bleepTab.isEnabled();

  return reviewEnabled && bleepEnabled;
}

/**
 * Wait for transcript to be fully loaded and tabs to unlock
 *
 * @param page - Playwright page object
 * @param timeout - Maximum wait time in milliseconds
 */
export async function waitForTranscriptLoaded(page: Page, timeout = 10000): Promise<void> {
  await page.waitForFunction(
    () => {
      // Check if transcript data exists in any form
      const hasData =
        !!(window as any).__TEST_TRANSCRIPT__ ||
        !!localStorage.getItem('__TEST_TRANSCRIPT__') ||
        !!sessionStorage.getItem('test:transcript');

      // Check if tabs are unlocked (review tab should be enabled)
      const reviewTab = document.querySelector('[role="tab"][aria-label*="Review"]');
      const tabUnlocked = reviewTab && !(reviewTab as HTMLElement).hasAttribute('disabled');

      return hasData && tabUnlocked;
    },
    { timeout }
  );
}
