import { pipeline, AutoTokenizer } from "@huggingface/transformers";
import { fetchFile } from "@ffmpeg/util";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { getBleepSounds, findBleepSound } from "../assets/bleeps/index.js";
import { fileTypeFromBuffer } from "file-type";

// Transcription handling
export function initializeTranscription() {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const languageSelect = document.getElementById("language");
  const progressBar = document.getElementById("progress");
  const progressText = document.getElementById("progressText");
  const resultsContainer = document.getElementById("results");
  const errorContainer = document.getElementById("error");
  const transcribeButton = document.getElementById("transcribeButton");
  const bleepSoundSelect = document.getElementById("bleepSound");
  const bleepPreviewButton = document.getElementById("bleepPreviewButton");
  const bleepSoundName = document.getElementById("bleepSoundName");
  const fileWarningContainer = document.getElementById(
    "transcriptionFileWarning"
  );
  let selectedFile = null;
  let selectedBleep = null;

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
    console.log("[Debug] File input changed", e.target.files);
    handleFiles(e.target.files);
  });

  // Add Cancel button to the UI
  let cancelButton = document.getElementById("cancelTranscriptionButton");
  if (!cancelButton) {
    cancelButton = document.createElement("button");
    cancelButton.id = "cancelTranscriptionButton";
    cancelButton.textContent = "Cancel";
    cancelButton.className =
      "ml-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 hidden";
    transcribeButton.parentNode.insertBefore(
      cancelButton,
      transcribeButton.nextSibling
    );
  }

  let worker = null;

  cancelButton.addEventListener("click", () => {
    if (worker) {
      worker.terminate();
      worker = null;
      cancelButton.classList.add("hidden");
      updateProgress(0, "Transcription cancelled.");
      transcribeButton.disabled = false;
    }
  });

  transcribeButton.addEventListener("click", async () => {
    if (!selectedFile) {
      console.log("[Debug] No file selected when transcribe clicked");
      showError("Please select a file first.");
      return;
    }

    console.log("[Debug] Starting transcription for file", selectedFile);
    hideError();
    updateProgress(0, "Initializing...");
    transcribeButton.disabled = true;
    resultsContainer.innerHTML = ""; // Clear previous results
    cancelButton.classList.add("hidden");

    // Prepare file data
    const language = languageSelect.value;
    const modelName = document.getElementById("model").value;
    const fileBuffer = await selectedFile.arrayBuffer();
    const fileType = selectedFile.type;
    console.log("[Debug] File type:", fileType);

    worker = new Worker(
      new URL("../workers/transcriptionWorker.js", import.meta.url),
      { type: "module" }
    );
    console.log("[Debug] Worker created");

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
        console.log("[Debug] Progress update:", progress, status);
        updateProgress(progress, status || "");
        if (status === "Transcribing...") {
          cancelButton.classList.remove("hidden");
        }
      }
      if (msgType === "extracted" && audioBuffer) {
        console.log("[Debug] Received extracted audio buffer from worker");
        // Decode the extracted audio buffer to Float32Array
        try {
          const audioContext = new AudioContext({ sampleRate: 16000 });
          const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
          const float32Audio = decodedAudio.getChannelData(0);
          console.log(
            "[Main] Decoded extracted audio to Float32Array, length:",
            float32Audio.length
          );
          worker.postMessage({
            type: "transcribe",
            audioData: float32Audio,
            fileType: "audio/wav",
            model: modelName,
            language,
          });
        } catch (err) {
          console.error("[Main] Audio decoding failed after extraction", err);
          showError("Audio decoding failed after extraction");
          transcribeButton.disabled = false;
          cancelButton.classList.add("hidden");
          worker.terminate();
          worker = null;
        }
        return;
      }
      if (result) {
        console.log("[Main] Received result from worker", result);
        showResults(result);
        transcribeButton.disabled = false;
        cancelButton.classList.add("hidden");
        worker.terminate();
        worker = null;
      }
      if (error) {
        console.error("[Main] Worker error:", error);
        showError(error);
        transcribeButton.disabled = false;
        cancelButton.classList.add("hidden");
        worker.terminate();
        worker = null;
      }
    };

    if (fileType === "video/mp4") {
      console.log("[Debug] Sending extract message to worker for MP4");
      worker.postMessage({ type: "extract", fileBuffer, fileType });
    } else {
      // Decode audio to Float32Array in main thread
      let audioDataToSend = fileBuffer;
      if (fileType.startsWith("audio/")) {
        try {
          const audioContext = new AudioContext({ sampleRate: 16000 });
          const decodedAudio = await audioContext.decodeAudioData(fileBuffer);
          audioDataToSend = decodedAudio.getChannelData(0);
          console.log(
            "[Main] Decoded audio to Float32Array, length:",
            audioDataToSend.length
          );
        } catch (err) {
          console.error(
            "[Main] Audio decoding failed, sending raw buffer",
            err
          );
        }
      }
      console.log("[Debug] Sending transcribe message to worker");
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

    // Client-side file type check
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
        selectedFile = file;
        dropzoneText.textContent = `Selected file: ${file.name}`;
        transcribeButton.disabled = false;
        hideError();
      } else {
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

    // Display the full transcript first
    const fullTranscript = document.createElement("div");
    fullTranscript.className = "mb-6";
    fullTranscript.innerHTML = `
      <h3 class="text-lg font-semibold mb-2">Full Transcript</h3>
      <p class="text-gray-800 bg-gray-50 p-3 rounded-md">${output.text}</p>
    `;
    resultsContainer.appendChild(fullTranscript);

    // Display word-level timestamps
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

  // Populate bleep sound dropdown
  if (bleepSoundSelect) {
    const sounds = getBleepSounds();
    sounds.forEach((sound) => {
      const opt = document.createElement("option");
      opt.value = sound.filename;
      opt.textContent = sound.name;
      bleepSoundSelect.appendChild(opt);
    });
    bleepSoundSelect.addEventListener("change", (e) => {
      selectedBleep = sounds.find((s) => s.filename === e.target.value);
      bleepSoundName.textContent = selectedBleep ? selectedBleep.name : "";
    });
  }

  // Preview button logic
  if (bleepPreviewButton) {
    bleepPreviewButton.addEventListener("click", () => {
      if (!selectedBleep) return;
      const audio = new Audio(selectedBleep.url);
      audio.play();
    });
  }
}
