// CensoredAudioPlayer.js
// Vanilla JS component for playing censored audio with markers using Plyr
// Usage: import { initCensoredAudioPlayer } from './CensoredAudioPlayer';
//        initCensoredAudioPlayer(containerElement, audioUrl, markersArray);

import Plyr from "plyr";
import "plyr/dist/plyr.css";

/**
 * Initialize the CensoredAudioPlayer in a container.
 * @param {HTMLElement} container - The DOM element to render the player in.
 * @param {string} audioUrl - The URL (Blob or file) of the censored audio.
 * @param {Array<{time: number, label: string}>} markers - Array of marker objects.
 */
export function initCensoredAudioPlayer(container, audioUrl, markers = []) {
  // Clear container
  container.innerHTML = "";

  // Create audio element
  const audio = document.createElement("audio");
  audio.setAttribute("controls", "");
  audio.setAttribute("preload", "auto");
  audio.src = audioUrl;
  container.appendChild(audio);

  // Plyr options with markers
  const options = {
    controls: [
      "play",
      "progress",
      "current-time",
      "duration",
      "mute",
      "volume",
      "download",
    ],
    markers: {
      enabled: true,
      points: markers.map((m) => ({ time: m.time, label: m.label })),
    },
  };

  // Initialize Plyr
  const player = new Plyr(audio, options);

  // Add markers to the timeline (if Plyr markers plugin is available)
  if (player && player.markers && typeof player.markers.add === "function") {
    player.markers.add(markers.map((m) => ({ time: m.time, label: m.label })));
  }

  // Optionally, handle marker click events
  // player.on('marker:click', e => { ... });

  return player;
}
