import { Page, Locator, expect } from '@playwright/test';

export class WordsetPage {
  readonly page: Page;

  // Tab navigation
  readonly wordsetsTab: Locator;
  readonly reviewTab: Locator;

  // Wordset Manager Elements
  readonly closeManagerButton: Locator;
  readonly searchWordsetsInput: Locator;
  readonly newWordsetButton: Locator;
  readonly exportAllButton: Locator;
  readonly importFileInput: Locator;

  // Wordset Selector (in Review tab)
  readonly applyWordsetsButton: Locator;

  // Wordset Editor Elements
  readonly wordsetNameInput: Locator;
  readonly wordsetDescriptionInput: Locator;
  readonly wordInput: Locator;
  readonly addWordButton: Locator;
  readonly bulkEditButton: Locator;
  readonly bulkEditTextarea: Locator;
  readonly saveWordsetButton: Locator;
  readonly cancelButton: Locator;

  // Delete Confirmation
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Tab navigation
    this.wordsetsTab = page.locator('button').filter({ hasText: /Manage Word Lists/i });
    this.reviewTab = page.locator('button').filter({ hasText: /Review & Match/i });

    // Manager
    this.closeManagerButton = page.getByTestId('close-manager');
    this.searchWordsetsInput = page.getByTestId('search-wordsets-input');
    this.newWordsetButton = page.getByTestId('new-wordset-button');
    this.exportAllButton = page.getByTestId('export-all-button');
    this.importFileInput = page.getByTestId('import-file-input');

    // Selector
    this.applyWordsetsButton = page.getByTestId('apply-wordsets-button');

    // Editor
    this.wordsetNameInput = page.getByTestId('wordset-name-input');
    this.wordsetDescriptionInput = page.getByTestId('wordset-description-input');
    this.wordInput = page.getByTestId('new-word-input');
    this.addWordButton = page.getByTestId('add-word-button');
    this.bulkEditButton = page.locator('button').filter({ hasText: /Bulk Edit/i });
    this.bulkEditTextarea = page.getByTestId('bulk-edit-textarea');
    this.saveWordsetButton = page.getByTestId('save-wordset-button');
    this.cancelButton = page.getByTestId('cancel-button');

