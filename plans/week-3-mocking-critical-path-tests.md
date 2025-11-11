# Week 3: Mocking Utilities and Critical Path Tests

## Overview

**Goal**: Test full transcription and bleeping workflows with mocked Web Workers to eliminate model download waits (30-90 seconds) and ensure fast, reliable CI tests.

**Duration**: 8-12 hours

**Prerequisites**:

- Week 1 (helper utilities) completed
- Week 2 (smoke tests) completed
- Understanding of Web Worker architecture

---

## 1. Understanding the Architecture

### Current Worker Flow

**Transcription Worker** (`app/workers/transcriptionWorker.ts`):

```
1. Video files: extract audio with FFmpeg → transcribe with Whisper
2. Audio files: transcribe directly with Whisper
3. Messages:
   - Input: { type: 'extract', fileBuffer } or { type: 'transcribe', audioData, model, language }
   - Output: { type: 'complete', result: { text, chunks }, progress, status }
   - Progress: { progress: 0-100, status: 'Loading model...' }
   - Error: { error: 'message', debug: 'stack trace' }
```

**Remux Worker** (`app/workers/remuxWorker.ts`):

```
1. Input: { type: 'remux', videoBuffer, audioBuffer }
2. Process: FFmpeg combines video with censored audio
3. Output: { type: 'complete', videoBuffer }
```

### Data Structures

**Transcription Result**:

```typescript
interface TranscriptionResult {
  text: string;
  chunks: Array<{
    text: string;
    timestamp: [number, number]; // [start, end] in seconds
  }>;
}
```

**Bleep Segment**:

```typescript
interface BleepSegment {
  word: string;
  start: number; // seconds
  end: number; // seconds
}
```

---

## 2. Mock Data Structures

### Complete Mock Transcription Response

```typescript
// tests/fixtures/mockTranscriptionData.ts

export interface MockTranscriptionChunk {
  text: string;
  timestamp: [number, number];
}

export interface MockTranscriptionResult {
  text: string;
  chunks: MockTranscriptionChunk[];
}

// Short audio mock (3 seconds, contains profanity)
export const MOCK_SHORT_TRANSCRIPTION: MockTranscriptionResult = {
  text: 'This is a damn test recording with some shit profanity.',
  chunks: [
    { text: 'This', timestamp: [0.0, 0.2] },
    { text: 'is', timestamp: [0.2, 0.4] },
    { text: 'a', timestamp: [0.4, 0.5] },
    { text: 'damn', timestamp: [0.5, 0.9] },
    { text: 'test', timestamp: [0.9, 1.2] },
    { text: 'recording', timestamp: [1.2, 1.7] },
    { text: 'with', timestamp: [1.7, 1.9] },
    { text: 'some', timestamp: [1.9, 2.1] },
    { text: 'shit', timestamp: [2.1, 2.5] },
    { text: 'profanity.', timestamp: [2.5, 3.0] },
  ],
};

// Audio without profanity (for testing no matches)
export const MOCK_CLEAN_TRANSCRIPTION: MockTranscriptionResult = {
  text: 'This is a clean test recording with no bad words.',
  chunks: [
    { text: 'This', timestamp: [0.0, 0.2] },
    { text: 'is', timestamp: [0.2, 0.4] },
    { text: 'a', timestamp: [0.4, 0.5] },
    { text: 'clean', timestamp: [0.5, 0.9] },
    { text: 'test', timestamp: [0.9, 1.2] },
    { text: 'recording', timestamp: [1.2, 1.7] },
    { text: 'with', timestamp: [1.7, 1.9] },
    { text: 'no', timestamp: [1.9, 2.1] },
    { text: 'bad', timestamp: [2.1, 2.3] },
    { text: 'words.', timestamp: [2.3, 2.8] },
  ],
};

// Long audio mock (30+ seconds for chunk merging tests)
export const MOCK_LONG_TRANSCRIPTION: MockTranscriptionResult = {
  text: 'The first damn word at the start. More content in the middle section. Another shit word near the end. Final fucking sentence at the very end.',
  chunks: [
    { text: 'The', timestamp: [0.0, 0.2] },
    { text: 'first', timestamp: [0.2, 0.5] },
    { text: 'damn', timestamp: [0.5, 0.9] },
    { text: 'word', timestamp: [0.9, 1.2] },
    { text: 'at', timestamp: [1.2, 1.4] },
    { text: 'the', timestamp: [1.4, 1.5] },
    { text: 'start.', timestamp: [1.5, 1.9] },
    // ... middle section (simulate 10-20 seconds)
    { text: 'More', timestamp: [10.0, 10.3] },
    { text: 'content', timestamp: [10.3, 10.7] },
    { text: 'in', timestamp: [10.7, 10.8] },
    { text: 'the', timestamp: [10.8, 11.0] },
    { text: 'middle', timestamp: [11.0, 11.4] },
    { text: 'section.', timestamp: [11.4, 11.9] },
    // ... near end (simulate 20-25 seconds)
    { text: 'Another', timestamp: [20.0, 20.4] },
    { text: 'shit', timestamp: [20.4, 20.8] },
    { text: 'word', timestamp: [20.8, 21.1] },
    { text: 'near', timestamp: [21.1, 21.3] },
    { text: 'the', timestamp: [21.3, 21.5] },
    { text: 'end.', timestamp: [21.5, 21.9] },
    // ... final section (25-30 seconds)
    { text: 'Final', timestamp: [28.0, 28.3] },
    { text: 'fucking', timestamp: [28.3, 28.8] },
    { text: 'sentence', timestamp: [28.8, 29.3] },
    { text: 'at', timestamp: [29.3, 29.5] },
    { text: 'the', timestamp: [29.5, 29.6] },
    { text: 'very', timestamp: [29.6, 29.9] },
    { text: 'end.', timestamp: [29.9, 30.3] },
  ],
};

// Video extraction mock (for video files)
export const MOCK_VIDEO_EXTRACTED_AUDIO = new Float32Array(48000); // 3 seconds at 16kHz

// Progress messages that match actual worker output
export const MOCK_PROGRESS_MESSAGES = [
  { progress: 0, status: 'Initializing...' },
  { progress: 20, status: 'Loading model...' },
  { progress: 50, status: 'Processing audio...' },
  { progress: 90, status: 'Finalizing transcription...' },
  { progress: 100, status: 'Transcription complete!' },
];
```

