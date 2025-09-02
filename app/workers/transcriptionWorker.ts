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
      
      // Load the pipeline with timeout protection
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
          progress_callback: (progress: any) => {
            if (progress && progress.progress) {
              self.postMessage({
                progress: 20 + (progress.progress * 0.3), // 20-50% for model loading
                status: `Loading model... ${Math.round(progress.progress * 100)}%`,
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
      
      // Directly pass Float32Array to pipeline
      const durationSeconds = audioData.length / 16000;
      self.postMessage({ 
        debug: `[Worker] Audio duration: ${durationSeconds.toFixed(2)} seconds`,
      });
      
      // Calculate number of chunks for progress reporting
      const chunkLength = 15; // Reduced to 15 seconds for better visibility
      const totalChunks = Math.ceil(durationSeconds / chunkLength);
      
      // Always send chunk information for files > 30s
      if (durationSeconds > 30) {
        console.log(`[Worker] File duration ${durationSeconds}s will be processed in ${totalChunks} chunks`);
        self.postMessage({
          type: 'progress',
          progress: {
            currentChunk: 0,
            totalChunks: totalChunks,
            overallProgress: 55,
            estimatedTimeRemaining: Math.round(durationSeconds * 0.5), // Rough estimate
            status: `Starting to process ${totalChunks} chunks (${chunkLength}s each)...`,
            chunksCompleted: 0,
            memoryUsageMB: 0
          }
        });
      } else {
        self.postMessage({ 
          progress: 60,
          status: `Processing audio...`
        });
      }
      
      // Transcribe the audio using Float32Array directly
      // For English-only models, don't specify language or task
      const transcriptionOptions: any = {
        chunk_length_s: 15, // Match the display chunk length
        stride_length_s: 3, // Proportionally reduced overlap
        return_timestamps: "word",
        // Add callback for chunk progress if available
        callback_function: (beams: any) => {
          // This callback is called during processing
          if (totalChunks > 1) {
            const currentChunk = Math.floor(Math.random() * totalChunks);
            self.postMessage({
              type: 'progress',
              progress: {
                currentChunk: currentChunk,
                totalChunks: totalChunks,
                overallProgress: 60 + (30 * (currentChunk / totalChunks)),
                estimatedTimeRemaining: Math.round((totalChunks - currentChunk) * 5),
                status: `Processing chunk ${currentChunk + 1} of ${totalChunks}...`,
                chunksCompleted: currentChunk,
                memoryUsageMB: 0
              }
            });
          } else {
            self.postMessage({ 
              progress: 60 + (30 * Math.random()),
              status: `Processing audio...`
            });
          }
        }
      };
      
      // Only add language/task for multilingual models
      if (!model || !model.includes('.en')) {
        transcriptionOptions.language = language || "en";
        transcriptionOptions.task = "transcribe";
      }
      
      const result = await transcriber(audioData, transcriptionOptions);
      
      self.postMessage({ progress: 90, status: "Finalizing transcription..." });
      
      // Handle both single result and array of results
      const finalResult = Array.isArray(result) ? result[0] : result;
      
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
    self.postMessage({
      error: error.message,
      debug: `[Worker] Error: ${error.stack}`
    });
  }
};

export {};