import bleepSounds from "./bleepSounds.json";

/**
 * Returns the list of bleep sound metadata with resolved URLs for use in the UI.
 */
export function getBleepSounds() {
  return bleepSounds.map((sound) => ({
    ...sound,
    url: new URL(`./${sound.filename}`, import.meta.url).href,
  }));
}

/**
 * Find a bleep sound by name or filename.
 */
export function findBleepSound(query) {
  return getBleepSounds().find((s) => s.name === query || s.filename === query);
}