---

## 3. Mocking Web Workers in Playwright

### Strategy Overview

Playwright cannot directly mock Web Workers, but we can:

1. **Route interception**: Intercept worker file requests and inject mock code
2. **Page evaluation**: Replace Worker constructor with mock implementation
3. **Fixture-based approach**: Use Playwright fixtures for reusable mocks

### Method: Worker Constructor Mocking (Recommended)

This approach intercepts the Worker constructor and replaces it with a mock that simulates worker behavior.

```typescript
// tests/fixtures/workerMocks.ts

import { Page } from '@playwright/test';
import {
  MOCK_SHORT_TRANSCRIPTION,
  MOCK_CLEAN_TRANSCRIPTION,
  MOCK_PROGRESS_MESSAGES,
} from './mockTranscriptionData';

export interface WorkerMockOptions {
  transcriptionResult?: typeof MOCK_SHORT_TRANSCRIPTION;
  shouldFail?: boolean;
  errorMessage?: string;
  progressDelay?: number; // ms between progress updates
  simulateModelLoad?: boolean;
}

/**
 * Mock the Web Worker for transcription
 * This replaces the Worker constructor to simulate transcription without downloading models
 */
export async function mockTranscriptionWorker(page: Page, options: WorkerMockOptions = {}) {
  const {
    transcriptionResult = MOCK_SHORT_TRANSCRIPTION,
    shouldFail = false,
    errorMessage = 'Mock worker error',
    progressDelay = 100,
    simulateModelLoad = true,
  } = options;

  await page.addInitScript(
    ({ result, shouldFail, errorMessage, progressDelay, simulateModelLoad }) => {
      // Store original Worker
      const OriginalWorker = window.Worker;

      // Create mock Worker class
      class MockWorker extends EventTarget {
        private messageHandler: ((event: MessageEvent) => void) | null = null;
        private errorHandler: ((event: ErrorEvent) => void) | null = null;

        constructor(scriptURL: string | URL, options?: WorkerOptions) {
          super();
          console.log('[MockWorker] Created for:', scriptURL.toString());

          // Simulate worker initialization delay
          setTimeout(() => {
            console.log('[MockWorker] Initialized');
          }, 50);
        }

        postMessage(message: any, transfer?: Transferable[]): void {
          console.log('[MockWorker] Received message:', message);

          // Handle different message types
          if (message.type === 'extract') {
            this.handleExtract();
          } else if (message.type === 'transcribe') {
            this.handleTranscribe();
          } else if (message.type === 'remux') {
            this.handleRemux();
          }
        }

        private async handleExtract() {
          // Simulate audio extraction from video
          await this.sleep(progressDelay);
          this.sendMessage({
            debug: '[Worker] Extracting audio from video',
          });

          await this.sleep(progressDelay * 2);

          // Send extracted audio (mock Float32Array)
          const mockAudioBuffer = new Float32Array(48000).buffer;
          this.sendMessage({
            type: 'extracted',
            audioBuffer: mockAudioBuffer,
          });
        }

        private async handleTranscribe() {
          if (shouldFail) {
            this.sendMessage({
              error: errorMessage,
              debug: `[Worker] Error: ${errorMessage}`,
            });
            return;
          }

          // Send progress updates
          if (simulateModelLoad) {
            const progressSteps = [
              { progress: 0, status: 'Initializing...' },
              { progress: 20, status: 'Loading model...' },
              { progress: 50, status: 'Processing audio...' },
              { progress: 90, status: 'Finalizing transcription...' },
            ];

            for (const step of progressSteps) {
              await this.sleep(progressDelay);
              this.sendMessage(step);
            }
          }

          // Send final result
          await this.sleep(progressDelay);
          this.sendMessage({
            type: 'complete',
            result: result,
            progress: 100,
            status: 'Transcription complete!',
          });
        }

        private async handleRemux() {
          await this.sleep(progressDelay);
          this.sendMessage({ status: 'Loading FFmpeg...', progress: 0 });

          await this.sleep(progressDelay);
          this.sendMessage({ status: 'Processing video...', progress: 20 });

          await this.sleep(progressDelay);
          this.sendMessage({ status: 'Remuxing video with censored audio...', progress: 40 });

          await this.sleep(progressDelay);
          this.sendMessage({ status: 'Reading output...', progress: 80 });

          await this.sleep(progressDelay);
          this.sendMessage({ status: 'Complete!', progress: 100 });

          // Send mock video buffer
          const mockVideoBuffer = new ArrayBuffer(1024 * 100); // 100KB mock video
          this.sendMessage({ type: 'complete', videoBuffer: mockVideoBuffer });
        }

        private sendMessage(data: any) {
          if (this.messageHandler) {
            const event = new MessageEvent('message', { data });
            this.messageHandler(event);
          }
          // Also dispatch as event for addEventListener
          this.dispatchEvent(new MessageEvent('message', { data }));
        }

        private sleep(ms: number): Promise<void> {
          return new Promise(resolve => setTimeout(resolve, ms));
        }

        set onmessage(handler: ((event: MessageEvent) => void) | null) {
          this.messageHandler = handler;
        }

        get onmessage() {
          return this.messageHandler;
        }

        set onerror(handler: ((event: ErrorEvent) => void) | null) {
          this.errorHandler = handler;
        }

        get onerror() {
          return this.errorHandler;
        }

        terminate(): void {
          console.log('[MockWorker] Terminated');
        }
      }

      // Replace Worker constructor
      (window as any).Worker = MockWorker;
      console.log('[MockWorker] Worker constructor replaced');
    },
    {
      result: transcriptionResult,
      shouldFail,
      errorMessage,
      progressDelay,
      simulateModelLoad,
    }
  );
}

/**
 * Mock FFmpeg remux worker
 */
export async function mockRemuxWorker(page: Page) {
  // The mockTranscriptionWorker already handles remux messages
  // This is just an alias for clarity
  await mockTranscriptionWorker(page, {
    progressDelay: 100,
    simulateModelLoad: false,
  });
}
```

