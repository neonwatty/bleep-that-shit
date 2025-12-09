/**
 * localStorage helpers for walkthrough state persistence
 */

const STORAGE_KEYS = {
  ONBOARDING_COMPLETE: 'bts_onboarding_complete',
  TOUR_COMPLETED: 'bts_tour_completed',
  WALKTHROUGH_VERSION: 'bts_walkthrough_version',
} as const;

// Current version - increment when making breaking changes to walkthrough
const CURRENT_VERSION = '1.0.0';

/**
 * Check if code is running in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Get the stored walkthrough version
 */
function getWalkthroughVersion(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(STORAGE_KEYS.WALKTHROUGH_VERSION);
}

/**
 * Update the walkthrough version
 */
function setWalkthroughVersion(version: string = CURRENT_VERSION): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEYS.WALKTHROUGH_VERSION, version);
}

/**
 * Check if user has completed the onboarding wizard
 */
export function hasCompletedOnboarding(): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE) === 'true';
}

/**
 * Mark onboarding wizard as complete
 */
export function setOnboardingComplete(complete: boolean = true): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, String(complete));
  setWalkthroughVersion();
}

/**
 * Check if user has completed the tour
 */
export function hasCompletedTour(): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem(STORAGE_KEYS.TOUR_COMPLETED) === 'true';
}

/**
 * Mark tour as complete
 */
export function setTourComplete(complete: boolean = true): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEYS.TOUR_COMPLETED, String(complete));
}

/**
 * Check if this is the user's first visit (hasn't seen onboarding)
 */
export function isFirstVisit(): boolean {
  if (!isBrowser()) return false;
  // Check if version exists - if not, this is first visit
  const version = getWalkthroughVersion();
  if (!version) return true;
  // Also check if onboarding is complete
  return !hasCompletedOnboarding();
}

