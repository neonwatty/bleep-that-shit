import { describe, it, expect, vi } from "vitest";
import {
  createChunkProcessor,
  processAudioInChunks,
  mergeChunkResults,
} from "../../app/javascript/utils/audioProcessor";

// Helper to create a dummy audio buffer of specified duration
function createDummyAudioBuffer(durationSeconds, sampleRate = 16000) {
  const samples = new Float32Array(durationSeconds * sampleRate);
  for (let i = 0; i < samples.length; i++) {
    // Create a simple sine wave
    samples[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
  }
  return samples;
}

describe("Audio Processor", () => {
  describe("createChunkProcessor", () => {
    it("should chunk audio into correct sizes with overlap", async () => {
      const audioBuffer = createDummyAudioBuffer(65); // 65 seconds
      const config = {
        chunkDuration: 30,
        overlapDuration: 5,
        maxMemoryMB: 1024,
        onProgress: vi.fn(),
      };

      const chunks = [];
      for await (const chunk of createChunkProcessor(audioBuffer, config)) {
        chunks.push(chunk);
      }

      // Should have 3 chunks for 65 seconds (30s + 30s + 5s)
      expect(chunks.length).toBe(3);

      // First chunk
      expect(chunks[0].start).toBe(0);
      expect(chunks[0].end).toBe(30);
      expect(chunks[0].overlapStart).toBeNull();
      expect(chunks[0].overlapEnd).toBe(30);

      // Second chunk (with overlap)
      expect(chunks[1].start).toBe(25); // 30 - 5 overlap
      expect(chunks[1].end).toBe(55);
      expect(chunks[1].overlapStart).toBe(25);
      expect(chunks[1].overlapEnd).toBe(55);

      // Last chunk (with overlap)
      expect(chunks[2].start).toBe(50); // 55 - 5 overlap
      expect(chunks[2].end).toBe(65);
      expect(chunks[2].overlapStart).toBe(50);
      expect(chunks[2].overlapEnd).toBeNull();

      // Check progress callback
      expect(config.onProgress).toHaveBeenCalledTimes(3);
      expect(config.onProgress).toHaveBeenLastCalledWith(100);
    });

    it("should handle short audio files", async () => {
      const audioBuffer = createDummyAudioBuffer(15); // 15 seconds
      const chunks = [];
      for await (const chunk of createChunkProcessor(audioBuffer)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0].start).toBe(0);
      expect(chunks[0].end).toBe(15);
      expect(chunks[0].overlapStart).toBeNull();
      expect(chunks[0].overlapEnd).toBeNull();
    });

    it("should respect memory limits", async () => {
      const audioBuffer = createDummyAudioBuffer(120); // 120 seconds
      const config = {
        chunkDuration: 30,
        overlapDuration: 5,
        maxMemoryMB: 1, // Very small memory limit
        onProgress: vi.fn(),
      };

      const chunks = [];
      for await (const chunk of createChunkProcessor(audioBuffer, config)) {
        chunks.push(chunk);
      }

      // Should have more chunks due to memory constraints
      expect(chunks.length).toBeGreaterThan(4);
      chunks.forEach((chunk) => {
        const durationSeconds = chunk.end - chunk.start;
        expect(durationSeconds).toBeLessThanOrEqual(30);
        expect(durationSeconds).toBeGreaterThanOrEqual(10);
      });
    });
  });

  describe("processAudioInChunks", () => {
    it("should process all chunks and collect results", async () => {
      const audioBuffer = createDummyAudioBuffer(65);
      const mockProcessor = vi
        .fn()
        .mockImplementation(({ chunk, start, end }) => ({
          text: `Processed ${end - start}s chunk`,
          start,
          end,
        }));

      const results = await processAudioInChunks(audioBuffer, mockProcessor);

      expect(results.length).toBeGreaterThan(0);
      expect(mockProcessor).toHaveBeenCalled();
      results.forEach((result) => {
        expect(result).toHaveProperty("text");
        expect(result).toHaveProperty("start");
        expect(result).toHaveProperty("end");
      });
    });
  });

  describe("mergeChunkResults", () => {
    it("should merge overlapping results correctly", () => {
      const results = [
        [
          { text: "Hello", start: 0, end: 2, confidence: 0.9 },
          { text: "world", start: 2, end: 4, confidence: 0.85 },
        ],
        [
          { text: "world", start: 2, end: 4, confidence: 0.7 }, // Lower confidence duplicate
          { text: "today", start: 4, end: 6, confidence: 0.95 },
        ],
      ];

      const merged = mergeChunkResults(results);

      // Should keep the higher confidence 'world' and merge properly
      expect(merged).toEqual([
        { text: "Hello", start: 0, end: 2, confidence: 0.9 },
        { text: "world", start: 2, end: 4, confidence: 0.85 },
        { text: "today", start: 4, end: 6, confidence: 0.95 },
      ]);
    });

    it("should handle empty results", () => {
      expect(mergeChunkResults([])).toEqual([]);
    });

    it("should handle single chunk results", () => {
      const singleChunk = [
        { text: "Hello", start: 0, end: 1, confidence: 0.9 },
      ];
      expect(mergeChunkResults([singleChunk])).toEqual(singleChunk);
    });
  });
});
