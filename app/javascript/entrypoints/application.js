// To see this message, add the following to the `<head>` section in your
// views/layouts/application.html.erb
//
//    <%= vite_client_tag %>
//    <%= vite_javascript_tag 'application' %>
console.log("Vite ⚡️ Rails");

// If using a TypeScript entrypoint file:
//     <%= vite_typescript_tag 'application' %>
//
// If you want to use .jsx or .tsx, add the extension:
//     <%= vite_javascript_tag 'application.jsx' %>

console.log(
  "Visit the guide for more information: ",
  "https://vite-ruby.netlify.app/guide/rails"
);

// Example: Load Rails libraries in Vite.
//
// import * as Turbo from '@hotwired/turbo'
// Turbo.start()
//
// import ActiveStorage from '@rails/activestorage'
// ActiveStorage.start()
//
// // Import all channels.
// const channels = import.meta.globEager('./**/*_channel.js')

// Example: Import a stylesheet in app/frontend/index.css
// import '~/index.css'

import { mountHelloComponent } from "../components/HelloComponent";
import Dropzone from "dropzone";
import "dropzone/dist/dropzone.css";
import { DirectUpload } from "@rails/activestorage";
import * as transformers from "@huggingface/transformers";
import {
  cachedFetch,
  resetCachedFetchSources,
  getCachedFetchSourcesSummary,
} from "../utils/cachedFetch";

Dropzone.autoDiscover = false;

