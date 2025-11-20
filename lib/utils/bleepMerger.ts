import type { BleepSegment, BleepSource } from '@/lib/types/bleep';

/**
 * Merges overlapping bleep segments into continuous segments
 * Also merges segments that are too close together (within 0.02s) to avoid
 * gain automation conflicts in the audio processing pipeline.
 *
 * When segments are merged:
 * - If both sources are the same, keeps that source
 * - If sources differ (word + manual), marks as 'merged'
 * - Combines labels with comma separator
 * - Uses purple color for merged segments
 *
 * @param segments Array of bleep segments with id, word, start, end, source, and color
 * @returns Array of merged segments where overlaps are combined
 */
export const mergeOverlappingBleeps = (segments: BleepSegment[]): BleepSegment[] => {
  if (segments.length === 0) return [];

  // Sort by start time
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const merged: BleepSegment[] = [];

  // Gain automation uses 0.01s ramps on each side, so merge if within 0.02s
  const GAIN_RAMP_BUFFER = 0.02;

  let current = { ...sorted[0] };
  const currentSources = new Set<BleepSource>([current.source]);

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    // Merge if overlapping OR if too close together (within gain ramp time)
    if (next.start <= current.end + GAIN_RAMP_BUFFER) {
      // Overlapping or too close - merge
      currentSources.add(next.source);

      // Determine merged source
      let mergedSource: BleepSource = current.source;
      if (currentSources.size > 1) {
        mergedSource = 'merged';
      } else if (next.source !== current.source) {
        mergedSource = 'merged';
      }

      // Determine merged color
      let mergedColor = current.color;
      if (mergedSource === 'merged') {
        mergedColor = '#9333ea'; // purple for merged segments
      }

      current = {
        id: `${current.id}_${next.id}`, // Combine IDs
        word: `${current.word}, ${next.word}`, // Combine word labels
        start: current.start,
        end: Math.max(current.end, next.end),
        source: mergedSource,
        color: mergedColor,
      };
    } else {
      // No overlap - push current and move to next
      merged.push(current);
      current = { ...next };
      currentSources.clear();
      currentSources.add(next.source);
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
    ...segment,
    start: Math.max(0, segment.start - buffer), // Prevent negative times
    end: segment.end + buffer,
  };
};

/**
 * Gets statistics about bleep segments
 * @param segments Array of bleep segments
 * @returns Object with counts by source type
 */
export const getBleepStats = (
  segments: BleepSegment[]
): { word: number; manual: number; merged: number; total: number } => {
  const stats = {
    word: 0,
    manual: 0,
    merged: 0,
    total: segments.length,
  };

  segments.forEach(seg => {
    if (seg.source === 'word') stats.word++;
    else if (seg.source === 'manual') stats.manual++;
    else if (seg.source === 'merged') stats.merged++;
  });

  return stats;
};
