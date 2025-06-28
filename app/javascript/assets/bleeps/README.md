# Bleep Sound Assets

This directory contains audio files (e.g., MP3, WAV) used as bleep/censor sounds in the application.

- Place all bleep sound files here (e.g., `bleep.mp3`, `brown.mp3`).
- Metadata for each sound is defined in `bleepSounds.json`.
- Sounds should be short (<2s), normalized, and in a web-friendly format (MP3 or WAV).

## Usage

The frontend loader module will use `bleepSounds.json` to display and play these sounds in the customization UI.
