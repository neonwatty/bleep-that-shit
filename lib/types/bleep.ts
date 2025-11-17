/**
 * Bleep segment types for audio censoring
 */

export type BleepSource = 'word' | 'manual' | 'merged';

export interface BleepSegment {
  word: string; // Display label
  start: number; // Start time in seconds
  end: number; // End time in seconds
  source: BleepSource; // Origin of the bleep
  id: string; // Unique identifier
  color?: string; // Visual differentiation color
}

export interface ManualRegion {
  id: string;
  start: number;
  end: number;
  label?: string;
  color: string;
}

export interface RegionPluginRegion {
  id: string;
  start: number;
  end: number;
  color?: string;
  drag?: boolean;
  resize?: boolean;
}
