/**
 * Audio chunking utilities for processing long audio files
 */

import { 
  AudioChunk, 
  ChunkingConfig, 
  ChunkingStats,
  ChunkTranscriptionResult,
  DEFAULT_CHUNKING_CONFIG,
  VADSegment 
} from '@/lib/types/chunking';

/**
 * Split audio data into overlapping chunks for processing
 */
export function createAudioChunks(
  audioData: Float32Array,
  sampleRate: number,
  config: Partial<ChunkingConfig> = {}
): { chunks: AudioChunk[]; stats: ChunkingStats } {
  const finalConfig = { ...DEFAULT_CHUNKING_CONFIG, ...config };
  const { chunkLengthSeconds, overlapSeconds } = finalConfig;
  
  const totalDurationSeconds = audioData.length / sampleRate;
  const chunkSizeSamples = Math.floor(chunkLengthSeconds * sampleRate);
  const overlapSizeSamples = Math.floor(overlapSeconds * sampleRate);
  const stepSizeSamples = chunkSizeSamples - overlapSizeSamples;
  
  const chunks: AudioChunk[] = [];
  let currentPosition = 0;
  let chunkIndex = 0;
  
  while (currentPosition < audioData.length) {
    const chunkStart = currentPosition;
    const chunkEnd = Math.min(currentPosition + chunkSizeSamples, audioData.length);
    const actualChunkSize = chunkEnd - chunkStart;
    
    // Extract chunk data
    const chunkData = audioData.slice(chunkStart, chunkEnd);
    
    // Calculate time positions
    const startTime = chunkStart / sampleRate;
    const endTime = chunkEnd / sampleRate;
    
    // Determine overlap regions
    const overlapStart = chunkIndex > 0 ? overlapSeconds : 0;
    const isLastChunk = chunkEnd >= audioData.length;
    const overlapEnd = !isLastChunk ? overlapSeconds : 0;
    
    chunks.push({
      index: chunkIndex,
      startTime,
      endTime,
      audioData: chunkData,
      isLastChunk,
      overlapStart,
      overlapEnd
    });
    
    currentPosition += stepSizeSamples;
    chunkIndex++;
    
    // For the last chunk, make sure we don't miss any samples
    if (currentPosition < audioData.length && currentPosition + chunkSizeSamples > audioData.length) {
      currentPosition = audioData.length - chunkSizeSamples;
      // Ensure we don't go negative
      if (currentPosition < 0) currentPosition = 0;
    }
  }
  
  const stats: ChunkingStats = {
    totalDuration: totalDurationSeconds,
    speechDuration: totalDurationSeconds, // Will be updated after VAD
    totalChunks: chunks.length,
    averageChunkSize: chunkLengthSeconds,
    silenceRemoved: 0,
    estimatedProcessingTime: chunks.length * 5 // Rough estimate: 5 seconds per chunk
  };
  
  return { chunks, stats };
}

/**
 * Merge transcription results from multiple chunks
 */
export function mergeChunkResults(
  results: ChunkTranscriptionResult[],
  config: Partial<ChunkingConfig> = {}
): { text: string; chunks: Array<{ text: string; timestamp: [number, number] }> } {
  const { overlapSeconds = 5 } = config;
  
  // Sort results by chunk index
  const sortedResults = [...results].sort((a, b) => a.chunkIndex - b.chunkIndex);
  
  const mergedText: string[] = [];
  const mergedChunks: Array<{ text: string; timestamp: [number, number] }> = [];
  
  for (let i = 0; i < sortedResults.length; i++) {
    const result = sortedResults[i];
    const isFirst = i === 0;
    const isLast = i === sortedResults.length - 1;
    
    // For word-level chunks, we need to handle overlaps
    let wordsToAdd = result.chunks;
    
    if (!isFirst && overlapSeconds > 0 && result.chunks.length > 0) {
      // Remove words from the overlap region at the start
      const overlapEndTime = result.chunkStartTime + overlapSeconds;
      wordsToAdd = wordsToAdd.filter(chunk => {
        const wordStart = chunk.timestamp[0];
        return wordStart >= overlapEndTime;
      });
    }
    
    if (!isLast && overlapSeconds > 0 && wordsToAdd.length > 0) {
      // Remove words from the overlap region at the end
      const overlapStartTime = result.chunkEndTime - overlapSeconds;
      wordsToAdd = wordsToAdd.filter(chunk => {
        const wordEnd = chunk.timestamp[1];
        return wordEnd <= overlapStartTime;
      });
    }
    
    // Adjust timestamps to be relative to the original audio
    for (const chunk of wordsToAdd) {
      mergedChunks.push({
        text: chunk.text,
        timestamp: [
          chunk.timestamp[0],
          chunk.timestamp[1]
        ]
      });
    }
    
    // For text merging, extract just the words from this chunk's contribution
    const chunkText = wordsToAdd.map(w => w.text).join(' ');
    if (chunkText) {
      mergedText.push(chunkText);
    }
  }
  
  return {
    text: mergedText.join(' ').replace(/\s+/g, ' ').trim(),
    chunks: mergedChunks
  };
}