---

## 4. Custom Playwright Fixtures

Create reusable fixtures for common test scenarios:

```typescript
// tests/fixtures/bleepFixtures.ts

import { test as base, Page } from '@playwright/test';
import path from 'path';
import { mockTranscriptionWorker, WorkerMockOptions } from './workerMocks';
import {
  MOCK_SHORT_TRANSCRIPTION,
  MOCK_CLEAN_TRANSCRIPTION,
  MOCK_LONG_TRANSCRIPTION,
} from './mockTranscriptionData';

type BleepFixtures = {
  bleepPage: Page;
  mockedBleepPage: Page;
  uploadTestAudio: (page: Page, filename?: string) => Promise<void>;
  uploadTestVideo: (page: Page, filename?: string) => Promise<void>;
  startTranscription: (page: Page) => Promise<void>;
  waitForTranscription: (page: Page, timeout?: number) => Promise<string>;
};

export const test = base.extend<BleepFixtures>({
  // Navigate to bleep page
  bleepPage: async ({ page }, use) => {
    await page.goto('/bleep');
    await page.waitForLoadState('networkidle');
    await use(page);
  },

  // Navigate to bleep page with mocked workers
  mockedBleepPage: async ({ page }, use) => {
    await mockTranscriptionWorker(page, {
      transcriptionResult: MOCK_SHORT_TRANSCRIPTION,
      progressDelay: 50,
    });
    await page.goto('/bleep');
    await page.waitForLoadState('networkidle');
    await use(page);
  },

  // Helper to upload audio files
  uploadTestAudio: async ({}, use) => {
    const uploadFn = async (page: Page, filename: string = 'test.mp3') => {
      const fileInput = page.locator('input[type="file"]');
      const filePath = path.join(__dirname, '..', 'fixtures', 'files', filename);
      await fileInput.setInputFiles(filePath);
      await page.locator('text=/File loaded/').waitFor({ timeout: 5000 });
    };
    await use(uploadFn);
  },

  // Helper to upload video files
  uploadTestVideo: async ({}, use) => {
    const uploadFn = async (page: Page, filename: string = 'test.mp4') => {
      const fileInput = page.locator('input[type="file"]');
      const filePath = path.join(__dirname, '..', 'fixtures', 'files', filename);
      await fileInput.setInputFiles(filePath);
      await page.locator('text=/File loaded/').waitFor({ timeout: 5000 });
    };
    await use(uploadFn);
  },

  // Helper to start transcription
  startTranscription: async ({}, use) => {
    const startFn = async (page: Page) => {
      const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
      await transcribeBtn.click();
    };
    await use(startFn);
  },

  // Helper to wait for transcription completion
  waitForTranscription: async ({}, use) => {
    const waitFn = async (page: Page, timeout: number = 10000): Promise<string> => {
      await page.locator('text=/Transcription complete/').waitFor({ timeout });
      const transcriptText = await page.locator('p.text-gray-800').first().textContent();
      return transcriptText || '';
    };
    await use(waitFn);
  },
});

export { expect } from '@playwright/test';
```

