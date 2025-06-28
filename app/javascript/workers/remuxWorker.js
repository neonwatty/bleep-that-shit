import { FFmpeg } from "@ffmpeg/ffmpeg";

self.onmessage = async (event) => {
  const { videoBuffer, audioBuffer, audioExt = "wav" } = event.data;
  try {
    self.postMessage({ progress: 0, status: "Loading ffmpeg..." });
    const ffmpeg = new FFmpeg({ log: false, corePath: "/ffmpeg-core.js" });
    if (!ffmpeg.loaded) await ffmpeg.load();
    self.postMessage({ progress: 10, status: "Writing input files..." });
    await ffmpeg.writeFile("input.mp4", new Uint8Array(videoBuffer));
    await ffmpeg.writeFile(`censored.${audioExt}`, new Uint8Array(audioBuffer));
    self.postMessage({
      progress: 20,
      status: "Running ffmpeg to mux video and censored audio...",
    });
    // ffmpeg command: replace audio, keep video, output mp4
    await ffmpeg.exec([
      "-i",
      "input.mp4",
      "-i",
      `censored.${audioExt}`,
      "-c:v",
      "copy",
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-shortest",
      "output.mp4",
    ]);
    self.postMessage({ progress: 90, status: "Reading output file..." });
    const output = await ffmpeg.readFile("output.mp4");
    self.postMessage({ progress: 100, status: "Done", result: output.buffer }, [
      output.buffer,
    ]);
  } catch (err) {
    self.postMessage({ error: err.message || err.toString() });
  }
};
