# Week 4 Implementation Plan: Integration Tests with Model Caching

## Overview

**Goal**: Add real end-to-end integration tests that use actual Whisper models with pre-cached model downloads to avoid CI timeouts.

**Challenge**: Whisper models range from 39 MB (tiny) to 242 MB (base), taking 30-90 seconds to download on first run.

**Solution**: Use Playwright's setup projects to pre-download and cache models before running integration tests.

**Building on:** Weeks 1-3 (helpers, smoke tests, mocked critical tests)

---

## 1. Model Caching Strategy

### Playwright Setup Projects

Playwright supports "setup projects" that run before other tests:

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        storageState: 'playwright/.auth/cache.json',
      },
    },
    {
      name: 'chromium-integration',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/cache.json', // Reuse cached models
      },
      dependencies: ['setup'], // Run setup first
      testMatch: /integration\/.*\.spec\.ts/,
    },
  ],
});
```

---

## 2. Pre-Download Models Setup

### File: `tests/setup/cache-models.setup.ts`

```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Model Caching Setup', () => {
  test.setTimeout(180000); // 3 minutes for initial download

  test('pre-cache whisper-tiny.en model', async ({ page }) => {
    console.log('[SETUP] Starting model cache setup...');

    await page.goto('/bleep');
    await expect(page.locator('h1').filter({ hasText: /Bleep Your Sh/i })).toBeVisible();

    // Upload a small test file
    const testFile = path.join(__dirname, '../fixtures/files/test.mp3');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFile);
    await expect(page.locator('text=/File loaded/i')).toBeVisible({ timeout: 10000 });

    // Select Whisper Tiny model
    const modelSelect = page.locator('select').first();
    await modelSelect.selectOption('Xenova/whisper-tiny.en');

    console.log('[SETUP] Starting transcription to trigger model download...');

    // Start transcription (this will download the model)
    const transcribeBtn = page.locator('button').filter({ hasText: /Start Transcription/i });
    await transcribeBtn.click();

    // Wait for transcription to complete
    await expect(page.locator('text=/Transcription complete/i')).toBeVisible({
      timeout: 120000, // 2 minutes for first-time download + transcription
    });

    console.log('[SETUP] Model is now cached.');
  });

  test('verify cached model loads quickly', async ({ page }) => {
    await page.goto('/bleep');

    const testFile = path.join(__dirname, '../fixtures/files/test.mp3');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFile);
    await expect(page.locator('text=/File loaded/i')).toBeVisible({ timeout: 10000 });

    const modelSelect = page.locator('select').first();
    await modelSelect.selectOption('Xenova/whisper-tiny.en');

    const startTime = Date.now();
    const transcribeBtn = page.locator('button').filter({ hasText: /Start Transcription/i });
    await transcribeBtn.click();

    await expect(page.locator('text=/Transcription complete/i')).toBeVisible({
      timeout: 30000, // Should be under 30s with cached model
    });

    const duration = Date.now() - startTime;
    console.log(`[SETUP] Cached transcription took ${duration}ms`);

    expect(duration).toBeLessThan(20000); // Should be fast
    console.log('[SETUP] Cached model verification complete! ✓');
  });
});
```

---

## 3. Storage State Configuration

Create directory structure:

```bash
mkdir -p playwright/.auth
```

Add to `.gitignore`:

```bash
# Playwright cache
playwright/.auth/
```

The `storageState` file will be auto-generated and contains:

- Cookies
- LocalStorage data
- IndexedDB references
- Cache Storage references

---

## 4. Integration Test Structure

```
tests/
├── setup/
│   └── cache-models.setup.ts          # Pre-cache models
├── integration/
│   ├── transcription-basic.spec.ts    # Basic transcription tests
│   ├── transcription-accuracy.spec.ts # Timestamp accuracy tests
│   ├── transcription-bleeping.spec.ts # Full bleep workflow
│   ├── video-extraction.spec.ts       # Video audio extraction
│   └── cache-verification.spec.ts     # Verify caching works
├── fixtures/
│   ├── files/
│   │   ├── test.mp3                   # 2.5s, 52KB
│   │   ├── timestamp-test.mp3         # 2.0s, 16KB
│   │   ├── profanity-test.mp3         # 5s, 40KB (NEW)
│   │   └── short-video.mp4            # 3s, 100KB (NEW)
│   └── expected/
│       └── transcripts.json           # Expected results
```

---

## 5. Test Helper Functions

### File: `tests/helpers/transcription.ts`

```typescript
import { Page, expect } from '@playwright/test';
import path from 'path';