---

## 5. Complete Test Examples

### Test 1: Audio Transcription with Mocks

```typescript
// tests/mocked/audio-transcription.spec.ts

import { test, expect } from '../fixtures/bleepFixtures';
import path from 'path';
import { mockTranscriptionWorker } from '../fixtures/workerMocks';
import {
  MOCK_SHORT_TRANSCRIPTION,
  MOCK_CLEAN_TRANSCRIPTION,
} from '../fixtures/mockTranscriptionData';

test.describe('Audio Transcription (Mocked)', () => {
  test('should transcribe audio file with profanity', async ({
    page,
    uploadTestAudio,
    startTranscription,
    waitForTranscription,
  }) => {
    // Setup mock
    await mockTranscriptionWorker(page, {
      transcriptionResult: MOCK_SHORT_TRANSCRIPTION,
      progressDelay: 50,
    });

    // Navigate and upload
    await page.goto('/bleep');
    await uploadTestAudio(page);

    // Start transcription
    await startTranscription(page);

    // Verify progress updates
    await expect(page.locator('text=/Loading model/')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=/Processing audio/')).toBeVisible({ timeout: 2000 });

    // Wait for completion
    const transcript = await waitForTranscription(page);

    // Verify transcript content
    expect(transcript).toContain('damn');
    expect(transcript).toContain('shit');
    expect(transcript.length).toBeGreaterThan(20);
  });

  test('should transcribe clean audio', async ({
    page,
    uploadTestAudio,
    startTranscription,
    waitForTranscription,
  }) => {
    await mockTranscriptionWorker(page, {
      transcriptionResult: MOCK_CLEAN_TRANSCRIPTION,
      progressDelay: 50,
    });

    await page.goto('/bleep');
    await uploadTestAudio(page);
    await startTranscription(page);

    const transcript = await waitForTranscription(page);

    expect(transcript).not.toContain('damn');
    expect(transcript).not.toContain('shit');
    expect(transcript).toContain('clean');
  });

  test('should show progress during transcription', async ({
    page,
    uploadTestAudio,
    startTranscription,
  }) => {
    await mockTranscriptionWorker(page, {
      transcriptionResult: MOCK_SHORT_TRANSCRIPTION,
      progressDelay: 200, // Slower for visibility
      simulateModelLoad: true,
    });

    await page.goto('/bleep');
    await uploadTestAudio(page);
    await startTranscription(page);

    // Check each progress stage
    await expect(page.locator('text=/Initializing/')).toBeVisible({ timeout: 1000 });
    await expect(page.locator('text=/Loading model/')).toBeVisible({ timeout: 1000 });
    await expect(page.locator('text=/Processing audio/')).toBeVisible({ timeout: 1000 });
    await expect(page.locator('text=/Finalizing/')).toBeVisible({ timeout: 1000 });
    await expect(page.locator('text=/Transcription complete/')).toBeVisible({ timeout: 1000 });
  });

  test('should handle transcription errors', async ({
    page,
    uploadTestAudio,
    startTranscription,
  }) => {
    await mockTranscriptionWorker(page, {
      shouldFail: true,
      errorMessage: 'Model loading failed',
    });

    await page.goto('/bleep');
    await uploadTestAudio(page);
    await startTranscription(page);

    // Should show error message
    await expect(page.locator('text=/Model loading failed/')).toBeVisible({ timeout: 2000 });
  });
});
```

### Test 2: Word Matching and Highlighting

