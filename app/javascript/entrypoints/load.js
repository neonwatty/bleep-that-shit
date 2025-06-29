import { initializeTranscription } from "../pages/transcription";
import { initializeBleepView } from "../pages/bleep_view";
import { initializeTranscriptionSampler } from "../pages/transcription-sampler";

// Initialize any global JavaScript functionality here
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded");

  if (window.location.pathname === "/transcription-view") {
    console.log("Initializing transcription on transcription-view page");
    initializeTranscription();
  }

  if (window.location.pathname === "/bleep-view") {
    console.log("Initializing transcription on bleep-view page");
    initializeBleepView();
  }

  if (window.location.pathname === "/transcription-sampler-view") {
    console.log(
      "Initializing transcription on transcription-sampler-view page"
    );
    initializeTranscriptionSampler();
  }
});
