import { describe, it, expect } from 'vitest';
import { mergeOverlappingBleeps, applyBufferToSegment, BleepSegment } from './bleepMerger';

describe('bleepMerger', () => {
  describe('mergeOverlappingBleeps', () => {
    it('should return empty array for empty input', () => {
      const result = mergeOverlappingBleeps([]);
      expect(result).toEqual([]);
    });

    it('should return single segment unchanged', () => {
      const segments: BleepSegment[] = [{ word: 'hello', start: 0, end: 1 }];
      const result = mergeOverlappingBleeps(segments);
      expect(result).toEqual(segments);
    });

    it('should not merge non-overlapping segments', () => {
      const segments: BleepSegment[] = [
        { word: 'hello', start: 0, end: 1 },
        { word: 'world', start: 2, end: 3 },
      ];
      const result = mergeOverlappingBleeps(segments);
      expect(result).toEqual(segments);
    });

    it('should merge overlapping segments', () => {
      const segments: BleepSegment[] = [
        { word: 'hello', start: 0, end: 1.5 },
        { word: 'world', start: 1.0, end: 2.0 },
      ];
      const result = mergeOverlappingBleeps(segments);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        word: 'hello, world',
        start: 0,
        end: 2.0,
      });
    });

    it('should merge touching segments (end === next start)', () => {
      const segments: BleepSegment[] = [
        { word: 'hello', start: 0, end: 1.0 },
        { word: 'world', start: 1.0, end: 2.0 },
      ];
      const result = mergeOverlappingBleeps(segments);
      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('hello, world');
      expect(result[0].start).toBe(0);
      expect(result[0].end).toBe(2.0);
    });

    it('should merge multiple overlapping segments', () => {
      const segments: BleepSegment[] = [
        { word: 'one', start: 0, end: 1.5 },
        { word: 'two', start: 1.0, end: 2.5 },
        { word: 'three', start: 2.0, end: 3.0 },
      ];
      const result = mergeOverlappingBleeps(segments);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        word: 'one, two, three',
        start: 0,
        end: 3.0,
      });
    });

    it('should handle mix of overlapping and non-overlapping segments', () => {
      const segments: BleepSegment[] = [
        { word: 'one', start: 0, end: 1.0 },
        { word: 'two', start: 0.5, end: 1.5 }, // Overlaps with one
        { word: 'three', start: 3.0, end: 4.0 }, // No overlap
        { word: 'four', start: 3.5, end: 4.5 }, // Overlaps with three
      ];
      const result = mergeOverlappingBleeps(segments);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        word: 'one, two',
        start: 0,
        end: 1.5,
      });
      expect(result[1]).toEqual({
        word: 'three, four',
        start: 3.0,
        end: 4.5,
      });
    });

    it('should sort segments by start time before merging', () => {
      const segments: BleepSegment[] = [
        { word: 'three', start: 4.0, end: 5.0 },
        { word: 'one', start: 0, end: 1.0 },
        { word: 'two', start: 2.0, end: 3.0 },
      ];
      const result = mergeOverlappingBleeps(segments);
      expect(result).toHaveLength(3);
      expect(result[0].word).toBe('one');
      expect(result[1].word).toBe('two');
      expect(result[2].word).toBe('three');
    });

    it('should handle segment completely contained in another', () => {
      const segments: BleepSegment[] = [
        { word: 'outer', start: 0, end: 5.0 },
        { word: 'inner', start: 2.0, end: 3.0 }, // Completely inside outer
      ];
      const result = mergeOverlappingBleeps(segments);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        word: 'outer, inner',
        start: 0,
        end: 5.0,
      });
    });

    it('should handle many consecutive overlapping segments', () => {
      const segments: BleepSegment[] = [
        { word: 'a', start: 0, end: 1.2 },
        { word: 'b', start: 1.0, end: 2.2 },
        { word: 'c', start: 2.0, end: 3.2 },
        { word: 'd', start: 3.0, end: 4.2 },
        { word: 'e', start: 4.0, end: 5.0 },
      ];
      const result = mergeOverlappingBleeps(segments);
      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('a, b, c, d, e');
      expect(result[0].start).toBe(0);
      expect(result[0].end).toBe(5.0);
    });
  });

  describe('applyBufferToSegment', () => {
    it('should apply buffer to both start and end', () => {
      const segment: BleepSegment = { word: 'test', start: 2.0, end: 3.0 };
      const result = applyBufferToSegment(segment, 0.5);
      expect(result).toEqual({
        word: 'test',
        start: 1.5,
        end: 3.5,
      });
    });

    it('should prevent negative start time', () => {
      const segment: BleepSegment = { word: 'test', start: 0.2, end: 1.0 };
      const result = applyBufferToSegment(segment, 0.5);
      expect(result).toEqual({
        word: 'test',
        start: 0, // Should be 0, not -0.3
        end: 1.5,
      });
    });

    it('should handle zero buffer', () => {
      const segment: BleepSegment = { word: 'test', start: 1.0, end: 2.0 };
      const result = applyBufferToSegment(segment, 0);
      expect(result).toEqual(segment);
    });

    it('should handle segment at start of audio (start=0)', () => {
      const segment: BleepSegment = { word: 'test', start: 0, end: 1.0 };
      const result = applyBufferToSegment(segment, 0.5);
      expect(result).toEqual({
        word: 'test',
        start: 0, // Should stay at 0
        end: 1.5,
      });
    });

    it('should apply large buffer correctly', () => {
      const segment: BleepSegment = { word: 'test', start: 5.0, end: 6.0 };
      const result = applyBufferToSegment(segment, 2.0);
      expect(result).toEqual({
        word: 'test',
        start: 3.0,
        end: 8.0,
      });
    });
  });

  describe('integration: buffer + merge', () => {
    it('should merge segments that overlap after buffer is applied', () => {
      // Two words with 0.5s gap, but with 0.3s buffer they overlap
      const segments: BleepSegment[] = [
        { word: 'hello', start: 1.0, end: 1.5 },
        { word: 'world', start: 2.0, end: 2.5 },
      ];

      // Apply buffer
      const buffered = segments.map(seg => applyBufferToSegment(seg, 0.3));

      // buffered[0]: start=0.7, end=1.8
      // buffered[1]: start=1.7, end=2.8
      // They now overlap!

      const merged = mergeOverlappingBleeps(buffered);
      expect(merged).toHaveLength(1);
      expect(merged[0].word).toBe('hello, world');
      expect(merged[0].start).toBe(0.7);
      expect(merged[0].end).toBe(2.8);
    });

    it('should not merge segments with insufficient buffer', () => {
      const segments: BleepSegment[] = [
        { word: 'hello', start: 1.0, end: 1.5 },
        { word: 'world', start: 3.0, end: 3.5 },
      ];

      // Apply small buffer - not enough to cause overlap
      const buffered = segments.map(seg => applyBufferToSegment(seg, 0.2));

      const merged = mergeOverlappingBleeps(buffered);
      expect(merged).toHaveLength(2); // Should stay separate
    });
  });

  describe('GAIN_RAMP_BUFFER (0.02s) merging', () => {
    it('should merge segments within 0.02s to avoid gain automation conflicts', () => {
      // Two segments 0.01s apart - within GAIN_RAMP_BUFFER
      const segments: BleepSegment[] = [
        { word: 'hello', start: 1.0, end: 1.5 },
        { word: 'world', start: 1.51, end: 2.0 },
      ];

      const merged = mergeOverlappingBleeps(segments);
      expect(merged).toHaveLength(1);
      expect(merged[0].word).toBe('hello, world');
      expect(merged[0].start).toBe(1.0);
      expect(merged[0].end).toBe(2.0);
    });

    it('should merge segments exactly at 0.02s threshold', () => {
      // Segments exactly 0.02s apart
      const segments: BleepSegment[] = [
        { word: 'hello', start: 1.0, end: 1.5 },
        { word: 'world', start: 1.52, end: 2.0 },
      ];

      const merged = mergeOverlappingBleeps(segments);
      expect(merged).toHaveLength(1);
      expect(merged[0].word).toBe('hello, world');
    });

    it('should not merge segments with gap larger than 0.02s', () => {
      // Segments 0.03s apart - beyond GAIN_RAMP_BUFFER
      const segments: BleepSegment[] = [
        { word: 'hello', start: 1.0, end: 1.5 },
        { word: 'world', start: 1.53, end: 2.0 },
      ];

      const merged = mergeOverlappingBleeps(segments);
      expect(merged).toHaveLength(2);
      expect(merged[0].word).toBe('hello');
      expect(merged[1].word).toBe('world');
    });

    it('should merge close segments even with zero buffer', () => {
      // Zero buffer, but segments are 0.01s apart
      const segments: BleepSegment[] = [
        { word: 'hello', start: 1.0, end: 1.5 },
        { word: 'world', start: 1.51, end: 2.0 },
      ];

      const buffered = segments.map(seg => applyBufferToSegment(seg, 0));
      const merged = mergeOverlappingBleeps(buffered);

      expect(merged).toHaveLength(1);
      expect(merged[0].word).toBe('hello, world');
    });

    it('should handle complex scenario with multiple segments at varying distances', () => {
      const segments: BleepSegment[] = [
        { word: 'one', start: 1.0, end: 1.3 },
        { word: 'two', start: 1.31, end: 1.6 }, // 0.01s from one - will merge
        { word: 'three', start: 1.8, end: 2.0 }, // 0.2s from two - won't merge
        { word: 'four', start: 2.01, end: 2.3 }, // 0.01s from three - will merge
      ];

      const merged = mergeOverlappingBleeps(segments);

      expect(merged).toHaveLength(2);
      expect(merged[0].word).toBe('one, two');
      expect(merged[0].start).toBe(1.0);
      expect(merged[0].end).toBe(1.6);
      expect(merged[1].word).toBe('three, four');
      expect(merged[1].start).toBe(1.8);
      expect(merged[1].end).toBe(2.3);
    });

    it('should merge three segments where buffer causes all to be within GAIN_RAMP_BUFFER', () => {
      // Three segments where buffer brings them all within 0.02s
      const segments: BleepSegment[] = [
        { word: 'one', start: 1.0, end: 1.1 },
        { word: 'two', start: 1.3, end: 1.4 },
        { word: 'three', start: 1.6, end: 1.7 },
      ];

      // With 0.15s buffer: one ends at 1.25, two is 1.15-1.55, three starts at 1.45
      const buffered = segments.map(seg => applyBufferToSegment(seg, 0.15));
      const merged = mergeOverlappingBleeps(buffered);

      expect(merged).toHaveLength(1);
      expect(merged[0].word).toBe('one, two, three');
      expect(merged[0].start).toBeCloseTo(0.85, 5);
      expect(merged[0].end).toBeCloseTo(1.85, 5);
    });

    it('should handle buffer at file start with GAIN_RAMP_BUFFER merging', () => {
      const segments: BleepSegment[] = [
        { word: 'hello', start: 0.1, end: 0.3 },
        { word: 'world', start: 0.31, end: 0.5 },
      ];

      const buffered = segments.map(seg => applyBufferToSegment(seg, 0.2));
      const merged = mergeOverlappingBleeps(buffered);

      expect(merged).toHaveLength(1);
      expect(merged[0].start).toBe(0); // Clamped to 0
      expect(merged[0].end).toBe(0.7);
      expect(merged[0].word).toBe('hello, world');
    });

    it('should merge segments with maximum buffer (0.5s)', () => {
      // Segments 0.8s apart, but with 0.5s buffer they overlap
      const segments: BleepSegment[] = [
        { word: 'hello', start: 1.0, end: 1.2 },
        { word: 'world', start: 2.0, end: 2.2 },
      ];

      // With 0.5s buffer: hello is 0.5-1.7, world is 1.5-2.7
      const buffered = segments.map(seg => applyBufferToSegment(seg, 0.5));
      const merged = mergeOverlappingBleeps(buffered);

      expect(merged).toHaveLength(1);
      expect(merged[0].start).toBe(0.5);
      expect(merged[0].end).toBe(2.7);
    });
  });
});
