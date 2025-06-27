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

import { DirectUpload } from "@rails/activestorage";
import { initializeTranscription } from "../pages/transcription";

console.log("Application.jsx loaded");

// Initialize any global JavaScript functionality here
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded");

  // Only initialize transcription on the transcription-test page
  if (window.location.pathname === "/transcription-test") {
    console.log("Initializing transcription on transcription-test page");
    initializeTranscription();
  }
});

// Add any additional JavaScript initialization here
