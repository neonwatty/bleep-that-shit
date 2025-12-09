import { Page, expect } from '@playwright/test';

/**
 * Skip the onboarding wizard by setting localStorage to simulate a returning user.
 * Should be called via page.addInitScript() before navigation.
 *
 * @example
 * test.beforeEach(async ({ page }) => {
 *   await page.addInitScript(skipOnboardingWizard);
 *   await page.goto('/bleep');
 * });
 */
export function skipOnboardingWizard() {
  localStorage.setItem('bts_onboarding_complete', 'true');
  localStorage.setItem('bts_walkthrough_version', '1.0.0');
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
