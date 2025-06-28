console.log("Bleep view JS loaded");

import { pipeline } from "@huggingface/transformers";
import { fetchFile } from "@ffmpeg/util";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { getBleepSounds, findBleepSound } from "../assets/bleeps/index.js";
import { fileTypeFromBuffer } from "file-type";

// Transcription handling
export function initializeBleepView() {
  console.log("initializeBleepView called");
  const dropzone = document.getElementById("bleep-dropzone");
  const fileInput = document.getElementById("bleepFileInput");
  const languageSelect = document.getElementById("bleepLanguage");
  const progressContainer = document.getElementById("bleepProgressContainer");
  const resultsContainer = document.getElementById("bleepResultsContainer");
  const transcribeButton = document.getElementById("transcribeAndBleepButton");
  const modelRadios = document.getElementsByName("bleepModel");
  const bleepSoundSelect = document.getElementById("bleepSound");
  const bleepPreviewButton = document.getElementById("bleepPreviewButton");
  const bleepSoundName = document.getElementById("bleepSoundName");
  const progressBar = document.getElementById("bleepProgressBar");
  const progressText = document.getElementById("bleepProgressText");
  const matchExactCheckbox = document.getElementById("matchExact");
  const matchPartialCheckbox = document.getElementById("matchPartial");
  const matchFuzzyCheckbox = document.getElementById("matchFuzzy");
  const fuzzyDistanceInput = document.getElementById("fuzzyDistance");
  const fuzzyDistanceContainer = document.getElementById(
    "fuzzyDistanceContainer"
  );
  const runMatchingButton = document.getElementById("runMatchingButton");
  const matchResultsContainer = document.getElementById("bleepMatchResults");
  const fileWarningContainer = document.getElementById("bleepFileWarning");

  let selectedFile = null;
  let selectedBleep = null;
  let lastTranscriptOutput = null;

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
  fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
  dropzone.addEventListener("drop", (e) => {
    preventDefaults(e);
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) {
      handleFiles(dt.files);
    }
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

  function updateProgress(percentage, text) {
    if (progressBar && progressText) {
      progressBar.style.width = `${percentage}%`;
      progressText.textContent = text || `${Math.round(percentage)}%`;
    } else if (progressContainer) {
      progressContainer.textContent = text || `${Math.round(percentage)}%`;
    }
  }

  cancelButton.addEventListener("click", () => {
    if (worker) {
      worker.terminate();
      worker = null;
      cancelButton.classList.add("hidden");
      updateProgress(0, "Transcription cancelled.");
      transcribeButton.disabled = false;
    }
  });

  function highlight() {
    dropzone.classList.add("bg-blue-100", "border-blue-500");
  }

  function unhighlight() {
    dropzone.classList.remove("bg-blue-100", "border-blue-500");
  }

  async function handleFiles(files) {
    if (!files || !files.length) return;
    selectedFile = files[0];
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
    if (selectedFile) {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const detected = await fileTypeFromBuffer(new Uint8Array(arrayBuffer));
      let ext = selectedFile.name.split(".").pop().toLowerCase();
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
        dropzoneText.textContent = `Selected file: ${selectedFile.name} (type mismatch)`;
        transcribeButton.disabled = true;
        return;
      }
    }

    if (selectedFile && validAudioTypes.includes(selectedFile.type)) {
      dropzoneText.textContent = `Selected file: ${selectedFile.name}`;
      transcribeButton.disabled = false;
    } else {
      selectedFile = null;
      dropzoneText.textContent =
        "Drag and drop your audio file here or click to browse";
      transcribeButton.disabled = true;
    }
  }

  transcribeButton.addEventListener("click", async () => {
    if (!selectedFile) {
      console.log("[Debug] No file selected when transcribe clicked");
      updateProgress(0, "Please select a file first.");
      return;
    }

    console.log("[Debug] Starting transcription for file", selectedFile);
    updateProgress(0, "Initializing...");
    resultsContainer.innerHTML = "";
    cancelButton.classList.remove("hidden");
    transcribeButton.disabled = true;

    try {
      // Get language and model
      const language = languageSelect.value;
      let model = "onnx-community/whisper-base_timestamped";
      for (const radio of modelRadios) {
        if (radio.checked && radio.value === "large") {
          model = "onnx-community/whisper-large-v3-turbo_timestamped";
        }
      }
      // Read file buffer
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
            const decodedAudio = await audioContext.decodeAudioData(
              audioBuffer
            );
            const float32Audio = decodedAudio.getChannelData(0);
            console.log(
              "[Main] Decoded extracted audio to Float32Array, length:",
              float32Audio.length
            );
            worker.postMessage({
              type: "transcribe",
              audioData: float32Audio,
              fileType: "audio/wav",
              model: model,
              language,
            });
          } catch (err) {
            console.error("[Main] Audio decoding failed after extraction", err);
            updateProgress(0, "Audio decoding failed after extraction");
            resultsContainer.innerHTML = "";
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
          updateProgress(0, "Error: " + error);
          resultsContainer.innerHTML = "";
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
          model: model,
          language,
        });
      }
    } catch (err) {
      console.error("[BleepView] Error during transcription:", err);
      updateProgress(0, "Error: " + err.message);
      resultsContainer.innerHTML = "";
    } finally {
      cancelButton.classList.add("hidden");
      transcribeButton.disabled = false;
    }
  });

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
    // Store transcript output for matching
    lastTranscriptOutput = output;
    // Optionally clear previous match results
    if (matchResultsContainer) matchResultsContainer.innerHTML = "";
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

  // Show/hide fuzzy distance input
  if (matchFuzzyCheckbox && fuzzyDistanceContainer) {
    matchFuzzyCheckbox.addEventListener("change", () => {
      if (matchFuzzyCheckbox.checked) {
        fuzzyDistanceContainer.classList.remove("hidden");
      } else {
        fuzzyDistanceContainer.classList.add("hidden");
      }
    });
  }

  // Levenshtein distance for fuzzy matching
  function levenshtein(a, b) {
    const matrix = Array.from({ length: a.length + 1 }, () => []);
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }
    return matrix[a.length][b.length];
  }

  // Example function to get selected matching modes
  function getSelectedMatchingModes() {
    return {
      exact: matchExactCheckbox && matchExactCheckbox.checked,
      partial: matchPartialCheckbox && matchPartialCheckbox.checked,
      fuzzy: matchFuzzyCheckbox && matchFuzzyCheckbox.checked,
      fuzzyDistance: fuzzyDistanceInput
        ? parseInt(fuzzyDistanceInput.value, 10)
        : 1,
    };
  }

  // Helper to normalize words (lowercase, strip punctuation except apostrophes)
  function normalizeWord(word) {
    return word.toLowerCase().replace(/[^a-z0-9']/gi, "");
  }

  // Example function to match words (only exact for now)
  function isCensorMatch(transcriptWord, censorWord, modes) {
    transcriptWord = normalizeWord(transcriptWord);
    censorWord = normalizeWord(censorWord);
    if (modes.exact && transcriptWord === censorWord) {
      return true;
    }
    if (modes.partial && transcriptWord.includes(censorWord)) {
      return true;
    }
    if (
      modes.fuzzy &&
      levenshtein(transcriptWord, censorWord) <= (modes.fuzzyDistance || 1)
    ) {
      return true;
    }
    return false;
  }

  // Example usage: finding matches after transcription
  function findCensoredWords(transcriptChunks, censorWords, modes) {
    // transcriptChunks: array of {text, timestamp}
    // censorWords: array of words (strings)
    // modes: {exact, partial, fuzzy}
    const matches = [];
    for (const chunk of transcriptChunks) {
      for (const censorWord of censorWords) {
        if (isCensorMatch(chunk.text, censorWord, modes)) {
          matches.push({ word: chunk.text, timestamp: chunk.timestamp });
          break; // Only need to match once per chunk
        }
      }
    }
    return matches;
  }

  // Add handler for Run Matching button
  if (runMatchingButton) {
    runMatchingButton.addEventListener("click", () => {
      if (!lastTranscriptOutput || !lastTranscriptOutput.chunks) {
        matchResultsContainer.innerHTML =
          '<div class="text-red-600">Please transcribe a file first.</div>';
        return;
      }
      const censorWords = document
        .getElementById("bleepWords")
        .value.split(/[ ,]+/)
        .filter(Boolean);
      const modes = getSelectedMatchingModes();
      const matches = findCensoredWords(
        lastTranscriptOutput.chunks,
        censorWords,
        modes
      );
      // Display results
      if (matches.length === 0) {
        matchResultsContainer.innerHTML =
          '<div class="text-yellow-600">No matches found.</div>';
      } else {
        matchResultsContainer.innerHTML =
          `<div class="mb-2 text-green-700 font-semibold">${matches.length} match(es) found:</div>` +
          '<ul class="list-disc ml-6">' +
          matches
            .map(
              (m) =>
                `<li><span class="font-mono">${
                  m.word
                }</span> <span class="text-gray-500">[${m.timestamp[0].toFixed(
                  2
                )}s - ${m.timestamp[1].toFixed(2)}s]</span></li>`
            )
            .join("") +
          "</ul>";
      }
    });
  }
}
