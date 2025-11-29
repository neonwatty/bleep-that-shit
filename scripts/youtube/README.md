# YouTube Shorts Automation Pipeline

Automated pipeline for generating and uploading YouTube Shorts demo videos.

## Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Playwright    │────▶│     FFmpeg      │────▶│  YouTube API    │
│   Record Demo   │     │   Process Video │     │     Upload      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     9:16 video          Add music/text         Publish to channel
```

## Quick Start

```bash
# Generate a demo video (no upload)
./scripts/youtube/generate-short.sh 04-bob-ross-naughty

# Generate and upload (private)
./scripts/youtube/generate-short.sh 04-bob-ross-naughty --upload

# Generate and upload (public)
./scripts/youtube/generate-short.sh 04-bob-ross-naughty --upload --public
```

## Available Demos

| Demo                      | Description                                     |
| ------------------------- | ----------------------------------------------- |
| `01-demonetization-saver` | Fix YouTube demonetization by bleeping one word |
| `02-three-ways-to-censor` | Demo of exact, partial, and fuzzy matching      |
| `03-no-upload-required`   | Privacy-focused demo (files stay local)         |
| `04-bob-ross-naughty`     | Humor: make Bob Ross sound naughty              |
| `05-speed-run`            | Speed run from upload to download               |

## Setup

### 1. Install Dependencies

```bash
npm install googleapis
```

### 2. YouTube API Setup (for uploads)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **YouTube Data API v3**
4. Create OAuth 2.0 credentials:
   - Go to Credentials → Create Credentials → OAuth 2.0 Client ID
   - Select **Desktop application**
   - Download the JSON file
5. Save as `scripts/youtube/client_secrets.json`

### 3. First Upload (OAuth)

The first time you upload, you'll be prompted to authorize in your browser:

```bash
npx tsx scripts/youtube/upload-to-youtube.ts output/test.mp4 --preset bob-ross-naughty
```

This creates `youtube_token.json` with your refresh token for future uploads.

## Scripts

### `generate-short.sh`

Full pipeline: Record → Process → Upload

```bash
./scripts/youtube/generate-short.sh <demo-name> [--upload] [--public]
```

### `process-video.sh`

Post-process Playwright recordings for YouTube Shorts:

```bash
./scripts/youtube/process-video.sh input.webm output.mp4 [options]

Options:
  --music <file>     Add background music
  --hook <text>      Hook text overlay (first 3 seconds)
  --cta <text>       CTA text overlay (last 5 seconds)
  --speed <factor>   Speed up video (e.g., 1.5)
```

### `upload-to-youtube.ts`

Upload processed videos to YouTube:

```bash
npx tsx scripts/youtube/upload-to-youtube.ts video.mp4 [options]

Options:
  --preset <name>      Use predefined metadata
  --title "..."        Custom title
  --description "..."  Custom description
  --public             Upload as public (default: private)
```

## Running Individual Steps

### Step 1: Record with Playwright

```bash
npx playwright test tests/videos/04-bob-ross-naughty.spec.ts --project=videos
```

Videos are saved to `test-results/` as `.webm` files.

### Step 2: Process with FFmpeg

```bash
./scripts/youtube/process-video.sh test-results/*/video.webm output/demo.mp4
```

### Step 3: Upload to YouTube

```bash
npx tsx scripts/youtube/upload-to-youtube.ts output/demo.mp4 --preset bob-ross-naughty
```

## Output Structure

```
output/
└── youtube/
    ├── 01-demonetization-saver.mp4
    ├── 02-three-ways-to-censor.mp4
    ├── 03-no-upload-required.mp4
    ├── 04-bob-ross-naughty.mp4
    └── 05-speed-run.mp4
```

## Notes

### Video Format

- **Resolution**: 1080x1920 (9:16 vertical)
- **Duration**: Max 60 seconds (YouTube Shorts limit)
- **Format**: MP4 (H.264 + AAC)

### Privacy

- Videos upload as **private** by default
- Review in YouTube Studio before making public
- Use `--public` flag to upload directly as public

### App Verification

- Unverified Google apps may force videos to private
- For production use, submit app for verification
- Or use your personal Google account (no verification needed)

## Troubleshooting

### "Video not found" error

Playwright may save videos in different paths. Check:

```bash
find test-results -name "*.webm"
```

### OAuth errors

Delete `youtube_token.json` and re-authenticate:

```bash
rm scripts/youtube/youtube_token.json
npx tsx scripts/youtube/upload-to-youtube.ts ...
```

### FFmpeg not found

Install FFmpeg:

```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg
```
