import { initializeTranscription } from "../pages/transcription";
import { initializeBleepView } from "../pages/bleep_view";

// Initialize any global JavaScript functionality here
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded");

  // Only initialize transcription on the transcription-view page
  if (window.location.pathname === "/transcription-view") {
    console.log("Initializing transcription on transcription-view page");
    initializeTranscription();
  }

  // Only initialize transcription on the bleep-view page
  if (window.location.pathname === "/bleep-view") {
    console.log("Initializing transcription on bleep-view page");
    initializeBleepView();
  }
});
