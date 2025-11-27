/**
 * Time formatting utilities for the Manual Timeline feature
 */

/**
 * Formats seconds as MM:SS or HH:MM:SS for display
 * @param seconds - Time in seconds
 * @param forceHours - Always show hours even if 0
 * @returns Formatted time string
 */
export function formatTime(seconds: number, forceHours: boolean = false): string {
  if (!isFinite(seconds) || seconds < 0) {
    return forceHours ? '00:00:00' : '00:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0 || forceHours) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats seconds with decimal precision for display
 * @param seconds - Time in seconds
 * @param decimals - Number of decimal places (default 2)
 * @returns Formatted time string like "1:23.45"
 */
export function formatTimeWithDecimals(seconds: number, decimals: number = 2): string {
  if (!isFinite(seconds) || seconds < 0) {
    return '0:00.00';
  }

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${minutes}:${secs.toFixed(decimals).padStart(decimals + 3, '0')}`;
}

/**
 * Parses a time string (MM:SS or HH:MM:SS or just seconds) to seconds
 * @param timeStr - Time string to parse
 * @returns Time in seconds, or NaN if invalid
 */
export function parseTime(timeStr: string): number {
  const trimmed = timeStr.trim();

  // Try parsing as plain number (seconds)
  const asNumber = parseFloat(trimmed);
  if (!isNaN(asNumber) && !trimmed.includes(':')) {
    return Math.max(0, asNumber);
  }

  // Parse MM:SS or HH:MM:SS format
  const parts = trimmed.split(':').map(p => parseFloat(p.trim()));

  if (parts.some(isNaN)) {
    return NaN;
  }

  if (parts.length === 2) {
    // MM:SS
    const [minutes, seconds] = parts;
    return Math.max(0, minutes * 60 + seconds);
  }

  if (parts.length === 3) {
    // HH:MM:SS
    const [hours, minutes, seconds] = parts;
    return Math.max(0, hours * 3600 + minutes * 60 + seconds);
  }

  return NaN;
}

/**
 * Formats a duration in seconds as a human-readable string
 * @param seconds - Duration in seconds
 * @returns Human-readable duration like "2.5s" or "1m 30s"
 */
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) {
    return '0s';
  }

  if (seconds < 60) {
    // Show decimal for short durations
    return seconds < 10 ? `${seconds.toFixed(1)}s` : `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);

  if (secs === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${secs}s`;
}

/**
 * Rounds a time value to a specified precision
 * Useful for avoiding floating point issues
 * @param seconds - Time in seconds
 * @param precision - Decimal places (default 3)
 * @returns Rounded time value
 */
export function roundTime(seconds: number, precision: number = 3): number {
  const multiplier = Math.pow(10, precision);
  return Math.round(seconds * multiplier) / multiplier;
}

/**
 * Clamps a time value between min and max
 * @param time - Time to clamp
 * @param min - Minimum value (default 0)
 * @param max - Maximum value
 * @returns Clamped time value
 */
export function clampTime(time: number, min: number = 0, max?: number): number {
  let result = Math.max(min, time);
  if (max !== undefined) {
    result = Math.min(max, result);
  }
  return result;
}
