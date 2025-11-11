# Week 3: Quick Start Guide

## TL;DR

Create mocking utilities and critical path tests for fast, reliable CI testing without model downloads.

**Time**: 8-12 hours  
**Output**: 20+ tests, all running in <2 seconds each

---

## Quick Setup (30 minutes)

### 1. Create Mock Data

```bash
# Create fixtures directory
mkdir -p tests/fixtures

# Copy mock data template from the full plan
# File: tests/fixtures/mockTranscriptionData.ts
```

### 2. Create Worker Mocks

```bash
# File: tests/fixtures/workerMocks.ts
# Implements MockWorker class that replaces window.Worker
```

### 3. Create Test Fixtures

```bash
# File: tests/fixtures/bleepFixtures.ts
# Reusable Playwright fixtures for common patterns
```

---

## Running Your First Mocked Test

```typescript
// tests/mocked/first-test.spec.ts
import { test, expect } from '../fixtures/bleepFixtures';
import { mockTranscriptionWorker } from '../fixtures/workerMocks';
import { MOCK_SHORT_TRANSCRIPTION } from '../fixtures/mockTranscriptionData';

test('should transcribe audio quickly', async ({ page }) => {
  // 1. Setup mock BEFORE navigating
  await mockTranscriptionWorker(page, {
    transcriptionResult: MOCK_SHORT_TRANSCRIPTION,
    progressDelay: 50,
  });

  // 2. Navigate to page
  await page.goto('/bleep');

  // 3. Upload test file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('tests/fixtures/files/test.mp3');
  await expect(page.locator('text=/File loaded/')).toBeVisible();

  // 4. Start transcription
  await page.locator('button:has-text("Start Transcription")').click();

  // 5. Verify completion (should be <2 seconds!)
  await expect(page.locator('text=/Transcription complete/')).toBeVisible({ timeout: 2000 });
});
```

Run it:

```bash
npm run test:e2e -- tests/mocked/first-test.spec.ts
```

---

## Key Concepts

### 1. Mock Worker Constructor

The mock replaces `window.Worker` in the browser context:

```typescript
await page.addInitScript(() => {
  class MockWorker {
    postMessage(msg) {
      // Simulate worker behavior
      if (msg.type === 'transcribe') {
        setTimeout(() => {
          this.onmessage({
            data: { type: 'complete', result: mockData },
          });
        }, 100);
      }
    }
  }
  window.Worker = MockWorker;
});
```

### 2. Call Order Matters

```typescript
// WRONG - mock too late
await page.goto('/bleep');
await mockTranscriptionWorker(page); // Already loaded real worker!

// RIGHT - mock first
await mockTranscriptionWorker(page);
await page.goto('/bleep'); // Uses mock worker
```

### 3. Mock Data Structure

Must match actual worker output exactly:

```typescript
{
  text: "Full transcript text",
  chunks: [
    { text: "word", timestamp: [0.5, 0.9] }
  ]
}
```

---

## Common Test Patterns

### Pattern 1: Audio Transcription

```typescript
await mockTranscriptionWorker(page);
await page.goto('/bleep');
await uploadAudio(page);
await clickTranscribe(page);
await verifyTranscript(page);
```

### Pattern 2: Word Matching

```typescript
await mockTranscriptionWorker(page);
await page.goto('/bleep');
await uploadAndTranscribe(page);
await enterWord(page, 'damn');
await verifyMatch(page, 1);
```

### Pattern 3: Error Handling

```typescript
await mockTranscriptionWorker(page, {
  shouldFail: true,
  errorMessage: 'Model failed',
});
await page.goto('/bleep');
await uploadAndTranscribe(page);
await verifyError(page, 'Model failed');
```

### Pattern 4: Video Processing

```typescript
await mockTranscriptionWorker(page);
await page.goto('/bleep');
await uploadVideo(page);
await clickTranscribe(page);
await verifyExtraction(page);
await verifyTranscription(page);
```

---

## Verification Checklist

After implementing, verify:

- [ ] Console shows "[MockWorker] Worker constructor replaced"
- [ ] No network requests to huggingface.co
- [ ] Tests complete in <2 seconds
- [ ] All progress messages appear
- [ ] Transcription result displays correctly
- [ ] Word matching works
- [ ] Error handling works

---

## Troubleshooting

### "Tests still take 30+ seconds"

- Check mock is called BEFORE page.goto()
- Look for "[MockWorker]" in console logs
- Verify no network requests in DevTools

### "Transcript never appears"

- Check mock data structure matches expected format
- Verify MessageEvent is dispatched correctly
- Add console.log in mock to trace messages

### "Tests fail intermittently"

- Increase progressDelay (50ms → 200ms)
- Use longer timeouts in waitFor()
- Check for race conditions

### "Mock doesn't handle video extraction"

- Ensure MockWorker handles 'extract' message type
- Return proper ArrayBuffer format
- Check extraction progress messages

---

## File Checklist

Create these files:

- [ ] `tests/fixtures/mockTranscriptionData.ts` - Mock data
- [ ] `tests/fixtures/workerMocks.ts` - Worker mocking utilities
- [ ] `tests/fixtures/bleepFixtures.ts` - Playwright fixtures
- [ ] `tests/mocked/audio-transcription.spec.ts` - Audio tests
- [ ] `tests/mocked/word-matching.spec.ts` - Matching tests
- [ ] `tests/mocked/audio-bleeping.spec.ts` - Bleeping tests
- [ ] `tests/mocked/video-processing.spec.ts` - Video tests
- [ ] `tests/mocked/error-handling.spec.ts` - Error tests

---

## Success Metrics

Week 3 is complete when:

1. All 5 test files created
2. 20+ tests passing
3. All tests complete in <2 seconds each
4. Zero model downloads during tests
5. CI tests run reliably
6. Coverage includes: audio, video, matching, bleeping, errors

---

## Next Steps

After Week 3:

- Week 4: Edge cases (long files, multiple profanity, overlapping bleeps)
- Week 5: Performance testing
- Week 6: Visual regression testing
- Week 7: Accessibility testing

---

## Getting Help

If stuck:

1. Check full plan: `plans/week-3-mocking-critical-path-tests.md`
2. Review troubleshooting section
3. Check console logs for mock messages
4. Use Playwright UI mode: `npm run test:e2e:ui`
5. Add screenshots at each step for debugging

---

## Example Test Run Output

```bash
$ npm run test:e2e -- tests/mocked/

Running 24 tests using 4 workers

✓ audio-transcription.spec.ts:5 should transcribe audio file (352ms)
✓ audio-transcription.spec.ts:25 should transcribe clean audio (298ms)
✓ audio-transcription.spec.ts:40 should show progress (521ms)
✓ audio-transcription.spec.ts:58 should handle errors (187ms)
✓ word-matching.spec.ts:8 should match exact words (412ms)
✓ word-matching.spec.ts:22 should match multiple words (498ms)
✓ word-matching.spec.ts:38 should handle partial matching (456ms)
✓ word-matching.spec.ts:54 should clear matches (389ms)
...

24 passed (8.2s)
```

Compare to without mocks: 20+ minutes for same tests!

---

## Key Takeaways

1. **Mocking saves time**: 30-90s → <2s per test
2. **Mock BEFORE goto**: Critical for proper setup
3. **Match real data**: Mock structure must match actual worker
4. **Fixtures are reusable**: Write once, use everywhere
5. **Verify mocks work**: Check console, network, timing

Good luck with Week 3!
