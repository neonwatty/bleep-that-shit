// Constants for audio processing
const SAMPLE_RATE = 16000; // Whisper expects 16kHz audio
const DEFAULT_CHUNK_DURATION = 30; // seconds
const DEFAULT_OVERLAP_DURATION = 5; // seconds
const MAX_CHUNK_DURATION = 45; // seconds
const MIN_CHUNK_DURATION = 10; // seconds

/**
 * Configuration for audio chunking
 * @typedef {Object} ChunkConfig
 * @property {number} chunkDuration - Duration of each chunk in seconds (default: 30)
 * @property {number} overlapDuration - Duration of overlap between chunks in seconds (default: 5)
 * @property {number} maxMemoryMB - Maximum memory usage in MB (default: 1024)
 * @property {Function} onProgress - Callback for chunking progress (0-100)
 */

/**
 * Calculate optimal chunk size based on available memory and audio duration
 * @param {number} totalSamples - Total number of samples in the audio
 * @param {number} maxMemoryMB - Maximum memory usage in MB
 * @returns {number} Optimal chunk duration in seconds
 */
function calculateOptimalChunkDuration(totalSamples, maxMemoryMB) {
  // Each Float32 sample is 4 bytes
  const totalSizeBytes = totalSamples * 4;
  const maxSizeBytes = maxMemoryMB * 1024 * 1024;

  // Calculate how many chunks we need to stay within memory limits
  // Account for overlap in the calculation
  const optimalDuration = Math.min(
    MAX_CHUNK_DURATION,
    Math.max(
      MIN_CHUNK_DURATION,
      Math.floor((maxSizeBytes / totalSizeBytes) * (totalSamples / SAMPLE_RATE))
    )
  );

  return optimalDuration;
}

/**
 * Create a chunk processor that yields chunks with proper memory management
 * @param {Float32Array} audioBuffer - The complete audio buffer
 * @param {ChunkConfig} config - Chunking configuration
 * @returns {AsyncGenerator<{chunk: Float32Array, start: number, end: number, overlapStart: number, overlapEnd: number}>}
 */
export async function* createChunkProcessor(audioBuffer, config = {}) {
  const {
    chunkDuration = DEFAULT_CHUNK_DURATION,
    overlapDuration = DEFAULT_OVERLAP_DURATION,
    maxMemoryMB = 1024,
    onProgress = () => {},
  } = config;

  const totalSamples = audioBuffer.length;
  const optimalDuration = calculateOptimalChunkDuration(
    totalSamples,
    maxMemoryMB
  );
  const actualChunkDuration = Math.min(chunkDuration, optimalDuration);

  const chunkSize = actualChunkDuration * SAMPLE_RATE;
  const overlapSize = overlapDuration * SAMPLE_RATE;

  let processedSamples = 0;
  let start = 0;

  while (start < totalSamples) {
    const end = Math.min(start + chunkSize, totalSamples);
    const chunk = audioBuffer.slice(start, end);

    // Calculate overlap regions
    const overlapStart = start > 0 ? start : null;
    const overlapEnd = end < totalSamples ? end : null;

    yield {
      chunk,
      start: start / SAMPLE_RATE,
      end: end / SAMPLE_RATE,
      overlapStart: overlapStart ? overlapStart / SAMPLE_RATE : null,
      overlapEnd: overlapEnd ? overlapEnd / SAMPLE_RATE : null,
    };

    processedSamples = end;
    onProgress(Math.min(100, (processedSamples / totalSamples) * 100));

    // Move to next chunk, accounting for overlap
    start += chunkSize - overlapSize;

    // Ensure we don't get stuck in a loop with tiny chunks
    if (start >= totalSamples) break;
  }
}

/**
 * Process audio in chunks with memory-efficient handling
 * @param {Float32Array} audioBuffer - The complete audio buffer
 * @param {Function} processChunk - Function to process each chunk
 * @param {ChunkConfig} config - Chunking configuration
 * @returns {Promise<Array>} Array of results from processing each chunk
 */
export async function processAudioInChunks(
  audioBuffer,
  processChunk,
  config = {}
) {
  const results = [];
  const chunkProcessor = createChunkProcessor(audioBuffer, config);

  for await (const chunkInfo of chunkProcessor) {
    const result = await processChunk(chunkInfo);
    results.push(result);
  }

  return results;
}

/**
 * Merge transcription results from multiple chunks, handling overlaps
 * @param {Array<{text: string, start: number, end: number}>} chunkResults
 * @returns {Array<{text: string, start: number, end: number}>}
 */
export function mergeChunkResults(chunkResults) {
  if (chunkResults.length === 0) return [];
  if (chunkResults.length === 1) return chunkResults[0];

  const merged = [];

  for (let i = 0; i < chunkResults.length; i++) {
    const current = chunkResults[i];
    const next = chunkResults[i + 1];

    // Process each result in the current chunk
    for (const item of current) {
      // Skip if this item is better represented in the next chunk
      if (next) {
        const overlapItems = next.filter(
          (nextItem) => nextItem.start < item.end && nextItem.end > item.start
        );

        if (
          overlapItems.some((overlap) => overlap.confidence > item.confidence)
        ) {
          continue;
        }
      }

      // Add the item if it's not already included
      if (
        !merged.some(
          (m) =>
            m.start === item.start && m.end === item.end && m.text === item.text
        )
      ) {
        merged.push(item);
      }
    }
  }

  return merged.sort((a, b) => a.start - b.start);
}
