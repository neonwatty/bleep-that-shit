export interface BleepSegment {
  word: string;
  start: number;
  end: number;
}

/**
 * Merges overlapping bleep segments into continuous segments
 * Also merges segments that are too close together (within 0.02s) to avoid
 * gain automation conflicts in the audio processing pipeline.
 * @param segments Array of bleep segments with word, start, and end times
 * @returns Array of merged segments where overlaps are combined
 */
export const mergeOverlappingBleeps = (segments: BleepSegment[]): BleepSegment[] => {
  if (segments.length === 0) return [];

  // Sort by start time
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const merged: BleepSegment[] = [];

  // Gain automation uses 0.01s ramps on each side, so merge if within 0.02s
  const GAIN_RAMP_BUFFER = 0.02;

  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    // Merge if overlapping OR if too close together (within gain ramp time)
    if (next.start <= current.end + GAIN_RAMP_BUFFER) {
      // Overlapping or too close - merge
      current = {
        word: `${current.word}, ${next.word}`, // Combine word labels
        start: current.start,
        end: Math.max(current.end, next.end),
      };
    } else {
      // No overlap - push current and move to next
      merged.push(current);
      current = next;
    }
  }

  merged.push(current); // Don't forget the last one
  return merged;
};

/**
 * Applies a time buffer to a bleep segment
 * @param segment The original segment
 * @param buffer Time buffer in seconds to add before and after
 * @returns Segment with buffer applied, ensuring start >= 0
 */
export const applyBufferToSegment = (segment: BleepSegment, buffer: number): BleepSegment => {
  return {
    word: segment.word,
    start: Math.max(0, segment.start - buffer), // Prevent negative times
    end: segment.end + buffer,
  };
};
