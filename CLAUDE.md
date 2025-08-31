# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bleep That Sh*t! is a Rails 8 application for in-browser audio and video censorship. It processes media files entirely client-side using WebAssembly and Web Workers, ensuring user privacy.

## Tech Stack

- **Backend**: Rails 8 with SQLite, Vite for asset bundling
- **Frontend**: Vanilla JavaScript with Web Workers
- **Key Libraries**:
  - `@huggingface/transformers` - Whisper ONNX models for transcription
  - `@ffmpeg/ffmpeg` - WebAssembly-based media processing
  - Plyr - Media player
  - Dropzone - File uploads

## Architecture

### Frontend Processing Pipeline
1. **File Upload**: Users upload MP3/MP4 files via Dropzone
2. **Audio Extraction**: FFmpeg.wasm extracts audio from video files
3. **Transcription**: Whisper ONNX models run in Web Workers to generate word-level timestamps
4. **Censoring**: Web Audio API processes audio to insert bleeps at specified timestamps
5. **Remuxing**: FFmpeg.wasm combines censored audio with original video

### Key JavaScript Modules
- `app/javascript/workers/` - Web Workers for heavy processing (transcription, remuxing)
- `app/javascript/services/transcriptionService.js` - Orchestrates transcription workflow
- `app/javascript/utils/` - Audio processing, caching, and utility functions
- `app/javascript/pages/` - Page-specific initialization and UI logic

### Rails Backend Structure
- Minimal backend - primarily serves the frontend application
- Models: User, StoredMedium, BleepConfig, AudioJob
- Controllers follow standard Rails patterns
- ActiveStorage for optional file uploads

## Development Commands

```bash
# Install dependencies
bundle install
npm install

# Database setup
bin/rails db:create db:migrate

# Development server
bin/rails server
# OR with Vite hot reload
bin/dev

# Run tests
bin/rails test                    # Rails tests
npm test                          # JavaScript unit tests (Vitest)
npx playwright test               # E2E tests

# Linting and code quality
bin/rubocop                       # Ruby linting
bin/brakeman                      # Security analysis

# Build for production
npm run build                     # Build frontend assets
bin/rails assets:precompile      # Compile all assets

# Docker
docker compose up                 # Run with Docker
```

## Testing Strategy

- **Unit Tests**: Located in `test/` for Rails, `*.test.js` files for JavaScript
- **System Tests**: Rails system tests in `test/system/`
- **E2E Tests**: Playwright tests in `playwright-tests/`
- Test frameworks: Minitest (Rails), Vitest (JS), Playwright (E2E)

## Important Considerations

1. **Client-Side Processing**: Core functionality runs in the browser. Server is minimal by design.
2. **Web Workers**: Heavy processing happens in workers to keep UI responsive
3. **CORS Configuration**: FFmpeg core files must be served with proper CORS headers
4. **Memory Management**: Large files are processed in chunks to avoid memory issues
5. **Browser Compatibility**: Requires modern browsers with WebAssembly and Web Workers support

## Routes

- `/` - Home page
- `/transcription-view` - Transcription interface
- `/bleep-view` - Bleep censoring interface
- `/transcription-sampler-view` - Transcription sampling tool
- `/rails/active_storage/direct_uploads` - Direct upload endpoint (CSRF protection disabled)