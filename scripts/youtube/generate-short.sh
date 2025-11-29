#!/bin/bash
# generate-short.sh
# Full pipeline: Record demo -> Process -> Upload to YouTube
#
# Usage: ./scripts/youtube/generate-short.sh <demo-name> [--upload] [--public]
#
# Examples:
#   ./scripts/youtube/generate-short.sh bob-ross-naughty
#   ./scripts/youtube/generate-short.sh demonetization-saver --upload
#   ./scripts/youtube/generate-short.sh speed-run --upload --public

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$PROJECT_DIR/output/youtube"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
DEMO_NAME=""
DO_UPLOAD=false
PRIVACY="private"

while [[ $# -gt 0 ]]; do
  case $1 in
    --upload)
      DO_UPLOAD=true
      shift
      ;;
    --public)
      PRIVACY="public"
      shift
      ;;
    --help)
      echo "Usage: $0 <demo-name> [--upload] [--public]"
      echo ""
      echo "Available demos:"
      echo "  01-demonetization-saver"
      echo "  02-three-ways-to-censor"
      echo "  03-no-upload-required"
      echo "  04-bob-ross-naughty"
      echo "  05-speed-run"
      echo ""
      echo "Options:"
      echo "  --upload    Upload to YouTube after processing"
      echo "  --public    Make video public (default: private)"
      exit 0
      ;;
    *)
      DEMO_NAME="$1"
      shift
      ;;
  esac
done

if [[ -z "$DEMO_NAME" ]]; then
  echo -e "${RED}Error: Demo name required${NC}"
  echo "Usage: $0 <demo-name> [--upload] [--public]"
  echo "Run with --help for available demos"
  exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   YouTube Shorts Generator Pipeline        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# === STEP 1: Record demo with Playwright ===
echo -e "${GREEN}▶ STEP 1: Recording demo with Playwright...${NC}"
echo "  Demo: $DEMO_NAME"
echo ""

cd "$PROJECT_DIR"

# Run Playwright test and capture the video
npx playwright test "tests/videos/${DEMO_NAME}.spec.ts" \
  --project=videos \
  --reporter=list

# Find the recorded video
PLAYWRIGHT_VIDEO=$(find test-results -name "video.webm" -newer "$OUTPUT_DIR" 2>/dev/null | head -1)

if [[ -z "$PLAYWRIGHT_VIDEO" ]]; then
  # Try alternative path
  PLAYWRIGHT_VIDEO=$(find test-results -name "*.webm" -type f 2>/dev/null | head -1)
fi

if [[ -z "$PLAYWRIGHT_VIDEO" || ! -f "$PLAYWRIGHT_VIDEO" ]]; then
  echo -e "${RED}Error: Could not find recorded video in test-results/${NC}"
  echo "Looking in: test-results/"
  ls -la test-results/ 2>/dev/null || echo "Directory not found"
  exit 1
fi

echo -e "${GREEN}✓ Recording complete: $PLAYWRIGHT_VIDEO${NC}"
echo ""

# === STEP 2: Process video with FFmpeg ===
echo -e "${GREEN}▶ STEP 2: Processing video for YouTube Shorts...${NC}"

# Map demo name to preset name for upload
PRESET_NAME=$(echo "$DEMO_NAME" | sed 's/^[0-9]*-//')
OUTPUT_FILE="$OUTPUT_DIR/${DEMO_NAME}.mp4"

# Process the video
"$SCRIPT_DIR/process-video.sh" "$PLAYWRIGHT_VIDEO" "$OUTPUT_FILE"

if [[ ! -f "$OUTPUT_FILE" ]]; then
  echo -e "${RED}Error: Processing failed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Processing complete: $OUTPUT_FILE${NC}"
echo ""

# === STEP 3: Upload to YouTube (optional) ===
if [[ "$DO_UPLOAD" == true ]]; then
  echo -e "${GREEN}▶ STEP 3: Uploading to YouTube...${NC}"
  echo "  Preset: $PRESET_NAME"
  echo "  Privacy: $PRIVACY"
  echo ""

  UPLOAD_ARGS="$OUTPUT_FILE --preset $PRESET_NAME"
  if [[ "$PRIVACY" == "public" ]]; then
    UPLOAD_ARGS="$UPLOAD_ARGS --public"
  fi

  npx tsx "$SCRIPT_DIR/upload-to-youtube.ts" $UPLOAD_ARGS

  echo ""
  echo -e "${GREEN}✓ Upload complete!${NC}"
else
  echo -e "${YELLOW}▶ STEP 3: Skipping upload (use --upload to upload)${NC}"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Pipeline Complete!                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo "Output file: $OUTPUT_FILE"
echo ""

if [[ "$DO_UPLOAD" != true ]]; then
  echo "To upload manually:"
  echo "  npx tsx scripts/youtube/upload-to-youtube.ts $OUTPUT_FILE --preset $PRESET_NAME"
fi
