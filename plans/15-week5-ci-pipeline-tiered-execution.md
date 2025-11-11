# Week 5 Implementation Plan: CI Pipeline with Tiered Test Execution

## Overview

Transform the CI pipeline to run E2E tests with a smart tiered execution strategy that balances coverage with CI resource constraints.

**Building on:** Weeks 1-4 (all test infrastructure in place)

---

## Test Tier Classification

### Tier 1: Smoke Tests (CI on every PR/push)

**Duration: ~2-3 minutes | No model downloads | Chromium only**

- `tests/home.spec.ts`
- `tests/ci-tests.spec.ts`
- `tests/smoke/*.spec.ts`

### Tier 2: Critical Tests (Manual/Nightly)

**Duration: ~15-30 minutes | Small model downloads | Chromium + Firefox**

- `tests/simple-bleep.spec.ts`
- `tests/bleep-volume.spec.ts`
- `tests/functional-test.spec.ts`

### Tier 3: Integration Tests (Manual/Weekly)

**Duration: ~1-2 hours | Multiple models | All browsers**

- `tests/integration/*.spec.ts`
- `tests/bleep-volume-integration.spec.ts`
- `tests/comprehensive-media.spec.ts`

### Tier 4: Regression Tests (Manual/Release)

**Duration: ~2-3 hours | Full test suite**

- `tests/regression/*.spec.ts`
- `tests/timestamp-accuracy*.spec.ts`
- All other tests

---

## 1. GitHub Actions Workflow Files

### File: `.github/workflows/ci-smoke.yml`

```yaml
name: CI - Smoke Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-and-build:
    name: Lint, Type Check & Build
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npm run typecheck
      - run: npm run test:unit
      - run: npm run build
        env:
          NEXT_PUBLIC_BASE_PATH: /bleep-that-shit

  smoke-tests:
    name: E2E Smoke Tests
    runs-on: ubuntu-latest
    needs: lint-and-build

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-chromium-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
      - run: npm run test:e2e:smoke
        env:
          CI: true
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: smoke-test-report
          path: playwright-report/
          retention-days: 7
```

### File: `.github/workflows/ci-critical.yml`

```yaml
name: CI - Critical Tests

on:
  workflow_dispatch:
    inputs:
      browsers:
        description: 'Browsers to test'
        required: true
        default: 'chromium,firefox'
  schedule:
    - cron: '0 2 * * *' # Nightly at 2 AM UTC

concurrency:
  group: critical-tests
  cancel-in-progress: false

jobs:
  critical-tests:
    name: E2E Critical Tests
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Determine browsers
        id: browsers
        run: |
          if [ "${{ github.event_name }}" = "schedule" ]; then
            echo "list=chromium firefox" >> $GITHUB_OUTPUT
          else
            echo "list=${{ github.event.inputs.browsers }}" | tr ',' ' ' >> $GITHUB_OUTPUT
          fi
      - run: npx playwright install --with-deps ${{ steps.browsers.outputs.list }}
      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ steps.browsers.outputs.list }}-${{ runner.os }}
      - name: Cache Whisper models
        uses: actions/cache@v4
        with:
          path: |
            ~/.cache/huggingface
            public/models
          key: whisper-models-tiny-${{ hashFiles('package-lock.json') }}
      - run: npm run build
        env:
          NEXT_PUBLIC_BASE_PATH: /bleep-that-shit
      - run: npm run test:e2e:critical
        env:
          CI: true
        timeout-minutes: 45
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: critical-test-report-${{ github.run_number }}
          path: playwright-report/
          retention-days: 14
```

### File: `.github/workflows/ci-integration.yml`

```yaml
name: CI - Integration Tests

on:
  workflow_dispatch:
  schedule:
    - cron: '0 3 * * 0' # Weekly on Sunday at 3 AM

jobs:
  integration-tests:
    name: E2E Integration Tests
    runs-on: ubuntu-latest
    timeout-minutes: 150

    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps ${{ matrix.browser }}
      - name: Cache Whisper models
        uses: actions/cache@v4
        with:
          path: |
            ~/.cache/huggingface
            public/models
          key: whisper-models-all-${{ hashFiles('package-lock.json') }}
      - run: npm run build
      - run: npm run test:e2e:integration
        env:
          CI: true
          BROWSER: ${{ matrix.browser }}
        timeout-minutes: 120
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: integration-report-${{ matrix.browser }}-${{ github.run_number }}
          path: playwright-report/
          retention-days: 30
```

---

