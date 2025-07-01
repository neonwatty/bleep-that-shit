console.log("Bleep view JS loaded");

import { pipeline } from "@huggingface/transformers";
import { fetchFile } from "@ffmpeg/util";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { getBleepSounds, findBleepSound } from "../assets/bleeps/index.js";
import { fileTypeFromBuffer } from "file-type";
import { initCensoredAudioPlayer } from "../components/CensoredAudioPlayer";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

// Apply bleep sound to audio at matched intervals
function applyBleepsToAudio(originalBuffer, bleepBuffer, intervals) {
  const sampleRate = originalBuffer.sampleRate;
  const numChannels = originalBuffer.numberOfChannels;
  const output = new AudioBuffer({
    length: originalBuffer.length,
    numberOfChannels: numChannels,
    sampleRate: sampleRate,
  });

  // Copy original audio to output
  for (let ch = 0; ch < numChannels; ch++) {
    output.copyToChannel(originalBuffer.getChannelData(ch), ch);
  }

  // For each interval, overwrite with bleep
  intervals.forEach(({ start, end }) => {
    const startSample = Math.floor(start * sampleRate);
    const endSample = Math.floor(end * sampleRate);
    const bleepLength = bleepBuffer.length;

    for (let ch = 0; ch < numChannels; ch++) {
      const outData = output.getChannelData(ch);
      const bleepData = bleepBuffer.getChannelData(
        ch % bleepBuffer.numberOfChannels
      );

      for (let i = startSample; i < endSample && i < output.length; i++) {
        // Loop bleep if needed
        outData[i] = bleepData[(i - startSample) % bleepLength];
      }
    }
  });

  return output;
}

