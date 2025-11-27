import { describe, it, expect, vi } from 'vitest';
import { createManualCensorSegment } from './manualCensor';
import type { ManualCensorSegment } from './manualCensor';

describe('manualCensor', () => {
  describe('createManualCensorSegment', () => {
    it('should create a segment with start and end times', () => {
      const segment = createManualCensorSegment(1.5, 3.5);

      expect(segment.start).toBe(1.5);
      expect(segment.end).toBe(3.5);
    });

    it('should generate a unique ID', () => {
      const segment1 = createManualCensorSegment(0, 1);
      const segment2 = createManualCensorSegment(0, 1);

      expect(segment1.id).toBeDefined();
      expect(segment2.id).toBeDefined();
      expect(segment1.id).not.toBe(segment2.id);
    });

    it('should create a valid ManualCensorSegment type', () => {
      const segment = createManualCensorSegment(10, 15);

      // Type check - ensure the segment matches the interface
      const typed: ManualCensorSegment = segment;
      expect(typed.id).toBeDefined();
      expect(typeof typed.start).toBe('number');
      expect(typeof typed.end).toBe('number');
    });

    it('should handle zero values', () => {
      const segment = createManualCensorSegment(0, 0);

      expect(segment.start).toBe(0);
      expect(segment.end).toBe(0);
    });

    it('should handle decimal precision', () => {
      const segment = createManualCensorSegment(1.234, 5.678);

      expect(segment.start).toBe(1.234);
      expect(segment.end).toBe(5.678);
    });
  });

  describe('ManualCensorSegment interface', () => {
    it('should only have id, start, and end properties', () => {
      const segment = createManualCensorSegment(1, 2);
      const keys = Object.keys(segment);

      expect(keys).toHaveLength(3);
      expect(keys).toContain('id');
      expect(keys).toContain('start');
      expect(keys).toContain('end');
    });
  });
});