## 2. NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test:e2e:smoke": "playwright test --grep @smoke --project chromium",
    "test:e2e:critical": "playwright test --grep @critical --project chromium --project firefox",
    "test:e2e:integration": "playwright test tests/integration/",
    "test:e2e:regression": "playwright test tests/regression/ --project chromium --project firefox --project webkit"
  }
}
```

---

## 3. Playwright Configuration Updates

Update `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI
    ? [
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['github'],
      ]
    : [['html', { open: 'on-failure' }], ['list']],

  use: {
    baseURL: 'http://localhost:3004',
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'on',
    actionTimeout: process.env.CI ? 120000 : 30000,
    navigationTimeout: process.env.CI ? 60000 : 30000,
  },

  timeout: process.env.CI ? 180000 : 60000,
  expect: {
    timeout: process.env.CI ? 30000 : 10000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3004',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

---

## 4. Test File Tagging Strategy

Create `tests/test-tiers.ts`:

```typescript
/**
 * Test tier classification for CI pipeline
 */

export const TEST_TIERS = {
  SMOKE: '@smoke',
  CRITICAL: '@critical',
  INTEGRATION: '@integration',
  REGRESSION: '@regression',
} as const;

export const TIER_TIMEOUTS = {
  [TEST_TIERS.SMOKE]: 30000, // 30 seconds
  [TEST_TIERS.CRITICAL]: 120000, // 2 minutes
  [TEST_TIERS.INTEGRATION]: 300000, // 5 minutes
  [TEST_TIERS.REGRESSION]: 600000, // 10 minutes
} as const;
```

Example tagged test:

```typescript
test.describe('Home Page Tests @smoke', () => {
  test('should display the main heading', async ({ page }) => {
    // ...
  });
});
```

---

## 5. Model Caching Script

Create `scripts/cache-models.js`:

```javascript
#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS = {
  tiny: {
    'onnx/model.onnx':
      'https://huggingface.co/onnx-community/whisper-tiny/resolve/main/onnx/model.onnx',
    'tokenizer.json':
      'https://huggingface.co/onnx-community/whisper-tiny/resolve/main/tokenizer.json',
  },
};

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(dest)) {
      console.log(`✓ Skipping (already exists): ${dest}`);
      resolve();
      return;
    }

    const file = fs.createWriteStream(dest);
    console.log(`⬇ Downloading: ${url}`);

    https
      .get(url, response => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          https
            .get(response.headers.location, redirectResponse => {
              redirectResponse.pipe(file);
              file.on('finish', () => {
                file.close();
                console.log(`✓ Downloaded: ${dest}`);
                resolve();
              });
            })
            .on('error', reject);
        } else {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`✓ Downloaded: ${dest}`);
            resolve();
          });
        }
      })
      .on('error', reject);
  });
}

async function cacheModel(modelName) {
  console.log(`\n📦 Caching ${modelName} model...`);
  const modelFiles = MODELS[modelName];
  const cacheDir = path.join(
    process.env.HOME,
    '.cache',
    'huggingface',
    'transformers',
    `whisper-${modelName}`
  );

  for (const [file, url] of Object.entries(modelFiles)) {
    const dest = path.join(cacheDir, file);
    await downloadFile(url, dest);
  }

  console.log(`✅ ${modelName} model cached successfully\n`);
}

async function main() {
  const target = process.argv[2] || 'tiny';
  await cacheModel(target);
}

main().catch(console.error);
```

---

## 6. Cost Optimization

### Concurrency Control

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true # Cancel outdated runs
```

### Conditional Execution

```yaml
on:
  pull_request:
    paths-ignore:
      - '**.md'
      - 'docs/**'
```

### Cache Strategy

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
```

---

## 7. Triggering Manual Test Runs

### Via GitHub UI

1. Navigate to Actions tab
2. Select workflow (e.g., "CI - Critical Tests")
3. Click "Run workflow"
4. Choose inputs and click "Run workflow"

### Via GitHub CLI

```bash
# Critical tests
gh workflow run ci-critical.yml -f browsers=chromium,firefox

# Integration tests
gh workflow run ci-integration.yml

# Regression suite
gh workflow run ci-regression.yml
```

---

## 8. Monitoring and Debugging

### Debugging Checklist

1. Check workflow logs
2. Download artifacts: `gh run download RUN_ID`
3. View HTML report: `npx playwright show-report`
4. Examine screenshots/videos in `test-results/`
5. Check trace files: `npx playwright show-trace <trace.zip>`

### Common Failure Patterns

**Model Download Timeout:**

```yaml
use:
  actionTimeout: 180000 # 3 minutes
```

**Flaky Tests:**

```yaml
retries: 2
expect:
  timeout: 30000
```

---

## 9. Implementation Checklist

### Day 1: Setup and Configuration

- [ ] Create `.github/workflows/ci-smoke.yml`
- [ ] Create `.github/workflows/ci-critical.yml`
- [ ] Create `.github/workflows/ci-integration.yml`
- [ ] Update `playwright.config.ts`
- [ ] Add NPM scripts to `package.json`
- [ ] Create `scripts/cache-models.js`
- [ ] Create `tests/test-tiers.ts`

### Day 2: Test Tagging

- [ ] Tag smoke tests with `@smoke`
- [ ] Tag critical tests with `@critical`
- [ ] Verify integration tests location
- [ ] Verify regression tests location

### Day 3: Testing and Validation

- [ ] Test smoke workflow locally
- [ ] Verify cache behavior
- [ ] Test model download and caching
- [ ] Validate artifact uploads
- [ ] Check workflow run times

### Day 4: Documentation

- [ ] Create CI documentation
- [ ] Document manual trigger procedures
- [ ] Create troubleshooting guide
- [ ] Update README with CI badges

---

## 10. Expected Results

### Performance Metrics

- **Smoke tests**: 2-5 minutes (every PR/push)
- **Critical tests**: 15-30 minutes (nightly/manual)
- **Integration tests**: 1-2 hours (weekly/manual)
- **Regression tests**: 2-3 hours (pre-release)

### CI/CD Integration

- **GitHub Actions**: Automated testing on PR
- **Model caching**: 95% cache hit rate in CI
- **Total CI time**: 5-8 minutes per PR (smoke only)
- **Flakiness**: <5% (with retries and timeouts)

---

## Summary

Week 5 provides:

1. **4 tiered workflows** - smoke, critical, integration, regression
2. **Smart caching** - NPM, browsers, models
3. **Artifact management** - Reports with appropriate retention
4. **NPM scripts** - Easy local execution
5. **Manual triggers** - Via UI, CLI, or API
6. **Cost optimization** - Concurrency, caching, conditional execution
7. **Complete documentation** - Implementation, debugging, monitoring

**Result**: Fast feedback (<5 min) for developers, comprehensive coverage for releases.
