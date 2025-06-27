import { pipeline, AutoTokenizer } from "@huggingface/transformers";
import { fetchFile } from "@ffmpeg/util";
import { FFmpeg } from "@ffmpeg/ffmpeg";

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
  let selectedFile = null;

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

  transcribeButton.addEventListener("click", async () => {
    if (!selectedFile) {
      showError("Please select a file first.");
      return;
    }

    hideError();
    updateProgress(0, "Initializing...");
    transcribeButton.disabled = true;
    resultsContainer.innerHTML = ""; // Clear previous results

    try {
      console.log(
        "[Transcription] Starting transcription for file",
        selectedFile
      );
      const language = languageSelect.value;
      const model = document.querySelector('input[name="model"]:checked').value;
      let modelName;
      if (model === "base") {
        modelName = "onnx-community/whisper-base_timestamped";
      } else if (model === "large") {
        modelName = "onnx-community/whisper-large-v3-turbo_timestamped";
      } else {
        modelName = "onnx-community/whisper-base_timestamped"; // fallback
      }
      console.log(
        "[Transcription] Selected language:",
        language,
        "model:",
        modelName
      );

      let audioBuffer;
      let fileToDecode = selectedFile;
      console.log("[Transcription] File type:", selectedFile.type);

      // If the file is a video/mp4, extract audio using ffmpeg.wasm
      if (selectedFile.type === "video/mp4") {
        console.log("[Transcription] FFmpeg module loaded");
        updateProgress(5, "Extracting audio from video...");
        const ffmpeg = new FFmpeg({ log: true, corePath: "/ffmpeg-core.js" });
        console.log("[Transcription] FFmpeg instance created", ffmpeg);
        if (!ffmpeg.loaded) {
          console.log("[Transcription] Loading ffmpeg core...");
          await ffmpeg.load();
          console.log("[Transcription] ffmpeg core loaded");
        }
        const fileData = await fetchFile(selectedFile);
        console.log("[Transcription] Writing input.mp4 to ffmpeg FS", fileData);
        await ffmpeg.writeFile("input.mp4", fileData);
        console.log("[Transcription] Starting ffmpeg audio extraction...");
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
        console.log(
          "[Transcription] Audio extraction complete, reading output.wav"
        );
        const audioData = await ffmpeg.readFile("output.wav");
        console.log("[Transcription] output.wav fileData:", audioData);
        fileToDecode = new File([audioData.buffer], "output.wav", {
          type: "audio/wav",
        });
        console.log(
          "[Transcription] Audio file ready for decoding",
          fileToDecode
        );
      }

      // 1. Read the audio file into a buffer
      console.log("[Transcription] Reading file to arrayBuffer");
      audioBuffer = await fileToDecode.arrayBuffer();
      console.log("[Transcription] Got audioBuffer:", audioBuffer);

      // 2. Create an AudioContext and decode the audio data
      const audioContext = new AudioContext({
        sampleRate: 16000, // Whisper models expect 16kHz audio
      });
      console.log("[Transcription] Created AudioContext");
      const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
      console.log("[Transcription] Decoded audio:", decodedAudio);
      const audioData = decodedAudio.getChannelData(0);
      console.log("[Transcription] Got channel data for transcription");

      // 3. Initialize the transcription pipeline
      console.log("[Transcription] Initializing pipeline");
      const transcriber = await pipeline(
        "automatic-speech-recognition",
        modelName,
        {
          progress_callback: (data) => {
            const progress = (data.progress || 0).toFixed(2);
            let statusText = "";
            switch (data.status) {
              case "download":
                statusText = `Downloading model: ${progress}%`;
                updateProgress(progress * 0.8, statusText); // Downloading is 80% of the loading phase
                break;
              case "progress":
                statusText = `Transcribing: ${progress}%`;
                updateProgress(80 + progress * 0.2, statusText); // Transcription is the final 20%
                break;
              case "done":
                statusText = "Finalizing...";
                updateProgress(100, statusText);
                break;
              default:
                statusText = data.status.replace(/_/g, " ");
                updateProgress(data.progress, statusText);
            }
            console.log(
              "[Transcription] Pipeline progress:",
              data.status,
              data.progress
            );
          },
        }
      );

      // 4. Transcribe the audio
      updateProgress(80, "Model loaded. Transcribing...");
      console.log("[Transcription] Calling transcriber");
      const output = await transcriber(audioData, {
        language: language,
        task: "transcribe",
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: "word", // Request word-level timestamps
      });
      console.log("[Transcription] Transcription output:", output);

      // 5. Display the results
      showResults(output);
    } catch (error) {
      console.error("[Transcription] ERROR:", error, error.stack);
      let errorMessage = `An unexpected error occurred: ${error.message}`;
      if (error.message.includes("Failed to fetch")) {
        errorMessage =
          "Failed to download the transcription model. Please check your internet connection.";
      } else if (error.message.includes("decodeAudioData")) {
        errorMessage =
          "The audio file appears to be corrupted or in an unsupported format.";
      }
      showError(errorMessage);
    } finally {
      transcribeButton.disabled = false;
      // The final state is handled in showResults or showError
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
}
