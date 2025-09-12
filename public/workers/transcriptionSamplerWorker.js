// Try to load transformers library
try {
  importScripts('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.2');
} catch (error) {
  self.postMessage({ 
    error: 'Failed to load transformers library. Check internet connection.',
    details: error.message 
  });
}

self.onmessage = async (event) => {
  const { type, fileBuffer, fileType, model, language, sampleStart, sampleDuration } = event.data;
  
  try {
    if (type === 'sample') {
      // Load the model
      const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.2/+esm');
      
      const transcriber = await pipeline(
        'automatic-speech-recognition',
        model,
        {
          progress_callback: (progress) => {
            if (progress && progress.progress) {
              self.postMessage({
                progress: 10 + (progress.progress * 40), // 10-50% for model loading
                status: `Loading model... ${Math.round(progress.progress * 100)}%`
              });
            }
          }
        }
      );

      // For simplicity, we'll transcribe the whole file for now
      // In a real implementation, you'd extract the specific sample
      const result = await transcriber(fileBuffer, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: false,
        language: language || 'en',
        task: 'transcribe',
      });

      // Handle both single result and array of results
      let finalResult;
      if (Array.isArray(result)) {
        // Merge all chunks when result is an array
        console.log(`[Worker] Merging ${result.length} transcription chunks`);
        finalResult = {
          text: result.map(r => r.text || '').join(' ')
        };
      } else {
        finalResult = result;
      }

      self.postMessage({
        type: 'complete',
        result: {
          text: finalResult.text || 'No transcription generated'
        }
      });
    }
  } catch (error) {
    self.postMessage({
      error: error.message
    });
  }
};