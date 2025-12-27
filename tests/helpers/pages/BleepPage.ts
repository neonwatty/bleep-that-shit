import { Page, Locator, expect } from '@playwright/test';
import { uploadFile } from '../fileHelpers';
import { waitForTranscription, waitForVideoProcessing } from '../waitHelpers';

export class BleepPage {
  readonly page: Page;

  // Tab Elements
  readonly setupTab: Locator;
  readonly reviewTab: Locator;
  readonly bleepTab: Locator;
  readonly wordsetTab: Locator;

  // Section Toggles (for collapsible sections in Review tab)
  readonly interactiveTranscriptToggle: Locator;
  readonly keywordMatchingToggle: Locator;

  // Manual Timeline Section Elements (in Review tab)
  readonly timelineSection: Locator;
  readonly timelineSectionToggle: Locator;
  readonly timelineBar: Locator;
  readonly timelineSegments: Locator;
  readonly timelineChips: Locator;
  readonly timelineClearAll: Locator;

  // Media Players
  readonly audioPlayer: Locator;
  readonly videoPlayer: Locator;

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

  // Premium CTA Elements
  readonly premiumCta: Locator;
  readonly premiumCtaLink: Locator;
  readonly premiumCtaDismiss: Locator;

  constructor(page: Page) {
    this.page = page;

    // Tabs
    this.setupTab = page.getByRole('tab', { name: /setup/i });
    this.reviewTab = page.getByRole('tab', { name: /review/i });
    this.bleepTab = page.getByRole('tab', { name: /bleep/i });
    this.wordsetTab = page.getByRole('tab', { name: /word.*list/i });

    // Section Toggles (for collapsible sections in Review tab)
    this.interactiveTranscriptToggle = page.getByRole('button', {
      name: /Interactive Transcript/i,
    });
    this.keywordMatchingToggle = page.getByRole('button', { name: /Keyword Matching/i });

    // Manual Timeline Section (in Review tab)
    this.timelineSection = page.getByTestId('timeline-section');
    this.timelineSectionToggle = page.getByTestId('timeline-section-toggle');
    this.timelineBar = page.getByTestId('timeline-bar');
    this.timelineSegments = page.locator('[class*="bg-red-400"], [class*="bg-red-500"]');
    this.timelineChips = page.locator('[class*="rounded-full"][class*="bg-red-100"]');
    this.timelineClearAll = page.getByRole('button', { name: /clear all/i });

    // Media Players
    this.audioPlayer = page.locator('audio').first();
    this.videoPlayer = page.locator('video').first();

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

    // Pro Waitlist CTA (formerly Premium CTA)
    this.premiumCta = page.getByTestId('premium-cta');
    this.premiumCtaLink = this.premiumCta.getByRole('link', { name: /Join the Pro Waitlist/i });
    this.premiumCtaDismiss = page.getByLabel('Dismiss premium prompt');
  }

