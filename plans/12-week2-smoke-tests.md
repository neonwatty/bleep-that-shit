# Week 2 Implementation Plan: Smoke Tests (No Model Loading)

## Overview

Fast UI-only tests that verify rendering, navigation, file validation, and user interactions WITHOUT triggering model downloads or transcription. Target: 2-5 minutes total runtime.

**Building on:** Week 1 (data-testid attributes and test helpers)

---

## 1. Test File Structure

Create a dedicated `smoke/` directory for fast smoke tests:

```
tests/
├── smoke/                          # NEW: Fast smoke tests (2-5 min total)
│   ├── home.smoke.spec.ts         # Home page UI tests
│   ├── bleep-ui.smoke.spec.ts     # Bleep page UI tests (no transcription)
│   ├── sampler-ui.smoke.spec.ts   # Sampler page UI tests (no models)
│   ├── navigation.smoke.spec.ts   # Cross-page navigation
│   ├── file-upload.smoke.spec.ts  # File upload/validation
│   └── responsive.smoke.spec.ts   # Responsive design tests
```

---

## 2. Playwright Configuration Updates

Add to `playwright.config.ts`:

```typescript
export default defineConfig({
  projects: [
    // NEW: Smoke tests - fast UI-only tests
    {
      name: 'smoke-chromium',
      testMatch: /smoke.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Faster timeouts for smoke tests
        actionTimeout: 10000,
        navigationTimeout: 30000,
      },
    },

    // Existing projects (add grep to exclude smoke tests)
    {
      name: 'chromium',
      testIgnore: /smoke.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

---

## 3. NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test:smoke": "playwright test --project=smoke-chromium",
    "test:smoke:ui": "playwright test --project=smoke-chromium --ui",
    "test:smoke:debug": "playwright test --project=smoke-chromium --debug",
    "test:smoke:headed": "playwright test --project=smoke-chromium --headed"
  }
}
```

---

## 4. Key Testing Principles

### ✅ DO Test (Smoke Tests)

- UI elements render correctly
- Navigation works between pages
- File upload accepts/rejects correctly
- Buttons enable/disable based on state
- Responsive layouts at different breakpoints
- No console errors during basic interactions

### ❌ DON'T Test (Smoke Tests)

- Never click "Start Transcription" button
- Never click "Compare All Models" button
- Never trigger model downloads
- Never wait for actual transcription
- Never process video/audio files

---

## 5. Example Test Files

### File: `tests/smoke/bleep-ui.smoke.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Bleep Page UI - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bleep');
  });

  test('renders main heading and workflow steps', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();

    const steps = [
      'Upload Your File',
      'Select Language & Model',
      'Transcribe',
      'Enter Words to Bleep',
      'Choose Bleep Sound & Volume',
      'Bleep That Sh*t!',
    ];

    for (const stepTitle of steps) {
      await expect(page.locator('h2').filter({ hasText: stepTitle })).toBeVisible();
    }
  });

  test('transcribe button is disabled without file', async ({ page }) => {
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await expect(transcribeBtn).toBeDisabled();
  });

  test('displays language and model selectors', async ({ page }) => {
    const languageSelect = page.locator('select').first();
    await expect(languageSelect).toBeVisible();
    await expect(languageSelect).toContainText('English');

    const modelSelect = page.locator('select').nth(1);
    await expect(modelSelect).toBeVisible();
    await expect(modelSelect).toContainText('Tiny');
  });
});
```

### File: `tests/smoke/file-upload.smoke.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('File Upload - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bleep');
  });

  test('accepts valid MP3 file', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    const testFile = path.join(__dirname, '../fixtures/files/test.mp3');

    await fileInput.setInputFiles(testFile);

    // Should show file loaded message
    await expect(page.locator('text=/File loaded:.*test.mp3/')).toBeVisible({ timeout: 5000 });

    // Should show audio player
    await expect(page.locator('audio')).toBeVisible();

    // Should enable transcribe button (but DON'T click it!)
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await expect(transcribeBtn).toBeEnabled();
  });

  test('rejects invalid text file', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    const textFile = path.join(__dirname, '../fixtures/files/sample.txt');

    await fileInput.setInputFiles(textFile);

    // Should show error message
    await expect(page.locator('text=/Please upload a valid audio or video file/')).toBeVisible({
      timeout: 5000,
    });

    // Transcribe button should remain disabled
    const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
    await expect(transcribeBtn).toBeDisabled();
  });
});
```

### File: `tests/smoke/navigation.smoke.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Navigation - Smoke Tests', () => {
  test('navigates from home to bleep page', async ({ page }) => {
    await page.goto('/');

    const bleepLink = page.locator('a[href="/bleep"]').first();
    await bleepLink.click();

    await expect(page).toHaveURL(/.*\/bleep/);
    await expect(page.locator('h1').filter({ hasText: 'Bleep Your Sh*t!' })).toBeVisible();
  });

  test('navbar is present on all pages', async ({ page }) => {
    const pages = ['/', '/bleep', '/sampler'];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await expect(page.locator('nav')).toBeVisible();

      // Check navbar links
      await expect(page.locator('nav a[href="/"]')).toBeVisible();
      await expect(page.locator('nav a[href="/bleep"]')).toBeVisible();
      await expect(page.locator('nav a[href="/sampler"]')).toBeVisible();
    }
  });
});
```

---

## 6. How to Avoid Model Loading/Processing

### Never Click Transcribe Buttons

```typescript
// ❌ BAD - This will trigger model loading
await page.locator('button').filter({ hasText: 'Start Transcription' }).click();

