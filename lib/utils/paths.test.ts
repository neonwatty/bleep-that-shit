import { describe, it, expect, beforeEach } from 'vitest';
import { getPublicPath } from './paths';

describe('paths utilities', () => {
  describe('getPublicPath', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/',
        },
        writable: true,
        configurable: true,
      });
    });

    it('should return path without base path for local development', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/bleep',
        },
        writable: true,
        configurable: true,
      });

      expect(getPublicPath('/bleeps/bleep.mp3')).toBe('/bleeps/bleep.mp3');
    });

    it('should return path with base path for GitHub Pages', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/bleep-that-shit/bleep',
        },
        writable: true,
        configurable: true,
      });

      expect(getPublicPath('/bleeps/bleep.mp3')).toBe('/bleep-that-shit/bleeps/bleep.mp3');
    });

    it('should handle root path', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/',
        },
        writable: true,
        configurable: true,
      });

      expect(getPublicPath('/assets/icon.png')).toBe('/assets/icon.png');
    });

    it('should handle GitHub Pages root', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/bleep-that-shit/',
        },
        writable: true,
        configurable: true,
      });

      expect(getPublicPath('/assets/icon.png')).toBe('/bleep-that-shit/assets/icon.png');
    });

    it('should not double-add base path', () => {
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/bleep-that-shit/sampler',
        },
        writable: true,
        configurable: true,
      });

      const result = getPublicPath('/workers/transcription.js');
      expect(result).toBe('/bleep-that-shit/workers/transcription.js');
      expect(result).not.toContain('/bleep-that-shit/bleep-that-shit');
    });
  });
});
