import { pipeline } from "@huggingface/transformers";
import {
  createChunkProcessor,
  processAudioInChunks,
  mergeChunkResults,
} from "../utils/audioProcessor";
import { cachedFetch } from "../utils/cachedFetch";

// Constants for transcription
const DEFAULT_MODEL = "onnx-community/whisper-base_timestamped";
const ADVANCED_MODEL = "onnx-community/whisper-large-v3-turbo_timestamped";
const DEFAULT_LANGUAGE = "auto";

/**
 * Configuration for transcription
 * @typedef {Object} TranscriptionConfig
 * @property {string} model - Model ID to use (default: whisper-base_timestamped)
 * @property {string} language - Language code or 'auto' for detection
 * @property {number} chunkDuration - Duration of each chunk in seconds
 * @property {number} overlapDuration - Duration of overlap between chunks
 * @property {number} maxMemoryMB - Maximum memory usage in MB
 * @property {Function} onProgress - Callback for progress updates
 * @property {Function} onChunkComplete - Callback when a chunk is processed
 */

export class TranscriptionService {
  constructor() {
    this.pipeline = null;
    this.model = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the transcription service with a specific model
   * @param {TranscriptionConfig} config - Configuration options
   */
  async initialize(config = {}) {
    const { model = DEFAULT_MODEL } = config;

    if (this.isInitialized && this.model === model) {
      return;
    }

    try {
      this.pipeline = await pipeline("automatic-speech-recognition", model, {
        fetch: cachedFetch,
        quantized: true,
        revision: "main",
      });

      this.model = model;
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize transcription service:", error);
      this.isInitialized = false;
      throw new Error(
        "Failed to initialize transcription service: " + error.message
      );
    }
  }

  /**
   * Process a single chunk of audio
   * @private
   * @param {Object} chunkInfo - Chunk information from audio processor
   * @param {TranscriptionConfig} config - Transcription configuration
   * @returns {Promise<Array>} Transcription results for the chunk
   * @throws {Error} If transcription fails
   */
  async #processChunk(chunkInfo, config) {
    const { chunk, start: chunkStart } = chunkInfo;
    const { language = DEFAULT_LANGUAGE } = config;

    if (!this.pipeline) {
      throw new Error("Transcription service not initialized");
    }

    try {
      // Process chunk with Whisper model
      const result = await this.pipeline(chunk, {
        language,
        return_timestamps: true,
        chunk_length_s: chunk.length / 16000, // Convert samples to seconds
        stride_length_s: config.overlapDuration || 5,
      });

      // Adjust timestamps relative to chunk start time
      return result.chunks.map((item) => ({
        text: item.text,
        start: chunkStart + item.timestamp[0],
        end: chunkStart + item.timestamp[1],
        confidence: item.confidence || 0.9,
        timestamp: item.timestamp, // Keep original timestamps for merging
      }));
    } catch (error) {
      console.error("Error processing chunk:", error);
      throw error; // Let the transcribe method handle the error
    }
  }

  /**
   * Transcribe an audio buffer with timestamps
   * @param {Float32Array} audioBuffer - Audio buffer (mono, 16kHz)
   * @param {TranscriptionConfig} config - Transcription configuration
   * @returns {Promise<Array<{text: string, start: number, end: number, confidence: number}>>}
   * @throws {Error} If transcription fails
   */
  async transcribe(audioBuffer, config = {}) {
    if (!this.isInitialized) {
      await this.initialize(config);
    }
    const { language = DEFAULT_LANGUAGE } = config;

    if (!audioBuffer || audioBuffer.length === 0) {
      return [];
    }

    try {
      const durationSeconds = audioBuffer.length / 16000;
      const result = await this.pipeline(audioBuffer, {
        language,
        return_timestamps: true,
        chunk_length_s: durationSeconds,
        stride_length_s: 0,
      });

      // Map to expected output format
      console.log("results", result);
      return result.chunks.map((item) => ({
        text: item.text,
        start: item.timestamp[0],
        end: item.timestamp[1],
        confidence: item.confidence || 0.9,
        timestamp: item.timestamp,
      }));
    } catch (error) {
      console.error("Transcription failed:", error);
      throw error;
    }
  }

  /**
   * Check if a model is available and cached
   * @param {string} modelId - The model ID to check
   * @returns {Promise<boolean>} Whether the model is ready to use
   */
  async isModelReady(modelId = DEFAULT_MODEL) {
    try {
      // Try to fetch the model configuration to check availability
      const configUrl = `https://huggingface.co/${modelId}/resolve/main/config.json`;
      const response = await cachedFetch(configUrl);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the list of supported languages
   * @returns {Promise<Array<{code: string, name: string}>>}
   */
  async getSupportedLanguages() {
    // This could be expanded based on the specific model's capabilities
    return [
      { code: "auto", name: "Auto-detect" },
      { code: "en", name: "English" },
      { code: "fr", name: "French" },
      { code: "de", name: "German" },
      { code: "es", name: "Spanish" },
      { code: "it", name: "Italian" },
      { code: "pt", name: "Portuguese" },
      { code: "nl", name: "Dutch" },
      { code: "pl", name: "Polish" },
      { code: "ja", name: "Japanese" },
      { code: "zh", name: "Chinese" },
      { code: "ko", name: "Korean" },
    ];
  }
}
