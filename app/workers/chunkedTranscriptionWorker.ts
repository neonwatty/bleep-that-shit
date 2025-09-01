/**
 * Enhanced transcription worker with support for chunked processing of long audio files
 */

import { pipeline } from "@huggingface/transformers";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { 
  AudioChunk,
  ChunkingConfig,
  ChunkTranscriptionResult,
  TranscriptionProgress,
  DEFAULT_CHUNKING_CONFIG,
  ChunkedWorkerMessage,
  ChunkedWorkerResponse
} from '@/lib/types/chunking';
import { 
  createAudioChunks, 
  mergeChunkResults,
  checkMemoryUsage,
  formatTime 
} from '@/lib/utils/audioChunking';

// State management
let transcriptionPipeline: any | null = null;
let currentConfig: ChunkingConfig = DEFAULT_CHUNKING_CONFIG;
let isProcessing = false;
let shouldCancel = false;
let chunkResults: ChunkTranscriptionResult[] = [];
let startTime = 0;
let processedChunks = 0;

// Helper to get correct public path
function getPublicPath(path: string) {
  const basePath = self.location.pathname.includes('/bleep-that-shit') 
    ? '/bleep-that-shit' 
    : '';
  return `${basePath}${path}`;
}

// Send response helper
function sendResponse(response: ChunkedWorkerResponse) {
  self.postMessage(response);
}

