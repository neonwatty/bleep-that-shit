# PRD: Browser-Based Bleep (v2.0)

## 1. Overview

### 1.1 What & Why

A privacy-first, browser-based tool to remove unwanted words (and video profanity) from audio and video content. Unlike the prior version—which required users to self-host with limited UX—this iteration is a hosted Rails 8 web app that lets users upload content, customize censorship options, and process media _entirely in the browser_. No media is sent to the server unless the user explicitly opts in.

### 1.2 Target Users

- Hobbyist content creators, educators, podcasters, and streamers
- Non-technical to semi-technical users who appreciate simplicity
- Privacy-conscious individuals wanting on-device processing
- Users needing fast, optional media retention for later use or sharing

### 1.3 Value Proposition

- **Effortless usability**: No installation or CLI—upload, configure, bleep, and download
- **True privacy**: Media remains client-side by default
- **Customizable experience**: Multiple bleep sounds, twiddable padding, model-size choice
- **Scalable hosting**: Backend is light since heavy lifting happens in-browser

---

## 2. Core Features

### 2.1 Feature Summary

- In-browser transcription & timestamping via Whisper ONNX (transformers.js)
- Audio/video upload with browser-side extraction, bleep insertion, and remixing
- Bleep customization: multiple sounds, pre/post padding slider
- Long-file support through automatic chunking for stable transcription
- User account layer with Rails 8 built-in auth
- Optional storage with a “Store file with us” checkbox and direct-to-S3 upload

### 2.2 Why They Matter

- Privacy-first in-browser processing protects user media and reduces server load
- Video support broadens use cases—YouTube, education, social content
- Customizable bleeps and chunking improve user experience and output quality
- Optional account and storage features offer flexibility without compromising defaults

---

## 3. User Experience

### 3.1 Personas

- **Emma the Educator**: Quickly sanitizes classroom videos privately
- **Tom the Podcaster**: Wants seamless swear removal without delay
- **Lisa the Streamer**: Uses multiple bleeps for Twitch VODs
- **Novice User**: Values zero setup and guided workflows

### 3.2 Workflows

**Guest flow**

1. Upload audio or video
2. Select bleep sound and padding
3. Process in-browser → download
4. Optional "Store file with us" for media retention

**Account flow**

1. Sign up / sign in via Rails 8 built-in auth
2. Perform the same flow as guest
3. Access job history and stored media (if opted in)

### 3.3 UX Principles

- **Privacy by default**: Media processed client-side; storage is optional
- **Simplicity**: Clean UI, minimal steps, clear feedback and error messages
- **Feedback-rich**: Chunked progress indicators, previews, user control
- **Compatibility**: Broad browser support with fallback methods

---

## 4. Technical Architecture

### 4.1 Layers

- **Frontend**: Rails 8 + Vite‑Ruby + Vanilla JS (upload UI, auth, metadata)
- **Client-side Processing**: transformers.js + ONNX Whisper models (`base_timestamped`, `large-v3-turbo_timestamped`) for transcription; Web Audio API for manipulation; audio/video muxing via FFmpeg WASM or Canvas + MediaRecorder
- **Optional Backend**: Rails 8 built-in auth; ActiveStorage → S3 (direct upload, opt-in)
- **Database**: PostgreSQL storing Users, AudioJobs, BleepConfigs, and optional StoredMedia

### 4.2 Data Models (High-Level)

- **User** – via Rails 8 auth
- **AudioJob** – metadata: file type, status, model, padding, bleeps, opt-in flag
- **BleepConfig** – reusable settings (optional)
- **StoredMedia** – optional references to ActiveStorage blobs

### 4.3 External Libraries & APIs

- **transformers.js (ONNX Whisper models)** – in-browser ASR with timestamps
- **FFmpeg WASM** – media extraction and muxing
- **Web Audio API**, **Canvas + MediaRecorder** – for browser-native workflows

### 4.4 Infrastructure

- **Hosting**: Standard Rails 8 deployment (Heroku, AWS, etc.)
- **CDN**: Whisper ONNX model delivery via Hugging Face + CDN
- **Storage**: Optional S3 via direct upload for media retention
- **Background Jobs**: ActiveJob to manage metadata and cleanup
- **Privacy Compliance**: Default no retention; storage based on opt-in; auto-deletion after retention window

---

## 5. Roadmap

### 5.1 MVP (3–4 Weeks)

- Rails 8 backend with built-in auth
- JS frontend for file upload and client-side audio processing
- transformers.js + Whisper base model + Web Audio API for bleeping
- Bleep sound choice + padding slider + basic UI
- "Store file with us" metadata flag
- AudioJob metadata tracking and download

### 5.2 Phase 1 Enhancements (6–8 Weeks)

- Video support: audio extraction and remix via FFmpeg WASM or Canvas/MediaRecorder
- Enhanced chunking UI for long files
- Expanded bleep library with previews and user uploads
- Device-capability-based model toggle
- Job history + downloads for signed users
- Optional media storage with S3
- Cross-browser support and error handling

### 5.3 Further Phases (>12 Weeks)

- User-defined BleepConfig presets
- Team/organization account support
- Collaboration features (comments, shared jobs)
- Server-side fallback processing
- API endpoints for integration
- Mobile UI optimization and analytics features

---

## 6. Dependency Plan

**Technical:**

- Whisper ONNX models (cache via CDN; fallback options)
- FFmpeg WASM or Web API muxing (prototype early)
- Rails 8 auth and Vite-Ruby (ensure compatibility)
- ActiveStorage direct S3 uploads (configure early)
- PostgreSQL and schema management

**Infrastructure:**

- CDN setup, SSL, background workers, hosting stack

**UX/Design:**

- Bleep sound assets and licensing
- Browser compatibility testing (Chrome, Firefox, Safari, iOS)

**Organization:**

- AWS, DNS/CDN access
- Data retention/privacy policy finalized
- UI design support for sound selection

---

## 7. Risks & Mitigations

| Risk Area                   | Mitigation                                                           |
| --------------------------- | -------------------------------------------------------------------- |
| ONNX model load/performance | CDN caching, lightweight base model fallback, performance monitoring |
| Video muxing complexity     | Early prototyping, browser detection, choosing optimal muxing method |
| Optional storage opt-in     | Clear consent UI, direct S3 uploads, auto-deletion policy            |
| Auth conflicts              | Use Rails 8 built-in auth; avoid Devise complexity                   |
| Browser performance         | Chunking for large files; device performance detection               |
| Cross-browser issues        | Browser matrix support, fallback implementation, thorough QA testing |

---
