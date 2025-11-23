import { Page, Locator, expect } from '@playwright/test';
import { uploadFile } from '../fileHelpers';
import { waitForTranscription, waitForVideoProcessing } from '../waitHelpers';

export class BleepPage {
  readonly page: Page;

  // File Upload Elements
  readonly fileDropzone: Locator;
  readonly fileInput: Locator;
  readonly fileWarning: Locator;
  readonly fileDurationWarning: Locator;

  // Language & Model Selection
  readonly languageSelect: Locator;
  readonly modelSelect: Locator;

  // Transcription Controls
  readonly transcribeButton: Locator;
  readonly progressBar: Locator;
  readonly progressText: Locator;
  readonly transcriptResult: Locator;
  readonly transcriptText: Locator;
  readonly errorMessage: Locator;

  // Word Matching Elements
  readonly wordsToMatchInput: Locator;
  readonly exactMatchCheckbox: Locator;
  readonly partialMatchCheckbox: Locator;
  readonly fuzzyMatchCheckbox: Locator;
  readonly fuzzyDistanceSlider: Locator;
  readonly runMatchingButton: Locator;
  readonly matchedWordsContainer: Locator;
  readonly matchedWordChips: Locator;

  // Transcript Review Elements (NEW)
  readonly searchTranscriptInput: Locator;
  readonly clearAllButton: Locator;
  readonly transcriptExpandButton: Locator;
  readonly transcriptStats: Locator;

  // Bleep Sound & Volume Controls
  readonly bleepSoundSelect: Locator;
  readonly bleepVolumeSlider: Locator;
  readonly originalVolumeSlider: Locator;
  readonly bleepBufferSlider: Locator;
  readonly previewBleepButton: Locator;

  // Apply Bleeps Controls
  readonly applyBleepsButton: Locator;
  readonly censoredResult: Locator;
  readonly downloadButton: Locator;
  readonly videoProcessingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;

    // File Upload
    this.fileDropzone = page.getByTestId('file-dropzone');
    this.fileInput = page.getByTestId('file-input');
    this.fileWarning = page.getByTestId('file-warning');
    this.fileDurationWarning = page.getByTestId('file-duration-warning');

    // Language & Model
    this.languageSelect = page.getByTestId('language-select');
    this.modelSelect = page.getByTestId('model-select');

    // Transcription
    this.transcribeButton = page.getByTestId('transcribe-button');
    this.progressBar = page.getByTestId('progress-bar');
    this.progressText = page.getByTestId('progress-text');
    this.transcriptResult = page.getByTestId('transcript-result');
    this.transcriptText = page.getByTestId('transcript-text');
    this.errorMessage = page.getByTestId('error-message');

    // Word Matching
    this.wordsToMatchInput = page.getByTestId('words-to-match-input');
    this.exactMatchCheckbox = page.getByTestId('exact-match-checkbox');
    this.partialMatchCheckbox = page.getByTestId('partial-match-checkbox');
    this.fuzzyMatchCheckbox = page.getByTestId('fuzzy-match-checkbox');
    this.fuzzyDistanceSlider = page.getByTestId('fuzzy-distance-slider');
    this.runMatchingButton = page.getByTestId('run-matching-button');
    this.matchedWordsContainer = page.getByTestId('matched-words-container');
    this.matchedWordChips = page.getByTestId('matched-word-chip');

    // Transcript Review (NEW)
    this.searchTranscriptInput = page.getByTestId('search-transcript-input');
    this.clearAllButton = page.getByTestId('clear-all-button');
    this.transcriptExpandButton = page.locator('button').filter({ hasText: /Expand|Collapse/ });
    this.transcriptStats = page.locator('text=/\\d+ of \\d+ words selected/i');

    // Bleep Sound & Volume
    this.bleepSoundSelect = page.getByTestId('bleep-sound-select');
    this.bleepVolumeSlider = page.getByTestId('bleep-volume-slider');
    this.originalVolumeSlider = page.getByTestId('original-volume-slider');
    this.bleepBufferSlider = page.getByTestId('bleep-buffer-slider');
    this.previewBleepButton = page.getByTestId('preview-bleep-button');

