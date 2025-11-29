import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3004',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Video recording for YouTube Shorts demos
    // Run with: npx playwright test --project=videos --headed
    {
      name: 'videos',
      testMatch: /videos\/.*\.spec\.ts/,
      timeout: 300000, // 5 min per video - demos need time
      use: {
        ...devices['Desktop Chrome'],
        headless: false, // Must be headed for visible recording
        video: 'on', // Always record video
        viewport: { width: 1080, height: 1920 }, // Vertical 9:16 for Shorts
        actionTimeout: 60000, // Longer timeouts for demos
        navigationTimeout: 120000,
        launchOptions: {
          slowMo: 100, // Slight slowdown for visibility
        },
      },
    },

    // Smoke tests - fast UI-only tests (no model loading)
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

    // E2E tests - comprehensive workflow tests
    // In CI: Uses network mocks (ML models blocked), FFmpeg still loads for audio processing
    // Locally: Uses real network for full integration testing
    {
      name: 'e2e',
      testMatch: /e2e\/.*\.spec\.ts/,
      testIgnore: /smoke.*\.spec\.ts/,
      timeout: 180000, // 3 min per test - video processing can take time
      use: {
        ...devices['Desktop Chrome'],
        headless: true, // Headless by default for speed
        actionTimeout: 30000,
        navigationTimeout: 60000,
      },
    },

    // Standard E2E tests (excluding smoke tests and new e2e directory)
    {
      name: 'chromium',
      testIgnore: [/smoke.*\.spec\.ts/, /e2e\/.*\.spec\.ts/],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testIgnore: [/smoke.*\.spec\.ts/, /e2e\/.*\.spec\.ts/],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: [/smoke.*\.spec\.ts/, /e2e\/.*\.spec\.ts/],
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      testIgnore: [/smoke.*\.spec\.ts/, /e2e\/.*\.spec\.ts/],
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      testIgnore: [/smoke.*\.spec\.ts/, /e2e\/.*\.spec\.ts/],
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: process.env.CI ? 'npx serve@latest out -l 3004' : 'npm run dev',
    url: 'http://localhost:3004',
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 30 * 1000 : 120 * 1000, // 30s for serve, 2min for dev
  },
});