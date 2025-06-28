# Page snapshot

```yaml
- main:
  - navigation:
    - link "Frame Miner":
      - /url: /
    - link "Sign Up":
      - /url: /users/new
    - link "Sign In":
      - /url: /sessions/new
    - link "Transcription View":
      - /url: /transcription-view
    - link "Bleep View":
      - /url: /bleep-view
  - heading "Audio Transcription" [level=1]
  - paragraph: "Selected file: test.mp3"
  - text: Language
  - combobox "Language":
    - option "English" [selected]
    - option "Spanish"
    - option "French"
    - option "German"
    - option "Italian"
    - option "Portuguese"
    - option "Dutch"
    - option "Polish"
    - option "Russian"
    - option "Japanese"
    - option "Korean"
    - option "Chinese"
  - text: Model
  - radio "Base (Faster, less accurate)" [checked]
  - text: Base (Faster, less accurate)
  - radio "Large (Slower, more accurate)"
  - text: Large (Slower, more accurate)
  - button "Transcribe" [disabled]
  - text: Initializing...
```