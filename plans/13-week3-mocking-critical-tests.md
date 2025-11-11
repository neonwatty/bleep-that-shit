# Week 3 Implementation Plan: Mocking Utilities and Critical Path Tests

## Overview

**Goal**: Test full workflows with mocked Web Workers to avoid 30-90 second model downloads and enable fast, reliable critical path testing.

**Building on:** Weeks 1-2 (helpers, smoke tests)

**Key Innovation**: Mock the Web Workers that handle transcription to return instant results while testing the full UI workflow.

---

## 1. Understanding the Worker Architecture

### Current Worker Implementation

The app uses 3 Web Workers:

1. **transcriptionWorker.ts** - Whisper ONNX transcription
2. **remuxWorker.ts** - FFmpeg video remuxing
3. **transcriptionSamplerWorker.ts** - Model comparison

### Worker Communication Pattern

```typescript
// Main thread sends:
{ type: 'transcribe', audioData: Float32Array, model: string, language: string }

// Worker responds with progress:
{ progress: 20, status: 'Loading model...' }
{ progress: 50, status: 'Processing audio...' }
{ progress: 100, status: 'Complete!', result: { text: string, chunks: [...] } }
```

### The Challenge

Real workers:

- Download 39-242 MB models (30-90 seconds)
- Process audio (2-10x realtime)
- Total time: 30-120 seconds per test

Mocked workers:

- Return instant results (<1 second)
- Test UI logic without heavy processing
- Total time: 2-5 seconds per test

---

## 2. Mock Data Structures

### File: `tests/mocks/transcriptionResults.ts`

```typescript
export interface TranscriptionResult {
  text: string;
  chunks: Array<{
    text: string;
    timestamp: [number, number];
  }>;
}

export const MOCK_SHORT_TRANSCRIPTION: TranscriptionResult = {
  text: 'Hello world. This is a damn test.',
  chunks: [
    { text: 'Hello', timestamp: [0.0, 0.5] },
    { text: 'world', timestamp: [0.5, 1.0] },
    { text: 'This', timestamp: [1.2, 1.5] },
    { text: 'is', timestamp: [1.5, 1.7] },
    { text: 'a', timestamp: [1.7, 1.8] },
    { text: 'damn', timestamp: [1.8, 2.1] },
    { text: 'test', timestamp: [2.1, 2.5] },
  ],
};

export const MOCK_CLEAN_TRANSCRIPTION: TranscriptionResult = {
  text: 'This is a clean test without profanity.',
  chunks: [
    { text: 'This', timestamp: [0.0, 0.3] },
    { text: 'is', timestamp: [0.3, 0.5] },
    { text: 'a', timestamp: [0.5, 0.6] },
    { text: 'clean', timestamp: [0.6, 1.0] },
    { text: 'test', timestamp: [1.0, 1.3] },
    { text: 'without', timestamp: [1.5, 1.9] },
    { text: 'profanity', timestamp: [1.9, 2.5] },
  ],
};

export const MOCK_LONG_TRANSCRIPTION: TranscriptionResult = {
  text: 'This is a longer transcript with multiple sentences and several profane words scattered throughout.',
  chunks: [
    // ... 30+ chunks with various profane words
  ],
};

export const MOCK_TRANSCRIPTION_ERROR = {
  error: 'Failed to load model: Network timeout',
};
```

---

## 3. Worker Mocking Implementation

### File: `tests/helpers/mockWorkers.ts`

