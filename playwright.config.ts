import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3004',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
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

    // Standard E2E tests (excluding smoke tests)
    {
      name: 'chromium',
      testIgnore: /smoke.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testIgnore: /smoke.*\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: /smoke.*\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      testIgnore: /smoke.*\.spec\.ts/,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      testIgnore: /smoke.*\.spec\.ts/,
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3004',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});