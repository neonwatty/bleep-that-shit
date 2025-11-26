import { FileUpload } from '@/components/FileUpload';
import { TranscriptionControls } from '@/components/TranscriptionControls';
import { TranscriptExport } from '@/components/TranscriptExport';
import type { TranscriptionResult } from '../hooks/useBleepState';

interface SetupTranscribeTabProps {
  // File props
  file: File | null;
  fileUrl: string | null;
  isLoadingSample: boolean;
  showFileWarning: boolean;
  fileDurationWarning: string | null;
  onFileUpload: (file: File) => void;
  // Transcription props
  language: string;
  model: string;
  isTranscribing: boolean;
  transcriptionResult: TranscriptionResult | null;
  progress: number;
  progressText: string;
  errorMessage: string | null;
  timestampWarning: { count: number; total: number } | null;
  onLanguageChange: (language: string) => void;
  onModelChange: (model: string) => void;
  onTranscribe: () => void;
  onDismissError: () => void;
}

export function SetupTranscribeTab({
  file,
  fileUrl,
  isLoadingSample,
  showFileWarning,
  fileDurationWarning,
  onFileUpload,
  language,
  model,
  isTranscribing,
  transcriptionResult,
  progress,
  progressText,
  errorMessage,
  timestampWarning,
  onLanguageChange,
  onModelChange,
  onTranscribe,
  onDismissError,
}: SetupTranscribeTabProps) {
  return (
    <div className="space-y-8">
      {/* Step 1: Upload */}
      <section className="border-l-4 border-blue-500 pl-3 sm:pl-4">
        <div className="mb-2 flex items-center">
          <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-base font-bold text-white">
            1
          </span>
          <h2 className="font-inter text-lg font-extrabold text-black uppercase sm:text-xl md:text-2xl">
            Upload Your File
          </h2>
        </div>
        <p className="mb-2 text-sm text-blue-900 sm:text-base">
          Audio (MP3) or Video (MP4) supported. Files up to 10 minutes. Preview your input before
          processing.
        </p>

        <FileUpload
          onFileUpload={onFileUpload}
          file={file}
          fileUrl={fileUrl}
          isLoadingSample={isLoadingSample}
          showFileWarning={showFileWarning}
          fileDurationWarning={fileDurationWarning}
        />
      </section>

      {/* Step 2: Language & Model */}
      <section className="border-l-4 border-green-500 pl-3 sm:pl-4">
        <div className="mb-2 flex items-center">
          <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-base font-bold text-white">
            2
          </span>
          <h2 className="font-inter text-lg font-extrabold text-black uppercase sm:text-xl md:text-2xl">
            Select Language & Model
          </h2>
        </div>

        <TranscriptionControls
          language={language}
          model={model}
          onLanguageChange={onLanguageChange}
          onModelChange={onModelChange}
        />
      </section>

      {/* Step 3: Transcribe */}
      <section className="border-l-4 border-indigo-500 pl-3 sm:pl-4">
        <div className="mb-2 flex items-center">
          <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-base font-bold text-white">
            3
          </span>
          <h2 className="font-inter text-lg font-extrabold text-black uppercase sm:text-xl md:text-2xl">
            Transcribe
          </h2>
        </div>

        <button
          data-testid="transcribe-button"
          onClick={onTranscribe}
          disabled={!file || isTranscribing}
          className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isTranscribing ? 'Transcribing...' : 'Start Transcription'}
        </button>

        {isTranscribing && (
          <div className="mt-4">
            <div data-testid="progress-bar" className="h-2.5 w-full rounded-full bg-gray-200">
              <div
                className="h-2.5 rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p data-testid="progress-text" className="mt-2 text-sm text-gray-600">
              {progressText}
            </p>
          </div>
        )}

        {errorMessage && (
          <div
            data-testid="error-message"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4"
          >
            <div className="flex items-start">
              <svg
                className="mt-0.5 mr-2 h-5 w-5 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-red-800">Transcription Error</p>
                <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={onDismissError}
                    className="text-sm text-red-600 underline hover:text-red-800"
                  >
                    Dismiss
                  </button>
                  <a
                    href="https://discord.gg/8EUxqR93"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 underline hover:text-indigo-800"
                  >
                    Get help on Discord
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {transcriptionResult && (
          <div data-testid="transcript-result" className="mt-4 rounded bg-gray-50 p-4">
            <h3 className="mb-2 font-bold">Transcript:</h3>
            <p data-testid="transcript-text" className="text-gray-800">
              {transcriptionResult.text}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Found {transcriptionResult.chunks.length} words with timestamps
            </p>
            <div className="mt-4 border-t border-gray-200 pt-4">
              <TranscriptExport
                transcriptData={transcriptionResult}
                filename={file?.name?.replace(/\.[^/.]+$/, '') || 'transcript'}
              />
            </div>
          </div>
        )}

        {timestampWarning && (
          <div
            data-testid="timestamp-warning"
            className="mt-2 rounded border border-orange-400 bg-orange-100 p-3 text-orange-800"
          >
            <div className="flex items-start">
              <span className="mr-2">⚠️</span>
              <div>
                <strong>Timestamp Quality Warning:</strong> {timestampWarning.count} out of{' '}
                {timestampWarning.total} words had invalid timestamps and were filtered out.
                <div className="mt-2 text-sm">
                  Having issues?{' '}
                  <a
                    href="https://discord.gg/8EUxqR93"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 underline hover:text-indigo-800"
                  >
                    Get help on Discord
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {transcriptionResult &&
          (() => {
            const wordCount = transcriptionResult.chunks.length;
            const sentenceCount = transcriptionResult.text
              .split(/[.!?]+/)
              .filter(s => s.trim().length > 0).length;

            return (
              <div className="mt-4 rounded border-l-4 border-green-400 bg-green-50 p-3 text-sm">
                <p className="text-green-900">
                  ✅ <strong>Transcription complete!</strong> {wordCount} word
                  {wordCount !== 1 ? 's' : ''} in {sentenceCount} sentence
                  {sentenceCount !== 1 ? 's' : ''}. Continue to the Review & Match tab to select
                  words.
                </p>
              </div>
            );
          })()}
      </section>
    </div>
  );
}
