# Week 3: Minimal Working Example

This is a complete, copy-paste ready example to get you started immediately.

## Step 1: Create Mock Data (5 minutes)

Create file: `tests/fixtures/mockTranscriptionData.ts`

```typescript
export interface MockTranscriptionChunk {
  text: string;
  timestamp: [number, number];
}

export interface MockTranscriptionResult {
  text: string;
  chunks: MockTranscriptionChunk[];
}

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
```

## Step 2: Create Worker Mock (10 minutes)

Create file: `tests/fixtures/workerMocks.ts`

```typescript
import { Page } from '@playwright/test';
import { MOCK_SHORT_TRANSCRIPTION } from './mockTranscriptionData';

export interface WorkerMockOptions {
  transcriptionResult?: typeof MOCK_SHORT_TRANSCRIPTION;
  shouldFail?: boolean;
  errorMessage?: string;
  progressDelay?: number;
}

export async function mockTranscriptionWorker(page: Page, options: WorkerMockOptions = {}) {
  const {
    transcriptionResult = MOCK_SHORT_TRANSCRIPTION,
    shouldFail = false,
    errorMessage = 'Mock worker error',
    progressDelay = 100,
  } = options;

  await page.addInitScript(
    ({ result, shouldFail, errorMessage, progressDelay }) => {
      class MockWorker extends EventTarget {
        private messageHandler: ((event: MessageEvent) => void) | null = null;
        private errorHandler: ((event: ErrorEvent) => void) | null = null;

        constructor(scriptURL: string | URL, options?: WorkerOptions) {
          super();
          console.log('[MockWorker] Created for:', scriptURL.toString());
        }

        postMessage(message: any, transfer?: Transferable[]): void {
          console.log('[MockWorker] Received message:', message);

          if (message.type === 'transcribe') {
            this.handleTranscribe();
          } else if (message.type === 'extract') {
            this.handleExtract();
          } else if (message.type === 'remux') {
            this.handleRemux();
          }
        }

        private async handleTranscribe() {
          if (shouldFail) {
            this.sendMessage({ error: errorMessage });
            return;
          }

          // Send progress updates
          await this.sleep(progressDelay);
          this.sendMessage({ progress: 20, status: 'Loading model...' });

          await this.sleep(progressDelay);
          this.sendMessage({ progress: 50, status: 'Processing audio...' });

          await this.sleep(progressDelay);
          this.sendMessage({ progress: 90, status: 'Finalizing transcription...' });

          // Send result
          await this.sleep(progressDelay);
          this.sendMessage({
            type: 'complete',
            result: result,
            progress: 100,
            status: 'Transcription complete!',
          });
        }

        private async handleExtract() {
          await this.sleep(progressDelay);
          this.sendMessage({ debug: '[Worker] Extracting audio from video' });

          await this.sleep(progressDelay * 2);
          const mockAudioBuffer = new Float32Array(48000).buffer;
          this.sendMessage({ type: 'extracted', audioBuffer: mockAudioBuffer });
        }

        private async handleRemux() {
          await this.sleep(progressDelay);
          this.sendMessage({ status: 'Loading FFmpeg...', progress: 0 });

          await this.sleep(progressDelay);
          this.sendMessage({ status: 'Remuxing video...', progress: 50 });

          await this.sleep(progressDelay);
          const mockVideoBuffer = new ArrayBuffer(1024 * 100);
          this.sendMessage({ type: 'complete', videoBuffer: mockVideoBuffer, progress: 100 });
        }

        private sendMessage(data: any) {
          if (this.messageHandler) {
            const event = new MessageEvent('message', { data });
            this.messageHandler(event);
          }
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

      (window as any).Worker = MockWorker;
      console.log('[MockWorker] Worker constructor replaced');
    },
    { result: transcriptionResult, shouldFail, errorMessage, progressDelay }
  );
}
```

## Step 3: Create Your First Test (5 minutes)

