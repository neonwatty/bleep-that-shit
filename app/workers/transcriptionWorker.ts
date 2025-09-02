import { pipeline } from "@huggingface/transformers";
import { FFmpeg } from "@ffmpeg/ffmpeg";

// Helper to get correct public path
function getPublicPath(path: string) {
  // In production, adjust for GitHub Pages subdirectory
  const basePath = self.location.pathname.includes('/bleep-that-shit') 
    ? '/bleep-that-shit' 
    : '';
  return `${basePath}${path}`;
}

let isCancelled = false;
let currentProcessingChunk = 0;
let lastProgressUpdate = 0;


// Global error handler for unhandled worker errors
self.onerror = (error) => {
  console.error('[Worker] Unhandled error:', error);
  self.postMessage({
    error: 'Worker initialization or execution error',
    debug: `[Worker] Unhandled error: ${error.toString()}`,
    errorType: 'WorkerError'
  });
};

self.onmessage = async (event: MessageEvent) => {
  console.log('[Worker] Received message:', event.data);
  const { type, fileBuffer, audioData, fileType, model, language } = event.data;
  
  try {
    if (type === "cancel") {
      // Handle cancellation
      isCancelled = true;
      self.postMessage({ type: "cancelled" });
      return;
    }
    
    if (type === "initialize") {
      // Handle initialization for compatibility
      self.postMessage({ 
        type: "initialized",
        stats: { totalChunks: 1 }
      });
      return;
    }
    
    // Reset cancelled flag for new operations
    if (type === "transcribe" || type === "extract" || type === "processAudio") {
      isCancelled = false;
    }
    
    if (type === "extract") {
      // Extract audio from video using FFmpeg
      self.postMessage({ debug: `[Worker] Extracting audio from video` });
      
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
      self.postMessage({
        debug: `[Worker] Audio extracted, sending buffer to main thread`,
      });
      
      // Handle both Uint8Array and string types
      if (audioDataBuffer instanceof Uint8Array) {
        // Type assertion to ensure we're passing a Transferable
        const buffer = audioDataBuffer.buffer as ArrayBuffer;
        (self as any).postMessage(
          { type: "extracted", audioBuffer: buffer },
          [buffer]
        );
      } else {
        // Convert string to Uint8Array if necessary
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(audioDataBuffer as string);
        const buffer = uint8Array.buffer as ArrayBuffer;
        (self as any).postMessage(
          { type: "extracted", audioBuffer: buffer },
          [buffer]
        );
      }
      return;
    }
    
    if (type === "processAudio") {
      // Handle processAudio like transcribe for compatibility
      event.data.type = "transcribe";
      // Continue to transcribe handling below
    }
    
    if (type === "transcribe" || type === "processAudio") {
      self.postMessage({
        debug: `[Worker] Starting transcription with model: ${model}`,
      });
      
      // Validate input data - should be Float32Array
      if (!audioData) {
        throw new Error('No audio data provided');
      }
      
      // Log the actual type received
      self.postMessage({
        debug: `[Worker] Received audioData type: ${audioData.constructor.name}, length: ${audioData.length || 0}`
      });
      
      if (!(audioData instanceof Float32Array) && !audioData.length) {
        throw new Error(`Audio data must be a Float32Array, received: ${audioData.constructor.name}`);
      }
      
      self.postMessage({ 
        debug: `[Worker] Audio data received, length: ${audioData.length}`,
        progress: 20, 
        status: "Loading model..." 
      });
      
      // Calculate duration first (before creating pipeline)
      const durationSeconds = audioData.length / 16000;
      const chunkLength = 15;
      const totalChunks = Math.ceil(durationSeconds / chunkLength);
      
      // Model-specific optimizations
      const isBaseModel = model && model.includes('base');
      const isSmallModel = model && model.includes('small');
      const isTinyModel = model && model.includes('tiny');
      
      // Use WASM for all models for maximum reliability
      const device = 'wasm';
      const dtype = 'q8';
      
      self.postMessage({ 
        debug: `[Worker] Using WASM backend for all models (reliable and universal compatibility)`
      });
      
      
      self.postMessage({ 
        debug: `[Worker] Using ${device.toUpperCase()} backend for transcription with dtype: ${dtype}`,
        progress: 25,
        status: `Initializing ${device.toUpperCase()} backend...`
      });
      
      // Load the pipeline with WASM backend
      let pipelineLoaded = false;
      const pipelineTimeout = setTimeout(() => {
        if (!pipelineLoaded) {
          throw new Error('Model loading timed out after 30 seconds');
        }
      }, 30000);
      
      const transcriber = await pipeline(
        "automatic-speech-recognition",
        model || "Xenova/whisper-tiny.en",
        {
          device: device,
          dtype: dtype,
          progress_callback: (progress: any) => {
            if (progress && progress.progress) {
              const percentage = Math.min(Math.round(progress.progress * 100), 100);
              self.postMessage({
                progress: 20 + (progress.progress * 30),
                status: `Loading model... ${percentage}%`,
                debug: `[Worker] Model loading progress: ${progress.progress}`
              });
            }
          }
        }
      );
      pipelineLoaded = true;
      clearTimeout(pipelineTimeout);
      
      self.postMessage({ progress: 50, status: "Processing audio..." });
      
      // Check if cancelled
      if (isCancelled) {
        self.postMessage({ type: "cancelled" });
        return;
      }
      
      // Log audio duration
      self.postMessage({ 
        debug: `[Worker] Audio duration: ${durationSeconds.toFixed(2)} seconds`,
      });
      
      // Initialize processing variables
      currentProcessingChunk = 0;
      const startTime = Date.now();
      lastProgressUpdate = startTime;
      
      // Simple processing message without chunking details
      self.postMessage({ 
        progress: 60,
        status: `Processing audio...`
      });
      
      // Transcribe the audio using Float32Array directly
      // Use 30-second chunks for WASM backend
      const transcriptionOptions: any = {
        chunk_length_s: 30, // 30s chunks for WASM
        stride_length_s: 5, // Standard overlap  
        return_timestamps: true, // Required for word-level timestamps
        // Increase token limits for Base model to prevent truncation
        max_new_tokens: isBaseModel ? 512 : 448, // More tokens for Base model
        // Add sampling parameters for better quality
        temperature: 0.0, // Deterministic output
        compression_ratio_threshold: 2.4, // Standard threshold
        logprob_threshold: -1.0, // Standard threshold
        no_speech_threshold: 0.6, // Standard threshold
      };
      
      // Only add language/task for multilingual models
      if (!model || !model.includes('.en')) {
        transcriptionOptions.language = language || "en";
        transcriptionOptions.task = "transcribe";
      }
      
      // Remove chunking messages - it's handled transparently now
      
      console.log(`[Worker] Starting transcription of ${durationSeconds}s audio with ${device.toUpperCase()}...`);
      const transcriptionStart = Date.now();
      
      const result = await transcriber(audioData, transcriptionOptions);
      
      const transcriptionTime = (Date.now() - transcriptionStart) / 1000;
      console.log(`[Worker] Transcription completed in ${transcriptionTime}s using ${device.toUpperCase()}`);
      
      // Log performance metrics
      const throughput = durationSeconds / transcriptionTime;
      console.log(`[Worker] Performance: ${throughput.toFixed(2)}x real-time (${device.toUpperCase()})`);
      console.log(`[Worker] Used chunk_length_s: ${transcriptionOptions.chunk_length_s}s`);
      
      // Remove chunking completion message
      
      self.postMessage({ progress: 90, status: "Finalizing transcription..." });
      
      // Log the raw result structure for debugging
      self.postMessage({ 
        debug: `[Worker] Result type: ${typeof result}, isArray: ${Array.isArray(result)}, keys: ${result ? Object.keys(result).join(', ') : 'null'}`
      });
      
      // Handle both single result and array of results
      const finalResult = Array.isArray(result) ? result[0] : result;
      
      // Log the finalResult structure
      if (finalResult) {
        self.postMessage({ 
          debug: `[Worker] Final result - text length: ${finalResult.text?.length || 0}, chunks: ${finalResult.chunks?.length || 0}`
        });
      }
      
      // Format the result
      const formattedResult = {
        text: finalResult.text || '',
        chunks: finalResult.chunks || []
      };
      
      self.postMessage({
        type: "complete",
        result: formattedResult,
        progress: 100,
        status: "Transcription complete!"
      });
    }
  } catch (error: any) {
    console.error('[Worker] Error occurred:', error);
    self.postMessage({
      error: error?.message || 'Unknown worker error',
      debug: `[Worker] Error: ${error?.stack || error?.toString() || 'No error details available'}`,
      errorType: error?.name || 'UnknownError'
    });
  }
};

export {};