```typescript
// tests/mocked/word-matching.spec.ts

import { test, expect } from '../fixtures/bleepFixtures';
import { mockTranscriptionWorker } from '../fixtures/workerMocks';
import { MOCK_SHORT_TRANSCRIPTION } from '../fixtures/mockTranscriptionData';

test.describe('Word Matching (Mocked)', () => {
  test.beforeEach(async ({ page }) => {
    await mockTranscriptionWorker(page, {
      transcriptionResult: MOCK_SHORT_TRANSCRIPTION,
      progressDelay: 50,
    });
  });

  test('should match exact words', async ({
    page,
    uploadTestAudio,
    startTranscription,
    waitForTranscription,
  }) => {
    await page.goto('/bleep');
    await uploadTestAudio(page);
    await startTranscription(page);
    await waitForTranscription(page);

    // Enter word to match
    const wordInput = page.locator('input[placeholder*="word"]').first();
    await wordInput.fill('damn');
    await wordInput.press('Enter');

    // Verify match highlighting
    await expect(page.locator('text=/1 word matched/')).toBeVisible();

    // Check that matched word is highlighted (look for specific styling or data attributes)
    const highlightedWord = page.locator('[data-matched="true"]').first();
    await expect(highlightedWord).toBeVisible();
  });

  test('should match multiple words', async ({
    page,
    uploadTestAudio,
    startTranscription,
    waitForTranscription,
  }) => {
    await page.goto('/bleep');
    await uploadTestAudio(page);
    await startTranscription(page);
    await waitForTranscription(page);

    // Match first word
    const wordInput = page.locator('input[placeholder*="word"]').first();
    await wordInput.fill('damn');
    await wordInput.press('Enter');

    // Match second word
    await wordInput.fill('shit');
    await wordInput.press('Enter');

    // Verify both matches
    await expect(page.locator('text=/2 words matched/')).toBeVisible();
  });

  test('should handle partial matching', async ({
    page,
    uploadTestAudio,
    startTranscription,
    waitForTranscription,
  }) => {
    await page.goto('/bleep');
    await uploadTestAudio(page);
    await startTranscription(page);
    await waitForTranscription(page);

    // Enable partial matching
    const partialCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /partial/i });
    await partialCheckbox.check();

    // Match partial word
    const wordInput = page.locator('input[placeholder*="word"]').first();
    await wordInput.fill('dam');
    await wordInput.press('Enter');

    // Should match "damn"
    await expect(page.locator('text=/1 word matched/')).toBeVisible();
  });

  test('should clear matches', async ({
    page,
    uploadTestAudio,
    startTranscription,
    waitForTranscription,
  }) => {
    await page.goto('/bleep');
    await uploadTestAudio(page);
    await startTranscription(page);
    await waitForTranscription(page);

    // Add match
    const wordInput = page.locator('input[placeholder*="word"]').first();
    await wordInput.fill('damn');
    await wordInput.press('Enter');
    await expect(page.locator('text=/1 word matched/')).toBeVisible();

    // Clear matches
    const clearBtn = page.locator('button').filter({ hasText: /clear/i });
    await clearBtn.click();

    // Verify matches cleared
    await expect(page.locator('text=/0 words matched/')).toBeVisible();
  });
});
```

### Test 3: Audio Bleeping

```typescript
// tests/mocked/audio-bleeping.spec.ts

import { test, expect } from '../fixtures/bleepFixtures';
import { mockTranscriptionWorker } from '../fixtures/workerMocks';
import { MOCK_SHORT_TRANSCRIPTION } from '../fixtures/mockTranscriptionData';

test.describe('Audio Bleeping (Mocked)', () => {
  test.beforeEach(async ({ page }) => {
    await mockTranscriptionWorker(page, {
      transcriptionResult: MOCK_SHORT_TRANSCRIPTION,
      progressDelay: 50,
    });
  });

  test('should apply bleeps to audio', async ({
    page,
    uploadTestAudio,
    startTranscription,
    waitForTranscription,
  }) => {
    await page.goto('/bleep');
    await uploadTestAudio(page);
    await startTranscription(page);
    await waitForTranscription(page);

    // Match words
    const wordInput = page.locator('input[placeholder*="word"]').first();
    await wordInput.fill('damn');
    await wordInput.press('Enter');

    // Apply bleeps
    const bleepBtn = page.locator('button').filter({ hasText: /bleep|censor/i });
    await bleepBtn.click();

    // Wait for processing
    await expect(page.locator('text=/Processing|Applying/i')).toBeVisible({ timeout: 2000 });

    // Verify censored audio available
    await expect(page.locator('text=/Download|Censored/i')).toBeVisible({ timeout: 5000 });
  });

  test('should allow bleep sound selection', async ({
    page,
    uploadTestAudio,
    startTranscription,
    waitForTranscription,
  }) => {
    await page.goto('/bleep');
    await uploadTestAudio(page);
    await startTranscription(page);
    await waitForTranscription(page);

    // Select bleep sound
    const bleepSelect = page.locator('select').filter({ hasText: /bleep|sound/i });
    await bleepSelect.selectOption('beep');

    // Match and bleep
    const wordInput = page.locator('input[placeholder*="word"]').first();
    await wordInput.fill('damn');
    await wordInput.press('Enter');

    const bleepBtn = page.locator('button').filter({ hasText: /bleep|censor/i });
    await bleepBtn.click();

    await expect(page.locator('text=/Download|Censored/i')).toBeVisible({ timeout: 5000 });
  });

  test('should adjust bleep volume', async ({
    page,
    uploadTestAudio,
    startTranscription,
    waitForTranscription,
  }) => {
    await page.goto('/bleep');
    await uploadTestAudio(page);
    await startTranscription(page);
    await waitForTranscription(page);

    // Adjust volume slider
    const volumeSlider = page.locator('input[type="range"]').first();
    await volumeSlider.fill('50'); // 50% volume

    // Match and bleep
    const wordInput = page.locator('input[placeholder*="word"]').first();
    await wordInput.fill('damn');
    await wordInput.press('Enter');

    const bleepBtn = page.locator('button').filter({ hasText: /bleep|censor/i });
    await bleepBtn.click();

    await expect(page.locator('text=/Download|Censored/i')).toBeVisible({ timeout: 5000 });
  });

  test('should preview bleep sound', async ({
    page,
    uploadTestAudio,
    startTranscription,
    waitForTranscription,
  }) => {
    await page.goto('/bleep');
    await uploadTestAudio(page);
    await startTranscription(page);
    await waitForTranscription(page);

    // Click preview button
    const previewBtn = page.locator('button').filter({ hasText: /preview|play/i });
    await previewBtn.click();

    // Verify audio plays (check for playing state or audio element)
    const audioElement = page.locator('audio').last();
    const isPlaying = await audioElement.evaluate((el: HTMLAudioElement) => !el.paused);
    expect(isPlaying).toBeTruthy();
  });
});
```