```typescript
import { Page } from '@playwright/test';
import { TranscriptionResult } from '../mocks/transcriptionResults';

/**
 * Mock the Web Worker constructor to intercept worker creation
 */
export async function mockTranscriptionWorker(
  page: Page,
  mockResult: TranscriptionResult | { error: string }
) {
  await page.addInitScript(result => {
    // Store original Worker constructor
    const OriginalWorker = window.Worker;

    // Replace Worker constructor
    window.Worker = class extends OriginalWorker {
      constructor(scriptURL: string | URL, options?: WorkerOptions) {
        super(scriptURL, options);

        // Only mock transcription workers
        const urlString = scriptURL.toString();
        if (!urlString.includes('transcription')) {
          return;
        }

        // Intercept postMessage
        const originalPostMessage = this.postMessage.bind(this);

        this.postMessage = function (message: any) {
          console.log('[MOCK WORKER] Received message:', message.type);

          if (message.type === 'transcribe' || message.type === 'extract') {
            // Simulate progress updates
            setTimeout(() => {
              this.dispatchEvent(
                new MessageEvent('message', {
                  data: { progress: 20, status: 'Loading model...' },
                })
              );
            }, 100);

            setTimeout(() => {
              this.dispatchEvent(
                new MessageEvent('message', {
                  data: { progress: 50, status: 'Processing audio...' },
                })
              );
            }, 200);

            setTimeout(() => {
              this.dispatchEvent(
                new MessageEvent('message', {
                  data: { progress: 90, status: 'Finalizing...' },
                })
              );
            }, 300);

            // Return final result
            setTimeout(() => {
              if ('error' in result) {
                this.dispatchEvent(
                  new MessageEvent('message', {
                    data: { error: result.error },
                  })
                );
              } else {
                this.dispatchEvent(
                  new MessageEvent('message', {
                    data: {
                      type: 'complete',
                      progress: 100,
                      status: 'Transcription complete!',
                      result: result,
                    },
                  })
                );
              }
            }, 500);

            return; // Don't call original postMessage
          }

          // For non-transcription messages, use original
          originalPostMessage(message);
        };
      }
    } as any;

    console.log('[MOCK] Transcription worker mocked successfully');
  }, mockResult);
}

/**
 * Mock FFmpeg remux worker
 */
export async function mockRemuxWorker(page: Page) {
  await page.addInitScript(() => {
    const OriginalWorker = window.Worker;

    window.Worker = class extends OriginalWorker {
      constructor(scriptURL: string | URL, options?: WorkerOptions) {
        super(scriptURL, options);

        const urlString = scriptURL.toString();
        if (!urlString.includes('remux')) {
          return;
        }

        const originalPostMessage = this.postMessage.bind(this);

        this.postMessage = function (message: any) {
          if (message.type === 'remux') {
            // Simulate video remuxing
            setTimeout(() => {
              this.dispatchEvent(
                new MessageEvent('message', {
                  data: { status: 'Processing video...', progress: 20 },
                })
              );
            }, 100);

            setTimeout(() => {
              this.dispatchEvent(
                new MessageEvent('message', {
                  data: { status: 'Remuxing...', progress: 60 },
                })
              );
            }, 200);

            setTimeout(() => {
              // Return mock video blob
              const mockVideoBlob = new Blob(['mock video data'], { type: 'video/mp4' });
              this.dispatchEvent(
                new MessageEvent('message', {
                  data: {
                    type: 'complete',
                    progress: 100,
                    videoBuffer: mockVideoBlob,
                  },
                })
              );
            }, 500);

            return;
          }

          originalPostMessage(message);
        };
      }
    } as any;
  });
}

/**
 * Check if workers are mocked
 */
export async function verifyWorkersMocked(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return window.Worker !== undefined && window.Worker.name.includes('Worker'); // Should be wrapped
  });
}
```

---

## 4. Custom Playwright Fixtures

### File: `tests/fixtures/mockFixtures.ts`

```typescript
import { test as base } from '@playwright/test';
import { BleepPage } from '../helpers/pages/BleepPage';
import { mockTranscriptionWorker } from '../helpers/mockWorkers';
import { MOCK_SHORT_TRANSCRIPTION } from '../mocks/transcriptionResults';

type MockedFixtures = {
  bleepPage: BleepPage;
  mockedBleepPage: BleepPage;
};

export const test = base.extend<MockedFixtures>({
  bleepPage: async ({ page }, use) => {
    const bleepPage = new BleepPage(page);
    await bleepPage.goto();
    await use(bleepPage);
  },

  mockedBleepPage: async ({ page }, use) => {
    // Mock workers before navigation
    await mockTranscriptionWorker(page, MOCK_SHORT_TRANSCRIPTION);

    const bleepPage = new BleepPage(page);
    await bleepPage.goto();

    await use(bleepPage);
  },
});

export { expect } from '@playwright/test';
```

---

## 5. Complete Test Examples

### File: `tests/critical/audio-transcription.spec.ts`

```typescript
import { test, expect } from '../fixtures/mockFixtures';
import { MOCK_SHORT_TRANSCRIPTION } from '../mocks/transcriptionResults';

test.describe('Audio Transcription Workflow (Mocked)', () => {
  test('should complete transcription with mocked worker', async ({ mockedBleepPage }) => {
    test.setTimeout(30000); // Should be fast with mocks

    // Upload a test file
    await mockedBleepPage.uploadAudio();

    // Start transcription (mocked)
    await mockedBleepPage.startTranscription();

    // Should complete quickly with mock
    await mockedBleepPage.waitForTranscriptionComplete();

    // Verify transcript appears
    const transcript = await mockedBleepPage.getTranscriptText();
    expect(transcript).toContain(MOCK_SHORT_TRANSCRIPTION.text);
  });

  test('should display progress during transcription', async ({ mockedBleepPage }) => {
    await mockedBleepPage.uploadAudio();
    await mockedBleepPage.startTranscription();

    // Should show progress indicator
    await expect(mockedBleepPage.progressBar).toBeVisible();
    await expect(mockedBleepPage.progressText).toContainText(/loading model|processing|complete/i);
  });

  test('should enable word matching after transcription', async ({ mockedBleepPage }) => {
    await mockedBleepPage.uploadAudio();
    await mockedBleepPage.startTranscription();
    await mockedBleepPage.waitForTranscriptionComplete();

    // Word matching section should be enabled
    await expect(mockedBleepPage.wordsToMatchInput).toBeEnabled();
    await expect(mockedBleepPage.runMatchingButton).toBeEnabled();
  });
});
```

### File: `tests/critical/word-matching.spec.ts`