    // Delete confirmation
    this.confirmDeleteButton = page.getByTestId('confirm-delete-button');
    this.cancelDeleteButton = page.getByTestId('cancel-delete-button');
  }

  /**
   * Alias for newWordsetButton - for backward compatibility
   */
  get createButton() {
    return this.newWordsetButton;
  }

  /**
   * Alias for wordsetNameInput - for backward compatibility
   */
  get nameInput() {
    return this.wordsetNameInput;
  }

  /**
   * Alias for wordsetDescriptionInput - for backward compatibility
   */
  get descriptionInput() {
    return this.wordsetDescriptionInput;
  }

  /**
   * Alias for wordInput - for backward compatibility
   */
  get wordsInput() {
    return this.wordInput;
  }

  /**
   * Alias for saveWordsetButton - for backward compatibility
   */
  get saveButton() {
    return this.saveWordsetButton;
  }

  /**
   * Alias for searchWordsetsInput - for backward compatibility
   */
  get searchInput() {
    return this.searchWordsetsInput;
  }

  /**
   * Navigate to the Wordsets tab
   */
  async gotoWordsetsTab() {
    await this.wordsetsTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to the Review & Match tab
   */
  async gotoReviewTab() {
    await this.reviewTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Create a new wordset
   */
  async createWordset(options: {
    name: string;
    description?: string;
    words: string[];
    useBulkEdit?: boolean;
  }) {
    await this.newWordsetButton.click();
    await this.wordsetNameInput.fill(options.name);

    if (options.description) {
      await this.wordsetDescriptionInput.fill(options.description);
    }

    // Click Bulk Edit to enter bulk edit mode
    await this.bulkEditButton.click();

    // Wait for textarea to be visible and fill words
    await expect(this.bulkEditTextarea).toBeVisible();
    await this.bulkEditTextarea.fill(options.words.join(', '));

    // Click Done Editing to parse words
    await this.page.getByRole('button', { name: /Done Editing/i }).click();

    // Wait for save button to be enabled
    await expect(this.saveWordsetButton).toBeEnabled({ timeout: 5000 });

    await this.saveWordsetButton.click();
  }

  /**
   * Edit an existing wordset
   */
  async editWordset(
    wordsetId: number,
    options: {
      name?: string;
      description?: string;
      words?: string[];
    }
  ) {
    const editButton = this.page.getByTestId(`edit-button`);
    await editButton.first().click();

    if (options.name) {
      await this.wordsetNameInput.clear();
      await this.wordsetNameInput.fill(options.name);
    }

    if (options.description !== undefined) {
      await this.wordsetDescriptionInput.clear();
      await this.wordsetDescriptionInput.fill(options.description);
    }

    if (options.words) {
      await this.bulkEditButton.click();
      await expect(this.bulkEditTextarea).toBeVisible();
      await this.bulkEditTextarea.fill(options.words.join('\n'));
      await this.page.getByRole('button', { name: /Done Editing/i }).click();
    }

    await expect(this.saveWordsetButton).toBeEnabled({ timeout: 5000 });
    await this.saveWordsetButton.click();
  }

  /**
   * Delete a wordset
   */
  async deleteWordset(wordsetId?: number) {
    const deleteButton = this.page.getByTestId(`delete-button`);
    await deleteButton.first().click();
    await this.confirmDeleteButton.click();
  }

  /**
   * Duplicate a wordset
   */
  async duplicateWordset(wordsetId?: number) {
    const duplicateButton = this.page.getByTestId(`duplicate-button`);
    await duplicateButton.first().click();
  }

  /**
   * Export a wordset
   */
  async exportWordset(wordsetId?: number) {
    const exportButton = this.page.getByTestId(`export-button`);
    const downloadPromise = this.page.waitForEvent('download');
    await exportButton.first().click();
    return await downloadPromise;
  }

  /**
   * Export all wordsets
   */
  async exportAllWordsets() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportAllButton.click();
    return await downloadPromise;
  }

  /**
   * Import wordsets from CSV file
   */
  async importWordsets(filePath: string) {
    await this.importFileInput.setInputFiles(filePath);
    // Wait for import to complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Search for wordsets
   */
  async searchWordsets(query: string) {
    await this.searchWordsetsInput.fill(query);
  }

  /**
   * Apply wordsets to the review
   */
  async applyWordsets(wordsetIds: number[]) {
    // Navigate to review tab first
    await this.gotoReviewTab();

    // Check the wordset checkboxes
    for (const id of wordsetIds) {
      const checkbox = this.page.getByTestId(`wordset-checkbox-${id}`);
      await checkbox.check();
    }

    await this.applyWordsetsButton.click();
  }

  /**
   * Remove a wordset from active wordsets
   */
  async removeActiveWordset(wordsetId: number) {
    const removeButton = this.page.getByTestId(`remove-wordset-${wordsetId}`);
    await removeButton.click();
  }

  /**
   * Get the count of wordsets displayed
   */
  async getWordsetCount(): Promise<number> {
    const cards = await this.page.locator('[data-testid*="wordset-item"]').count();
    return cards;
  }

  /**
   * Verify a wordset exists with the given name
   */
  async expectWordsetExists(name: string) {
    const wordsetName = this.page.locator('text=' + name);
    await expect(wordsetName).toBeVisible();
  }

  /**
   * Verify wordset count
   */
  async expectWordsetCount(count: number) {
    await this.page.waitForTimeout(500); // Wait for rendering
    const actualCount = await this.getWordsetCount();
    expect(actualCount).toBe(count);
  }

  /**
   * Verify success message is shown
   */
  async expectSuccessMessage(message?: string) {
    if (message) {
      await expect(this.page.locator(`text=${message}`)).toBeVisible();
    } else {
      await expect(this.page.locator('[class*="success"]')).toBeVisible();
    }
  }
}
