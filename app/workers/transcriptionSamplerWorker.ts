import { pipeline } from "@huggingface/transformers";

self.onmessage = async (event: MessageEvent) => {
  const { audioData, model, language } = event.data;
  
  try {
    if (!audioData) {
      throw new Error('No audio data provided');
    }
    
    console.log(`[Worker] Processing sample with model ${model}, audio length: ${audioData.length}`);
    self.postMessage({ progress: 10, status: `Loading ${model}...` });
    
    const transcriber = await pipeline(
      "automatic-speech-recognition",
      model,
      {
        progress_callback: (progress: any) => {
          if (progress && progress.progress) {
            self.postMessage({
              progress: 10 + (progress.progress * 0.4),
              status: `Loading ${model}... ${Math.round(progress.progress * 100)}%`
            });
          }
        }
      }
    );
    
    self.postMessage({ progress: 50, status: `Transcribing with ${model}...` });
    
    const transcriptionOptions: any = {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: "word"
    };
    
    // Only add language/task for multilingual models
    if (!model.includes('.en')) {
      transcriptionOptions.language = language || "en";
      transcriptionOptions.task = "transcribe";
    }
    
    const result = await transcriber(audioData, transcriptionOptions);
    
    // Handle both single result and array of results
    const finalResult = Array.isArray(result) ? result[0] : result;
    
    self.postMessage({
      type: "complete",
      result: {
        text: finalResult.text || '',
        chunks: finalResult.chunks || []
      },
      progress: 100,
      status: "Transcription complete!"
    });
  } catch (error: any) {
    self.postMessage({
      error: error.message,
      debug: `[Worker] Error: ${error.stack}`
    });
  }
};

export {};