### Test 4: Video Processing

```typescript
// tests/mocked/video-processing.spec.ts

import { test, expect } from '../fixtures/bleepFixtures';
import { mockTranscriptionWorker } from '../fixtures/workerMocks';
import { MOCK_SHORT_TRANSCRIPTION } from '../fixtures/mockTranscriptionData';

test.describe('Video Processing (Mocked)', () => {
  test.beforeEach(async ({ page }) => {
    await mockTranscriptionWorker(page, {
      transcriptionResult: MOCK_SHORT_TRANSCRIPTION,
      progressDelay: 50,
    });
  });

  test('should extract and transcribe video audio', async ({
    page,
    uploadTestVideo,
    startTranscription,
  }) => {
    await page.goto('/bleep');
    await uploadTestVideo(page);

    // Start transcription (should trigger extraction first)
    await startTranscription(page);

    // Verify extraction phase
    await expect(page.locator('text=/Extracting audio/')).toBeVisible({ timeout: 2000 });

    // Verify transcription phase
    await expect(page.locator('text=/Processing audio/')).toBeVisible({ timeout: 2000 });

    // Wait for completion
    await expect(page.locator('text=/Transcription complete/')).toBeVisible({ timeout: 3000 });
  });

  test('should remux video with censored audio', async ({
    page,
    uploadTestVideo,
    startTranscription,
    waitForTranscription,
  }) => {
    await page.goto('/bleep');
    await uploadTestVideo(page);
    await startTranscription(page);
    await waitForTranscription(page);

    // Match and bleep
    const wordInput = page.locator('input[placeholder*="word"]').first();
    await wordInput.fill('damn');
    await wordInput.press('Enter');

    const bleepBtn = page.locator('button').filter({ hasText: /bleep|censor/i });
    await bleepBtn.click();

    // Verify remuxing progress
    await expect(page.locator('text=/Loading FFmpeg|Remuxing/i')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=/Download|Censored/i')).toBeVisible({ timeout: 10000 });
  });

  test('should display video preview', async ({ page, uploadTestVideo }) => {
    await page.goto('/bleep');
    await uploadTestVideo(page);

    // Check video player appears
    const videoPlayer = page.locator('video');
    await expect(videoPlayer).toBeVisible({ timeout: 3000 });

    // Verify video source is set
    const videoSrc = await videoPlayer.getAttribute('src');
    expect(videoSrc).toBeTruthy();
  });
});
```

### Test 5: Error Handling

