'use client';

import { useState } from 'react';
import { downloadTranscript, TranscriptData, ExportFormat } from '@/lib/utils/transcriptExport';

interface TranscriptExportProps {
  transcriptData: TranscriptData;
  filename?: string;
  className?: string;
}

export function TranscriptExport({
  transcriptData,
  filename,
  className = '',
}: TranscriptExportProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('txt');

  const handleExport = () => {
    downloadTranscript(transcriptData, selectedFormat, filename);
  };

  const hasTimestamps = transcriptData.chunks && transcriptData.chunks.length > 0;

  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-center ${className}`}>
      <label className="text-sm font-semibold text-gray-700">Export Transcript:</label>
      <select
        data-testid="export-format-select"
        value={selectedFormat}
        onChange={e => setSelectedFormat(e.target.value as ExportFormat)}
        className="min-h-touch rounded-lg border border-gray-300 p-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
      >
        <option value="txt">Plain Text (.txt)</option>
        {hasTimestamps && (
          <>
            <option value="srt">SRT Subtitles (.srt)</option>
            <option value="json">JSON with Timestamps (.json)</option>
          </>
        )}
      </select>

      <button
        data-testid="export-transcript-button"
        onClick={handleExport}
        className="min-h-touch rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Download
      </button>
    </div>
  );
}
