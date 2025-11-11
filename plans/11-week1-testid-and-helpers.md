# Week 1 Implementation Plan: Add data-testid Attributes and Create Test Helpers

## Overview

This plan will transform your E2E tests from brittle selector-based tests to robust, maintainable tests using `data-testid` attributes and reusable test helpers (page objects).

**Estimated Total Time:** 12-16 hours

---

## Phase 1: Setup Test Infrastructure (2-3 hours)

### Task 1.1: Create Test Helpers Directory Structure (30 minutes)

Create the following directory structure:

```
/Users/jeremywatt/Desktop/bleep-that-shit/tests/
├── helpers/
│   ├── pages/
│   │   ├── BleepPage.ts
│   │   ├── SamplerPage.ts
│   │   └── HomePage.ts
│   ├── components/
│   │   └── Navbar.ts
│   ├── waitHelpers.ts
│   ├── fileHelpers.ts
│   └── index.ts
└── fixtures/
    └── (existing test files)
```

**Commands to run:**

```bash
cd /Users/jeremywatt/Desktop/bleep-that-shit
mkdir -p tests/helpers/pages
mkdir -p tests/helpers/components
```

**Acceptance Criteria:**

- Directory structure created
- No existing tests broken

---

### Task 1.2: Install Dependencies (if needed) (15 minutes)

Check if any additional dependencies are needed:

```bash
cd /Users/jeremywatt/Desktop/bleep-that-shit
npm list @playwright/test
```

**Dependencies:** Already installed (@playwright/test ^1.55.0)

**Acceptance Criteria:**

- Confirm Playwright is installed and up to date

---

### Task 1.3: Create Base Wait Helpers (1 hour)

**File:** `/Users/jeremywatt/Desktop/bleep-that-shit/tests/helpers/waitHelpers.ts`

```typescript
import { Page, Locator, expect } from '@playwright/test';

/**
 * Wait for an element to be visible and stable
 */
export async function waitForElementVisible(
  locator: Locator,
  options?: { timeout?: number }
): Promise<void> {
  await expect(locator).toBeVisible({ timeout: options?.timeout ?? 10000 });
}

/**
 * Wait for an element to be hidden
 */
export async function waitForElementHidden(
  locator: Locator,
  options?: { timeout?: number }
): Promise<void> {
  await expect(locator).toBeHidden({ timeout: options?.timeout ?? 10000 });
}

/**
 * Wait for transcription to complete (or error)
 */
export async function waitForTranscription(
  page: Page,
  options?: { timeout?: number; expectSuccess?: boolean }
): Promise<'success' | 'error'> {
  const timeout = options?.timeout ?? 60000;
  const expectSuccess = options?.expectSuccess ?? true;

  const transcriptLocator = page.getByTestId('transcript-result');
  const errorLocator = page.getByTestId('error-message');

  try {
    const result = await Promise.race([
      transcriptLocator.waitFor({ state: 'visible', timeout }).then(() => 'success' as const),
      errorLocator.waitFor({ state: 'visible', timeout }).then(() => 'error' as const),
    ]);

    if (expectSuccess && result === 'error') {
      const errorText = await errorLocator.textContent();
      throw new Error(`Transcription failed: ${errorText}`);
    }

    return result;
  } catch (error) {
    if (expectSuccess) {
      throw error;
    }
    return 'error';
  }
}

/**
 * Wait for video processing to complete
 */
export async function waitForVideoProcessing(
  page: Page,
  options?: { timeout?: number }
): Promise<void> {
  const processingIndicator = page.getByTestId('video-processing-indicator');
  const censoredResult = page.getByTestId('censored-result');

  // Wait for processing indicator to appear
  await processingIndicator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
    // May already be done
  });

  // Wait for it to disappear and result to appear
  await expect(censoredResult).toBeVisible({ timeout: options?.timeout ?? 120000 });
}

/**
 * Wait for progress bar to reach completion
 */
export async function waitForProgressComplete(
  page: Page,
  options?: { timeout?: number }
): Promise<void> {
  const progressBar = page.getByTestId('progress-bar');
  const progressText = page.getByTestId('progress-text');

  await expect(progressText).toContainText(/complete/i, {
    timeout: options?.timeout ?? 60000,
  });
}

/**
 * Retry a function until it succeeds or times out
 */
export async function retryUntil<T>(
  fn: () => Promise<T>,
  options?: {
    timeout?: number;
    interval?: number;
    errorMessage?: string;
  }
): Promise<T> {
  const timeout = options?.timeout ?? 10000;
  const interval = options?.interval ?? 500;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      return await fn();
    } catch (error) {
      if (Date.now() - startTime + interval >= timeout) {
        throw new Error(options?.errorMessage || `Retry timeout: ${error}`);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  throw new Error(options?.errorMessage || 'Retry timeout');
}
```

**Acceptance Criteria:**

- File created with all helper functions
- TypeScript compiles without errors
- Functions are properly typed

---

### Task 1.4: Create File Upload Helpers (1 hour)

**File:** `/Users/jeremywatt/Desktop/bleep-that-shit/tests/helpers/fileHelpers.ts`