  /**
   * Navigate to the Bleep page
   */
  async goto() {
    await this.page.goto('/bleep');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Switch to Setup tab
   */
  async switchToSetupTab() {
    await this.setupTab.click();
  }

  /**
   * Switch to Review tab and expand timeline section
   */
  async switchToTimelineSection() {
    await this.reviewTab.click();
    // Ensure the timeline section is expanded
    await this.expandTimelineSection();
  }

  /**
   * Expand the timeline section if collapsed
   */
  async expandTimelineSection() {
    // Check if the section exists and if it's collapsed (toggle has -rotate-90)
    const toggle = this.timelineSectionToggle;
    if (await toggle.isVisible()) {
      // Check if collapsed by looking for the rotation class on the arrow span
      const arrowSpan = toggle.locator('span').last();
      const classList = await arrowSpan.getAttribute('class');
      if (classList?.includes('-rotate-90')) {
        await toggle.click();
      }
    }
  }

  /**
   * Switch to Review tab
   */
  async switchToReviewTab() {
    await this.reviewTab.click();
  }

  /**
   * Expand the Interactive Transcript section if collapsed
   */
  async expandInteractiveTranscript() {
    const toggle = this.interactiveTranscriptToggle;
    if (await toggle.isVisible()) {
      // Check if collapsed by looking for ▼ text (means it's collapsed)
      const toggleText = await toggle.textContent();
      if (toggleText?.includes('▼')) {
        await toggle.click();
      }
    }
  }

  /**
   * Expand the Keyword Matching section if collapsed
   */
  async expandKeywordMatching() {
    const toggle = this.keywordMatchingToggle;
    if (await toggle.isVisible()) {
      // Check if collapsed by looking for ▼ text (means it's collapsed)
      const toggleText = await toggle.textContent();
      if (toggleText?.includes('▼')) {
        await toggle.click();
      }
    }
  }

  /**
   * Switch to Bleep tab
   */
  async switchToBleepTab() {
    await this.bleepTab.click();
  }

  /**
   * Switch to Wordset tab
   */
  async switchToWordsetTab() {
    await this.wordsetTab.click();
  }

  /**
   * Upload a file using the file input
   * Can accept either a file path string or an options object
   */
  async uploadFile(
    pathOrOptions:
      | string
      | {
          fileName: string;
          mimeType: string;
          buffer?: Buffer;
          filePath?: string;
        }
  ) {
    // If string path is provided, convert to options object
    if (typeof pathOrOptions === 'string') {
      const filePath = pathOrOptions;
      const fileName = filePath.split('/').pop() || 'file';
      const mimeType = fileName.endsWith('.mp4')
        ? 'video/mp4'
        : fileName.endsWith('.mp3')
          ? 'audio/mpeg'
          : fileName.endsWith('.wav')
            ? 'audio/wav'
            : 'application/octet-stream';

      await uploadFile(this.page, { fileName, mimeType, filePath });
    } else {
      await uploadFile(this.page, pathOrOptions);
    }
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

  /**
   * Create a censor segment using Shift+drag on the timeline
   * @param startPercent - Starting position as percentage (0-100)
   * @param endPercent - Ending position as percentage (0-100)
   */
  async createTimelineSegment(startPercent: number, endPercent: number) {
    const box = await this.timelineBar.boundingBox();
    if (!box) throw new Error('Timeline bar not found');

    const startX = box.x + (box.width * startPercent) / 100;
    const endX = box.x + (box.width * endPercent) / 100;
    const y = box.y + box.height / 2;

    // Hold Shift and wait for the visual indicator (orange border appears when Shift is held)
    await this.page.keyboard.down('Shift');
    await expect(this.timelineBar).toHaveClass(/border-orange-400/, { timeout: 2000 });

    // Move mouse to start position first
    await this.page.mouse.move(startX, y);
    await this.page.waitForTimeout(50);

    // Click on the timeline bar element directly to ensure proper event routing
    await this.timelineBar.dispatchEvent('mousedown', {
      bubbles: true,
      button: 0,
      clientX: startX,
      clientY: y,
    });

    // Wait for React to process the mousedown and set createDrag state
    await this.page.waitForTimeout(100);

    // Dispatch mousemove on document to update endTime (global listener is on document)
    await this.page.evaluate(
      ({ clientX, clientY }) => {
        const event = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
        });
        document.dispatchEvent(event);
      },
      { clientX: endX, clientY: y }
    );
    await this.page.waitForTimeout(50);

    // Release mouse using document event as well (global listener is on document)
    await this.page.evaluate(
      ({ clientX, clientY }) => {
        const event = new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
        });
        document.dispatchEvent(event);
      },
      { clientX: endX, clientY: y }
    );

    // Release Shift
    await this.page.keyboard.up('Shift');
    // Wait for segment chip to appear
    await this.page.waitForTimeout(200);
  }

  /**
   * Get count of timeline censor segments
   */
  async getTimelineSegmentCount(): Promise<number> {
    const chips = await this.timelineChips.all();
    return chips.length;
  }

  /**
   * Clear all timeline segments
   */
  async clearTimelineSegments() {
    if ((await this.timelineChips.count()) > 0) {
      await this.timelineClearAll.click();
    }
  }

  /**
   * Delete a specific timeline segment by index
   */
  async deleteTimelineSegment(index: number) {
    const chip = this.timelineChips.nth(index);
    const deleteButton = chip.locator('button').filter({ hasText: '✕' });
    await deleteButton.click();
  }

  /**
   * Verify review tab is enabled (which contains the timeline section)
   */
  async expectReviewTabEnabled() {
    await expect(this.reviewTab).not.toBeDisabled();
  }

  /**
   * Verify timeline section is visible
   */
  async expectTimelineSectionVisible() {
    await expect(this.timelineSection).toBeVisible();
  }

  /**
   * Dismiss the Premium CTA
   */
  async dismissPremiumCta() {
    await this.premiumCtaDismiss.click();
  }

  /**
   * Verify Premium CTA is visible
   */
  async expectPremiumCtaVisible() {
    await expect(this.premiumCta).toBeVisible();
    await expect(this.premiumCtaLink).toBeVisible();
  }

  /**
   * Verify Premium CTA is not visible
   */
  async expectPremiumCtaNotVisible() {
    await expect(this.premiumCta).not.toBeVisible();
  }

  /**
   * Complete a minimal workflow to get censored result (uses manual timeline, no transcription)
   * This is faster than full transcription workflow
   */
  async completeFastWorkflow(filePath: string) {
    // Upload file
    await this.uploadFile(filePath);
    await expect(this.audioPlayer).toBeVisible({ timeout: 10000 });

    // Add manual censor via timeline (no transcription needed)
    await this.switchToTimelineSection();
    await expect(this.timelineBar).toBeVisible({ timeout: 10000 });
    await this.createTimelineSegment(10, 30);

    // Switch to bleep tab and apply
    await this.switchToBleepTab();
    await this.applyBleepsAndWait({ timeout: 60000 });
  }
}