export interface TranscriptionResult {
  text: string;
  duration: number;
  wordCount: number;
}

export async function uploadAndTranscribe(
  page: Page,
  filename: string,
  modelName: string = 'Xenova/whisper-tiny.en'
): Promise<TranscriptionResult> {
  await page.goto('/bleep');
  await expect(page.locator('h1').filter({ hasText: /Bleep Your Sh/i })).toBeVisible();

  // Upload file
  const testFile = path.join(__dirname, '../fixtures/files', filename);
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(testFile);
  await expect(page.locator('text=/File loaded/i')).toBeVisible({ timeout: 10000 });

  // Select model
  const modelSelect = page.locator('select').first();
  await modelSelect.selectOption(modelName);

  // Start transcription
  const startTime = Date.now();
  const transcribeBtn = page.locator('button').filter({ hasText: /Start Transcription/i });
  await transcribeBtn.click();

  // Wait for completion
  await expect(page.locator('text=/Transcription complete/i')).toBeVisible({
    timeout: 30000, // Cached models should complete quickly
  });

  const duration = Date.now() - startTime;

  // Extract transcript text
  const transcriptText = await page.locator('p.text-gray-800').first().textContent();

  const wordCount = transcriptText?.split(/\s+/).filter(w => w.length > 0).length || 0;

  return {
    text: transcriptText || '',
    duration,
    wordCount,
  };
}
```

---

## 6. Small Fixture Requirements

All integration test fixtures should be:

- **Duration**: Under 10 seconds (preferably 2-5 seconds)
- **File Size**: Under 100 KB
- **Format**: MP3 (64 kbps) or MP4 (H.264, AAC 64 kbps)
- **Content**: Clear speech, known phrases
- **Sampling**: 16 kHz mono (matches Whisper requirements)

### Creating Test Fixtures

```bash
# Generate profanity test audio (5 seconds, ~40 KB)
say -o /tmp/profanity-test.aiff "This damn test contains some hell of a crap."

# Convert to MP3
ffmpeg -i /tmp/profanity-test.aiff \
  -ar 16000 \
  -ac 1 \
  -b:a 64k \
  tests/fixtures/files/profanity-test.mp3
```

---

## 7. Complete Test Examples

### File: `tests/integration/transcription-basic.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { uploadAndTranscribe } from '../helpers/transcription';

test.describe('Basic Transcription Integration', () => {
  test.beforeEach(async () => {
    test.setTimeout(30000); // 30 seconds with cached model
  });

  test('should transcribe short audio file', async ({ page }) => {
    const result = await uploadAndTranscribe(page, 'test.mp3');

    // Verify transcription succeeded
    expect(result.text).toBeTruthy();
    expect(result.wordCount).toBeGreaterThan(0);

    // Verify performance (should be fast with cached model)
    expect(result.duration).toBeLessThan(10000);

    console.log(`[TEST] Transcribed "${result.text}" in ${result.duration}ms`);
  });

  test('should transcribe timestamp test file accurately', async ({ page }) => {
    const result = await uploadAndTranscribe(page, 'timestamp-test.mp3');

    const expectedWords = ['hello', 'world', 'this', 'is', 'a', 'test'];
    const lowerText = result.text.toLowerCase();

    for (const word of expectedWords) {
      expect(lowerText).toContain(word);
    }

    console.log(`[TEST] Timestamp test transcription: "${result.text}"`);
  });
});
```

### File: `tests/integration/cache-verification.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Model Cache Verification', () => {
  test('should use cached model without downloading', async ({ page }) => {
    const modelRequests: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('huggingface.co') || url.includes('cdn-lfs')) {
        modelRequests.push(url);
        console.log('[CACHE CHECK] Network request:', url);
      }
    });

    await page.goto('/bleep');

    const testFile = path.join(__dirname, '../fixtures/files/test.mp3');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFile);
    await expect(page.locator('text=/File loaded/i')).toBeVisible({ timeout: 10000 });

    const modelSelect = page.locator('select').first();
    await modelSelect.selectOption('Xenova/whisper-tiny.en');

    const transcribeBtn = page.locator('button').filter({ hasText: /Start Transcription/i });
    await transcribeBtn.click();

    await expect(page.locator('text=/Transcription complete/i')).toBeVisible({
      timeout: 15000,
    });

    // Verify no model downloads occurred
    const modelDownloads = modelRequests.filter(
      url => url.includes('.onnx') || url.includes('tokenizer.json') || url.includes('config.json')
    );

    console.log('[CACHE CHECK] Model download requests:', modelDownloads.length);

    // Should be 0 if model is properly cached
    expect(modelDownloads.length).toBe(0);
  });
});
```

---

## 8. Timeout Configuration

### Per-Test Timeout Overrides

```typescript
// Global timeout in playwright.config.ts
export default defineConfig({
  timeout: 30000, // 30 seconds per test (with cached models)
  expect: {
    timeout: 10000, // 10 seconds for expect assertions
  },
  use: {
    actionTimeout: 10000,
    navigationTimeout: 10000,
  },
});