// ✅ GOOD - Only check if button exists and is in correct state
const transcribeBtn = page.locator('button').filter({ hasText: 'Start Transcription' });
await expect(transcribeBtn).toBeVisible();
await expect(transcribeBtn).toBeEnabled();
```

### Test Files Only Upload

```typescript
// ✅ GOOD - Upload file but don't transcribe
const fileInput = page.locator('input[type="file"]');
await fileInput.setInputFiles(testFilePath);
await expect(page.locator('text=/File loaded/')).toBeVisible();
// STOP HERE - don't click transcribe
```

### Use Shorter Timeouts

```typescript
// Smoke tests should be fast
test.setTimeout(30000); // 30 seconds max per test

// Use shorter wait times
await expect(element).toBeVisible({ timeout: 5000 }); // 5 seconds max
```

---

## 7. Verifying Tests Are Fast

### Run with Timing

```bash
npm run test:smoke

# Expected output:
# Running 30+ tests across smoke suite
# ✓ All tests pass in 2-5 minutes total
# ✓ No individual test exceeds 30 seconds
```

---

## 8. Acceptance Criteria

### Functional Requirements

- ✅ All smoke tests run without triggering model downloads
- ✅ All smoke tests run without starting transcription
- ✅ Tests verify UI rendering and state only
- ✅ File upload tests verify validation without processing
- ✅ Navigation tests verify routing without heavy operations

### Performance Requirements

- ✅ Total smoke suite runtime: 2-5 minutes
- ✅ Individual test runtime: < 30 seconds each
- ✅ No network requests to HuggingFace model CDN
- ✅ No FFmpeg worker instantiation

### Coverage Requirements

- ✅ Home page: 10+ UI tests
- ✅ Bleep page: 15+ UI tests
- ✅ Sampler page: 7+ UI tests
- ✅ File upload: 6+ validation tests
- ✅ Navigation: 8+ routing tests
- ✅ Responsive: 12+ viewport tests
- ✅ **Total: 58+ smoke tests**

---

## 9. CI Integration (Optional)

Update `.github/workflows/ci.yml`:

```yaml
smoke-tests:
  name: Smoke Tests (UI Only)
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    - run: npm ci
    - run: npx playwright install chromium --with-deps
    - run: npm run test:smoke
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: smoke-test-results
        path: playwright-report/
```

---

## Summary

This plan provides:

1. **Clear structure**: Dedicated `smoke/` directory for fast tests
2. **Complete examples**: Copy-paste ready test files
3. **Performance**: 2-5 minute total runtime
4. **Safety**: No model downloads or heavy processing
5. **Coverage**: 58+ tests across all pages and features
6. **Maintainability**: Consistent patterns and clear naming
7. **CI-ready**: Can run in GitHub Actions without cached models
