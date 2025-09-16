import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

// Helper to get correct public path
function getPublicPath(path: string) {
  // In production, adjust for GitHub Pages subdirectory
  const basePath = self.location.pathname.includes('/bleep-that-shit')
    ? '/bleep-that-shit'
    : '';
  return `${basePath}${path}`;
}

let ffmpeg: FFmpeg | null = null;

async function loadFFmpeg() {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
}

self.onmessage = async (event: MessageEvent) => {
  const { type, videoBuffer, audioBuffer } = event.data;

  try {
    if (type === "remux") {
      self.postMessage({ status: "Loading FFmpeg...", progress: 0 });

      const ffmpeg = await loadFFmpeg();

      self.postMessage({ status: "Processing video...", progress: 20 });

      // Write input files
      await ffmpeg.writeFile("input_video.mp4", new Uint8Array(videoBuffer));
      await ffmpeg.writeFile("censored_audio.wav", new Uint8Array(audioBuffer));

      self.postMessage({ status: "Remuxing video with censored audio...", progress: 40 });

      // Remux video with new audio
      // -c:v copy - copy video codec without re-encoding
      // -c:a aac - encode audio to AAC
      // -shortest - finish encoding when shortest input ends
      await ffmpeg.exec([
        "-i", "input_video.mp4",
        "-i", "censored_audio.wav",
        "-c:v", "copy",
        "-c:a", "aac",
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-shortest",
        "output.mp4"
      ]);

      self.postMessage({ status: "Reading output...", progress: 80 });

      // Read the output file
      const outputData = await ffmpeg.readFile("output.mp4");

      // Clean up files to free memory
      await ffmpeg.deleteFile("input_video.mp4");
      await ffmpeg.deleteFile("censored_audio.wav");
      await ffmpeg.deleteFile("output.mp4");

      self.postMessage({ status: "Complete!", progress: 100 });

      // Handle both Uint8Array and string types
      if (outputData instanceof Uint8Array) {
        const buffer = outputData.buffer as ArrayBuffer;
        (self as any).postMessage(
          { type: "complete", videoBuffer: buffer },
          [buffer]
        );
      } else {
        // Convert string to Uint8Array if necessary
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(outputData as string);
        const buffer = uint8Array.buffer as ArrayBuffer;
        (self as any).postMessage(
          { type: "complete", videoBuffer: buffer },
          [buffer]
        );
      }
    }
  } catch (error: any) {
    self.postMessage({
      type: "error",
      error: error.message,
      stack: error.stack
    });
  }
};

export {};