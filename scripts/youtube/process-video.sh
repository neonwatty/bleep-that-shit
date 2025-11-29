#!/bin/bash
# process-video.sh
# Post-process Playwright video recordings for YouTube Shorts
#
# Usage: ./scripts/youtube/process-video.sh <input.webm> <output.mp4> [options]
#
# Options:
#   --music <file>     Add background music (optional)
#   --hook <text>      Add hook text overlay at start
#   --cta <text>       Add CTA text overlay at end
#   --speed <factor>   Speed up video (e.g., 1.5 for 1.5x)

set -e

# Default values
MUSIC=""
HOOK_TEXT=""
CTA_TEXT=""
SPEED_FACTOR="1.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
INPUT_FILE=""
OUTPUT_FILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --music)
      MUSIC="$2"
      shift 2
      ;;
    --hook)
      HOOK_TEXT="$2"
      shift 2
      ;;
    --cta)
      CTA_TEXT="$2"
      shift 2
      ;;
    --speed)
      SPEED_FACTOR="$2"
      shift 2
      ;;
    *)
      if [[ -z "$INPUT_FILE" ]]; then
        INPUT_FILE="$1"
      elif [[ -z "$OUTPUT_FILE" ]]; then
        OUTPUT_FILE="$1"
      fi
      shift
      ;;
  esac
done

# Validate input
if [[ -z "$INPUT_FILE" ]]; then
  echo -e "${RED}Error: Input file required${NC}"
  echo "Usage: $0 <input.webm> <output.mp4> [options]"
  exit 1
fi

if [[ ! -f "$INPUT_FILE" ]]; then
  echo -e "${RED}Error: Input file not found: $INPUT_FILE${NC}"
  exit 1
fi

# Default output name
if [[ -z "$OUTPUT_FILE" ]]; then
  OUTPUT_FILE="${INPUT_FILE%.*}-processed.mp4"
fi

echo -e "${GREEN}Processing video for YouTube Shorts...${NC}"
echo "  Input:  $INPUT_FILE"
echo "  Output: $OUTPUT_FILE"

# Build FFmpeg filter chain
FILTER_COMPLEX=""

# Base: Scale to 1080x1920 (9:16 vertical)
# Playwright records at this size, but ensure it's correct
FILTER_COMPLEX="[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black"

# Apply speed adjustment if specified
if [[ "$SPEED_FACTOR" != "1.0" ]]; then
  FILTER_COMPLEX="${FILTER_COMPLEX},setpts=PTS/${SPEED_FACTOR}"
fi

# Add hook text overlay (first 3 seconds)
if [[ -n "$HOOK_TEXT" ]]; then
  FILTER_COMPLEX="${FILTER_COMPLEX},drawtext=text='${HOOK_TEXT}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.7:boxborderw=10:x=(w-text_w)/2:y=100:enable='lt(t,3)'"
fi

# Add CTA text overlay (last 5 seconds - need to know duration)
if [[ -n "$CTA_TEXT" ]]; then
  # Get video duration
  DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$INPUT_FILE")
  CTA_START=$(echo "$DURATION - 5" | bc)
  FILTER_COMPLEX="${FILTER_COMPLEX},drawtext=text='${CTA_TEXT}':fontcolor=white:fontsize=36:box=1:boxcolor=black@0.7:boxborderw=8:x=(w-text_w)/2:y=h-200:enable='gt(t,${CTA_START})'"
fi

FILTER_COMPLEX="${FILTER_COMPLEX}[v]"

# Build FFmpeg command
FFMPEG_CMD="ffmpeg -y -i \"$INPUT_FILE\""

# Add background music if specified
if [[ -n "$MUSIC" && -f "$MUSIC" ]]; then
  echo "  Music:  $MUSIC"
  FFMPEG_CMD="$FFMPEG_CMD -i \"$MUSIC\""
  # Mix original audio with music (music at 20% volume)
  FILTER_COMPLEX="${FILTER_COMPLEX};[0:a]volume=1.0[a0];[1:a]volume=0.2[a1];[a0][a1]amix=inputs=2:duration=first[a]"
  AUDIO_MAP="-map \"[a]\""
else
  AUDIO_MAP="-map 0:a?"
fi

# Complete the command
FFMPEG_CMD="$FFMPEG_CMD -filter_complex \"${FILTER_COMPLEX}\" -map \"[v]\" ${AUDIO_MAP} -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart -t 60 \"$OUTPUT_FILE\""

echo ""
echo -e "${YELLOW}Running FFmpeg...${NC}"
echo "$FFMPEG_CMD"
echo ""

# Execute
eval $FFMPEG_CMD

# Check result
if [[ -f "$OUTPUT_FILE" ]]; then
  OUTPUT_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
  OUTPUT_DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_FILE" | cut -d. -f1)

  echo ""
  echo -e "${GREEN}Video processed successfully!${NC}"
  echo "  Output: $OUTPUT_FILE"
  echo "  Size:   $OUTPUT_SIZE"
  echo "  Duration: ${OUTPUT_DURATION}s"

  # Warn if over 60 seconds
  if [[ $OUTPUT_DURATION -gt 60 ]]; then
    echo -e "${YELLOW}Warning: Video is over 60 seconds. YouTube Shorts must be 60s or less.${NC}"
  fi
else
  echo -e "${RED}Error: Failed to create output file${NC}"
  exit 1
fi
