/**
 * Utility functions for handling public paths in both development and production
 */

/**
 * Get the correct public path based on environment
 * @param path - The path to convert (should start with /)
 * @returns The path with the correct base path prepended
 */
export function getPublicPath(path: string): string {
  // Check if we're on GitHub Pages by looking at the pathname
  const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/bleep-that-shit')
    ? '/bleep-that-shit'
    : '';
  return `${basePath}${path}`;
}

/**
 * Get the correct worker path
 * @param workerName - Name of the worker file
 * @returns Full path to the worker
 */
export function getWorkerPath(workerName: string): string {
  return getPublicPath(`/workers/${workerName}`);
}

/**
 * Get the correct asset path
 * @param assetPath - Path to the asset
 * @returns Full path to the asset
 */
export function getAssetPath(assetPath: string): string {
  return getPublicPath(assetPath);
}