// Video player container and related state (declare once at top-level)
let censoredVideoPlayerContainer = null;
let censoredVideoDownloadButton = null;
let remuxWorker = null;
let censoredVideoUrl = null;
let bleepInputPlyrInstance = null;

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
  const previewCensoredAudioButton = document.getElementById(
    "previewCensoredAudioButton"
  );
  const downloadCensoredAudioButton = document.getElementById(
    "downloadCensoredAudioButton"
  );
  const bleepStepProgressContainer = document.getElementById(
    "bleepStepProgressContainer"
  );
  const bleepStepProgressBar = document.getElementById("bleepStepProgressBar");
  const bleepStepProgressText = document.getElementById(
    "bleepStepProgressText"
  );

  let selectedFile = null;
  let selectedBleep = null;
  let lastTranscriptOutput = null;
  let originalAudioBuffer = null;
  let censoredAudioBuffer = null;
  let censoredAudioSource = null;
  let previewAudioContext = null;
  let lastCensorMatches = null;
  const bleepAudioButton = document.getElementById("bleepAudioButton");

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
      let detected;
      try {
        detected = await fileTypeFromBuffer(new Uint8Array(arrayBuffer));
      } catch (err) {
        console.warn("[BleepView] fileTypeFromBuffer error:", err);
        detected = undefined;
      }
      let ext = selectedFile.name.split(".").pop().toLowerCase();
      let mismatch = false;
      let badFormat = false;
      if (!detected) {
        badFormat = true;
      } else if (detected.ext && ext !== detected.ext) {
        mismatch = true;
      }
      if (fileWarningContainer) {
        if (badFormat) {
          fileWarningContainer.innerHTML = `<div class='text-red-600 font-semibold'>Warning: File format could not be recognized. Please upload a valid audio file.</div>`;
          console.log("[Debug] Set bad format warning in fileWarningContainer");
          transcribeButton.disabled = true;
        } else if (mismatch) {
          fileWarningContainer.innerHTML = `<div class='text-red-600 font-semibold'>Warning: File extension .${ext} does not match detected type ${
            detected ? detected.ext.toUpperCase() : "unknown"
          } (${
            detected ? detected.mime : "unknown"
          }). Please upload a valid audio file.</div>`;
          console.log("[Debug] Set mismatch warning in fileWarningContainer");
          transcribeButton.disabled = true;
        }
      }
      if (badFormat) {
        dropzoneText.textContent = `Selected file: ${selectedFile.name} (unrecognized format)`;
        transcribeButton.disabled = true;
        return;
      }
      if (mismatch) {
        dropzoneText.textContent = `Selected file: ${selectedFile.name} (type mismatch)`;
        transcribeButton.disabled = true;
        return;
      }
      // Only clear the warning if the file is valid
      if (fileWarningContainer) {
        fileWarningContainer.innerHTML = "";
      }
    }

    if (selectedFile && validAudioTypes.includes(selectedFile.type)) {
      showBleepInputPreview(selectedFile);
      dropzoneText.textContent = `Selected file: ${selectedFile.name}`;
      transcribeButton.disabled = false;
      // Decode and store the original audio buffer
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const audioContext = new AudioContext();
        originalAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      } catch (err) {
        console.error("[BleepView] Error decoding original audio buffer", err);
        originalAudioBuffer = null;
      }
    } else {
      showBleepInputPreview(null);
      selectedFile = null;
      dropzoneText.textContent =
        "Drag and drop your audio file here or click to browse";
      transcribeButton.disabled = true;
      originalAudioBuffer = null;
    }
  }

  function showBleepInputPreview(file) {
    const section = document.getElementById("bleepInputPreviewSection");
    const container = document.getElementById("bleepInputPreviewContainer");
    if (!section || !container) return;
    // Remove previous content and destroy Plyr instance if any
    container.innerHTML = "";
    if (bleepInputPlyrInstance && bleepInputPlyrInstance.destroy) {
      bleepInputPlyrInstance.destroy();
      bleepInputPlyrInstance = null;
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
      mediaEl.setAttribute("id", "bleep-input-audio-player");
      mediaEl.src = url;
    } else if (file.type.startsWith("video/")) {
      mediaEl = document.createElement("video");
      mediaEl.setAttribute("controls", "");
      mediaEl.setAttribute("id", "bleep-input-video-player");
      mediaEl.src = url;
      mediaEl.setAttribute("playsinline", "");
      mediaEl.setAttribute("style", "max-width:100%;height:auto;");
    } else {
      section.classList.add("hidden");
      section.open = false;
      return;
    }
    container.appendChild(mediaEl);
    bleepInputPlyrInstance = new Plyr(mediaEl, {
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
      const model = document.getElementById("bleepModel").value;
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
          chunkProgress,
        } = event.data;
        if (debug) {
          console.log("[Worker Debug]", debug);
        }
        if (chunkProgress) {
          const { currentChunk, totalChunks } = chunkProgress;
          const percent = (currentChunk / totalChunks) * 100;
          updateProgress(
            percent,
            `Processing chunk ${currentChunk} of ${totalChunks}`
          );
          renderChunkStepper(currentChunk, totalChunks);
          return;
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
    // Render transcript into collapsible section
    const transcriptSection = document.getElementById("bleepTranscriptSection");
    const transcriptContainer = document.getElementById(
      "bleepTranscriptContainer"
    );
    if (transcriptSection && transcriptContainer) {
      transcriptContainer.innerHTML = "";
      // Full transcript
      const fullTranscript = document.createElement("div");
      fullTranscript.className = "mb-6";
      fullTranscript.innerHTML = `
        <h3 class="text-lg font-semibold mb-2">Full Transcript</h3>
        <p class="text-gray-800 bg-gray-50 p-3 rounded-md">${output.text}</p>
      `;
      transcriptContainer.appendChild(fullTranscript);
      // Word-level timestamps
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
        transcriptContainer.appendChild(segmentsContainer);
      }
      transcriptSection.classList.remove("hidden");
      transcriptSection.open = true;
    }
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
    // Set default to Classic Bleep if available
    const defaultBleep = sounds.find((s) => s.name === "Classic Bleep");
    if (defaultBleep) {
      bleepSoundSelect.value = defaultBleep.filename;
      selectedBleep = defaultBleep;
      if (bleepSoundName) bleepSoundName.textContent = defaultBleep.name;
    }
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

  // --- Censored Audio Player integration ---
  const censoredAudioPlayerContainer = document.getElementById(
    "censoredAudioPlayerContainer"
  );
  function showCensoredAudioPlayer(audioBuffer, matches) {
    if (!censoredAudioPlayerContainer) return;
    // Convert AudioBuffer to WAV Blob and URL
    const wavBlob = audioBufferToWavBlob(audioBuffer);
    const audioUrl = URL.createObjectURL(wavBlob);
    // Prepare markers: { time, label }
    const markers = (matches || []).map((m) => ({
      time: m.timestamp[0],
      label: m.word,
    }));
    console.log("[Debug] showCensoredAudioPlayer called", {
      audioUrl,
      markers,
    });
    censoredAudioPlayerContainer.classList.remove("hidden");
    console.log("[Debug] Showing censoredAudioPlayerContainer");
    initCensoredAudioPlayer(censoredAudioPlayerContainer, audioUrl, markers);
    // Hide preview button (optional)
    if (previewCensoredAudioButton)
      previewCensoredAudioButton.classList.add("hidden");
  }

  function showCensoredVideoPlayer(mp4Buffer, matches) {
    if (!censoredVideoPlayerContainer) return;
    // Clean up previous
    censoredVideoPlayerContainer.innerHTML = "";
    if (censoredVideoUrl) URL.revokeObjectURL(censoredVideoUrl);
    censoredVideoUrl = URL.createObjectURL(
      new Blob([mp4Buffer], { type: "video/mp4" })
    );
    // Create video element
    const video = document.createElement("video");
    video.setAttribute("controls", "");
    video.setAttribute("preload", "auto");
    video.src = censoredVideoUrl;
    censoredVideoPlayerContainer.appendChild(video);
    censoredVideoPlayerContainer.classList.remove("hidden");
    // Prepare markers
    const markers = (matches || []).map((m) => ({
      time: m.timestamp[0],
      label: m.word,
    }));
    // Init Plyr with markers
    new Plyr(video, {
      controls: [
        "play",
        "progress",
        "current-time",
        "duration",
        "mute",
        "volume",
        "download",
        "fullscreen",
      ],
      markers: {
        enabled: true,
        points: markers,
      },
    });
    // Show download button
    if (censoredVideoDownloadButton) {
      censoredVideoDownloadButton.classList.remove("hidden");
      censoredVideoDownloadButton.onclick = () => {
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = censoredVideoUrl;
        a.download = "censored_video.mp4";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
        }, 100);
      };
    }
  }

  // Add this function to render matches with delete buttons
  function renderMatchResults(matches) {
    const matchCountMessage = document.getElementById("bleepMatchCountMessage");
    const matchDetails = document.getElementById("bleepMatchResultsDetails");
    if (!matchResultsContainer) return;
    if (!matches || matches.length === 0) {
      matchResultsContainer.innerHTML =
        '<div class="text-yellow-600">No matches found.</div>';
      if (bleepAudioButton) bleepAudioButton.disabled = true;
      if (matchCountMessage) matchCountMessage.innerHTML = "";
      if (matchDetails) matchDetails.classList.add("hidden");
      return;
    }
    if (matchCountMessage) {
      matchCountMessage.innerHTML = `<div class="mb-2 text-green-700 font-semibold">${matches.length} match(es) found:</div>`;
    }
    if (matchDetails) {
      matchDetails.classList.remove("hidden");
      matchDetails.open = true;
    }
    matchResultsContainer.innerHTML =
      '<ul class="list-disc ml-6">' +
      matches
        .map(
          (m, i) =>
            `<li class="flex items-center gap-2"><span class="font-mono">${
              m.word
            }</span> <span class="text-gray-500">[${m.timestamp[0].toFixed(
              2
            )}s - ${m.timestamp[1].toFixed(
              2
            )}s]</span> <button class="delete-match-btn text-red-500 hover:text-red-700 ml-2" data-index="${i}" title="Remove this match">🗑️</button></li>`
        )
        .join("") +
      "</ul>";
    if (bleepAudioButton) bleepAudioButton.disabled = false;
    // Add event listeners for delete buttons
    matchResultsContainer
      .querySelectorAll(".delete-match-btn")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt(btn.getAttribute("data-index"), 10);
          if (!isNaN(idx)) {
            lastCensorMatches.splice(idx, 1);
            renderMatchResults(lastCensorMatches);
          }
        });
      });
  }

  // Update Run Matching handler to use renderMatchResults
  if (runMatchingButton) {
    runMatchingButton.addEventListener("click", async () => {
      if (!lastTranscriptOutput || !lastTranscriptOutput.chunks) {
        matchResultsContainer.innerHTML =
          '<div class="text-red-600">Please transcribe a file first.</div>';
        if (bleepAudioButton) bleepAudioButton.disabled = true;
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
      lastCensorMatches = matches;
      console.log("[Debug] matches after findCensoredWords:", matches);
      renderMatchResults(lastCensorMatches);
    });
  }

  if (bleepAudioButton) {
    bleepAudioButton.addEventListener("click", async () => {
      showBleepStepProgress();
      updateBleepStepProgress(0, "Starting bleeping...");
      if (!lastCensorMatches || lastCensorMatches.length === 0) {
        hideBleepStepProgress();
        return;
      }
      // --- Audio/video processing logic moved here ---
      if (originalAudioBuffer && selectedBleep) {
        try {
          // Load bleep sound as AudioBuffer
          const audioContext = new AudioContext();
          const bleepArrayBuffer = await fetch(selectedBleep.url).then((r) =>
            r.arrayBuffer()
          );
          const bleepBuffer = await audioContext.decodeAudioData(
            bleepArrayBuffer
          );
          // Prepare intervals from matches
          const intervals = lastCensorMatches.map((m) => ({
            start: m.timestamp[0],
            end: m.timestamp[1],
          }));
          // Simulate progress for applying bleeps (since it's fast, just a quick step)
          updateBleepStepProgress(20, "Applying bleeps...");
          censoredAudioBuffer = applyBleepsToAudio(
            originalAudioBuffer,
            bleepBuffer,
            intervals
          );
          updateBleepStepProgress(60, "Bleeps applied");
          // If original file is video/mp4, remux
          if (selectedFile && selectedFile.type === "video/mp4") {
            if (censoredAudioPlayerContainer) {
              censoredAudioPlayerContainer.classList.add("hidden");
              censoredAudioPlayerContainer.innerHTML = "";
            }
            matchResultsContainer.innerHTML +=
              '<div id="remuxProgress" class="mt-2 text-blue-700">Muxing censored audio with video...</div>';
            const videoBuffer = await selectedFile.arrayBuffer();
            const wavBlob = audioBufferToWavBlob(censoredAudioBuffer);
            const wavBuffer = await wavBlob.arrayBuffer();
            if (!remuxWorker)
              remuxWorker = new Worker(
                new URL("../workers/remuxWorker.js", import.meta.url),
                { type: "module" }
              );
            remuxWorker.onmessage = (e) => {
              if (e.data.progress !== undefined) {
                // Update progress bar with remux progress (from 60% to 100%)
                const percent = 60 + Math.round((e.data.progress / 100) * 40);
                updateBleepStepProgress(
                  percent,
                  e.data.status +
                    (e.data.progress < 100 ? ` (${e.data.progress}%)` : "")
                );
                const progressDiv = document.getElementById("remuxProgress");
                if (progressDiv)
                  progressDiv.textContent =
                    e.data.status +
                    (e.data.progress < 100 ? ` (${e.data.progress}%)` : "");
              }
              if (e.data.result) {
                const progressDiv = document.getElementById("remuxProgress");
                if (progressDiv) progressDiv.remove();
                showCensoredVideoPlayer(e.data.result, lastCensorMatches);
                updateBleepStepProgress(100, "Done!");
                setTimeout(hideBleepStepProgress, 1200);
              }
              if (e.data.error) {
                const progressDiv = document.getElementById("remuxProgress");
                if (progressDiv)
                  progressDiv.textContent = "Muxing error: " + e.data.error;
                updateBleepStepProgress(0, "Error: " + e.data.error);
                setTimeout(hideBleepStepProgress, 1200);
              }
            };
            remuxWorker.postMessage({
              videoBuffer,
              audioBuffer: wavBuffer,
              audioExt: "wav",
            });
          } else {
            showCensoredAudioPlayer(censoredAudioBuffer, lastCensorMatches);
            if (censoredVideoPlayerContainer) {
              censoredVideoPlayerContainer.classList.add("hidden");
              censoredVideoPlayerContainer.innerHTML = "";
            }
            if (censoredVideoDownloadButton)
              censoredVideoDownloadButton.classList.add("hidden");
            updateBleepStepProgress(100, "Done!");
            setTimeout(hideBleepStepProgress, 1200);
          }
        } catch (err) {
          console.error("[Debug] Error generating censored audio buffer", err);
          censoredAudioBuffer = null;
          if (censoredAudioPlayerContainer) {
            censoredAudioPlayerContainer.classList.add("hidden");
            censoredAudioPlayerContainer.innerHTML = "";
          }
          if (previewCensoredAudioButton)
            previewCensoredAudioButton.classList.remove("hidden");
          updateBleepStepProgress(0, "Error: " + err.message);
          setTimeout(hideBleepStepProgress, 1200);
        }
      } else {
        censoredAudioBuffer = null;
        if (censoredAudioPlayerContainer) {
          censoredAudioPlayerContainer.classList.add("hidden");
          censoredAudioPlayerContainer.innerHTML = "";
        }
        if (previewCensoredAudioButton)
          previewCensoredAudioButton.classList.remove("hidden");
        hideBleepStepProgress();
      }
      updateCensoredButtons();
    });
  }

  // Utility: Convert AudioBuffer to WAV Blob
  function audioBufferToWavBlob(audioBuffer) {
    // Helper adapted from npm wav-encoder or similar
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const numSamples = audioBuffer.length;
    const blockAlign = (numChannels * bitDepth) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    let offset = 0;
    function writeString(s) {
      for (let i = 0; i < s.length; i++)
        view.setUint8(offset++, s.charCodeAt(i));
    }
    writeString("RIFF");
    view.setUint32(offset, 36 + dataSize, true);
    offset += 4;
    writeString("WAVE");
    writeString("fmt ");
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, format, true);
    offset += 2;
    view.setUint16(offset, numChannels, true);
    offset += 2;
    view.setUint32(offset, sampleRate, true);
    offset += 4;
    view.setUint32(offset, byteRate, true);
    offset += 4;
    view.setUint16(offset, blockAlign, true);
    offset += 2;
    view.setUint16(offset, bitDepth, true);
    offset += 2;
    writeString("data");
    view.setUint32(offset, dataSize, true);
    offset += 4;
    // Write PCM samples
    for (let i = 0; i < numSamples; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = audioBuffer.getChannelData(ch)[i];
        sample = Math.max(-1, Math.min(1, sample));
        view.setInt16(
          offset,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true
        );
        offset += 2;
      }
    }
    return new Blob([buffer], { type: "audio/wav" });
  }

  // --- Enable/disable preview/download buttons based on censoredAudioBuffer ---
  function updateCensoredButtons() {
    if (previewCensoredAudioButton)
      previewCensoredAudioButton.disabled = !censoredAudioBuffer;
    if (downloadCensoredAudioButton)
      downloadCensoredAudioButton.disabled = !censoredAudioBuffer;
  }

  // Also update buttons on file load/reset
  if (downloadCensoredAudioButton || previewCensoredAudioButton) {
    updateCensoredButtons();
  }

  censoredVideoPlayerContainer = document.getElementById(
    "censoredVideoPlayerContainer"
  );
  censoredVideoDownloadButton = document.getElementById(
    "downloadCensoredVideoButton"
  );
  if (censoredVideoDownloadButton)
    censoredVideoDownloadButton.classList.add("hidden");

  // Render chunk stepper (dots)
  function renderChunkStepper(current, total) {
    const stepper = document.getElementById("chunkStepper");
    if (!stepper) return;
    if (!total || total <= 1) {
      stepper.innerHTML = "";
      return;
    }
    stepper.innerHTML = "";

    // Show all dots if <= 10
    if (total <= 10) {
      for (let i = 1; i <= total; i++) {
        const dot = document.createElement("span");
        dot.className = `inline-block w-3 h-3 rounded-full mx-0.5 border border-indigo-400 transition-colors duration-200 ${
          i < current
            ? "bg-indigo-400"
            : i === current
            ? "bg-indigo-600"
            : "bg-gray-200"
        }`;
        stepper.appendChild(dot);
      }
      return;
    }

    // Condensed stepper for large totals
    const addDot = (i) => {
      const dot = document.createElement("span");
      dot.className = `inline-block w-3 h-3 rounded-full mx-0.5 border border-indigo-400 transition-colors duration-200 ${
        i < current
          ? "bg-indigo-400"
          : i === current
          ? "bg-indigo-600"
          : "bg-gray-200"
      }`;
      stepper.appendChild(dot);
    };
    const addEllipsis = () => {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "…";
      ellipsis.className = "mx-1 text-gray-400";
      stepper.appendChild(ellipsis);
    };

    // Always show first dot
    addDot(1);

    // Show ellipsis if current > 4
    if (current > 4) addEllipsis();

    // Show up to 2 before, current, and 2 after
    for (
      let i = Math.max(2, current - 2);
      i <= Math.min(total - 1, current + 2);
      i++
    ) {
      if (i === 1 || i === total) continue; // already shown
      addDot(i);
    }

    // Show ellipsis if current < total - 3
    if (current < total - 3) addEllipsis();

    // Always show last dot
    addDot(total);
  }

  function showBleepStepProgress() {
    if (bleepStepProgressContainer)
      bleepStepProgressContainer.classList.remove("hidden");
  }
  function hideBleepStepProgress() {
    if (bleepStepProgressContainer)
      bleepStepProgressContainer.classList.add("hidden");
    if (bleepStepProgressBar) bleepStepProgressBar.style.width = "0%";
    if (bleepStepProgressText) bleepStepProgressText.textContent = "0%";
  }
  function updateBleepStepProgress(percent, text) {
    if (bleepStepProgressBar) bleepStepProgressBar.style.width = `${percent}%`;
    if (bleepStepProgressText)
      bleepStepProgressText.textContent = text || `${Math.round(percent)}%`;
  }
}