```typescript
import { test, expect } from '../fixtures/mockFixtures';

test.describe('Word Matching (Mocked)', () => {
  test.beforeEach(async ({ mockedBleepPage }) => {
    // Setup: upload and transcribe
    await mockedBleepPage.uploadAudio();
    await mockedBleepPage.startTranscription();
    await mockedBleepPage.waitForTranscriptionComplete();
  });

  test('should match profane words in transcript', async ({ mockedBleepPage }) => {
    // Mock transcript contains "damn"
    await mockedBleepPage.enterWordsToMatch('damn');
    await mockedBleepPage.runMatching();

    // Should show matched words
    const matchCount = await mockedBleepPage.getMatchedWordCount();
    expect(matchCount).toBeGreaterThan(0);
  });

  test('should support multiple word matching', async ({ mockedBleepPage }) => {
    await mockedBleepPage.enterWordsToMatch('damn, test');
    await mockedBleepPage.runMatching();

    const matchCount = await mockedBleepPage.getMatchedWordCount();
    expect(matchCount).toBeGreaterThanOrEqual(2); // At least 2 matches
  });

  test('should show no matches for clean words', async ({ mockedBleepPage }) => {
    await mockedBleepPage.enterWordsToMatch('xyz123');
    await mockedBleepPage.runMatching();

    // Should show 0 matches (or display a "no matches" message)
    const matchCount = await mockedBleepPage.getMatchedWordCount();
    expect(matchCount).toBe(0);
  });
});
```

---

## 6. Verification Tests

### File: `tests/critical/mock-verification.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { mockTranscriptionWorker, verifyWorkersMocked } from '../helpers/mockWorkers';
import { MOCK_SHORT_TRANSCRIPTION } from '../mocks/transcriptionResults';

test.describe('Worker Mock Verification', () => {
  test('should confirm workers are mocked', async ({ page }) => {
    await mockTranscriptionWorker(page, MOCK_SHORT_TRANSCRIPTION);
    await page.goto('/bleep');

    const isMocked = await verifyWorkersMocked(page);
    expect(isMocked).toBe(true);
  });

  test('should not make network requests to HuggingFace', async ({ page }) => {
    const networkRequests: string[] = [];

    page.on('request', request => {
      if (request.url().includes('huggingface.co')) {
        networkRequests.push(request.url());
      }
    });

    await mockTranscriptionWorker(page, MOCK_SHORT_TRANSCRIPTION);
    await page.goto('/bleep');

    // Upload and transcribe
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('test audio data'),
    });

    const transcribeBtn = page.locator('button').filter({ hasText: /Start Transcription/i });
    await transcribeBtn.click();

    // Wait a bit
    await page.waitForTimeout(2000);

    // Should have made NO requests to HuggingFace
    expect(networkRequests.length).toBe(0);
  });

  test('should complete transcription in under 2 seconds', async ({ page }) => {
    await mockTranscriptionWorker(page, MOCK_SHORT_TRANSCRIPTION);
    await page.goto('/bleep');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('test'),
    });

    const startTime = Date.now();

    const transcribeBtn = page.locator('button').filter({ hasText: /Start Transcription/i });
    await transcribeBtn.click();

    await page.locator('text=/Transcription complete/i').waitFor({ timeout: 5000 });

    const duration = Date.now() - startTime;
    console.log(`Mocked transcription took ${duration}ms`);

    expect(duration).toBeLessThan(2000); // Should be under 2 seconds
  });
});
```

---

## 7. Troubleshooting Common Issues

### Issue: Mock not applying

**Solution**: Ensure `addInitScript` is called BEFORE `page.goto()`

```typescript
// ✅ CORRECT ORDER
await mockTranscriptionWorker(page, mockData);
await page.goto('/bleep');

// ❌ WRONG ORDER
await page.goto('/bleep');
await mockTranscriptionWorker(page, mockData); // Too late!
```

### Issue: Real worker still running

**Check**: Verify mock is intercepting worker creation

```typescript
page.on('console', msg => {
  console.log(msg.text());
});

// Should see: "[MOCK] Transcription worker mocked successfully"
```

### Issue: Unexpected errors in mocked tests

**Debug**: Add extensive logging

```typescript
page.on('pageerror', error => {
  console.error('[PAGE ERROR]', error);
});

page.on('console', msg => {
  if (msg.type() === 'error') {
    console.error('[CONSOLE ERROR]', msg.text());
  }
});
```

---

## 8. Acceptance Criteria

- ✅ All critical tests run without model downloads
- ✅ Tests complete in <2 seconds each with mocks
- ✅ No network requests to HuggingFace during mocked tests
- ✅ All test fixtures working correctly
- ✅ 20+ critical path tests passing
- ✅ Mock verification tests passing
- ✅ Documentation complete

---

## Summary

Week 3 transforms slow integration tests into fast critical path tests by:

1. **Mocking Web Workers** - Return instant results
2. **Custom fixtures** - Reusable test setup
3. **Complete coverage** - All critical workflows tested
4. **Fast execution** - <2 seconds per test vs 30-120 seconds
5. **CI-friendly** - No model downloads needed

**Result**: 30-90 second tests → 2 second tests (15-45x faster!)