/**
 * Apply VAD segments to filter audio data
 */
export function applyVADToAudio(
  audioData: Float32Array,
  vadSegments: VADSegment[],
  sampleRate: number
): { filteredAudio: Float32Array; mapping: Array<[number, number]> } {
  if (vadSegments.length === 0) {
    return { 
      filteredAudio: audioData, 
      mapping: [[0, audioData.length / sampleRate]] 
    };
  }
  
  // Calculate total samples needed
  let totalSamples = 0;
  const segmentSamples: Array<[number, number]> = [];
  
  for (const segment of vadSegments) {
    const startSample = Math.floor(segment.start * sampleRate);
    const endSample = Math.floor(segment.end * sampleRate);
    const segmentLength = endSample - startSample;
    totalSamples += segmentLength;
    segmentSamples.push([startSample, endSample]);
  }
  
  // Create filtered audio
  const filteredAudio = new Float32Array(totalSamples);
  const mapping: Array<[number, number]> = [];
  let currentPosition = 0;
  
  for (const [startSample, endSample] of segmentSamples) {
    const segmentData = audioData.slice(startSample, endSample);
    filteredAudio.set(segmentData, currentPosition);
    
    // Store mapping from filtered position to original time
    mapping.push([
      currentPosition / sampleRate,
      startSample / sampleRate
    ]);
    
    currentPosition += segmentData.length;
  }
  
  return { filteredAudio, mapping };
}

/**
 * Adjust timestamps from VAD-filtered audio back to original timeline
 */
export function adjustTimestampsForVAD(
  chunks: Array<{ text: string; timestamp: [number, number] }>,
  vadMapping: Array<[number, number]>
): Array<{ text: string; timestamp: [number, number] }> {
  return chunks.map(chunk => {
    const [filteredStart, filteredEnd] = chunk.timestamp;
    
    // Find the VAD segment this timestamp belongs to
    let originalStart = filteredStart;
    let originalEnd = filteredEnd;
    
    for (const [filteredTime, originalTime] of vadMapping) {
      if (filteredStart >= filteredTime) {
        const offset = filteredStart - filteredTime;
        originalStart = originalTime + offset;
      }
      if (filteredEnd >= filteredTime) {
        const offset = filteredEnd - filteredTime;
        originalEnd = originalTime + offset;
      }
    }
    
    return {
      text: chunk.text,
      timestamp: [originalStart, originalEnd]
    };
  });
}

/**
 * Estimate memory usage for audio processing
 */
export function estimateMemoryUsage(
  audioLengthSeconds: number,
  sampleRate: number = 16000
): number {
  // Float32Array uses 4 bytes per sample
  const audioMemoryMB = (audioLengthSeconds * sampleRate * 4) / (1024 * 1024);
  
  // Add overhead for model and processing (rough estimate)
  const modelMemoryMB = 200; // Whisper tiny model
  const processingOverheadMB = 100; // Tensors, intermediate results
  
  return audioMemoryMB + modelMemoryMB + processingOverheadMB;
}

/**
 * Calculate optimal chunk size based on available memory
 */
export function calculateOptimalChunkSize(
  totalDurationSeconds: number,
  availableMemoryMB: number,
  config: Partial<ChunkingConfig> = {}
): number {
  const { minChunkSeconds = 10, maxChunkSeconds = 60 } = config;
  
  // Reserve memory for model and overhead
  const usableMemoryMB = Math.max(100, availableMemoryMB - 300);
  
  // Calculate chunk size that fits in memory
  // 16kHz * 4 bytes = 64KB per second
  const bytesPerSecond = 16000 * 4;
  const mbPerSecond = bytesPerSecond / (1024 * 1024);
  const maxChunkFromMemory = usableMemoryMB / mbPerSecond;
  
  // Clamp to configured limits
  const optimalChunkSize = Math.min(
    maxChunkSeconds,
    Math.max(minChunkSeconds, maxChunkFromMemory)
  );
  
  return Math.floor(optimalChunkSize);
}

/**
 * Check if memory usage is within limits
 */
export function checkMemoryUsage(): { usageMB: number; available: boolean } {
  if ('performance' in self && 'memory' in (performance as any)) {
    const memInfo = (performance as any).memory;
    const usedMB = memInfo.usedJSHeapSize / (1024 * 1024);
    const limitMB = memInfo.jsHeapSizeLimit / (1024 * 1024);
    const availableMB = limitMB - usedMB;
    
    return {
      usageMB: usedMB,
      available: availableMB > 100 // Need at least 100MB free
    };
  }
  
  // Fallback if performance.memory not available
  return { usageMB: 0, available: true };
}

/**
 * Format time in seconds to human readable format
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}