import { pipeline } from "@huggingface/transformers";
import { fetchFile } from "@ffmpeg/util";
import { FFmpeg } from "@ffmpeg/ffmpeg";

console.log('[Worker] Transcription worker loaded');

// Helper to get correct public path
function getPublicPath(path) {
  // In production, adjust for GitHub Pages subdirectory
  const basePath = self.location.pathname.includes('/bleep-that-shit') 
    ? '/bleep-that-shit' 
    : '';
  return `${basePath}${path}`;
}

self.onmessage = async (event) => {
  console.log('[Worker] Received message:', event.data);
  const { type, fileBuffer, audioData, fileType, model, language } = event.data;
  
  try {
    if (type === "extract") {
      // Extract audio from video using FFmpeg
      self.postMessage({ debug: `[Worker] Extracting audio from video` });
      
      const ffmpeg = new FFmpeg({ 
        log: false, 
        corePath: getPublicPath('/ffmpeg-core.js')
      });
      
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
      
      self.postMessage(
        { type: "extracted", audioBuffer: audioDataBuffer.buffer },
        [audioDataBuffer.buffer]
      );
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
          progress_callback: (progress) => {
            if (progress && progress.progress) {
              self.postMessage({
                progress: 20 + (progress.progress * 30), // 20-50% for model loading  
                status: `Loading model...`,
                debug: `[Worker] Model loading progress: ${progress.progress}`
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
      const transcriptionOptions = {
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
      let finalResult;
      if (Array.isArray(result)) {
        // Merge all chunks when result is an array
        console.log(`[Worker] Merging ${result.length} transcription chunks`);
        finalResult = {
          text: result.map(r => r.text || '').join(' '),
          chunks: result.flatMap(r => r.chunks || [])
        };
      } else {
        finalResult = result;
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
  } catch (error) {
    self.postMessage({
      error: error.message,
      debug: `[Worker] Error: ${error.stack}`
    });
  }
};