// Per-test override
test('long transcription test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ...
});
```

---

## 9. CI Cache Persistence

### GitHub Actions Configuration

```yaml
# .github/workflows/integration-tests.yml
- name: Cache Playwright Storage
  uses: actions/cache@v4
  with:
    path: playwright/.auth
    key: playwright-storage-${{ runner.os }}-${{ hashFiles('tests/setup/**') }}
    restore-keys: |
      playwright-storage-${{ runner.os }}-

- name: Run setup (cache models)
  run: npx playwright test --project=setup

- name: Run integration tests
  run: npx playwright test --project=chromium-integration
```

---

## 10. Implementation Checklist

### Phase 1: Setup Infrastructure (Day 1)

- [ ] Update `playwright.config.ts` with setup project
- [ ] Create `tests/setup/cache-models.setup.ts`
- [ ] Create `playwright/.auth/` directory
- [ ] Add `.gitignore` entry for `playwright/.auth/`
- [ ] Create test helpers: `tests/helpers/transcription.ts`

### Phase 2: Create Fixtures (Day 1-2)

- [ ] Generate `profanity-test.mp3` (5s, 40KB)
- [ ] Generate `short-video.mp4` (3s, 100KB)
- [ ] Create `tests/fixtures/expected/transcripts.json`
- [ ] Verify all fixtures under 100KB and 10 seconds

### Phase 3: Implement Tests (Day 2-3)

- [ ] Create `tests/integration/transcription-basic.spec.ts`
- [ ] Create `tests/integration/transcription-accuracy.spec.ts`
- [ ] Create `tests/integration/video-extraction.spec.ts`
- [ ] Create `tests/integration/cache-verification.spec.ts`

### Phase 4: Test and Debug (Day 3)

- [ ] Run setup: `npx playwright test --project=setup`
- [ ] Verify models cached (check `playwright/.auth/`)
- [ ] Run integration: `npx playwright test --project=chromium-integration`
- [ ] Verify tests run quickly (<30s each)
- [ ] Check no network requests to HuggingFace

### Phase 5: CI Integration (Day 4)

- [ ] Create `.github/workflows/integration-tests.yml`
- [ ] Configure cache persistence
- [ ] Test CI workflow with PR
- [ ] Verify cache restored between runs

---

## 11. Expected Results

### Performance Metrics (with cached models)

- **Setup time (first run)**: 2-3 minutes (download + cache tiny model)
- **Setup time (cached)**: 10-15 seconds (verify cache)
- **Per-test time**: 5-15 seconds (2-5s audio files)
- **Total suite time**: 2-5 minutes (10-20 tests)

### Test Coverage

- **Basic transcription**: 3 tests
- **Timestamp accuracy**: 3 tests
- **Full bleeping workflow**: 3 tests
- **Video extraction**: 1 test
- **Cache verification**: 3 tests
- **Total**: 13+ integration tests

---

## 12. Troubleshooting

### Models not caching between test runs

**Solution:**

1. Verify `storageState` in playwright.config.ts
2. Check `playwright/.auth/cache.json` exists after setup
3. Ensure setup project runs before integration tests

### Transcription timeouts

**Solution:**

1. Increase timeout: `test.setTimeout(60000)`
2. Verify model is cached (check network tab)
3. Try smaller fixtures (<5 seconds)

### Memory errors in CI

**Solution:**

1. Reduce workers: `workers: 1` in CI
2. Use smaller fixtures
3. Close browser contexts between tests

---

## Summary

Week 4 provides:

1. **Playwright setup projects** for pre-caching models
2. **Persistent storage state** to reuse cached models
3. **Small fixtures** (<10s, <100KB) for fast test execution
4. **Comprehensive helpers** for common operations
5. **Cache verification** to ensure optimal performance
6. **CI integration** with cache persistence

**Result**: Integration tests run in 5-15 seconds each with cached models, making them practical for frequent use.