```typescript
// tests/mocked/error-handling.spec.ts

import { test, expect } from '../fixtures/bleepFixtures';
import { mockTranscriptionWorker } from '../fixtures/workerMocks';

test.describe('Error Handling (Mocked)', () => {
  test('should handle worker initialization failure', async ({
    page,
    uploadTestAudio,
    startTranscription,
  }) => {
    await mockTranscriptionWorker(page, {
      shouldFail: true,
      errorMessage: 'Worker failed to initialize',
    });

    await page.goto('/bleep');
    await uploadTestAudio(page);
    await startTranscription(page);

    await expect(page.locator('text=/Worker failed to initialize/')).toBeVisible({ timeout: 2000 });
  });

  test('should handle model loading timeout', async ({
    page,
    uploadTestAudio,
    startTranscription,
  }) => {
    await mockTranscriptionWorker(page, {
      shouldFail: true,
      errorMessage: 'Model loading timed out',
    });

    await page.goto('/bleep');
    await uploadTestAudio(page);
    await startTranscription(page);

    await expect(page.locator('text=/timed out/i')).toBeVisible({ timeout: 2000 });
  });

  test('should handle invalid file upload', async ({ page }) => {
    await page.goto('/bleep');

    const fileInput = page.locator('input[type="file"]');
    const textFile = path.join(__dirname, '..', 'fixtures', 'files', 'sample.txt');
    await fileInput.setInputFiles(textFile);

    await expect(page.locator('text=/Please upload a valid audio or video file/')).toBeVisible({
      timeout: 2000,
    });
  });

  test('should handle empty word match', async ({
    page,
    uploadTestAudio,
    startTranscription,
    waitForTranscription,
  }) => {
    await mockTranscriptionWorker(page, {
      transcriptionResult: MOCK_SHORT_TRANSCRIPTION,
      progressDelay: 50,
    });

    await page.goto('/bleep');
    await uploadTestAudio(page);
    await startTranscription(page);
    await waitForTranscription(page);

    // Try to match non-existent word
    const wordInput = page.locator('input[placeholder*="word"]').first();
    await wordInput.fill('xyznonexistent');
    await wordInput.press('Enter');

    await expect(page.locator('text=/0 words matched/')).toBeVisible();
  });

  test('should recover from cancelled transcription', async ({
    page,
    uploadTestAudio,
    startTranscription,
  }) => {
    await mockTranscriptionWorker(page, {
      transcriptionResult: MOCK_SHORT_TRANSCRIPTION,
      progressDelay: 500, // Slow enough to cancel
    });

    await page.goto('/bleep');
    await uploadTestAudio(page);
    await startTranscription(page);

    // Wait for progress to start
    await expect(page.locator('text=/Loading model/')).toBeVisible({ timeout: 1000 });

    // Upload new file (should cancel current transcription)
    await uploadTestAudio(page, 'test_full.mp3');

    // Verify file replaced
    await expect(page.locator('text=/test_full.mp3/')).toBeVisible();
  });
});
```

---

## 6. Verifying Mocks Are Working

### Console Output Verification

```typescript
test('should log mock worker messages', async ({ page }) => {
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    consoleLogs.push(msg.text());
  });

  await mockTranscriptionWorker(page, {
    transcriptionResult: MOCK_SHORT_TRANSCRIPTION,
    progressDelay: 50,
  });

  await page.goto('/bleep');
  // ... perform actions

  // Verify mock messages
  expect(consoleLogs.some(log => log.includes('[MockWorker]'))).toBeTruthy();
  expect(consoleLogs.some(log => log.includes('Worker constructor replaced'))).toBeTruthy();
});
```

### Network Activity Check

```typescript
test('should not download models when mocked', async ({ page }) => {
  const modelRequests: string[] = [];

  page.on('request', request => {
    if (request.url().includes('huggingface') || request.url().includes('whisper')) {
      modelRequests.push(request.url());
    }
  });

  await mockTranscriptionWorker(page, {
    transcriptionResult: MOCK_SHORT_TRANSCRIPTION,
    progressDelay: 50,
  });

  await page.goto('/bleep');
  await uploadTestAudio(page);
  await startTranscription(page);
  await waitForTranscription(page);

  // Should not have any model download requests
  expect(modelRequests.length).toBe(0);
});
```

### Performance Check

```typescript
test('should complete transcription quickly with mocks', async ({
  page,
  uploadTestAudio,
  startTranscription,
  waitForTranscription,
}) => {
  await mockTranscriptionWorker(page, {
    transcriptionResult: MOCK_SHORT_TRANSCRIPTION,
    progressDelay: 50,
  });

  await page.goto('/bleep');
  await uploadTestAudio(page);

  const startTime = Date.now();
  await startTranscription(page);
  await waitForTranscription(page);
  const duration = Date.now() - startTime;

  // Should complete in under 2 seconds (vs 30-90s without mocks)
  expect(duration).toBeLessThan(2000);
});
```

---

## 7. Implementation Timeline

### Day 1-2: Setup and Mock Data (3-4 hours)

- [ ] Create `tests/fixtures/mockTranscriptionData.ts`
- [ ] Define all mock transcription results
- [ ] Create mock audio/video buffers
- [ ] Test mock data formats match actual worker output

### Day 2-3: Worker Mocking Implementation (3-4 hours)

- [ ] Create `tests/fixtures/workerMocks.ts`
- [ ] Implement `MockWorker` class
- [ ] Handle transcription, extraction, and remux messages
- [ ] Test mock worker with simple page evaluation

### Day 3-4: Fixtures and Test Helpers (2-3 hours)

- [ ] Create `tests/fixtures/bleepFixtures.ts`
- [ ] Implement reusable fixtures (bleepPage, mockedBleepPage)
- [ ] Add helper functions (uploadTestAudio, startTranscription, etc.)
- [ ] Test fixtures in isolation

### Day 4-5: Critical Path Tests (3-4 hours)

- [ ] Write audio transcription tests
- [ ] Write word matching tests
- [ ] Write audio bleeping tests
- [ ] Write video processing tests
- [ ] Write error handling tests

### Day 5: Verification and Documentation (1-2 hours)

- [ ] Add verification tests (console logs, network, performance)
- [ ] Run full test suite
- [ ] Document any issues or gotchas
- [ ] Update README with mocking instructions

