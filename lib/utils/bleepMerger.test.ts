import { describe, it, expect } from 'vitest';
import { mergeOverlappingBleeps, applyBufferToSegment, getBleepStats } from './bleepMerger';
import type { BleepSegment } from '@/lib/types/bleep';

describe('bleepMerger', () => {
  describe('mergeOverlappingBleeps', () => {
    it('returns empty array for empty input', () => {
      const result = mergeOverlappingBleeps([]);
      expect(result).toEqual([]);
    });

    it('returns single segment unchanged', () => {
      const segments: BleepSegment[] = [
        {
          id: 'word-1',
          word: 'hello',
          start: 0,
          end: 1,
          source: 'word',
          color: '#ec4899',
        },
      ];
      const result = mergeOverlappingBleeps(segments);
      expect(result).toEqual(segments);
    });

    it('does not merge non-overlapping segments', () => {
      const segments: BleepSegment[] = [
        {
          id: 'word-1',
          word: 'hello',
          start: 0,
          end: 1,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'word-2',
          word: 'world',
          start: 2,
          end: 3,
          source: 'word',
          color: '#ec4899',
        },
      ];
      const result = mergeOverlappingBleeps(segments);
      expect(result).toEqual(segments);
    });

    it('merges overlapping word-based segments', () => {
      const segments: BleepSegment[] = [
        {
          id: 'word-1',
          word: 'hello',
          start: 0,
          end: 1.5,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'word-2',
          word: 'world',
          start: 1.0,
          end: 2.0,
          source: 'word',
          color: '#ec4899',
        },
      ];
      const result = mergeOverlappingBleeps(segments);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'word-1_word-2',
        word: 'hello, world',
        start: 0,
        end: 2.0,
        source: 'word',
        color: '#ec4899',
      });
    });

    it('marks mixed word+manual overlap as merged with purple color', () => {
      const segments: BleepSegment[] = [
        {
          id: 'word-1',
          word: 'bad',
          start: 1.0,
          end: 2.0,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'manual-1',
          word: 'Manual',
          start: 1.5,
          end: 3.0,
          source: 'manual',
          color: '#3b82f6',
        },
      ];

      const result = mergeOverlappingBleeps(segments);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'word-1_manual-1',
        word: 'bad, Manual',
        start: 1.0,
        end: 3.0,
        source: 'merged',
        color: '#9333ea', // purple
      });
    });

    it('merges touching segments (end === next start)', () => {
      const segments: BleepSegment[] = [
        {
          id: 'word-1',
          word: 'hello',
          start: 0,
          end: 1.0,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'word-2',
          word: 'world',
          start: 1.0,
          end: 2.0,
          source: 'word',
          color: '#ec4899',
        },
      ];
      const result = mergeOverlappingBleeps(segments);
      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('hello, world');
      expect(result[0].start).toBe(0);
      expect(result[0].end).toBe(2.0);
    });

    it('merges multiple overlapping segments', () => {
      const segments: BleepSegment[] = [
        {
          id: 'word-1',
          word: 'one',
          start: 0,
          end: 1.5,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'word-2',
          word: 'two',
          start: 1.0,
          end: 2.5,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'word-3',
          word: 'three',
          start: 2.0,
          end: 3.0,
          source: 'word',
          color: '#ec4899',
        },
      ];
      const result = mergeOverlappingBleeps(segments);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'word-1_word-2_word-3',
        word: 'one, two, three',
        start: 0,
        end: 3.0,
        source: 'word',
        color: '#ec4899',
      });
    });

    it('handles mix of overlapping and non-overlapping segments', () => {
      const segments: BleepSegment[] = [
        {
          id: 'word-1',
          word: 'one',
          start: 0,
          end: 1.0,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'word-2',
          word: 'two',
          start: 0.5,
          end: 1.5,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'word-3',
          word: 'three',
          start: 3.0,
          end: 4.0,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'word-4',
          word: 'four',
          start: 3.5,
          end: 4.5,
          source: 'word',
          color: '#ec4899',
        },
      ];
      const result = mergeOverlappingBleeps(segments);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'word-1_word-2',
        word: 'one, two',
        start: 0,
        end: 1.5,
        source: 'word',
        color: '#ec4899',
      });
      expect(result[1]).toEqual({
        id: 'word-3_word-4',
        word: 'three, four',
        start: 3.0,
        end: 4.5,
        source: 'word',
        color: '#ec4899',
      });
    });

    it('sorts segments by start time before merging', () => {
      const segments: BleepSegment[] = [
        {
          id: 'word-3',
          word: 'three',
          start: 4.0,
          end: 5.0,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'word-1',
          word: 'one',
          start: 0,
          end: 1.0,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'word-2',
          word: 'two',
          start: 2.0,
          end: 3.0,
          source: 'word',
          color: '#ec4899',
        },
      ];
      const result = mergeOverlappingBleeps(segments);
      expect(result).toHaveLength(3);
      expect(result[0].word).toBe('one');
      expect(result[1].word).toBe('two');
      expect(result[2].word).toBe('three');
    });

    it('handles segment completely contained in another', () => {
      const segments: BleepSegment[] = [
        {
          id: 'word-1',
          word: 'outer',
          start: 0,
          end: 5.0,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'word-2',
          word: 'inner',
          start: 2.0,
          end: 3.0,
          source: 'word',
          color: '#ec4899',
        },
      ];
      const result = mergeOverlappingBleeps(segments);
      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('outer, inner');
      expect(result[0].start).toBe(0);
      expect(result[0].end).toBe(5.0);
    });

    it('merges segments within GAIN_RAMP_BUFFER (0.02s)', () => {
      const segments: BleepSegment[] = [
        {
          id: 'word-1',
          word: 'hello',
          start: 1.0,
          end: 1.5,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'word-2',
          word: 'world',
          start: 1.51,
          end: 2.0,
          source: 'word',
          color: '#ec4899',
        },
      ];

      const merged = mergeOverlappingBleeps(segments);
      expect(merged).toHaveLength(1);
      expect(merged[0].word).toBe('hello, world');
      expect(merged[0].start).toBe(1.0);
      expect(merged[0].end).toBe(2.0);
    });

    it('does not merge segments beyond GAIN_RAMP_BUFFER', () => {
      const segments: BleepSegment[] = [
        {
          id: 'word-1',
          word: 'hello',
          start: 1.0,
          end: 1.5,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'word-2',
          word: 'world',
          start: 1.53,
          end: 2.0,
          source: 'word',
          color: '#ec4899',
        },
      ];

      const merged = mergeOverlappingBleeps(segments);
      expect(merged).toHaveLength(2);
      expect(merged[0].word).toBe('hello');
      expect(merged[1].word).toBe('world');
    });
  });

  describe('applyBufferToSegment', () => {
    it('applies buffer to both start and end', () => {
      const segment: BleepSegment = {
        id: 'word-1',
        word: 'test',
        start: 2.0,
        end: 3.0,
        source: 'word',
        color: '#ec4899',
      };
      const result = applyBufferToSegment(segment, 0.5);
      expect(result).toEqual({
        id: 'word-1',
        word: 'test',
        start: 1.5,
        end: 3.5,
        source: 'word',
        color: '#ec4899',
      });
    });

    it('prevents negative start time', () => {
      const segment: BleepSegment = {
        id: 'word-1',
        word: 'test',
        start: 0.2,
        end: 1.0,
        source: 'word',
        color: '#ec4899',
      };
      const result = applyBufferToSegment(segment, 0.5);
      expect(result.start).toBe(0);
      expect(result.end).toBe(1.5);
    });

    it('handles zero buffer', () => {
      const segment: BleepSegment = {
        id: 'word-1',
        word: 'test',
        start: 1.0,
        end: 2.0,
        source: 'word',
        color: '#ec4899',
      };
      const result = applyBufferToSegment(segment, 0);
      expect(result).toEqual(segment);
    });

    it('handles segment at start of audio (start=0)', () => {
      const segment: BleepSegment = {
        id: 'word-1',
        word: 'test',
        start: 0,
        end: 1.0,
        source: 'word',
        color: '#ec4899',
      };
      const result = applyBufferToSegment(segment, 0.5);
      expect(result.start).toBe(0);
      expect(result.end).toBe(1.5);
    });
  });

  describe('getBleepStats', () => {
    it('returns zero counts for empty array', () => {
      const stats = getBleepStats([]);
      expect(stats).toEqual({
        word: 0,
        manual: 0,
        merged: 0,
        total: 0,
      });
    });

    it('counts word-based bleeps correctly', () => {
      const segments: BleepSegment[] = [
        {
          id: 'word-1',
          word: 'bad',
          start: 1.0,
          end: 2.0,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'word-2',
          word: 'shit',
          start: 5.0,
          end: 6.0,
          source: 'word',
          color: '#ec4899',
        },
      ];

      const stats = getBleepStats(segments);
      expect(stats).toEqual({
        word: 2,
        manual: 0,
        merged: 0,
        total: 2,
      });
    });

    it('counts manual bleeps correctly', () => {
      const segments: BleepSegment[] = [
        {
          id: 'manual-1',
          word: 'Manual 1',
          start: 1.0,
          end: 2.0,
          source: 'manual',
          color: '#3b82f6',
        },
        {
          id: 'manual-2',
          word: 'Manual 2',
          start: 5.0,
          end: 6.0,
          source: 'manual',
          color: '#3b82f6',
        },
      ];

      const stats = getBleepStats(segments);
      expect(stats).toEqual({
        word: 0,
        manual: 2,
        merged: 0,
        total: 2,
      });
    });

    it('counts mixed sources correctly', () => {
      const segments: BleepSegment[] = [
        {
          id: 'word-1',
          word: 'bad',
          start: 1.0,
          end: 2.0,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'manual-1',
          word: 'Manual',
          start: 3.0,
          end: 4.0,
          source: 'manual',
          color: '#3b82f6',
        },
        {
          id: 'merged-1',
          word: 'bad, Manual',
          start: 5.0,
          end: 6.0,
          source: 'merged',
          color: '#9333ea',
        },
        {
          id: 'word-2',
          word: 'damn',
          start: 7.0,
          end: 8.0,
          source: 'word',
          color: '#ec4899',
        },
      ];

      const stats = getBleepStats(segments);
      expect(stats).toEqual({
        word: 2,
        manual: 1,
        merged: 1,
        total: 4,
      });
    });

    it('counts after merging overlaps', () => {
      const segments: BleepSegment[] = [
        {
          id: 'word-1',
          word: 'bad',
          start: 1.0,
          end: 2.0,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'manual-1',
          word: 'Manual',
          start: 1.5,
          end: 3.0,
          source: 'manual',
          color: '#3b82f6',
        },
        {
          id: 'word-2',
          word: 'shit',
          start: 5.0,
          end: 6.0,
          source: 'word',
          color: '#ec4899',
        },
      ];

      const merged = mergeOverlappingBleeps(segments);
      const stats = getBleepStats(merged);

      expect(stats.total).toBe(2);
      expect(stats.merged).toBe(1); // word + manual overlap
      expect(stats.word).toBe(1); // standalone word bleep
      expect(stats.manual).toBe(0); // no standalone manual bleeps
    });
  });

  describe('integration: buffer + merge', () => {
    it('merges segments that overlap after buffer is applied', () => {
      const segments: BleepSegment[] = [
        {
          id: 'word-1',
          word: 'hello',
          start: 1.0,
          end: 1.5,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'word-2',
          word: 'world',
          start: 2.0,
          end: 2.5,
          source: 'word',
          color: '#ec4899',
        },
      ];

      const buffered = segments.map(seg => applyBufferToSegment(seg, 0.3));
      const merged = mergeOverlappingBleeps(buffered);

      expect(merged).toHaveLength(1);
      expect(merged[0].word).toBe('hello, world');
      expect(merged[0].start).toBe(0.7);
      expect(merged[0].end).toBe(2.8);
    });

    it('does not merge segments with insufficient buffer', () => {
      const segments: BleepSegment[] = [
        {
          id: 'word-1',
          word: 'hello',
          start: 1.0,
          end: 1.5,
          source: 'word',
          color: '#ec4899',
        },
        {
          id: 'word-2',
          word: 'world',
          start: 3.0,
          end: 3.5,
          source: 'word',
          color: '#ec4899',
        },
      ];

      const buffered = segments.map(seg => applyBufferToSegment(seg, 0.2));
      const merged = mergeOverlappingBleeps(buffered);

      expect(merged).toHaveLength(2);
    });
  });
});