    // Apply Bleeps
    this.applyBleepsButton = page.getByTestId('apply-bleeps-button');
    this.censoredResult = page.getByTestId('censored-result');
    this.downloadButton = page.getByTestId('download-button');
    this.videoProcessingIndicator = page.getByTestId('video-processing-indicator');
  }

  /**
   * Navigate to the Bleep page
   */
  async goto() {
    await this.page.goto('/bleep');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Upload a file using the file input
   */
  async uploadFile(options: {
    fileName: string;
    mimeType: string;
    buffer?: Buffer;
    filePath?: string;
  }) {
    await uploadFile(this.page, options);
  }

  /**
   * Select a language for transcription
   */
  async selectLanguage(language: string) {
    await this.languageSelect.selectOption(language);
  }

  /**
   * Select a model for transcription
   */
  async selectModel(model: string) {
    await this.modelSelect.selectOption(model);
  }

  /**
   * Start transcription and wait for completion
   */
  async transcribe(options?: { timeout?: number; expectSuccess?: boolean }) {
    await this.transcribeButton.click();
    return await waitForTranscription(this.page, options);
  }

  /**
   * Enter words to match
   */
  async enterWordsToMatch(words: string | string[]) {
    const wordsString = Array.isArray(words) ? words.join(', ') : words;
    await this.wordsToMatchInput.fill(wordsString);
  }

  /**
   * Set match mode checkboxes
   */
  async setMatchMode(options: { exact?: boolean; partial?: boolean; fuzzy?: boolean }) {
    if (options.exact !== undefined) {
      await this.exactMatchCheckbox.setChecked(options.exact);
    }
    if (options.partial !== undefined) {
      await this.partialMatchCheckbox.setChecked(options.partial);
    }
    if (options.fuzzy !== undefined) {
      await this.fuzzyMatchCheckbox.setChecked(options.fuzzy);
    }
  }

  /**
   * Set fuzzy distance
   */
  async setFuzzyDistance(distance: number) {
    await this.fuzzyDistanceSlider.fill(distance.toString());
  }

  /**
   * Run word matching
   */
  async runMatching() {
    await this.runMatchingButton.click();
  }

  /**
   * Get matched word count
   */
  async getMatchedWordCount(): Promise<number> {
    const chips = await this.matchedWordChips.all();
    return chips.length;
  }

  /**
   * Select a bleep sound
   */
  async selectBleepSound(sound: 'bleep' | 'brown' | 'dolphin') {
    await this.bleepSoundSelect.selectOption(sound);
  }

  /**
   * Set bleep volume (0-150)
   */
  async setBleepVolume(volume: number) {
    await this.bleepVolumeSlider.fill(volume.toString());
  }

  /**
   * Set original volume reduction (0-100)
   */
  async setOriginalVolume(volume: number) {
    await this.originalVolumeSlider.fill(volume.toString());
  }

  /**
   * Set bleep buffer (0-0.5)
   */
  async setBleepBuffer(buffer: number) {
    await this.bleepBufferSlider.fill(buffer.toString());
  }

  /**
   * Preview the bleep sound
   */
  async previewBleep() {
    await this.previewBleepButton.click();
  }

  /**
   * Apply bleeps to the media file
   */
  async applyBleeps() {
    await this.applyBleepsButton.click();
  }

  /**
   * Apply bleeps and wait for video processing to complete
   */
  async applyBleepsAndWait(options?: { timeout?: number }) {
    await this.applyBleeps();
    await waitForVideoProcessing(this.page, options);
  }

  /**
   * Download the censored media
   */
  async download() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.downloadButton.click();
    return await downloadPromise;
  }

  /**
   * Complete workflow: upload, transcribe, match, and bleep
   */
  async completeWorkflow(options: {
    filePath: string;
    fileName: string;
    mimeType: string;
    language?: string;
    model?: string;
    wordsToMatch: string | string[];
    matchMode?: { exact?: boolean; partial?: boolean; fuzzy?: boolean };
    bleepSound?: 'bleep' | 'brown' | 'dolphin';
    bleepVolume?: number;
  }) {
    // Upload file
    await this.uploadFile({
      filePath: options.filePath,
      fileName: options.fileName,
      mimeType: options.mimeType,
    });

    // Select language and model
    if (options.language) {
      await this.selectLanguage(options.language);
    }
    if (options.model) {
      await this.selectModel(options.model);
    }

    // Transcribe
    await this.transcribe();

    // Match words
    await this.enterWordsToMatch(options.wordsToMatch);
    if (options.matchMode) {
      await this.setMatchMode(options.matchMode);
    }
    await this.runMatching();

    // Configure bleep
    if (options.bleepSound) {
      await this.selectBleepSound(options.bleepSound);
    }
    if (options.bleepVolume !== undefined) {
      await this.setBleepVolume(options.bleepVolume);
    }

    // Apply bleeps
    await this.applyBleepsAndWait();
  }

  /**
   * Verify transcription result is visible
   */
  async expectTranscriptionVisible() {
    await expect(this.transcriptResult).toBeVisible();
  }

  /**
   * Verify censored result is visible
   */
  async expectCensoredResultVisible() {
    await expect(this.censoredResult).toBeVisible();
  }

  /**
   * Verify error message is visible
   */
  async expectErrorVisible() {
    await expect(this.errorMessage).toBeVisible();
  }

  /**
   * Search within transcript
   */
  async searchTranscript(query: string) {
    await this.searchTranscriptInput.fill(query);
  }

  /**
   * Clear all selected words
   */
  async clearAllWords() {
    await this.clearAllButton.click();
  }

  /**
   * Toggle transcript expansion
   */
  async toggleTranscriptExpanded() {
    await this.transcriptExpandButton.click();
  }

  /**
   * Get the count of selected words from stats
   */
  async getSelectedWordCount(): Promise<number> {
    const statsText = await this.transcriptStats.textContent();
    const match = statsText?.match(/(\d+) of \d+ words selected/i);
    return match ? parseInt(match[1], 10) : 0;
  }
}
