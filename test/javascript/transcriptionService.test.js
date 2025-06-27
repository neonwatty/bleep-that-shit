import { describe, it, expect, vi, beforeEach } from "vitest";
import { pipeline } from "@huggingface/transformers";
import { TranscriptionService } from "../../app/javascript/services/transcriptionService";
import { cachedFetch } from "../../app/javascript/utils/cachedFetch";
import {
  processAudioInChunks,
  mergeChunkResults,
} from "../../app/javascript/utils/audioProcessor";

// Mock the transformers pipeline
vi.mock("@huggingface/transformers", () => ({
  pipeline: vi.fn(),
}));

// Mock cachedFetch
vi.mock("../../app/javascript/utils/cachedFetch", () => ({
  cachedFetch: vi.fn(),
}));

// Mock processAudioInChunks and mergeChunkResults
vi.mock("../../app/javascript/utils/audioProcessor", () => ({
  processAudioInChunks: vi.fn(),
  mergeChunkResults: vi.fn(),
}));

// Helper to create a dummy audio buffer
function createDummyAudioBuffer(durationSeconds, sampleRate = 16000) {
  return new Float32Array(durationSeconds * sampleRate);
}

// Helper to create mock transcription chunks
function createMockChunks(count, baseTime = 0) {
  return Array.from({ length: count }, (_, i) => ({
    text: `Chunk ${i + 1} text`,
    timestamp: [baseTime + i * 2, baseTime + (i + 1) * 2],
    confidence: 0.8 + i * 0.05,
  }));
}

