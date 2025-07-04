import { pipeline } from "@huggingface/transformers";
import { fetchFile } from "@ffmpeg/util";
import { FFmpeg } from "@ffmpeg/ffmpeg";

self.onmessage = async (event) => {
  const { type, fileBuffer, audioData, fileType, model, language } = event.data;
  try {
    if (type === "extract") {
      self.postMessage({ debug: `[Worker] Extracting audio from MP4` });
      const ffmpeg = new FFmpeg({ log: false, corePath: "/ffmpeg-core.js" });
      if (!ffmpeg.loaded) await ffmpeg.load();
      await ffmpeg.writeFile("input.mp4", new Uint8Array(fileBuffer));
      await ffmpeg.exec([
        "-i",
        "input.mp4",
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        "output.wav",
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
        debug: `[Worker] Transcribing audio, length: ${audioData?.length}`,
      });
      self.postMessage({ progress: 20, status: "Loading model..." });
      const transcriber = await pipeline(
        "automatic-speech-recognition",
        model,
        {
          progress_callback: (data) => {
            self.postMessage({ progress: data.progress, status: data.status });
          },
        }
      );
      self.postMessage({
        debug: `[Worker] Pipeline loaded, starting transcription`,
      });
      self.postMessage({ progress: 60, status: "Transcribing..." });
      self.postMessage({ debug: `[Worker] About to call transcriber` });

      const durationSeconds = audioData.length / 16000;
      const output = await transcriber(audioData, {
        language: language,
        task: "transcribe",
        return_timestamps: "word",
        chunk_length_s: 30,
        stride_length_s: 0,
      });

      // Output structure should match what the UI expects
      const merged = {
        text: output.text,
        chunks: output.chunks || [],
      };
      self.postMessage({ debug: `[Worker] Transcription complete` });
      self.postMessage({ progress: 100, status: "Complete", result: merged });
      return;
    }
    self.postMessage({ error: "Unknown worker message type" });
  } catch (error) {
    self.postMessage({
      error: error.message,
      debug: `[Worker] ERROR: ${error.stack || error}`,
    });
  }
};
