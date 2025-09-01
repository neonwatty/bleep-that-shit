/**
 * Configuration and types for audio chunking and long file processing
 */

export interface ChunkingConfig {
  /** Length of each chunk in seconds (default: 30) */
  chunkLengthSeconds: number;
  
  /** Overlap between chunks in seconds to maintain context (default: 5) */
  overlapSeconds: number;
  
  /** Enable Voice Activity Detection to remove silence (default: true) */
  enableVAD: boolean;
  
  /** VAD threshold for detecting speech (0-1, default: 0.5) */
  vadThreshold: number;
  
  /** Maximum memory usage in MB before pausing (default: 2048) */
  maxMemoryMB: number;
  
  /** Show results as chunks are processed (default: true) */
  enableProgressiveResults: boolean;
  
  /** Number of parallel workers for processing (default: 1) */
  workerPoolSize: number;
  
  /** Minimum chunk size in seconds (default: 10) */
  minChunkSeconds: number;
  
  /** Maximum chunk size in seconds (default: 60) */
  maxChunkSeconds: number;
}

export interface AudioChunk {
  /** Chunk index (0-based) */
  index: number;
  
  /** Start time in seconds relative to original audio */
  startTime: number;
  
  /** End time in seconds relative to original audio */
  endTime: number;
  
  /** Audio data for this chunk */
  audioData: Float32Array;
  
  /** Whether this is the last chunk */
  isLastChunk: boolean;
  
  /** Overlap with previous chunk in seconds */
  overlapStart: number;
  
  /** Overlap with next chunk in seconds */
  overlapEnd: number;
}

export interface ChunkTranscriptionResult {
  /** Chunk index */
  chunkIndex: number;
  
  /** Transcribed text for this chunk */
  text: string;
  
  /** Word-level timestamps (adjusted for chunk position) */
  chunks: Array<{
    text: string;
    timestamp: [number, number];
  }>;
  
  /** Start time of chunk in original audio */
  chunkStartTime: number;
  
  /** End time of chunk in original audio */
  chunkEndTime: number;
  
  /** Processing time for this chunk in ms */
  processingTime: number;
  
  /** Whether VAD detected speech in this chunk */
  hasSpeech: boolean;
}

export interface TranscriptionProgress {
  /** Current chunk being processed */
  currentChunk: number;
  
  /** Total number of chunks */
  totalChunks: number;
  
  /** Overall progress percentage (0-100) */
  overallProgress: number;
  
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining: number;
  
  /** Current status message */
  status: string;
  
  /** Chunks completed so far */
  chunksCompleted: number;
  
  /** Current memory usage in MB */
  memoryUsageMB: number;
  
  /** Partial transcription result so far */
  partialResult?: {
    text: string;
    chunks: Array<{
      text: string;
      timestamp: [number, number];
    }>;
  };
}

export interface VADSegment {
  /** Start time of speech segment in seconds */
  start: number;
  
  /** End time of speech segment in seconds */
  end: number;
  
  /** Confidence score (0-1) */
  confidence: number;
}

export interface ChunkingStats {
  /** Total audio duration in seconds */
  totalDuration: number;
  
  /** Duration after VAD filtering */
  speechDuration: number;
  
  /** Number of chunks created */
  totalChunks: number;
  
  /** Average chunk size in seconds */
  averageChunkSize: number;
  
  /** Total silence removed in seconds */
  silenceRemoved: number;
  
  /** Estimated processing time in seconds */
  estimatedProcessingTime: number;
}

/** Default chunking configuration */
export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  chunkLengthSeconds: 30,
  overlapSeconds: 5,
  enableVAD: true,
  vadThreshold: 0.5,
  maxMemoryMB: 2048,
  enableProgressiveResults: true,
  workerPoolSize: 1,
  minChunkSeconds: 10,
  maxChunkSeconds: 60
};

/** Worker message types for chunked processing */
export type ChunkedWorkerMessage = 
  | { type: 'initialize'; config: ChunkingConfig }
  | { type: 'processChunk'; chunk: AudioChunk; model: string; language: string }
  | { type: 'mergeResults'; results: ChunkTranscriptionResult[] }
  | { type: 'detectVAD'; audioData: Float32Array; threshold: number }
  | { type: 'cancel' }
  | { type: 'getMemoryUsage' };

/** Worker response types for chunked processing */
export type ChunkedWorkerResponse =
  | { type: 'initialized'; stats: ChunkingStats }
  | { type: 'chunkComplete'; result: ChunkTranscriptionResult }
  | { type: 'progress'; progress: TranscriptionProgress }
  | { type: 'vadComplete'; segments: VADSegment[] }
  | { type: 'mergeComplete'; finalResult: { text: string; chunks: any[] } }
  | { type: 'memoryUsage'; usageMB: number }
  | { type: 'error'; error: string; details?: any }
  | { type: 'cancelled' };