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
  const basePath =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/bleep-that-shit')
      ? '/bleep-that-shit'
      : '';
  return `${basePath}${path}`;
}
