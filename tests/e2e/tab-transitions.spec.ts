/**
 * E2E Test: Tab Transitions
 *
 * Tests tab locking/unlocking behavior and data persistence across tabs:
 * - Tabs start locked (except Setup)
 * - Tabs unlock after transcription
 * - Data persists when switching tabs
 * - Tab lock icons display correctly
 */

import { test, expect } from './e2e-setup';
import { join } from 'path';
import { BleepPage } from '../helpers/pages/BleepPage';
import { loadTranscript } from '../helpers/transcriptLoader';

const AUDIO_FIXTURE = join(__dirname, '../fixtures/files/bob-ross-15s.mp3');
const AUDIO_TRANSCRIPT = 'bob-ross-15s-audio.transcript.json';

test.describe('Tab State Transitions', () => {
  let bleepPage: BleepPage;

  test.beforeEach(async ({ page }) => {
    bleepPage = new BleepPage(page);
    await bleepPage.goto();
  });

  test('should show correct initial tab state', async () => {
    // Setup tab should be unlocked and selected by default
    await expect(bleepPage.setupTab).toBeEnabled();
    await expect(bleepPage.setupTab).toHaveAttribute('aria-selected', 'true');

    // Review and Bleep tabs should be locked
    await expect(bleepPage.reviewTab).toBeDisabled();
    await expect(bleepPage.bleepTab).toBeDisabled();

    // Wordset tab should be unlocked
    await expect(bleepPage.wordsetTab).toBeEnabled();
  });

  test('should show lock icons on disabled tabs', async () => {
    // Check for lock icon (🔒) in disabled tabs
    const reviewTabText = await bleepPage.reviewTab.textContent();
    const bleepTabText = await bleepPage.bleepTab.textContent();

    expect(reviewTabText).toContain('🔒');
    expect(bleepTabText).toContain('🔒');
  });

  test('should unlock tabs after transcript loaded', async ({ page }) => {
    // Upload file
    await bleepPage.uploadFile(AUDIO_FIXTURE);

    // Review tab is enabled after file upload (for manual timeline)
    await expect(bleepPage.reviewTab).toBeEnabled();
    // Bleep tab still locked (no transcript or manual censors yet)
    await expect(bleepPage.bleepTab).toBeDisabled();

    // Load transcript
    await loadTranscript(page, AUDIO_TRANSCRIPT);
    await page.waitForTimeout(1000);

    // Now both tabs should be unlocked
    await expect(bleepPage.reviewTab).toBeEnabled({ timeout: 5000 });
    await expect(bleepPage.bleepTab).toBeEnabled({ timeout: 5000 });

    // Lock icons should be removed
    const reviewTabText = await bleepPage.reviewTab.textContent();
    const bleepTabText = await bleepPage.bleepTab.textContent();

    expect(reviewTabText).not.toContain('🔒');
    expect(bleepTabText).not.toContain('🔒');
  });

  test('should allow navigation between unlocked tabs', async ({ page }) => {
    // Unlock tabs
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await loadTranscript(page, AUDIO_TRANSCRIPT);
    await expect(bleepPage.reviewTab).toBeEnabled({ timeout: 5000 });

    // Navigate to Review tab
    await bleepPage.switchToReviewTab();
    await expect(bleepPage.reviewTab).toHaveAttribute('aria-selected', 'true');
    await expect(bleepPage.setupTab).toHaveAttribute('aria-selected', 'false');

    // Navigate to Bleep tab
    await bleepPage.switchToBleepTab();
    await expect(bleepPage.bleepTab).toHaveAttribute('aria-selected', 'true');
    await expect(bleepPage.reviewTab).toHaveAttribute('aria-selected', 'false');

    // Navigate back to Setup
    await bleepPage.setupTab.click();
    await expect(bleepPage.setupTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should persist matched words when switching tabs', async ({ page }) => {
    // Setup and match words
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await loadTranscript(page, AUDIO_TRANSCRIPT);
    await expect(bleepPage.reviewTab).toBeEnabled({ timeout: 5000 });

    await bleepPage.switchToReviewTab();
    const wordsInput = bleepPage.wordsToMatchInput;
    await wordsInput.fill('happy,tree');
    await bleepPage.page.getByRole('button', { name: /match words/i }).click();
    await page.waitForTimeout(1000);

    // Verify matches exist
    await expect(bleepPage.page.getByText(/matched words|selected words/i).first()).toBeVisible();

    // Switch to Bleep tab
    await bleepPage.switchToBleepTab();
    await page.waitForTimeout(500);

    // Switch back to Review tab
    await bleepPage.switchToReviewTab();
    await page.waitForTimeout(500);

    // Matched words should still be there
    await expect(bleepPage.page.getByText(/matched words|selected words/i).first()).toBeVisible();

    // Input should still have values
    const inputValue = await wordsInput.inputValue();
    expect(inputValue).toBe('happy,tree');
  });

  test('should persist bleep settings when switching tabs', async ({ page }) => {
    await bleepPage.uploadFile(AUDIO_FIXTURE);
    await loadTranscript(page, AUDIO_TRANSCRIPT);
    await expect(bleepPage.reviewTab).toBeEnabled({ timeout: 5000 });

    // Set bleep settings
    await bleepPage.switchToBleepTab();
    const bleepSelector = bleepPage.bleepSoundSelect;
    await bleepSelector.selectOption('dolphin'); // Fixed: removed regex syntax

    const volumeSlider = bleepPage.bleepVolumeSlider;
    await volumeSlider.fill('90');

    // Switch away and back
    await bleepPage.switchToReviewTab();
    await page.waitForTimeout(500);
    await bleepPage.switchToBleepTab();
    await page.waitForTimeout(500);

    // Settings should persist
    const selectedSound = await bleepSelector.inputValue();
    const volumeValue = await volumeSlider.inputValue();

    expect(selectedSound).toMatch(/dolphin/i);
    expect(parseInt(volumeValue)).toBe(90);
  });

  test('should show active tab with correct styling', async () => {
    // Active tab should have aria-selected="true"
    await expect(bleepPage.setupTab).toHaveAttribute('aria-selected', 'true');

    // Could also check for visual styling (e.g., specific CSS class)
    // This depends on your implementation
  });

  test('should prevent clicking locked tabs', async () => {
    // Try to click locked Review tab
    const reviewTab = bleepPage.reviewTab;
    await expect(reviewTab).toBeDisabled();

    // Attempt to click
    await reviewTab.click({ force: true }); // Force click even if disabled

    // Should still be on Setup tab
    await expect(bleepPage.setupTab).toHaveAttribute('aria-selected', 'true');
    await expect(bleepPage.reviewTab).toHaveAttribute('aria-selected', 'false');
  });
});
