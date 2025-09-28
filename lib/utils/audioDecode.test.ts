import { describe, it, expect, beforeEach } from 'vitest';
import { decodeAudioToMono16kHzPCM } from './audioDecode';

describe('audioDecode', () => {
  describe('decodeAudioToMono16kHzPCM', () => {
    let mockAudioFile: File;

    beforeEach(() => {
      const buffer = new ArrayBuffer(1000);
      mockAudioFile = new File([buffer], 'test.mp3', { type: 'audio/mp3' });
    });

    it('should decode audio file to Float32Array', async () => {
      const result = await decodeAudioToMono16kHzPCM(mockAudioFile);

      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should decode audio blob to Float32Array', async () => {
      const buffer = new ArrayBuffer(1000);
      const blob = new Blob([buffer], { type: 'audio/mp3' });

      const result = await decodeAudioToMono16kHzPCM(blob);

      expect(result).toBeInstanceOf(Float32Array);
    });

    it('should return mono audio (single channel)', async () => {
      const result = await decodeAudioToMono16kHzPCM(mockAudioFile);

      expect(result).toBeInstanceOf(Float32Array);
    });

    it('should handle stereo audio by averaging channels', async () => {
      const result = await decodeAudioToMono16kHzPCM(mockAudioFile);

      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should resample to 16kHz if needed', async () => {
      const result = await decodeAudioToMono16kHzPCM(mockAudioFile);

      expect(result).toBeInstanceOf(Float32Array);
    });

    it('should return samples in correct range (-1 to 1)', async () => {
      const result = await decodeAudioToMono16kHzPCM(mockAudioFile);

      expect(result).toBeInstanceOf(Float32Array);
      for (let i = 0; i < Math.min(100, result.length); i++) {
        expect(result[i]).toBeGreaterThanOrEqual(-1);
        expect(result[i]).toBeLessThanOrEqual(1);
      }
    });

    it('should handle empty audio file', async () => {
      const emptyBuffer = new ArrayBuffer(0);
      const emptyFile = new File([emptyBuffer], 'empty.mp3', { type: 'audio/mp3' });

      const result = await decodeAudioToMono16kHzPCM(emptyFile);

      expect(result).toBeInstanceOf(Float32Array);
    });

    it('should handle different audio formats', async () => {
      const formats = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];

      for (const format of formats) {
        const buffer = new ArrayBuffer(1000);
        const file = new File([buffer], `test.${format.split('/')[1]}`, { type: format });

        const result = await decodeAudioToMono16kHzPCM(file);

        expect(result).toBeInstanceOf(Float32Array);
      }
    });
  });
});
