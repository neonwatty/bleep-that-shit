// Transcription handling
export function initializeTranscription() {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const languageSelect = document.getElementById("language");
  const modelSelect = document.getElementById("model");
  const progressBar = document.getElementById("progress");
  const progressText = document.getElementById("progressText");
  const resultsContainer = document.getElementById("results");
  const errorContainer = document.getElementById("error");

  if (!dropzone) return;

  // Handle drag and drop
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, highlight, false);
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, unhighlight, false);
  });

  function highlight() {
    dropzone.classList.add("border-blue-500");
  }

  function unhighlight() {
    dropzone.classList.remove("border-blue-500");
  }

  // Handle file selection
  dropzone.addEventListener("drop", handleDrop, false);
  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", handleFileSelect);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    handleFile(file);
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    handleFile(file);
  }

  async function handleFile(file) {
    if (!file || !file.type.startsWith("audio/")) {
      showError("Please upload an audio file");
      return;
    }

    const formData = new FormData();
    formData.append("audio", file);
    formData.append("language", languageSelect.value);
    formData.append("model", modelSelect.value);

    try {
      // Start transcription
      const response = await fetch("/transcriptions", {
        method: "POST",
        body: formData,
        headers: {
          "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')
            .content,
        },
      });

      if (!response.ok) throw new Error("Upload failed");

      const { job_id } = await response.json();
      pollStatus(job_id);
    } catch (error) {
      showError(error.message);
    }
  }

  async function pollStatus(jobId) {
    try {
      const response = await fetch(`/transcriptions/${jobId}/status`);
      if (!response.ok) throw new Error("Failed to get status");

      const data = await response.json();

      if (data.error) {
        showError(data.error);
        return;
      }

      updateProgress(data.progress || 0);

      if (data.status === "completed") {
        showResults(JSON.parse(data.result));
      } else if (data.status === "failed") {
        showError(data.error || "Transcription failed");
      } else {
        // Continue polling
        setTimeout(() => pollStatus(jobId), 1000);
      }
    } catch (error) {
      showError(error.message);
    }
  }

  function updateProgress(percent) {
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${Math.round(percent)}%`;
  }

  function showResults(result) {
    resultsContainer.innerHTML = "";
    errorContainer.classList.add("hidden");

    // Display full text
    const textDiv = document.createElement("div");
    textDiv.className = "mb-4";
    textDiv.textContent = result.text;
    resultsContainer.appendChild(textDiv);

    // Display segments with timestamps
    const segmentsDiv = document.createElement("div");
    segmentsDiv.className = "space-y-2";
    console.log(result.segments);

    result.segments.forEach((segment) => {
      const segmentDiv = document.createElement("div");
      segmentDiv.className = "flex gap-4";

      const timeDiv = document.createElement("div");
      timeDiv.className = "text-gray-500 w-24";
      timeDiv.textContent = `${formatTime(segment.start)} → ${formatTime(
        segment.end
      )}`;

      const textDiv = document.createElement("div");
      textDiv.textContent = segment.text;

      segmentDiv.appendChild(timeDiv);
      segmentDiv.appendChild(textDiv);
      segmentsDiv.appendChild(segmentDiv);
    });

    resultsContainer.appendChild(segmentsDiv);
    resultsContainer.classList.remove("hidden");
  }

  function showError(message) {
    errorContainer.textContent = message;
    errorContainer.classList.remove("hidden");
    resultsContainer.classList.add("hidden");
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
}
