import { Page, Locator, expect } from '@playwright/test';
import { uploadFile } from '../fileHelpers';

export class SamplerPage {
  readonly page: Page;

  // File Upload Elements
  readonly fileDropzone: Locator;
  readonly fileInput: Locator;
  readonly fileDurationWarning: Locator;
  readonly audioPlayer: Locator;

  // Sample Configuration
  readonly sampleStartInput: Locator;
  readonly sampleDurationInput: Locator;
  readonly languageSelect: Locator;

  // Comparison Controls
  readonly compareAllButton: Locator;

  // Results Elements
  readonly resultsContainer: Locator;
  readonly modelResults: Locator;
  readonly recommendation: Locator;

  constructor(page: Page) {
    this.page = page;

    // File Upload
    this.fileDropzone = page.getByTestId('file-dropzone');
    this.fileInput = page.getByTestId('file-input');
    this.fileDurationWarning = page.getByTestId('file-duration-warning');
    this.audioPlayer = page.getByTestId('audio-player');

    // Sample Configuration
    this.sampleStartInput = page.getByTestId('sample-start-input');
    this.sampleDurationInput = page.getByTestId('sample-duration-input');
    this.languageSelect = page.getByTestId('language-select');

    // Comparison
    this.compareAllButton = page.getByTestId('compare-all-button');

    // Results
    this.resultsContainer = page.getByTestId('results-container');
    this.modelResults = page.getByTestId('model-result');
    this.recommendation = page.getByTestId('recommendation');
  }

  /**
   * Navigate to the Sampler page
   */
  async goto() {
    await this.page.goto('/sampler');
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
   * Set sample start time in seconds
   */
  async setSampleStart(seconds: number) {
    await this.sampleStartInput.fill(seconds.toString());
  }

  /**
   * Set sample duration in seconds
   */
  async setSampleDuration(seconds: number) {
    await this.sampleDurationInput.fill(seconds.toString());
  }

  /**
   * Select a language for transcription
   */
  async selectLanguage(language: string) {
    await this.languageSelect.selectOption(language);
  }

  /**
   * Click the compare all models button
   */
  async compareAllModels() {
    await this.compareAllButton.click();
  }

  /**
   * Wait for all models to finish processing
   */
  async waitForComparison(options?: { timeout?: number }) {
    await expect(this.recommendation).toBeVisible({ timeout: options?.timeout ?? 120000 });
  }

  /**
   * Get the number of model results displayed
   */
  async getModelResultCount(): Promise<number> {
    const results = await this.modelResults.all();
    return results.length;
  }

  /**
   * Get the recommended model text
   */
  async getRecommendation(): Promise<string | null> {
    return await this.recommendation.textContent();
  }

  /**
   * Complete workflow: upload, configure, and compare
   */
  async completeWorkflow(options: {
    filePath: string;
    fileName: string;
    mimeType: string;
    sampleStart?: number;
    sampleDuration?: number;
    language?: string;
  }) {
    // Upload file
    await this.uploadFile({
      filePath: options.filePath,
      fileName: options.fileName,
      mimeType: options.mimeType,
    });

    // Configure sample
    if (options.sampleStart !== undefined) {
      await this.setSampleStart(options.sampleStart);
    }
    if (options.sampleDuration !== undefined) {
      await this.setSampleDuration(options.sampleDuration);
    }
    if (options.language) {
      await this.selectLanguage(options.language);
    }

    // Compare models
    await this.compareAllModels();
    await this.waitForComparison();
  }

  /**
   * Verify results container is visible
   */
  async expectResultsVisible() {
    await expect(this.resultsContainer).toBeVisible();
  }

  /**
   * Verify recommendation is visible
   */
  async expectRecommendationVisible() {
    await expect(this.recommendation).toBeVisible();
  }
}