```typescript
import { Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Creates a test audio file buffer
 */
export function createTestAudioBuffer(durationSeconds: number = 5): Buffer {
  // Create a minimal valid MP3 header + data
  // This is a simplified version - in production, use actual test files
  return Buffer.from('dummy audio content for ' + durationSeconds + ' seconds');
}

/**
 * Creates a test video file buffer
 */
export function createTestVideoBuffer(durationSeconds: number = 5): Buffer {
  return Buffer.from('dummy video content for ' + durationSeconds + ' seconds');
}

/**
 * Upload a file to the dropzone
 */
export async function uploadFile(
  page: Page,
  options: {
    fileName: string;
    mimeType: string;
    buffer?: Buffer;
    filePath?: string;
  }
): Promise<void> {
  const fileInput = page.getByTestId('file-input');

  if (options.filePath) {
    // Use real file
    await fileInput.setInputFiles(options.filePath);
  } else if (options.buffer) {
    // Use buffer
    await fileInput.setInputFiles({
      name: options.fileName,
      mimeType: options.mimeType,
      buffer: options.buffer,
    });
  } else {
    throw new Error('Either filePath or buffer must be provided');
  }
}

/**
 * Upload a test audio file
 */
export async function uploadTestAudio(
  page: Page,
  options?: {
    fileName?: string;
    filePath?: string;
  }
): Promise<void> {
  const fileName = options?.fileName ?? 'test-audio.mp3';
  const filePath = options?.filePath;

  if (filePath) {
    await uploadFile(page, {
      fileName,
      mimeType: 'audio/mpeg',
      filePath,
    });
  } else {
    await uploadFile(page, {
      fileName,
      mimeType: 'audio/mpeg',
      buffer: createTestAudioBuffer(),
    });
  }
}

/**
 * Upload a test video file
 */
export async function uploadTestVideo(
  page: Page,
  options?: {
    fileName?: string;
    filePath?: string;
  }
): Promise<void> {
  const fileName = options?.fileName ?? 'test-video.mp4';
  const filePath = options?.filePath;

  if (filePath) {
    await uploadFile(page, {
      fileName,
      mimeType: 'video/mp4',
      filePath,
    });
  } else {
    await uploadFile(page, {
      fileName,
      mimeType: 'video/mp4',
      buffer: createTestVideoBuffer(),
    });
  }
}

/**
 * Get path to test fixture file
 */
export function getFixturePath(fileName: string): string {
  return path.join(__dirname, '../fixtures', fileName);
}

/**
 * Check if a file exists in fixtures
 */
export function fixtureExists(fileName: string): boolean {
  return fs.existsSync(getFixturePath(fileName));
}
```

**Acceptance Criteria:**

- File created with all helper functions
- Functions properly handle both buffer and file path uploads
- TypeScript compiles without errors

---

## Phase 2: Create Page Object Models (4-5 hours)

### Task 2.1: Create BleepPage Page Object (2 hours)

See complete implementation in the full plan document.

### Task 2.2: Create SamplerPage and HomePage Page Objects (1.5 hours)

See complete implementation in the full plan document.

### Task 2.3: Create Navbar Component Helper (30 minutes)

See complete implementation in the full plan document.

### Task 2.4: Create Index Barrel Export (15 minutes)

**File:** `/Users/jeremywatt/Desktop/bleep-that-shit/tests/helpers/index.ts`

```typescript
// Page Objects
export { BleepPage } from './pages/BleepPage';
export { SamplerPage } from './pages/SamplerPage';
export { HomePage } from './pages/HomePage';

// Components
export { NavbarComponent } from './components/Navbar';

// Helpers
export * from './waitHelpers';
export * from './fileHelpers';
```

---

## Phase 3: Add data-testid Attributes to Components (4-6 hours)

### Key Files to Modify:

1. **app/bleep/page.tsx** - Main bleeping interface
2. **components/Navbar.tsx** - Navigation component
3. **app/page.tsx** - Home page
4. **app/sampler/page.tsx** - Model comparison page

### Essential data-testid Attributes:

**Bleep Page:**

- `file-dropzone`, `file-input`
- `language-select`, `model-select`
- `transcribe-button`, `progress-bar`, `progress-text`
- `transcript-result`, `transcript-text`
- `words-to-match-input`, `run-matching-button`
- `matched-words-container`, `matched-word-chip`
- `bleep-sound-select`, `bleep-volume-slider`
- `apply-bleeps-button`, `download-button`
- `error-message`, `file-warning`

See full implementation in the complete plan document.

---

## Summary & Acceptance Criteria

### Overall Acceptance Criteria

**Must Have:**

1. ✅ All directory structure created
2. ✅ All helper files created and TypeScript compiles
3. ✅ All page objects created with complete type safety
4. ✅ All `data-testid` attributes added to components
5. ✅ Example tests work and demonstrate usage
6. ✅ Documentation complete
7. ✅ Verification tests pass
8. ✅ No existing tests broken
9. ✅ No visual changes to UI
10. ✅ All TypeScript compilation successful

### Time Breakdown

| Phase     | Task                 | Time            |
| --------- | -------------------- | --------------- |
| 1         | Setup Infrastructure | 2-3 hours       |
| 2         | Page Object Models   | 4-5 hours       |
| 3         | Add data-testid      | 4-6 hours       |
| 4         | Example Tests        | 2 hours         |
| 5         | Documentation        | 1-2 hours       |
| **Total** |                      | **13-18 hours** |

---

## Next Steps (Week 2)

After completing this plan:

1. Migrate existing tests to use page objects
2. Add more comprehensive test coverage
3. Set up CI/CD integration
4. Add visual regression testing
5. Performance testing helpers