// Process a single chunk
async function processChunk(
  chunk: AudioChunk,
  model: string,
  language: string,
  totalChunks: number
): Promise<ChunkTranscriptionResult> {
  const chunkStartTime = performance.now();
  
  try {
    // Check memory before processing
    const memCheck = checkMemoryUsage();
    if (!memCheck.available) {
      // Wait a bit for garbage collection
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Load pipeline if not already loaded
    if (!transcriptionPipeline) {
      sendResponse({
        type: 'progress',
        progress: {
          currentChunk: chunk.index,
          totalChunks,
          overallProgress: (chunk.index / totalChunks) * 20, // 20% for model loading
          estimatedTimeRemaining: 0,
          status: `Loading model ${model}...`,
          chunksCompleted: processedChunks,
          memoryUsageMB: memCheck.usageMB
        }
      });
      
      transcriptionPipeline = await pipeline(
        "automatic-speech-recognition",
        model || "Xenova/whisper-tiny.en",
        {
          progress_callback: (progress: any) => {
            if (progress && progress.progress) {
              const overallProgress = (chunk.index / totalChunks) * 20 * progress.progress;
              sendResponse({
                type: 'progress',
                progress: {
                  currentChunk: chunk.index,
                  totalChunks,
                  overallProgress,
                  estimatedTimeRemaining: 0,
                  status: `Loading model... ${Math.round(progress.progress * 100)}%`,
                  chunksCompleted: processedChunks,
                  memoryUsageMB: memCheck.usageMB
                }
              });
            }
          }
        }
      );
    }
    
    // Update progress
    const baseProgress = (processedChunks / totalChunks) * 100;
    sendResponse({
      type: 'progress',
      progress: {
        currentChunk: chunk.index,
        totalChunks,
        overallProgress: baseProgress + (100 / totalChunks) * 0.5,
        estimatedTimeRemaining: estimateTimeRemaining(chunk.index, totalChunks),
        status: `Processing chunk ${chunk.index + 1} of ${totalChunks}...`,
        chunksCompleted: processedChunks,
        memoryUsageMB: memCheck.usageMB
      }
    });
    
    // Transcribe the chunk
    const transcriptionOptions: any = {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: "word"
    };
    
    // Only add language/task for multilingual models
    if (!model || !model.includes('.en')) {
      transcriptionOptions.language = language || "en";
      transcriptionOptions.task = "transcribe";
    }
    
    const result = await transcriptionPipeline(chunk.audioData, transcriptionOptions);
    
    // Handle both single result and array of results
    const finalResult = Array.isArray(result) ? result[0] : result;
    
    // Adjust timestamps to be relative to original audio
    const adjustedChunks = (finalResult.chunks || []).map((wordChunk: any) => ({
      text: wordChunk.text,
      timestamp: [
        wordChunk.timestamp[0] + chunk.startTime,
        wordChunk.timestamp[1] + chunk.startTime
      ]
    }));
    
    const processingTime = performance.now() - chunkStartTime;
    
    // Clean up tensors to free memory (if exposed by the library)
    if (typeof (result as any).dispose === 'function') {
      (result as any).dispose();
    }
    
    // Force garbage collection hint
    if (typeof (global as any).gc === 'function') {
      (global as any).gc();
    }
    
    const chunkResult: ChunkTranscriptionResult = {
      chunkIndex: chunk.index,
      text: finalResult.text || '',
      chunks: adjustedChunks,
      chunkStartTime: chunk.startTime,
      chunkEndTime: chunk.endTime,
      processingTime,
      hasSpeech: adjustedChunks.length > 0
    };
    
    processedChunks++;
    
    return chunkResult;
  } catch (error: any) {
    console.error(`Error processing chunk ${chunk.index}:`, error);
    throw error;
  }
}

// Estimate remaining time based on current progress
function estimateTimeRemaining(currentChunk: number, totalChunks: number): number {
  if (processedChunks === 0) return 0;
  
  const elapsedTime = (performance.now() - startTime) / 1000; // in seconds
  const averageTimePerChunk = elapsedTime / processedChunks;
  const remainingChunks = totalChunks - processedChunks;
  
  return Math.round(averageTimePerChunk * remainingChunks);
}

// Extract audio from video
async function extractAudioFromVideo(fileBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  sendResponse({
    type: 'progress',
    progress: {
      currentChunk: 0,
      totalChunks: 1,
      overallProgress: 10,
      estimatedTimeRemaining: 0,
      status: 'Extracting audio from video...',
      chunksCompleted: 0,
      memoryUsageMB: 0
    }
  });
  
  const ffmpeg = new FFmpeg();
  
  if (!ffmpeg.loaded) {
    await ffmpeg.load();
  }
  
  await ffmpeg.writeFile("input.mp4", new Uint8Array(fileBuffer));
  await ffmpeg.exec([
    "-i", "input.mp4",
    "-vn",
    "-acodec", "pcm_s16le",
    "-ar", "16000",
    "-ac", "1",
    "output.wav"
  ]);
  
  const audioDataBuffer = await ffmpeg.readFile("output.wav");
  
  // Handle both Uint8Array and string types
  if (audioDataBuffer instanceof Uint8Array) {
    return audioDataBuffer.buffer as ArrayBuffer;
  } else {
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(audioDataBuffer as string);
    return uint8Array.buffer as ArrayBuffer;
  }
}

// Main message handler
self.onmessage = async (event: MessageEvent) => {
  const message = event.data as ChunkedWorkerMessage | any;
  
  try {
    // Handle legacy message format for backward compatibility
    if (message.type === 'transcribe' && message.audioData) {
      // Legacy single-chunk transcription
      await handleLegacyTranscription(message);
      return;
    }
    
    switch (message.type) {
      case 'initialize':
        currentConfig = { ...DEFAULT_CHUNKING_CONFIG, ...message.config };
        sendResponse({ 
          type: 'initialized', 
          stats: {
            totalDuration: 0,
            speechDuration: 0,
            totalChunks: 0,
            averageChunkSize: currentConfig.chunkLengthSeconds,
            silenceRemoved: 0,
            estimatedProcessingTime: 0
          }
        });
        break;
        
      case 'processChunk':
        if (shouldCancel) {
          sendResponse({ type: 'cancelled' });
          return;
        }
        
        const result = await processChunk(
          message.chunk,
          message.model,
          message.language,
          1 // For single chunk processing
        );
        
        sendResponse({ type: 'chunkComplete', result });
        break;
        
      case 'cancel':
        shouldCancel = true;
        isProcessing = false;
        sendResponse({ type: 'cancelled' });
        break;
        
      case 'getMemoryUsage':
        const memInfo = checkMemoryUsage();
        sendResponse({ type: 'memoryUsage', usageMB: memInfo.usageMB });
        break;
        
      case 'mergeResults':
        const merged = mergeChunkResults(message.results, currentConfig);
        sendResponse({ type: 'mergeComplete', finalResult: merged });
        break;
        
      // New unified processing endpoint
      case 'processAudio':
        await processFullAudio(message);
        break;
        
      // Handle video extraction
      case 'extract':
        const audioBuffer = await extractAudioFromVideo(message.fileBuffer);
        sendResponse({ type: 'extracted', audioBuffer } as any);
        break;
        
      default:
        sendResponse({ 
          type: 'error', 
          error: `Unknown message type: ${message.type}` 
        });
    }
  } catch (error: any) {
    sendResponse({
      type: 'error',
      error: error.message,
      details: error.stack
    });
  }
};

// Process full audio with chunking
async function processFullAudio(message: any) {
  const { audioData, model, language, config = {} } = message;
  const finalConfig = { ...DEFAULT_CHUNKING_CONFIG, ...config };
  
  isProcessing = true;
  shouldCancel = false;
  chunkResults = [];
  processedChunks = 0;
  startTime = performance.now();
  
  try {
    // Create chunks
    const { chunks, stats } = createAudioChunks(
      audioData,
      16000, // Sample rate
      finalConfig
    );
    
    sendResponse({ type: 'initialized', stats });
    
    // Process each chunk
    for (const chunk of chunks) {
      if (shouldCancel) {
        sendResponse({ type: 'cancelled' });
        return;
      }
      
      const result = await processChunk(chunk, model, language, chunks.length);
      chunkResults.push(result);
      
      sendResponse({ type: 'chunkComplete', result });
      
      // Send progressive results if enabled
      if (finalConfig.enableProgressiveResults && chunkResults.length > 0) {
        const partialMerged = mergeChunkResults(chunkResults, finalConfig);
        sendResponse({
          type: 'progress',
          progress: {
            currentChunk: chunk.index,
            totalChunks: chunks.length,
            overallProgress: ((chunk.index + 1) / chunks.length) * 100,
            estimatedTimeRemaining: estimateTimeRemaining(chunk.index, chunks.length),
            status: `Processed chunk ${chunk.index + 1} of ${chunks.length}`,
            chunksCompleted: processedChunks,
            memoryUsageMB: checkMemoryUsage().usageMB,
            partialResult: partialMerged
          }
        });
      }
    }
    
    // Merge all results
    const finalResult = mergeChunkResults(chunkResults, finalConfig);
    sendResponse({ type: 'mergeComplete', finalResult });
    
  } catch (error: any) {
    sendResponse({
      type: 'error',
      error: error.message,
      details: error.stack
    });
  } finally {
    isProcessing = false;
  }
}

// Handle legacy transcription for backward compatibility
async function handleLegacyTranscription(message: any) {
  const { audioData, model, language } = message;
  
  // Process as a single chunk using the new system
  const chunk: AudioChunk = {
    index: 0,
    startTime: 0,
    endTime: audioData.length / 16000,
    audioData: audioData,
    isLastChunk: true,
    overlapStart: 0,
    overlapEnd: 0
  };
  
  try {
    const result = await processChunk(chunk, model, language, 1);
    
    // Convert to legacy format
    self.postMessage({
      type: 'complete',
      result: {
        text: result.text,
        chunks: result.chunks
      },
      progress: 100,
      status: 'Transcription complete!'
    });
  } catch (error: any) {
    self.postMessage({
      error: error.message,
      debug: `[Worker] Error: ${error.stack}`
    });
  }
}

export {};