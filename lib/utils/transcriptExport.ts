import { TranscriptChunk } from '@/lib/types/transcript';

export interface TranscriptData {
  text: string;
  chunks: TranscriptChunk[];
}

export type ExportFormat = 'txt' | 'srt' | 'json';

/**
 * Format seconds to SRT timestamp format: HH:MM:SS,mmm
 */
export function formatSrtTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Export transcript as plain text (no timestamps)
 */
export function exportAsPlainText(data: TranscriptData): string {
  return data.text;
}

/**
 * Export transcript as SRT subtitle format
 */
export function exportAsSRT(data: TranscriptData): string {
  if (!data.chunks || data.chunks.length === 0) {
    return '';
  }

  return data.chunks
    .filter(chunk => chunk.timestamp && chunk.timestamp[0] != null && chunk.timestamp[1] != null)
    .map((chunk, index) => {
      const [start, end] = chunk.timestamp;
      return `${index + 1}\n${formatSrtTimestamp(start)} --> ${formatSrtTimestamp(end)}\n${chunk.text.trim()}`;
    })
    .join('\n\n');
}

/**
 * Export transcript as JSON with full timestamp data
 */
export function exportAsJSON(data: TranscriptData): string {
  return JSON.stringify(
    {
      text: data.text,
      chunks: data.chunks.filter(
        chunk => chunk.timestamp && chunk.timestamp[0] != null && chunk.timestamp[1] != null
      ),
    },
    null,
    2
  );
}

/**
 * Export transcript in the specified format
 */
export function exportTranscript(data: TranscriptData, format: ExportFormat): string {
  switch (format) {
    case 'txt':
      return exportAsPlainText(data);
    case 'srt':
      return exportAsSRT(data);
    case 'json':
      return exportAsJSON(data);
    default:
      return exportAsPlainText(data);
  }
}

/**
 * Generate a sanitized filename with timestamp
 */
function generateFilename(baseName: string | undefined, format: ExportFormat): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const sanitized = (baseName || 'transcript').replace(/[^a-zA-Z0-9-_]/g, '-');
  return `${sanitized}-${timestamp}.${format}`;
}

/**
 * Get MIME type for export format
 */
function getMimeType(format: ExportFormat): string {
  const mimeTypes: Record<ExportFormat, string> = {
    txt: 'text/plain',
    srt: 'text/plain',
    json: 'application/json',
  };
  return mimeTypes[format];
}

/**
 * Download transcript as a file
 */
export function downloadTranscript(
  data: TranscriptData,
  format: ExportFormat,
  filename?: string
): void {
  const content = exportTranscript(data, format);
  const blob = new Blob([content], { type: getMimeType(format) });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = generateFilename(filename, format);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}