describe("TranscriptionService", () => {
  let service;
  let mockPipeline;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock pipeline function
    mockPipeline = vi.fn().mockImplementation(async (audio, options) => ({
      chunks: createMockChunks(2),
    }));

    // Set up pipeline mock
    pipeline.mockResolvedValue(mockPipeline);

    // Set up processAudioInChunks mock
    processAudioInChunks.mockImplementation(
      async (buffer, processor, options) => {
        const chunks = createMockChunks(3);
        const results = chunks.map((chunk, i) => ({
          ...chunk,
          start: i * options.chunkDuration,
          end: (i + 1) * options.chunkDuration,
        }));

        // Call the processor for each chunk to simulate real behavior
        for (let i = 0; i < chunks.length; i++) {
          const chunkInfo = {
            chunk: buffer.slice(i * 16000, (i + 1) * 16000),
            start: i * options.chunkDuration,
          };
          await processor(chunkInfo);

          // Call progress callback if provided
          if (options.onProgress) {
            options.onProgress((i + 1) / chunks.length);
          }
        }

        return results;
      }
    );

    // Set up mergeChunkResults mock
    mergeChunkResults.mockImplementation((chunks) => chunks);

    // Create new service instance
    service = new TranscriptionService();
  });

  describe("initialize", () => {
    it("should initialize with default model", async () => {
      await service.initialize();
      expect(pipeline).toHaveBeenCalledWith(
        "automatic-speech-recognition",
        "onnx-community/whisper-base_timestamped",
        expect.objectContaining({
          fetch: cachedFetch,
          quantized: true,
        })
      );
      expect(service.isInitialized).toBe(true);
    });

    it("should initialize with advanced model", async () => {
      await service.initialize({
        model: "onnx-community/whisper-large-v3-turbo_timestamped",
      });
      expect(pipeline).toHaveBeenCalledWith(
        "automatic-speech-recognition",
        "onnx-community/whisper-large-v3-turbo_timestamped",
        expect.any(Object)
      );
    });

    it("should skip initialization if already initialized with same model", async () => {
      await service.initialize();
      await service.initialize();
      expect(pipeline).toHaveBeenCalledTimes(1);
    });

    it("should reinitialize if model changes", async () => {
      await service.initialize();
      await service.initialize({ model: "custom-model" });
      expect(pipeline).toHaveBeenCalledTimes(2);
    });

    it("should handle initialization errors", async () => {
      const error = new Error("Failed to load");
      pipeline.mockRejectedValueOnce(error);
      await expect(service.initialize()).rejects.toThrow(
        "Failed to initialize"
      );
      expect(service.isInitialized).toBe(false);
    });
  });

  describe("transcribe", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should transcribe short audio successfully", async () => {
      const audioBuffer = createDummyAudioBuffer(5);
      const onProgress = vi.fn();
      const onChunkComplete = vi.fn();

      const results = await service.transcribe(audioBuffer, {
        onProgress,
        onChunkComplete,
      });

      expect(results).toHaveLength(3);
      expect(onProgress).toHaveBeenCalled();
      expect(onChunkComplete).toHaveBeenCalled();
    });

    it("should handle long audio with memory constraints", async () => {
      const audioBuffer = createDummyAudioBuffer(120); // 2 minutes
      const maxMemoryMB = 512;
      const results = [];

      await service.transcribe(audioBuffer, {
        maxMemoryMB,
        onChunkComplete: (chunk) => results.push(...chunk),
      });

      expect(processAudioInChunks).toHaveBeenCalledWith(
        audioBuffer,
        expect.any(Function),
        expect.objectContaining({ maxMemoryMB })
      );
    });

    it("should respect chunk duration and overlap settings", async () => {
      const audioBuffer = createDummyAudioBuffer(60);
      await service.transcribe(audioBuffer, {
        chunkDuration: 15,
        overlapDuration: 3,
      });

      expect(processAudioInChunks).toHaveBeenCalledWith(
        audioBuffer,
        expect.any(Function),
        expect.objectContaining({
          chunkDuration: 15,
          overlapDuration: 3,
        })
      );
    });

    it("should handle different languages correctly", async () => {
      const audioBuffer = createDummyAudioBuffer(10);
      await service.transcribe(audioBuffer, { language: "fr" });

      // Wait for all promises to resolve
      await vi.waitFor(() => {
        expect(mockPipeline).toHaveBeenCalledWith(
          expect.any(Float32Array),
          expect.objectContaining({ language: "fr" })
        );
      });
    });

    it("should handle auto language detection", async () => {
      const audioBuffer = createDummyAudioBuffer(10);
      await service.transcribe(audioBuffer, { language: "auto" });

      // Wait for all promises to resolve
      await vi.waitFor(() => {
        expect(mockPipeline).toHaveBeenCalledWith(
          expect.any(Float32Array),
          expect.objectContaining({ language: "auto" })
        );
      });
    });

    it("should handle empty audio gracefully", async () => {
      const audioBuffer = createDummyAudioBuffer(0);
      await expect(service.transcribe(audioBuffer)).resolves.not.toThrow();
    });

    it("should handle transcription errors in chunks", async () => {
      const audioBuffer = createDummyAudioBuffer(10);
      mockPipeline.mockRejectedValueOnce(new Error("Processing failed"));

      // Mock processAudioInChunks to actually call the processor
      processAudioInChunks.mockImplementationOnce(async (buffer, processor) => {
        const chunkInfo = {
          chunk: buffer.slice(0, 16000),
          start: 0,
        };
        return processor(chunkInfo); // This should now throw
      });

      await expect(service.transcribe(audioBuffer)).rejects.toThrow(
        "Transcription failed"
      );
    });

    it("should merge overlapping transcriptions correctly", async () => {
      const audioBuffer = createDummyAudioBuffer(30);
      const mockResults = [
        { text: "First part", start: 0, end: 2 },
        { text: "Overlapping", start: 1.8, end: 3.5 },
        { text: "Final part", start: 3.2, end: 5 },
      ];

      mergeChunkResults.mockReturnValueOnce(mockResults);

      const results = await service.transcribe(audioBuffer, {
        chunkDuration: 10,
        overlapDuration: 2,
      });

      expect(results).toEqual(mockResults);
      expect(mergeChunkResults).toHaveBeenCalled();
    });
  });

  describe("isModelReady", () => {
    it("should return true when model is available and cached", async () => {
      cachedFetch.mockResolvedValueOnce({ ok: true });
      const result = await service.isModelReady();
      expect(result).toBe(true);
      expect(cachedFetch).toHaveBeenCalledWith(
        expect.stringContaining("config.json")
      );
    });

    it("should return false when model is not available", async () => {
      cachedFetch.mockRejectedValueOnce(new Error("Not found"));
      const result = await service.isModelReady();
      expect(result).toBe(false);
    });

    it("should return false when model config request fails", async () => {
      cachedFetch.mockResolvedValueOnce({ ok: false });
      const result = await service.isModelReady();
      expect(result).toBe(false);
    });

    it("should check specific model when provided", async () => {
      const customModel = "custom/model";
      await service.isModelReady(customModel);
      expect(cachedFetch).toHaveBeenCalledWith(
        expect.stringContaining(customModel)
      );
    });
  });

  describe("getSupportedLanguages", () => {
    it("should return a list of supported languages", async () => {
      const languages = await service.getSupportedLanguages();
      expect(languages).toContainEqual({ code: "auto", name: "Auto-detect" });
      expect(languages).toContainEqual({ code: "en", name: "English" });
      expect(languages.length).toBeGreaterThan(0);
    });
  });
});
