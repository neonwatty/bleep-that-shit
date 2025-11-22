import { describe, it, expect } from 'vitest';
import { applyBleeps, BleepSegment } from './audioProcessor';

describe('audioProcessor', () => {
  describe('BleepSegment interface', () => {
    it('should create valid BleepSegment objects', () => {
      const segment: BleepSegment = {
        word: 'bad',
        start: 1.5,
        end: 2.0,
      };

      expect(segment.word).toBe('bad');
      expect(segment.start).toBe(1.5);
      expect(segment.end).toBe(2.0);
      expect(segment.end - segment.start).toBe(0.5);
    });

    it('should handle multiple segments', () => {
      const segments: BleepSegment[] = [
        { word: 'bad', start: 1.0, end: 1.5 },
        { word: 'worse', start: 3.0, end: 3.8 },
        { word: 'worst', start: 5.0, end: 5.5 },
      ];

      expect(segments).toHaveLength(3);
      expect(segments[0].word).toBe('bad');
      expect(segments[1].start).toBe(3.0);
      expect(segments[2].end).toBe(5.5);
    });
  });

  describe('applyBleeps', () => {
    it('should apply bleeps to audio file', async () => {
      const mockFile = new File([new ArrayBuffer(1000)], 'test.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [{ word: 'bad', start: 1.0, end: 1.5 }];

      const result = await applyBleeps(mockFile, segments);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });

    it('should accept custom bleep sound parameter', async () => {
      const mockFile = new File([new ArrayBuffer(1000)], 'test.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [{ word: 'bad', start: 1.0, end: 1.5 }];

      const result = await applyBleeps(mockFile, segments, 'brown-noise');

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });

    it('should accept custom bleep volume parameter', async () => {
      const mockFile = new File([new ArrayBuffer(1000)], 'test.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [{ word: 'bad', start: 1.0, end: 1.5 }];

      const result = await applyBleeps(mockFile, segments, 'bleep', 0.5);

      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle multiple bleep segments', async () => {
      const mockFile = new File([new ArrayBuffer(2000)], 'test.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [
        { word: 'bad', start: 1.0, end: 1.5 },
        { word: 'worse', start: 2.0, end: 2.5 },
        { word: 'worst', start: 3.0, end: 3.5 },
      ];

      const result = await applyBleeps(mockFile, segments);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });

    it('should handle empty segments array', async () => {
      const mockFile = new File([new ArrayBuffer(1000)], 'test.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [];

      const result = await applyBleeps(mockFile, segments);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });

    it('should handle segments with zero duration', async () => {
      const mockFile = new File([new ArrayBuffer(1000)], 'test.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [{ word: 'instant', start: 1.0, end: 1.0 }];

      const result = await applyBleeps(mockFile, segments);

      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle segments starting at timestamp 0 without error', async () => {
      const mockFile = new File([new ArrayBuffer(1000)], 'test.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [{ word: 'first', start: 0.0, end: 0.5 }];

      const result = await applyBleeps(mockFile, segments);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });

    it('should handle segments starting very close to timestamp 0', async () => {
      const mockFile = new File([new ArrayBuffer(1000)], 'test.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [{ word: 'early', start: 0.005, end: 0.3 }];

      const result = await applyBleeps(mockFile, segments);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });
  });

  describe('WAV encoding', () => {
    it('should produce valid WAV blob with correct type', async () => {
      const mockFile = new File([new ArrayBuffer(1000)], 'test.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [{ word: 'test', start: 0.5, end: 1.0 }];

      const result = await applyBleeps(mockFile, segments);

      expect(result.type).toBe('audio/wav');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should include WAV header (minimum 44 bytes)', async () => {
      const mockFile = new File([new ArrayBuffer(100)], 'test.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [];

      const result = await applyBleeps(mockFile, segments);

      expect(result.size).toBeGreaterThanOrEqual(44);
    });
  });

  describe('Edge cases', () => {
    it('should handle overlapping segments', async () => {
      const mockFile = new File([new ArrayBuffer(1000)], 'test.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [
        { word: 'first', start: 1.0, end: 2.0 },
        { word: 'second', start: 1.5, end: 2.5 },
      ];

      const result = await applyBleeps(mockFile, segments);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });

    it('should handle segments with negative start time (defensive)', async () => {
      const mockFile = new File([new ArrayBuffer(1000)], 'test.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [{ word: 'negative', start: -0.5, end: 0.5 }];

      const result = await applyBleeps(mockFile, segments);

      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle segments in non-chronological order', async () => {
      const mockFile = new File([new ArrayBuffer(2000)], 'test.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [
        { word: 'third', start: 5.0, end: 5.5 },
        { word: 'first', start: 1.0, end: 1.5 },
        { word: 'second', start: 3.0, end: 3.5 },
      ];

      const result = await applyBleeps(mockFile, segments);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });

    it('should handle very large volume value', async () => {
      const mockFile = new File([new ArrayBuffer(1000)], 'test.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [{ word: 'loud', start: 1.0, end: 1.5 }];

      const result = await applyBleeps(mockFile, segments, 'bleep', 2.0);

      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle zero volume', async () => {
      const mockFile = new File([new ArrayBuffer(1000)], 'test.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [{ word: 'silent', start: 1.0, end: 1.5 }];

      const result = await applyBleeps(mockFile, segments, 'bleep', 0);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });

    it('should handle segments with very long duration', async () => {
      const mockFile = new File([new ArrayBuffer(10000)], 'long.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [{ word: 'long', start: 0.0, end: 10.0 }];

      const result = await applyBleeps(mockFile, segments);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });

    it('should handle segments with very short duration', async () => {
      const mockFile = new File([new ArrayBuffer(1000)], 'test.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [{ word: 'quick', start: 1.0, end: 1.001 }];

      const result = await applyBleeps(mockFile, segments);

      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle many consecutive segments', async () => {
      const mockFile = new File([new ArrayBuffer(10000)], 'test.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = Array.from({ length: 20 }, (_, i) => ({
        word: `word${i}`,
        start: i * 0.5,
        end: i * 0.5 + 0.3,
      }));

      const result = await applyBleeps(mockFile, segments);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });

    it('should handle segments with end before start (invalid)', async () => {
      const mockFile = new File([new ArrayBuffer(1000)], 'test.mp3', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [{ word: 'backwards', start: 2.0, end: 1.0 }];

      const result = await applyBleeps(mockFile, segments);

      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle empty file name', async () => {
      const mockFile = new File([new ArrayBuffer(1000)], '', { type: 'audio/mp3' });
      const segments: BleepSegment[] = [{ word: 'test', start: 1.0, end: 1.5 }];

      const result = await applyBleeps(mockFile, segments);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('audio/wav');
    });
  });
});
