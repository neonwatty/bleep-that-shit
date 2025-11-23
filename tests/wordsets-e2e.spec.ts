import { test, expect } from '@playwright/test';
import { BleepPage, WordsetPage } from './helpers';
import path from 'path';
import fs from 'fs';

test.describe('Wordsets E2E Tests', () => {
  let bleepPage: BleepPage;
  let wordsetPage: WordsetPage;

  test.beforeEach(async ({ page }) => {
    await page.goto('/bleep');
    await page.waitForLoadState('networkidle');
    bleepPage = new BleepPage(page);
    wordsetPage = new WordsetPage(page);
  });

  test.describe('Complete Wordset Workflow', () => {
    test('should create wordset, apply it, transcribe, and see matched words', async ({ page }) => {
      // Step 1: Navigate to Wordsets tab and create a new wordset
      await wordsetPage.gotoWordsetsTab();

      await wordsetPage.createWordset({
        name: 'Test Profanity',
        description: 'Common profane words for testing',
        words: ['welcome', 'to', 'bleep'],
        useBulkEdit: true,
      });

      // Verify wordset was created
      await wordsetPage.expectSuccessMessage();
      await wordsetPage.expectWordsetExists('Test Profanity');

      // Step 2: Upload a test audio file
      const testFilePath = path.join(__dirname, 'fixtures', 'test-audio.mp3');

      // Navigate to Setup tab
      await page.locator('button').filter({ hasText: /Setup & Transcribe/i }).click();

      await bleepPage.uploadFile({
        fileName: 'test-audio.mp3',
        mimeType: 'audio/mpeg',
        filePath: testFilePath,
      });

      // Step 3: Transcribe
      await bleepPage.selectLanguage('en');
      await bleepPage.selectModel('tiny');
      await bleepPage.transcribe({ timeout: 60000 });

      // Verify transcription completed
      await bleepPage.expectTranscriptionVisible();

      // Step 4: Navigate to Review & Match tab and apply wordset
      await wordsetPage.gotoReviewTab();

      // Find the wordset checkbox by looking for the wordset we created
      // Note: We don't know the ID, so we'll select the first available checkbox
      const firstWordsetCheckbox = page.locator('[data-testid*="wordset-checkbox-"]').first();
      await firstWordsetCheckbox.check();

      await wordsetPage.applyWordsetsButton.click();

      // Step 5: Verify words from wordset are matched in transcript
      // The wordsToMatch field should be populated
      const wordsToMatchValue = await bleepPage.wordsToMatchInput.inputValue();
      expect(wordsToMatchValue).toContain('welcome');
      expect(wordsToMatchValue).toContain('to');
      expect(wordsToMatchValue).toContain('bleep');

      // The matched words should appear in the transcript stats
      const selectedCount = await bleepPage.getSelectedWordCount();
      expect(selectedCount).toBeGreaterThan(0);
    });
  });

  test.describe('Wordset Persistence', () => {
    test('should persist wordsets across page reloads', async ({ page }) => {
      // Create a wordset
      await wordsetPage.gotoWordsetsTab();

      await wordsetPage.createWordset({
        name: 'Persistent Wordset',
        description: 'Should survive page reload',
        words: ['test', 'persist', 'reload'],
        useBulkEdit: true,
      });

      await wordsetPage.expectWordsetExists('Persistent Wordset');

      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Navigate back to wordsets tab
      await wordsetPage.gotoWordsetsTab();

      // Verify wordset still exists
      await wordsetPage.expectWordsetExists('Persistent Wordset');
    });

    test('should persist default example wordset', async ({ page }) => {
      await wordsetPage.gotoWordsetsTab();

      // The Example Word List should exist by default
      await wordsetPage.expectWordsetExists('Example Word List');

      // Verify it contains the expected words
      const exampleBadge = page.locator('text=EXAMPLE');
      await expect(exampleBadge).toBeVisible();
    });
  });

  test.describe('Import/Export Workflow', () => {
    test('should export and import wordsets maintaining data integrity', async ({ page }) => {
      // Create a test wordset
      await wordsetPage.gotoWordsetsTab();

      await wordsetPage.createWordset({
        name: 'Export Test Wordset',
        description: 'Testing export/import',
        words: ['export', 'import', 'test', 'roundtrip'],
        useBulkEdit: true,
      });

      // Export all wordsets
      const download = await wordsetPage.exportAllWordsets();
      const downloadPath = await download.path();

      // Verify download occurred
      expect(downloadPath).toBeTruthy();
      expect(download.suggestedFilename()).toMatch(/wordsets.*\.csv/);

      // Read the CSV content to verify format
      if (downloadPath) {
        const csvContent = fs.readFileSync(downloadPath, 'utf-8');
        expect(csvContent).toContain('Export Test Wordset');
        expect(csvContent).toContain('export;import;test;roundtrip');
      }

      // Delete the wordset
      await wordsetPage.deleteWordset();

      // Verify wordset was deleted
      await expect(page.locator('text=Export Test Wordset')).not.toBeVisible();

      // Import the wordsets back
      if (downloadPath) {
        await wordsetPage.importWordsets(downloadPath);

        // Verify wordset was imported (will have "(Imported)" suffix if name conflicts)
        await page.waitForTimeout(1000); // Wait for import to complete
        const importedWordset = page.locator('text=/Export Test Wordset/');
        await expect(importedWordset).toBeVisible();
      }
    });
  });

  test.describe('Multiple Wordsets Management', () => {
    test('should handle multiple wordsets with overlapping words', async ({ page }) => {
      await wordsetPage.gotoWordsetsTab();

      // Create first wordset
      await wordsetPage.createWordset({
        name: 'Wordset A',
        description: 'First wordset',
        words: ['alpha', 'beta', 'gamma'],
        useBulkEdit: true,
      });

      // Create second wordset with overlapping words
      await wordsetPage.createWordset({
        name: 'Wordset B',
        description: 'Second wordset',
        words: ['beta', 'delta', 'epsilon'],
        useBulkEdit: true,
      });

      // Verify both wordsets exist
      await wordsetPage.expectWordsetExists('Wordset A');
      await wordsetPage.expectWordsetExists('Wordset B');

      // Navigate to review tab
      await wordsetPage.gotoReviewTab();

      // Get all wordset checkboxes
      const checkboxes = await page.locator('[data-testid*="wordset-checkbox-"]').all();

      // Apply both wordsets (select last two checkboxes which are the ones we just created)
      if (checkboxes.length >= 2) {
        await checkboxes[checkboxes.length - 1].check();
        await checkboxes[checkboxes.length - 2].check();
        await wordsetPage.applyWordsetsButton.click();

        // Verify all unique words are in wordsToMatch
        const wordsToMatchValue = await bleepPage.wordsToMatchInput.inputValue();
        expect(wordsToMatchValue).toContain('alpha');
        expect(wordsToMatchValue).toContain('beta'); // overlapping word
        expect(wordsToMatchValue).toContain('gamma');
        expect(wordsToMatchValue).toContain('delta');
        expect(wordsToMatchValue).toContain('epsilon');

        // Remove one wordset
        const removeButtons = await page.locator('[data-testid*="remove-wordset-"]').all();
        if (removeButtons.length > 0) {
          await removeButtons[0].click();

          // Verify wordsToMatch was updated
          await page.waitForTimeout(500);
          const updatedWordsToMatch = await bleepPage.wordsToMatchInput.inputValue();

          // The removed wordset's unique words should be gone
          // but overlapping words (beta) should remain if the other wordset is still active
          expect(updatedWordsToMatch.split(',').length).toBeLessThan(
            wordsToMatchValue.split(',').length
          );
        }
      }
    });

    test('should allow duplicate and edit operations', async ({ page }) => {
      await wordsetPage.gotoWordsetsTab();

      // Create original wordset
      await wordsetPage.createWordset({
        name: 'Original Wordset',
        description: 'Will be duplicated',
        words: ['original', 'words'],
        useBulkEdit: true,
      });

      // Duplicate the wordset
      await wordsetPage.duplicateWordset();

      // Verify duplicate was created with "(Copy)" suffix
      await page.waitForTimeout(500);
      await wordsetPage.expectWordsetExists('Original Wordset (Copy)');

      // Edit the duplicate
      const editButtons = await page.locator('[data-testid="edit-button"]').all();
      if (editButtons.length > 0) {
        await editButtons[editButtons.length - 1].click();

        await wordsetPage.wordsetNameInput.fill('Edited Duplicate');
        await wordsetPage.saveWordsetButton.click();

        // Verify the edit
        await wordsetPage.expectWordsetExists('Edited Duplicate');
      }
    });
  });

  test.describe('Wordset Search and Filter', () => {
    test('should filter wordsets by search query', async ({ page }) => {
      await wordsetPage.gotoWordsetsTab();

      // Create multiple wordsets
      await wordsetPage.createWordset({
        name: 'Profanity Words',
        description: 'Bad words',
        words: ['bad', 'worse'],
        useBulkEdit: true,
      });

      await wordsetPage.createWordset({
        name: 'Brand Names',
        description: 'Company brands',
        words: ['nike', 'adidas'],
        useBulkEdit: true,
      });

      // Search for "profanity"
      await wordsetPage.searchWordsets('profanity');
      await page.waitForTimeout(500);

      // Verify only matching wordset is visible
      await expect(page.locator('text=Profanity Words')).toBeVisible();
      await expect(page.locator('text=Brand Names')).not.toBeVisible();

      // Clear search
      await wordsetPage.searchWordsets('');
      await page.waitForTimeout(500);

      // Verify both wordsets are visible again
      await expect(page.locator('text=Profanity Words')).toBeVisible();
      await expect(page.locator('text=Brand Names')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should prevent creating wordset with duplicate name', async ({ page }) => {
      await wordsetPage.gotoWordsetsTab();

      // Create first wordset
      await wordsetPage.createWordset({
        name: 'Unique Name',
        description: 'First wordset',
        words: ['test'],
        useBulkEdit: true,
      });

      // Try to create another with same name
      await wordsetPage.newWordsetButton.click();
      await wordsetPage.wordsetNameInput.fill('Unique Name');
      await wordsetPage.bulkEditButton.click();
      await wordsetPage.bulkEditTextarea.fill('different\nwords');
      await wordsetPage.saveWordsetButton.click();

      // Verify error message is shown
      const errorMessage = page.locator('text=/already exists|duplicate/i');
      await expect(errorMessage).toBeVisible({ timeout: 2000 });
    });

    test('should prevent creating wordset with no words', async ({ page }) => {
      await wordsetPage.gotoWordsetsTab();

      await wordsetPage.newWordsetButton.click();
      await wordsetPage.wordsetNameInput.fill('Empty Wordset');
      // Don't add any words
      await wordsetPage.saveWordsetButton.click();

      // Verify save button is disabled or error is shown
      const errorOrDisabled = await Promise.race([
        page.locator('text=/at least one word/i').isVisible(),
        wordsetPage.saveWordsetButton.isDisabled(),
      ]);
      expect(errorOrDisabled).toBeTruthy();
    });
  });

  test.describe('Delete Confirmation', () => {
    test('should show confirmation dialog before deleting wordset', async ({ page }) => {
      await wordsetPage.gotoWordsetsTab();

      // Create a wordset to delete
      await wordsetPage.createWordset({
        name: 'To Be Deleted',
        description: 'Will be removed',
        words: ['temporary'],
        useBulkEdit: true,
      });

      // Click delete button
      const deleteButton = page.getByTestId('delete-button').first();
      await deleteButton.click();

      // Verify confirmation dialog appears
      await expect(wordsetPage.confirmDeleteButton).toBeVisible();
      await expect(wordsetPage.cancelDeleteButton).toBeVisible();

      // Cancel deletion
      await wordsetPage.cancelDeleteButton.click();

      // Verify wordset still exists
      await wordsetPage.expectWordsetExists('To Be Deleted');

      // Delete for real
      await deleteButton.click();
      await wordsetPage.confirmDeleteButton.click();

      // Verify wordset was deleted
      await expect(page.locator('text=To Be Deleted')).not.toBeVisible();
    });
  });
});
