<a href="https://huggingface.co/spaces/neonwatty/bleep_that_sht" target="_parent"><img src="https://img.shields.io/badge/🤗-HuggingFace%20Space-cyan.svg" alt="HuggingFace Space"/></a>
<a href="https://colab.research.google.com/github/jermwatt/bleep_that_sht/blob/main/beep_that_sht_walkthrough.ipynb" target="_parent"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"/></a> <a href="https://www.youtube.com/watch?v=U8Ki9dD3HF0" target="_parent"><img src="https://badges.aleen42.com/src/youtube.svg" alt="Youtube"/></a>
[![Python application](https://github.com/neonwatty/bleep_that_sht/actions/workflows/python-app.yml/badge.svg)](https://github.com/neonwatty/bleep_that_sht/actions/workflows/python-app.yml/python-app.yml) <a href="https://www.producthunt.com/posts/bleep-that-sh-t?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-bleep&#0045;that&#0045;sh&#0045;t" target="_parent"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=470378&theme=light" alt="Bleep&#0032;That&#0032;Sh&#0042;t&#0033; - A&#0032;whisper&#0032;app&#0032;that&#0032;bleeps&#0032;out&#0032;chosen&#0032;words&#0032;in&#0032;YouTube&#0032;videos | Product Hunt" style="width: 250px; height: 45px;" /></a>

# Bleep That Sh\*t! — In-Browser Audio & Video Censorship Tool

> **Note:** This README describes the latest version of Bleep That Sh\*t! — a 100% browser-based, privacy-first web app. For the legacy Python/Streamlit version, see the [Legacy Branch](https://github.com/neonwatty/bleep_that_sht/tree/legacy).

Make someone sound naughty 😈 or make your content more Ad-friendly.

**Bleep That Sh\*t!** lets you instantly transcribe and censor words in your audio or video files, with full control over what gets bleeped. No uploads, no servers, no installs — everything happens right in your browser.

---

## How it works

1. **Upload** your audio (MP3) or video (MP4) file.
2. **Transcribe** using Whisper ONNX models (transformers.js) — all in-browser.
3. **Censor**: Pick words to bleep (exact, partial, or fuzzy match).
4. **Preview & Download**: Hear the result and save your censored file.

All processing is done locally in your browser using cutting-edge technologies. Your media and transcripts stay private — nothing is sent to a server unless you opt in.

---

## Technology Highlights

- **Rails 8 + Vite + Vanilla JS**: Modern, responsive web app with step-by-step UX
- **transformers.js + ONNX Whisper**: In-browser speech-to-text with word-level timestamps
- **ffmpeg.wasm**: Audio/video extraction and muxing, all in-browser
- **Web Audio API**: Precise audio editing and bleep insertion
- **Plyr**: Beautiful, interactive media playback
- **No Python, Docker, or ffmpeg install required**
- **No server/cloud processing by default** — privacy-first, local-only by design

---

## Examples

Some examples of the end product (make sure to turn volume on, its off by default).

https://github.com/user-attachments/assets/da50f8a9-27ba-4747-92e0-72a25e65175c

Let's look more closely at the last example above - below is a short clip we'll bleep out some words from using the pipeline in this repo. (make sure to turn on audio - its off by default)

https://github.com/neonwatty/bleep_that_sht/assets/16326421/fb8568fe-aba0-49e2-a563-642d658c0651

Now the same clip with the words - "treetz", "ice", "cream", "chocolate", "syrup", and "cookie" - bleeped out

https://github.com/neonwatty/bleep_that_sht/assets/16326421/63ebd7a0-46f6-4efd-80ea-20512ff427c0

---

## Using the App

Just open the app in any modern browser — **no installation or setup required**.

- Go to [https://bleep-that-sh-t.app](https://bleep-that-sh-t.app) (or your self-hosted instance)
- Upload your file, follow the step-by-step workflow, and download your censored result

---

## App Walkthrough

The app guides you through:

- Uploading audio or video
- Selecting language and model
- Transcribing to generate a word-level transcript
- Entering words and matching modes (exact, partial, fuzzy)
- Running matching to find words to censor
- Choosing a bleep sound
- Previewing and downloading the censored result

The UI is modern, privacy-first, and works on desktop and mobile.

---
