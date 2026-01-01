#!/bin/bash

# App Store Mockup Generator for Bleep That
# Creates device-framed screenshots with captions

SCREENSHOTS_DIR="/Users/jeremywatt/Desktop/temp/social-next/bleep/screenshots"
MOCKUPS_DIR="$SCREENSHOTS_DIR/mockups"

# Final dimensions for 6.7" display
WIDTH=1290
HEIGHT=2796

# Device frame settings
SCREEN_SCALE=0.72  # Scale screenshot to fit in frame
CORNER_RADIUS=50
BEZEL_WIDTH=12

# Colors (app theme)
BG_START="#ec4899"  # Pink
BG_END="#8b5cf6"    # Violet
TEXT_COLOR="white"

# Captions for each screenshot
declare -A CAPTIONS
CAPTIONS["01-home"]="Censor Any Video\nIn Seconds"
CAPTIONS["02-upload"]="Upload Your\nVideo or Audio"
CAPTIONS["03-transcribing"]="AI-Powered\nTranscription"
CAPTIONS["04-transcript"]="See Every Word\nDetected"
CAPTIONS["05-word-selection"]="Select Words\nTo Censor"
CAPTIONS["06-bleep-settings"]="Customize Your\nBleep Sound"
CAPTIONS["07-result-download"]="Download Your\nCensored Video"

for screenshot in "$SCREENSHOTS_DIR"/*.png; do
    filename=$(basename "$screenshot" .png)

    # Skip if not a numbered screenshot
    if [[ ! "$filename" =~ ^[0-9] ]]; then
        continue
    fi

    echo "Creating mockup for $filename..."

    caption="${CAPTIONS[$filename]}"
    if [ -z "$caption" ]; then
        caption="Bleep That"
    fi

    # Calculate scaled screenshot size
    SCREEN_WIDTH=$(echo "$WIDTH * $SCREEN_SCALE" | bc | cut -d. -f1)
    SCREEN_HEIGHT=$(echo "$HEIGHT * $SCREEN_SCALE * 0.75" | bc | cut -d. -f1)

    # Create gradient background
    magick -size ${WIDTH}x${HEIGHT} gradient:"$BG_START"-"$BG_END" \
        -rotate 135 \
        -gravity center -crop ${WIDTH}x${HEIGHT}+0+0 +repage \
        "$MOCKUPS_DIR/bg_temp.png"

    # Process screenshot: scale and add rounded corners
    magick "$screenshot" \
        -resize ${SCREEN_WIDTH}x${SCREEN_HEIGHT} \
        \( +clone -alpha extract \
           -draw "fill black polygon 0,0 0,$CORNER_RADIUS $CORNER_RADIUS,0 fill white circle $CORNER_RADIUS,$CORNER_RADIUS $CORNER_RADIUS,0" \
           -draw "fill black polygon $((SCREEN_WIDTH-CORNER_RADIUS)),0 $SCREEN_WIDTH,0 $SCREEN_WIDTH,$CORNER_RADIUS fill white circle $((SCREEN_WIDTH-CORNER_RADIUS)),$CORNER_RADIUS $((SCREEN_WIDTH-CORNER_RADIUS)),0" \
           -draw "fill black polygon 0,$((SCREEN_HEIGHT-CORNER_RADIUS)) 0,$SCREEN_HEIGHT $CORNER_RADIUS,$SCREEN_HEIGHT fill white circle $CORNER_RADIUS,$((SCREEN_HEIGHT-CORNER_RADIUS)) $CORNER_RADIUS,$SCREEN_HEIGHT" \
           -draw "fill black polygon $((SCREEN_WIDTH-CORNER_RADIUS)),$SCREEN_HEIGHT $SCREEN_WIDTH,$SCREEN_HEIGHT $SCREEN_WIDTH,$((SCREEN_HEIGHT-CORNER_RADIUS)) fill white circle $((SCREEN_WIDTH-CORNER_RADIUS)),$((SCREEN_HEIGHT-CORNER_RADIUS)) $SCREEN_WIDTH,$((SCREEN_HEIGHT-CORNER_RADIUS))" \
        \) -alpha off -compose CopyOpacity -composite \
        "$MOCKUPS_DIR/screen_temp.png"

    # Add device bezel (dark frame around screenshot)
    magick "$MOCKUPS_DIR/screen_temp.png" \
        -bordercolor "#1a1a1a" -border ${BEZEL_WIDTH} \
        \( +clone -alpha extract -blur 0x3 -shade 120x45 -normalize \
           -sigmoidal-contrast 7,50% -alpha off \) \
        -compose overlay -composite \
        "$MOCKUPS_DIR/framed_temp.png"

    # Composite onto background with caption
    magick "$MOCKUPS_DIR/bg_temp.png" \
        -gravity north -fill "$TEXT_COLOR" \
        -font "Helvetica-Bold" -pointsize 90 \
        -annotate +0+180 "$caption" \
        -gravity center \
        "$MOCKUPS_DIR/framed_temp.png" -geometry +0+200 -composite \
        "$MOCKUPS_DIR/mockup-$filename.png"

    echo "  -> mockup-$filename.png"
done

# Clean up temp files
rm -f "$MOCKUPS_DIR"/*_temp.png

echo ""
echo "Mockups created in: $MOCKUPS_DIR"
ls -la "$MOCKUPS_DIR"/*.png 2>/dev/null | grep -v temp
