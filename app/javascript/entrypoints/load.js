import { initializeTranscription } from "../pages/transcription";

// Initialize any global JavaScript functionality here
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded");

  // Only initialize transcription on the transcription-view page
  if (window.location.pathname === "/transcription-view") {
    console.log("Initializing transcription on transcription-view page");
    initializeTranscription();
  }
});
