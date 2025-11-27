/**
 * Manual censor segment type for timeline-based censoring
 * without requiring transcription
 */
export interface ManualCensorSegment {
  /** Unique identifier for the segment */
  id: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
}

/**
 * Creates a new ManualCensorSegment with a unique ID
 */
export function createManualCensorSegment(start: number, end: number): ManualCensorSegment {
  return {
    id: crypto.randomUUID(),
    start,
    end,
  };
}