**Total Estimated Time**: 12-17 hours

---

## 8. Troubleshooting Common Issues

### Issue 1: Mock Worker Not Being Used

**Symptoms**: Tests still download models, take 30+ seconds

**Solutions**:

- Verify `page.addInitScript()` is called **before** `page.goto()`
- Check console for "[MockWorker] Worker constructor replaced" message
- Ensure mock script doesn't have syntax errors

```typescript
// WRONG - addInitScript after goto
await page.goto('/bleep');
await mockTranscriptionWorker(page); // Too late!

// RIGHT - addInitScript before goto
await mockTranscriptionWorker(page);
await page.goto('/bleep');
```

### Issue 2: Mock Messages Not Received

**Symptoms**: Transcription never completes, page hangs

**Solutions**:

- Verify `MessageEvent` is dispatched correctly
- Check that both `onmessage` handler and event listener are supported
- Add console.log in mock to verify messages are sent

```typescript
// Ensure both handler types work
private sendMessage(data: any) {
  // Direct handler
  if (this.messageHandler) {
    this.messageHandler(new MessageEvent('message', { data }));
  }
  // Event listener
  this.dispatchEvent(new MessageEvent('message', { data }));
}
```

### Issue 3: ArrayBuffer/Typed Array Issues

**Symptoms**: TypeError: Cannot transfer non-transferable objects

**Solutions**:

- Create proper ArrayBuffer objects in mock
- Don't try to transfer mock objects (they're in same context)

```typescript
// Create proper ArrayBuffer
const mockAudioBuffer = new Float32Array(48000).buffer;
this.sendMessage({
  type: 'extracted',
  audioBuffer: mockAudioBuffer,
});
```

### Issue 4: Timing Issues

**Symptoms**: Tests fail intermittently, elements not found

**Solutions**:

- Increase progressDelay in tests
- Use proper waitFor() with generous timeouts
- Add explicit waits between steps

```typescript
// Add delays between progress steps
for (const step of progressSteps) {
  await this.sleep(progressDelay);
  this.sendMessage(step);
}
```

### Issue 5: Video Remuxing Not Working

**Symptoms**: Video bleeping hangs or fails

**Solutions**:

- Ensure mock handles both transcription AND remux messages
- Return proper video buffer format
- Verify remux progress messages match expected format

```typescript
// Handle remux messages in same mock worker
if (message.type === 'remux') {
  this.handleRemux();
}
```

### Issue 6: Mocks Not Cleaning Up

**Symptoms**: Mocks affect other tests, state pollution

**Solutions**:

- Use `test.beforeEach()` to set up fresh mocks
- Consider storing original Worker and restoring in cleanup
- Use test isolation (separate browser contexts)

```typescript
test.beforeEach(async ({ page }) => {
  // Fresh mock for each test
  await mockTranscriptionWorker(page);
});
```

---

## 9. Success Criteria

At the end of Week 3, you should have:

1. **Mock Data Files**: Complete mock transcription results for all scenarios
2. **Worker Mocking**: Functional mock worker that simulates all message types
3. **Reusable Fixtures**: Playwright fixtures for common test patterns
4. **20+ Tests**: Covering audio, video, matching, bleeping, errors
5. **Fast Execution**: All mocked tests complete in <2 seconds each
6. **Zero Network Calls**: No model downloads during mocked tests
7. **Verification Tests**: Prove mocks are working correctly
8. **Documentation**: Clear instructions for using mocks

---

## 10. Next Steps (Week 4+)

- Edge case testing (long files, multiple profanity, overlapping bleeps)
- Performance benchmarking (compare real vs mocked)
- Visual regression testing (screenshots of UI states)
- Accessibility testing (keyboard navigation, screen readers)
- Mobile-specific tests (touch interactions, responsive design)

---

## Appendix: Quick Reference

### File Structure

```
tests/
├── fixtures/
│   ├── mockTranscriptionData.ts    # Mock data definitions
│   ├── workerMocks.ts               # Worker mocking utilities
│   └── bleepFixtures.ts             # Playwright fixtures
├── mocked/
│   ├── audio-transcription.spec.ts
│   ├── word-matching.spec.ts
│   ├── audio-bleeping.spec.ts
│   ├── video-processing.spec.ts
│   └── error-handling.spec.ts
└── helpers/                         # From Week 1
```

### Running Tests

```bash
# Run all mocked tests
npm run test:e2e -- tests/mocked/

# Run specific test file
npm run test:e2e -- tests/mocked/audio-transcription.spec.ts

# Run with UI for debugging
npm run test:e2e:ui -- tests/mocked/

# Run in specific browser
npm run test:e2e -- --project=chromium tests/mocked/
```

### Debugging Mocks

```typescript
// Enable verbose console logging
page.on('console', msg => console.log('PAGE LOG:', msg.text()));

// Check network activity
page.on('request', req => console.log('REQ:', req.url()));

// Take screenshots at each step
await page.screenshot({ path: 'step-1.png' });
```