Create file: `tests/mocked/minimal-example.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import path from 'path';
import { mockTranscriptionWorker } from '../fixtures/workerMocks';
import { MOCK_SHORT_TRANSCRIPTION } from '../fixtures/mockTranscriptionData';

test.describe('Minimal Mocked Test Example', () => {
  test('should transcribe audio file with mock worker', async ({ page }) => {
    // IMPORTANT: Mock BEFORE navigating
    await mockTranscriptionWorker(page, {
      transcriptionResult: MOCK_SHORT_TRANSCRIPTION,
      progressDelay: 50,
    });

    // Navigate to bleep page
    await page.goto('/bleep');

    // Upload test file
    const fileInput = page.locator('input[type="file"]');
    const testFile = path.join(__dirname, '..', 'fixtures', 'files', 'test.mp3');
    await fileInput.setInputFiles(testFile);

    // Wait for file to load
    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });

    // Start transcription
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await transcribeBtn.click();

    // Verify progress
    await expect(page.locator('text=/Loading model/')).toBeVisible({ timeout: 2000 });

    // Wait for completion (should be fast!)
    await expect(page.locator('text=/Transcription complete/')).toBeVisible({ timeout: 2000 });

    // Verify transcript content
    const transcript = await page.locator('p.text-gray-800').first().textContent();
    expect(transcript).toContain('damn');
    expect(transcript).toContain('shit');
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Mock with error
    await mockTranscriptionWorker(page, {
      shouldFail: true,
      errorMessage: 'Model loading failed',
    });

    await page.goto('/bleep');

    const fileInput = page.locator('input[type="file"]');
    const testFile = path.join(__dirname, '..', 'fixtures', 'files', 'test.mp3');
    await fileInput.setInputFiles(testFile);
    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });

    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await transcribeBtn.click();

    // Should show error
    await expect(page.locator('text=/Model loading failed/')).toBeVisible({ timeout: 2000 });
  });

  test('should match and highlight profanity', async ({ page }) => {
    await mockTranscriptionWorker(page, {
      transcriptionResult: MOCK_SHORT_TRANSCRIPTION,
      progressDelay: 50,
    });

    await page.goto('/bleep');

    // Upload and transcribe
    const fileInput = page.locator('input[type="file"]');
    const testFile = path.join(__dirname, '..', 'fixtures', 'files', 'test.mp3');
    await fileInput.setInputFiles(testFile);
    await expect(page.locator('text=/File loaded/')).toBeVisible({ timeout: 5000 });

    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await transcribeBtn.click();
    await expect(page.locator('text=/Transcription complete/')).toBeVisible({ timeout: 2000 });

    // Enter word to match
    const wordInput = page.locator('input[placeholder*="word"]').first();
    await wordInput.fill('damn');
    await wordInput.press('Enter');

    // Verify match
    await expect(
      page
        .locator('text=/1 word matched/')
        .or(page.locator('text=/word/)').and(page.locator('text=/1/')))
    ).toBeVisible({ timeout: 2000 });
  });
});
```

## Step 4: Run the Tests (1 minute)

```bash
# Run your test
npm run test:e2e -- tests/mocked/minimal-example.spec.ts

# Or with UI for debugging
npm run test:e2e:ui -- tests/mocked/minimal-example.spec.ts
```

## Expected Output

```
Running 3 tests using 1 worker

✓ should transcribe audio file with mock worker (421ms)
✓ should handle errors gracefully (189ms)
✓ should match and highlight profanity (512ms)

3 passed (1.2s)
```

## Verification

Check these to confirm mocking is working:

1. **Console logs**: Look for `[MockWorker] Worker constructor replaced`
2. **Network tab**: No requests to huggingface.co
3. **Speed**: Tests complete in <2 seconds each
4. **Success**: All tests pass

## Common Issues

### Issue: Tests still download models

**Solution**: Ensure `mockTranscriptionWorker()` is called BEFORE `page.goto()`

### Issue: Transcript never appears

**Solution**: Check that mock data structure matches the expected format. Log the mock messages in the browser console.

### Issue: Tests timeout

**Solution**: Increase `progressDelay` or test timeouts. Check that MessageEvent is being dispatched.

## Next Steps

Once this works:

1. Add more test scenarios (word matching, bleeping, video)
2. Create reusable fixtures (see `week-3-mocking-critical-path-tests.md`)
3. Add edge case tests
4. Integrate into CI pipeline

## Full Documentation

For complete implementation details, see:

- `plans/week-3-mocking-critical-path-tests.md` - Full implementation plan
- `plans/week-3-quick-start.md` - Quick start guide

---

**Total time to get first test running: ~20 minutes**

**Total time for Week 3 complete: 8-12 hours**
