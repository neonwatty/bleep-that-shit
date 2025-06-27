// Utility to chunk a Float32Array audio buffer into overlapping segments for Whisper
// Assumes input is mono, 16kHz PCM

const CHUNK_SIZE_SAMPLES = 480000; // 30s * 16kHz
const OVERLAP_SAMPLES = 80000; // 5s * 16kHz

/**
 * Chunk an audio buffer into overlapping segments.
 * @param {Float32Array} audioBuffer - Mono, 16kHz PCM audio
 * @returns {Array<{chunk: Float32Array, start: number, end: number}>}
 */
export function chunkAudioBuffer(audioBuffer) {
  const chunks = [];
  let start = 0;
  while (start < audioBuffer.length) {
    const end = Math.min(start + CHUNK_SIZE_SAMPLES, audioBuffer.length);
    const chunk = audioBuffer.slice(start, end);
    chunks.push({ chunk, start, end });
    if (end === audioBuffer.length) break;
    start += CHUNK_SIZE_SAMPLES - OVERLAP_SAMPLES;
  }
  return chunks;
}
