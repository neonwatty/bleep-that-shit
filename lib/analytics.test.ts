import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackEvent, createDebouncedTracker } from './analytics';

describe('analytics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clean up window.gtag
    delete (window as Record<string, unknown>).gtag;
  });

  describe('trackEvent', () => {
    it('calls window.gtag with correct parameters', () => {
      const mockGtag = vi.fn();
      window.gtag = mockGtag;

      trackEvent('test_event', { foo: 'bar', count: 42 });

      expect(mockGtag).toHaveBeenCalledWith('event', 'test_event', {
        foo: 'bar',
        count: 42,
      });
    });

    it('calls window.gtag without params when none provided', () => {
      const mockGtag = vi.fn();
      window.gtag = mockGtag;

      trackEvent('simple_event');

      expect(mockGtag).toHaveBeenCalledWith('event', 'simple_event', undefined);
    });

    it('does not throw when window.gtag is undefined', () => {
      // Ensure gtag is not defined
      delete (window as Record<string, unknown>).gtag;

      expect(() => trackEvent('test_event')).not.toThrow();
    });

    it('does not throw when window is undefined (SSR)', () => {
      // This simulates SSR where window might not exist
      const originalWindow = global.window;
      // @ts-expect-error - simulating SSR environment
      delete global.window;

      expect(() => trackEvent('test_event')).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe('createDebouncedTracker', () => {
    it('creates a debounced tracker function', () => {
      const mockGtag = vi.fn();
      window.gtag = mockGtag;

      const debouncedTrack = createDebouncedTracker('debounced_event');

      debouncedTrack({ value: 1 });

      // Should not fire immediately
      expect(mockGtag).not.toHaveBeenCalled();

      // Advance time by default delay (500ms)
      vi.advanceTimersByTime(500);

      expect(mockGtag).toHaveBeenCalledWith('event', 'debounced_event', { value: 1 });
    });

    it('uses custom delay', () => {
      const mockGtag = vi.fn();
      window.gtag = mockGtag;

      const debouncedTrack = createDebouncedTracker('custom_delay_event', 1000);

      debouncedTrack({ value: 1 });

      // Should not fire after 500ms
      vi.advanceTimersByTime(500);
      expect(mockGtag).not.toHaveBeenCalled();

      // Should fire after 1000ms total
      vi.advanceTimersByTime(500);
      expect(mockGtag).toHaveBeenCalledWith('event', 'custom_delay_event', { value: 1 });
    });

    it('resets timer on rapid calls (debouncing)', () => {
      const mockGtag = vi.fn();
      window.gtag = mockGtag;

      const debouncedTrack = createDebouncedTracker('rapid_event');

      // Simulate rapid slider changes
      debouncedTrack({ value: 1 });
      vi.advanceTimersByTime(200);

      debouncedTrack({ value: 2 });
      vi.advanceTimersByTime(200);

      debouncedTrack({ value: 3 });
      vi.advanceTimersByTime(200);

      // Still shouldn't have fired
      expect(mockGtag).not.toHaveBeenCalled();

      // Advance past debounce delay from last call
      vi.advanceTimersByTime(300);

      // Should only fire once with last value
      expect(mockGtag).toHaveBeenCalledTimes(1);
      expect(mockGtag).toHaveBeenCalledWith('event', 'rapid_event', { value: 3 });
    });

    it('fires multiple times for spaced-out calls', () => {
      const mockGtag = vi.fn();
      window.gtag = mockGtag;

      const debouncedTrack = createDebouncedTracker('spaced_event');

      debouncedTrack({ value: 1 });
      vi.advanceTimersByTime(500);

      expect(mockGtag).toHaveBeenCalledTimes(1);

      debouncedTrack({ value: 2 });
      vi.advanceTimersByTime(500);

      expect(mockGtag).toHaveBeenCalledTimes(2);
      expect(mockGtag).toHaveBeenLastCalledWith('event', 'spaced_event', { value: 2 });
    });
  });
});
