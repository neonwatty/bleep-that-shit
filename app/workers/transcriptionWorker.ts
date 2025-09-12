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

self.onmessage = async (event: MessageEvent) => {
  console.log('[Worker] Received message:', event.data);
  const { type, fileBuffer, audioData, fileType, model, language } = event.data;
  
  try {
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
    
    if (type === "transcribe") {
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
            if (progress && progress.progress !== undefined) {
              // Check if progress.progress is already a percentage (0-100) or decimal (0-1)
              const progressValue = progress.progress;
              const isPercentage = progressValue > 1;
              const normalizedProgress = isPercentage ? progressValue / 100 : progressValue;
              
              self.postMessage({
                progress: 20 + (normalizedProgress * 30), // 20-50% for model loading
                status: `Loading model... ${Math.round(normalizedProgress * 100)}%`,
                debug: `[Worker] Model loading progress - raw: ${progressValue}, normalized: ${normalizedProgress}`
              });
            }
          }
        }
      );
      pipelineLoaded = true;
      clearTimeout(pipelineTimeout);
      
      self.postMessage({ progress: 50, status: "Processing audio..." });
      
      // Directly pass Float32Array to pipeline
      const durationSeconds = audioData.length / 16000;
      self.postMessage({ 
        debug: `[Worker] Audio duration: ${durationSeconds.toFixed(2)} seconds`,
      });
      
      // Transcribe the audio using Float32Array directly
      // For English-only models, don't specify language or task
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