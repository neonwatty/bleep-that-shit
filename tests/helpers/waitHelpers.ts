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
