# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bleep That Sh\*t! is a Next.js application for in-browser audio and video censorship. It processes media files entirely client-side using WebAssembly and Web Workers, ensuring user privacy.

## Tech Stack

- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS
- **Client-Side Processing**: Web Workers for heavy computation
- **Key Libraries**:
  - `@huggingface/transformers` - Whisper ONNX models for transcription
  - `@ffmpeg/ffmpeg` - WebAssembly-based media processing
  - `plyr-react` - Media player
  - `react-dropzone` - File uploads
  - `dexie` - IndexedDB wrapper for caching

## Architecture

### Client-Side Processing Pipeline

1. **File Upload**: Users upload MP3/MP4 files via react-dropzone
2. **Audio Extraction**: FFmpeg.wasm extracts audio from video files
3. **Transcription**: Whisper ONNX models run in Web Workers to generate word-level timestamps
4. **Censoring**: Web Audio API processes audio to insert bleeps at specified timestamps
5. **Remuxing**: FFmpeg.wasm combines censored audio with original video

### Project Structure

- `app/` - Next.js pages and routes
  - `app/bleep/page.tsx` - Main bleeping interface
  - `app/sampler/page.tsx` - Model comparison tool
  - `app/workers/` - Web Workers for heavy processing (transcription, remuxing)
- `components/` - React components (Navbar, Footer)
- `lib/utils/` - Utility functions (audio processing, caching, paths)
- `tests/` - Playwright E2E tests
- `public/` - Static assets

## Development Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev                       # Start Next.js dev server

# Run tests
npm test                          # Run unit tests with Vitest
npm run test:unit                 # Run unit tests (same as npm test)
npm run test:unit:watch           # Run unit tests in watch mode
npm run test:unit:ui              # Run unit tests with Vitest UI
npm run test:unit:coverage        # Run unit tests with coverage report
npm run test:e2e                  # E2E tests with Playwright
npm run test:e2e:ui               # E2E tests with Playwright UI
npm run test:e2e:debug            # Debug E2E tests

# Linting and code quality
npm run lint                      # Run ESLint
npm run lint:fix                  # Auto-fix ESLint issues
npm run format                    # Format code with Prettier
npm run format:check              # Check formatting without changes
npm run typecheck                 # Run TypeScript compiler check

# Build for production
npm run build                     # Build Next.js application
npm run export                    # Export static site
```

## Testing Strategy

### Unit Tests (Vitest)

Unit tests are configured with Vitest and test utility functions and React components:

**Test Files:**

- `lib/utils/paths.test.ts` - Path resolution logic (5 tests)
- `lib/utils/audioProcessor.test.ts` - Audio processing and WAV encoding (10 tests)
- `lib/utils/audioDecode.test.ts` - Audio decoding and resampling (8 tests)
- `components/Navbar.test.tsx` - Navigation component rendering (5 tests)
- `components/Footer.test.tsx` - Footer component rendering (7 tests)

**Coverage:**

- ✅ 35 unit tests covering utility functions and React components
- ✅ Mock browser APIs (AudioContext, OfflineAudioContext, File, Blob)
- ✅ Test configuration in `vitest.config.ts`
- ✅ Test setup with global mocks in `tests/setup.ts`

**What's NOT unit tested:**

- Worker code (tested via E2E tests)
- Complex audio processing functions (`applyBleeps`, `applyBleepsToVideo`) - tested via E2E
- Page components (`app/**`) - tested via E2E

### E2E Tests (Playwright)

- **E2E Tests**: 16 Playwright test files in `tests/` directory covering full user workflows
- Test frameworks: Vitest (unit tests), Playwright (E2E tests)

## Code Quality & Standards

### Linting

- **ESLint**: Configured with Next.js, TypeScript, and Prettier integration
- **Prettier**: Auto-formatting with Tailwind CSS class sorting
- **Rules**:
  - `console` statements: warnings (for debugging, should be removed in production)
  - TypeScript `any`: warnings (gradually tighten)
  - Unused variables: warnings (with `_` prefix exemption)
  - React hooks: enforced dependency arrays

### Formatting Standards

- Single quotes for strings
- 2-space indentation
- Semicolons required
- Max line length: 100 characters
- Trailing commas: ES5 style
- Arrow function parentheses: avoid when possible

### Running Linting

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix

# Format all files
npm run format

# Check formatting
npm run format:check

# Type check
npm run typecheck
```

## Continuous Integration

### GitHub Actions CI

The repository includes automated CI checks via GitHub Actions (`.github/workflows/ci.yml`):

**Triggers:**

- Pull requests to `main` branch
- Pushes to `main` branch

**CI Pipeline Steps:**

1. **ESLint** - Code quality and style checks
2. **Prettier** - Code formatting verification
3. **TypeScript** - Type checking across the codebase
4. **Unit Tests** - Vitest test suite (35 tests)
5. **Build** - Next.js production build verification

**Status:** All checks must pass before merging PRs.

**Other Workflows:**

- `deploy.yml` - Deploys to GitHub Pages on main branch pushes
- `test-build.yml` - Legacy build test (superseded by CI workflow)

## Important Considerations

1. **Client-Side Processing**: Core functionality runs in the browser. Server is minimal by design.
2. **Web Workers**: Heavy processing happens in workers to keep UI responsive
3. **CORS Configuration**: FFmpeg core files must be served with proper CORS headers
4. **Memory Management**: Large files are processed in chunks to avoid memory issues
5. **Browser Compatibility**: Requires modern browsers with WebAssembly and Web Workers support

## Routes

- `/` - Home page
- `/bleep` - Main bleeping interface (transcription + censoring)
- `/sampler` - Model comparison tool

## Social Starter Pack Tools

### autocomplete-cli

Keyword suggestions from Google, YouTube, Bing, Amazon, and DuckDuckGo.

- README: https://github.com/neonwatty/autocomplete-cli

```bash
# Basic usage
autocomplete google "topic"
autocomplete youtube "topic"

# Get help
autocomplete --help
```

### reddit-market-research

Search Reddit for pain points and market opportunities.

- README: https://github.com/neonwatty/reddit-market-research

```bash
# Search a subreddit with keywords
make reddit ARGS='search -s "subreddit" -k "keywords"'

# Setup (required for credentials)
make doppler-connect

# Get help
reddit-market-research --help
```

### demo-recorder

Record demo videos and screenshots of web apps.

- README: https://github.com/neonwatty/demo-recorder
- Requires: FFmpeg installed

```bash
# Record a demo video
demo-recorder record demo.ts -o video.mp4

# Get help
demo-recorder --help
```
