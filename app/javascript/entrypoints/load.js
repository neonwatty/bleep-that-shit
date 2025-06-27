import { initializeTranscription } from "../pages/transcription";

// Initialize any global JavaScript functionality here
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded");

  // Only initialize transcription on the transcription-test page
  if (window.location.pathname === "/transcription-test") {
    console.log("Initializing transcription on transcription-test page");
    initializeTranscription();
  }
});
