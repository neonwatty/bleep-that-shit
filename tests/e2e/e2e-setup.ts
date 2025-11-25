import { test as base, expect } from '@playwright/test';
import { setupNetworkMocks } from '../helpers/networkMocks';

const isCI = process.env.CI === 'true';

/**
 * Extended test fixture that automatically sets up network mocks in CI.
 *
 * In CI: Blocks model/FFmpeg downloads so tests run fast with mocked data.
 * Locally: Allows real network requests for full integration testing.
 */
export const test = base.extend({
  // eslint-disable-next-line react-hooks/rules-of-hooks
  page: async ({ page }, use) => {
    if (isCI) {
      await setupNetworkMocks(page);
    }
    await use(page);
  },
});

export { expect };
