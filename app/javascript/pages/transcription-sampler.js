import { pipeline, AutoTokenizer } from "@huggingface/transformers";
import { fetchFile } from "@ffmpeg/util";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { getBleepSounds, findBleepSound } from "../assets/bleeps/index.js";
import { fileTypeFromBuffer } from "file-type";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

// Transcription Sampler handling
export function initializeTranscriptionSampler() {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const languageSelect = document.getElementById("language");
  const progressBar = document.getElementById("progress");
  const progressText = document.getElementById("progressText");
  const resultsContainer = document.getElementById("results");
  const errorContainer = document.getElementById("error");
  const transcribeButton = document.getElementById("transcribeButton");
  const fileWarningContainer = document.getElementById(
    "transcriptionFileWarning"
  );
  let selectedFile = null;
  let inputPlyrInstance = null;

  if (!dropzone) return;

  transcribeButton.disabled = true;

  // Handle drag and drop
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Highlight drop zone when dragging over it
  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, highlight);
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, unhighlight);
  });

  // Handle file selection
  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });

  let worker = null;

  transcribeButton.addEventListener("click", async () => {
    if (!selectedFile) {
      showError("Please select a file first.");
      return;
    }

    hideError();
    updateProgress(0, "Initializing...");
    transcribeButton.disabled = true;
    resultsContainer.innerHTML = ""; // Clear previous results

    // Prepare file data
    const language = languageSelect.value;
    const modelName = document.getElementById("model").value;
    const fileBuffer = await selectedFile.arrayBuffer();
    const fileType = selectedFile.type;

    worker = new Worker(
      new URL("../workers/transcriptionSamplerWorker.js", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = async (event) => {
      const {
        progress,
        status,
        result,
        error,
        debug,
        type: msgType,
        audioBuffer,
      } = event.data;
      if (debug) {
        console.log("[Worker Debug]", debug);
      }
      if (progress !== undefined) {
        updateProgress(progress, status || "");
      }
      if (msgType === "extracted" && audioBuffer) {
        // Decode the extracted audio buffer to Float32Array
        try {
          const audioContext = new AudioContext({ sampleRate: 16000 });
          const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
          // Slice to first 5 seconds
          const sampleRate = decodedAudio.sampleRate;
          const maxSamples = Math.min(decodedAudio.length, sampleRate * 5);
          const float32Audio = decodedAudio
            .getChannelData(0)
            .slice(0, maxSamples);
          worker.postMessage({
            type: "transcribe",
            audioData: float32Audio,
            fileType: "audio/wav",
            model: modelName,
            language,
          });
        } catch (err) {
          showError("Audio decoding failed after extraction");
          transcribeButton.disabled = false;
          worker.terminate();
          worker = null;
        }
        return;
      }
      if (result) {
        showResults(result);
        transcribeButton.disabled = false;
        worker.terminate();
        worker = null;
      }
      if (error) {
        showError(error);
        transcribeButton.disabled = false;
        worker.terminate();
        worker = null;
      }
    };

    if (fileType === "video/mp4") {
      // Send extract message with duration: 5
      worker.postMessage({
        type: "extract",
        fileBuffer,
        fileType,
        duration: 5,
      });
    } else {
      // Decode audio to Float32Array in main thread
      let audioDataToSend = fileBuffer;
      if (fileType.startsWith("audio/")) {
        try {
          const audioContext = new AudioContext({ sampleRate: 16000 });
          const decodedAudio = await audioContext.decodeAudioData(fileBuffer);
          // Slice to first 5 seconds
          const sampleRate = decodedAudio.sampleRate;
          const maxSamples = Math.min(decodedAudio.length, sampleRate * 5);
          const float32Audio = decodedAudio
            .getChannelData(0)
            .slice(0, maxSamples);
          audioDataToSend = float32Audio;
          // UI note if file is shorter than 5 seconds
          const durationSec = decodedAudio.length / sampleRate;
          const note = document.getElementById("samplerDurationNote");
          if (note) {
            if (durationSec < 5) {
              note.textContent = `File is only ${durationSec.toFixed(
                2
              )} seconds long; transcribing the whole file.`;
            } else {
              note.textContent = `Transcribing only the first 5 seconds of your file.`;
            }
          }
        } catch (err) {
          showError("Audio decoding failed");
        }
      }
      worker.postMessage({
        type: "transcribe",
        audioData: audioDataToSend,
        fileType,
        model: modelName,
        language,
      });
    }
  });

  function highlight() {
    dropzone.classList.add("bg-blue-100", "border-blue-500");
  }

  function unhighlight() {
    dropzone.classList.remove("bg-blue-100", "border-blue-500");
  }

  function handleFiles(files) {
    if (files.length > 1) {
      showError("Please upload only one file at a time.");
      return;
    }
    const file = files[0];
    const dropzoneText = dropzone.querySelector("p");

    const validAudioTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/mp4",
      "audio/webm",
      "audio/flac",
      "audio/ogg",
      "audio/x-m4a",
      // Add video/mp4 for video files
      "video/mp4",
    ];

    (async () => {
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        const detected = await fileTypeFromBuffer(new Uint8Array(arrayBuffer));
        let ext = file.name.split(".").pop().toLowerCase();
        let mismatch = false;
        if (detected && detected.ext && ext !== detected.ext) {
          mismatch = true;
        }
        if (fileWarningContainer) {
          if (mismatch) {
            fileWarningContainer.innerHTML = `<div class='text-red-600 font-semibold'>Warning: File extension .${ext} does not match detected type ${
              detected ? detected.ext.toUpperCase() : "unknown"
            } (${
              detected ? detected.mime : "unknown"
            }). Please upload a valid audio file.</div>`;
            transcribeButton.disabled = true;
          } else {
            fileWarningContainer.innerHTML = "";
          }
        }
        if (mismatch) {
          dropzoneText.textContent = `Selected file: ${file.name} (type mismatch)`;
          transcribeButton.disabled = true;
          return;
        }
      }

      if (file && validAudioTypes.includes(file.type)) {
        showInputPreview(file);
        selectedFile = file;
        dropzoneText.textContent = `Selected file: ${file.name}`;
        transcribeButton.disabled = false;
        hideError();
      } else {
        showInputPreview(null);
        selectedFile = null;
        dropzoneText.textContent =
          "Drag and drop your audio file here or click to browse";
        transcribeButton.disabled = true;
        showError(
          `Invalid file type: ${file.type}. Please upload a valid audio or video file.`
        );
      }
    })();
  }

  function updateProgress(percentage, text) {
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = text || `${Math.round(percentage)}%`;
  }

  function showError(message) {
    errorContainer.innerHTML = `
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative" role="alert">
        <strong class="font-bold">Error:</strong>
        <span class="block sm:inline">${message}</span>
      </div>
    `;
    errorContainer.classList.remove("hidden");
    updateProgress(0, ""); // Reset progress bar on error
  }

  function hideError() {
    errorContainer.classList.add("hidden");
  }

  function showResults(output) {
    resultsContainer.innerHTML = ""; // Clear previous results
    const fullTranscript = document.createElement("div");
    fullTranscript.className = "mb-6";
    fullTranscript.innerHTML = `
      <h3 class="text-lg font-semibold mb-2">Full Transcript</h3>
      <p class="text-gray-800 bg-gray-50 p-3 rounded-md">${output.text}</p>
    `;
    resultsContainer.appendChild(fullTranscript);
    if (output.chunks && output.chunks.length > 0) {
      const segmentsContainer = document.createElement("div");
      segmentsContainer.innerHTML =
        '<h3 class="text-lg font-semibold mb-2">Word Timestamps</h3>';
      const segmentsGrid = document.createElement("div");
      segmentsGrid.className = "grid grid-cols-1 md:grid-cols-2 gap-4";
      output.chunks.forEach((chunk) => {
        const segmentEl = document.createElement("div");
        segmentEl.className =
          "flex items-center space-x-2 bg-gray-50 p-2 rounded-md";
        segmentEl.innerHTML = `
          <span class="font-mono text-sm text-gray-600 w-28">[${chunk.timestamp[0].toFixed(
            2
          )}s - ${chunk.timestamp[1].toFixed(2)}s]</span>
          <span class="text-gray-800">${chunk.text}</span>
        `;
        segmentsGrid.appendChild(segmentEl);
      });
      segmentsContainer.appendChild(segmentsGrid);
      resultsContainer.appendChild(segmentsContainer);
    }
    resultsContainer.classList.remove("hidden");
    updateProgress(100, "Complete");
  }

  function showInputPreview(file) {
    const section = document.getElementById("inputPreviewSection");
    const container = document.getElementById("inputPreviewContainer");
    if (!section || !container) return;
    // Remove previous content and destroy Plyr instance if any
    container.innerHTML = "";
    if (inputPlyrInstance && inputPlyrInstance.destroy) {
      inputPlyrInstance.destroy();
      inputPlyrInstance = null;
    }
    if (!file) {
      section.classList.add("hidden");
      section.open = false;
      return;
    }
    const url = URL.createObjectURL(file);
    let mediaEl;
    if (file.type.startsWith("audio/")) {
      mediaEl = document.createElement("audio");
      mediaEl.setAttribute("controls", "");
      mediaEl.setAttribute("id", "input-audio-player");
      mediaEl.src = url;
    } else if (file.type.startsWith("video/")) {
      mediaEl = document.createElement("video");
      mediaEl.setAttribute("controls", "");
      mediaEl.setAttribute("id", "input-video-player");
      mediaEl.src = url;
      mediaEl.setAttribute("playsinline", "");
      mediaEl.setAttribute("style", "max-width:100%;height:auto;");
    } else {
      section.classList.add("hidden");
      section.open = false;
      return;
    }
    container.appendChild(mediaEl);
    inputPlyrInstance = new Plyr(mediaEl, {
      controls: [
        "play",
        "progress",
        "current-time",
        "duration",
        "mute",
        "volume",
        "fullscreen",
      ],
    });
    section.classList.remove("hidden");
    section.open = true;
  }

  // Add a note for sampler duration feedback
  let samplerNote = document.getElementById("samplerDurationNote");
  if (!samplerNote) {
    samplerNote = document.createElement("div");
    samplerNote.id = "samplerDurationNote";
    samplerNote.className = "text-blue-700 text-sm mt-2";
    transcribeButton.parentNode.insertBefore(
      samplerNote,
      transcribeButton.nextSibling
    );
  }
}