// Example: Initialize Dropzone on an element with id 'my-dropzone'
document.addEventListener("DOMContentLoaded", () => {
  const dropzoneElement = document.getElementById("my-dropzone");
  const overallProgress = document.getElementById("overall-upload-progress");
  const overallProgressBar = document.getElementById(
    "overall-upload-progress-bar"
  );
  const feedback = document.getElementById("upload-feedback");

  function showFeedback(message, type = "info") {
    if (!feedback) return;
    feedback.innerHTML = `<div class="rounded px-4 py-2 mb-2 text-center font-semibold ${
      type === "error"
        ? "bg-red-100 border border-red-400 text-red-700"
        : type === "success"
        ? "bg-green-100 border border-green-400 text-green-700"
        : "bg-blue-100 border border-blue-400 text-blue-700"
    }">${message}</div>`;
  }
  function clearFeedback() {
    if (feedback) feedback.innerHTML = "";
  }

  if (dropzoneElement) {
    const dz = new Dropzone(dropzoneElement, {
      url: "/rails/active_storage/direct_uploads", // Not actually used
      autoProcessQueue: false, // We'll handle uploads manually
      addRemoveLinks: true,
      maxFilesize: 20, // MB
      acceptedFiles: "audio/*,video/*",
      dictDefaultMessage: "Drop audio or video files here or click to upload.",
      dictInvalidFileType: "Only audio and video files are allowed.",
      dictFileTooBig:
        "File is too large ({{filesize}}MB). Max allowed: {{maxFilesize}}MB.",
      init: function () {
        this.on("addedfile", function (file) {
          clearFeedback();
          // Use ActiveStorage DirectUpload for each file
          const upload = new DirectUpload(
            file,
            "/rails/active_storage/direct_uploads",
            {
              directUploadWillCreateBlobWithXHR: (xhr) => {
                // Add CSRF token
                const token = document
                  .querySelector('meta[name="csrf-token"]')
                  ?.getAttribute("content");
                if (token) xhr.setRequestHeader("X-CSRF-Token", token);
              },
            }
          );

          upload.create((error, blob) => {
            if (error) {
              showFeedback(
                `Upload failed: ${error} <button class='retry-upload bg-blue-200 hover:bg-blue-300 text-blue-800 font-bold py-1 px-2 rounded ml-2' data-filename='${file.name}'>Retry</button> <button class='cancel-upload bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-2 rounded ml-2' data-filename='${file.name}'>Cancel</button>`,
                "error"
              );
              this.emit("error", file, error);
              // Don't remove file immediately; allow retry/cancel
            } else {
              // Store blob.signed_id for later association
              file.uploadedBlob = blob;
              showFeedback(
                `Upload successful: <span class='font-mono'>${file.name}</span>`,
                "success"
              );
              this.emit("success", file);
              this.emit("complete", file);
              setTimeout(clearFeedback, 2000);
            }
          });
        });
        // Progress bar for overall uploads
        this.on("totaluploadprogress", function (progress) {
          if (overallProgress && overallProgressBar) {
            overallProgress.classList.remove("hidden");
            overallProgressBar.style.width = progress + "%";
          }
        });
        this.on("queuecomplete", function () {
          if (overallProgress && overallProgressBar) {
            setTimeout(() => {
              overallProgress.classList.add("hidden");
              overallProgressBar.style.width = "0%";
            }, 800);
          }
        });
        // Custom validation for number of files
        this.on("addedfile", function (file) {
          const maxFiles = 5;
          if (this.files.length > maxFiles) {
            showFeedback(
              `You can only upload up to ${maxFiles} files at a time.`,
              "error"
            );
            this.removeFile(file);
          }
        });
        this.on("error", function (file, message) {
          if (typeof message === "string") {
            showFeedback(`Error: ${message}`, "error");
          }
        });
        // Retry/cancel event delegation
        if (feedback) {
          feedback.addEventListener("click", (e) => {
            if (e.target.classList.contains("retry-upload")) {
              const filename = e.target.getAttribute("data-filename");
              const file = this.files.find((f) => f.name === filename);
              if (file) {
                this.removeFile(file);
                this.addFile(file);
              }
            } else if (e.target.classList.contains("cancel-upload")) {
              const filename = e.target.getAttribute("data-filename");
              const file = this.files.find((f) => f.name === filename);
              if (file) {
                this.removeFile(file);
                showFeedback(
                  `Upload cancelled: <span class='font-mono'>${filename}</span>`,
                  "info"
                );
                setTimeout(clearFeedback, 2000);
              }
            }
          });
        }
      },
    });
  }

  // Simple Whisper model loading button
  const loadModelBtn = document.getElementById("load-whisper-model-btn");
  const whisperModelSpinner = document.getElementById("whisper-model-spinner");
  const whisperModelError = document.getElementById("whisper-model-error");
  const whisperModelSuccess = document.getElementById("whisper-model-success");
  if (loadModelBtn) {
    loadModelBtn.addEventListener("click", async () => {
      loadModelBtn.disabled = true;
      loadModelBtn.textContent = "Loading...";
      if (whisperModelSpinner) whisperModelSpinner.classList.remove("hidden");
      if (whisperModelError) {
        whisperModelError.classList.add("hidden");
        whisperModelError.textContent = "";
      }
      if (whisperModelSuccess) {
        whisperModelSuccess.classList.add("hidden");
        whisperModelSuccess.textContent = "";
      }
      resetCachedFetchSources();
      try {
        const model = await transformers.pipeline(
          "automatic-speech-recognition",
          "onnx-community/whisper-base_timestamped",
          { fetch: cachedFetch }
        );
        loadModelBtn.textContent = "Model Loaded!";
        if (whisperModelSuccess) {
          const summary = getCachedFetchSourcesSummary();
          whisperModelSuccess.innerHTML = `<span class='inline-block align-middle'>✅</span> Whisper model loaded successfully!<br><span class='text-xs text-gray-700'>${summary}</span>`;
          whisperModelSuccess.classList.remove("hidden");
        }
      } catch (error) {
        loadModelBtn.textContent = "Load Whisper Model";
        loadModelBtn.disabled = false;
        if (whisperModelError) {
          whisperModelError.textContent =
            "Failed to load Whisper model. Please check your internet connection and try again.";
          whisperModelError.classList.remove("hidden");
        }
      }
      if (whisperModelSpinner) whisperModelSpinner.classList.add("hidden");
    });
  }
});

console.log(
  "@huggingface/transformers loaded:",
  transformers?.version || "(version unknown)"
);

mountHelloComponent();
