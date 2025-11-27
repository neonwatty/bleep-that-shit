import { describe, it, expect } from 'vitest';
import {
  formatTime,
  formatTimeWithDecimals,
  parseTime,
  formatDuration,
  roundTime,
  clampTime,
} from './timeFormat';

describe('timeFormat utilities', () => {
  describe('formatTime', () => {
    it('should format seconds as MM:SS', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(5)).toBe('00:05');
      expect(formatTime(65)).toBe('01:05');
      expect(formatTime(125)).toBe('02:05');
    });

    it('should format as HH:MM:SS when hours > 0', () => {
      expect(formatTime(3600)).toBe('01:00:00');
      expect(formatTime(3665)).toBe('01:01:05');
      expect(formatTime(7325)).toBe('02:02:05');
    });

    it('should force hours format when forceHours is true', () => {
      expect(formatTime(65, true)).toBe('00:01:05');
      expect(formatTime(0, true)).toBe('00:00:00');
    });

    it('should handle invalid inputs', () => {
      expect(formatTime(-1)).toBe('00:00');
      expect(formatTime(NaN)).toBe('00:00');
      expect(formatTime(Infinity)).toBe('00:00');
      expect(formatTime(-1, true)).toBe('00:00:00');
    });
  });

  describe('formatTimeWithDecimals', () => {
    it('should format with decimal seconds', () => {
      expect(formatTimeWithDecimals(0)).toBe('0:00.00');
      expect(formatTimeWithDecimals(1.5)).toBe('0:01.50');
      expect(formatTimeWithDecimals(65.25)).toBe('1:05.25');
    });

    it('should respect decimal precision', () => {
      expect(formatTimeWithDecimals(1.234, 1)).toBe('0:01.2');
      expect(formatTimeWithDecimals(1.234, 3)).toBe('0:01.234');
    });

    it('should handle invalid inputs', () => {
      expect(formatTimeWithDecimals(-1)).toBe('0:00.00');
      expect(formatTimeWithDecimals(NaN)).toBe('0:00.00');
    });
  });

  describe('parseTime', () => {
    it('should parse plain seconds', () => {
      expect(parseTime('5')).toBe(5);
      expect(parseTime('65')).toBe(65);
      expect(parseTime('1.5')).toBe(1.5);
      expect(parseTime('  10  ')).toBe(10);
    });

    it('should parse MM:SS format', () => {
      expect(parseTime('1:05')).toBe(65);
      expect(parseTime('0:30')).toBe(30);
      expect(parseTime('10:00')).toBe(600);
    });

    it('should parse HH:MM:SS format', () => {
      expect(parseTime('1:00:00')).toBe(3600);
      expect(parseTime('1:01:05')).toBe(3665);
      expect(parseTime('0:01:05')).toBe(65);
    });

    it('should handle invalid inputs', () => {
      expect(parseTime('')).toBeNaN();
      expect(parseTime('abc')).toBeNaN();
      expect(parseTime('1:2:3:4')).toBeNaN();
    });

    it('should clamp negative values to 0', () => {
      expect(parseTime('-5')).toBe(0);
    });
  });

  describe('formatDuration', () => {
    it('should format short durations with decimals', () => {
      expect(formatDuration(0.5)).toBe('0.5s');
      expect(formatDuration(5.5)).toBe('5.5s');
    });

    it('should format medium durations without decimals', () => {
      expect(formatDuration(15)).toBe('15s');
      expect(formatDuration(45)).toBe('45s');
    });

    it('should format durations over a minute', () => {
      expect(formatDuration(60)).toBe('1m');
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(125)).toBe('2m 5s');
    });

    it('should handle invalid inputs', () => {
      expect(formatDuration(-1)).toBe('0s');
      expect(formatDuration(NaN)).toBe('0s');
      expect(formatDuration(Infinity)).toBe('0s');
    });
  });

  describe('roundTime', () => {
    it('should round to default precision (3 decimals)', () => {
      expect(roundTime(1.2345)).toBe(1.235);
      expect(roundTime(1.2344)).toBe(1.234);
    });

    it('should respect custom precision', () => {
      expect(roundTime(1.2345, 2)).toBe(1.23);
      expect(roundTime(1.2345, 1)).toBe(1.2);
      expect(roundTime(1.2345, 0)).toBe(1);
    });
  });

  describe('clampTime', () => {
    it('should clamp to minimum (default 0)', () => {
      expect(clampTime(-5)).toBe(0);
      expect(clampTime(5)).toBe(5);
    });

    it('should clamp to custom minimum', () => {
      expect(clampTime(5, 10)).toBe(10);
      expect(clampTime(15, 10)).toBe(15);
    });

    it('should clamp to maximum', () => {
      expect(clampTime(100, 0, 60)).toBe(60);
      expect(clampTime(50, 0, 60)).toBe(50);
    });

    it('should clamp between min and max', () => {
      expect(clampTime(-5, 10, 100)).toBe(10);
      expect(clampTime(150, 10, 100)).toBe(100);
      expect(clampTime(50, 10, 100)).toBe(50);
    });
  });
});
