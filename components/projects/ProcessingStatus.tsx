'use client';

import { useProjectJob } from '@/hooks/useJobStatus';
import type { Database } from '@/types/supabase';

type Job = Database['public']['Tables']['jobs']['Row'];

interface ProcessingStatusProps {
  projectId: string;
  onComplete?: (job: Job, transcription: TranscriptionResult) => void;
  onError?: (error: string) => void;
}

interface TranscriptionResult {
  text: string;
  wordCount: number;
  duration: number;
  language: string;
}

/**
 * Component that displays and manages cloud processing status
 * Uses Groq's synchronous API - transcription completes in seconds
 */
export function ProcessingStatus({ projectId, onComplete, onError }: ProcessingStatusProps) {
  const { job, isLoading, isProcessing, error, transcription, startProcessing, refetch } =
    useProjectJob(projectId);

  const handleStartProcessing = async () => {
    const result = await startProcessing();
    if (result.error) {
      console.error('Failed to start processing:', result.error);
      onError?.(result.error);
    } else if (result.job && result.transcription) {
      // Refetch to get the latest job with completed status
      await refetch();
      onComplete?.(result.job as Job, result.transcription);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg bg-gray-100 p-6">
        <div className="h-6 w-48 rounded bg-gray-200" />
        <div className="mt-4 h-4 w-32 rounded bg-gray-200" />
      </div>
    );
  }

  // Show processing state while Groq API call is in progress
  if (isProcessing) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-blue-800">Cloud Transcription</h3>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            Processing
          </span>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
            <span className="text-blue-700">Transcribing with Groq Whisper...</span>
          </div>
          <ProcessingProgressBar />
          <p className="text-sm text-blue-600">
            This typically takes just a few seconds thanks to Groq&apos;s fast inference.
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !job) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="text-lg font-semibold text-red-800">Processing Error</h3>
        <p className="mt-2 text-red-700">{error.message}</p>
        <button
          onClick={handleStartProcessing}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // No job yet - show start button
  if (!job) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h3 className="text-lg font-semibold text-blue-800">Cloud Transcription</h3>
        <p className="mt-2 text-blue-700">
          Use cloud processing for fast, accurate transcription. Your file will be processed using
          Groq&apos;s Whisper model - typically completing in just a few seconds.
        </p>
        <button
          onClick={handleStartProcessing}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Start Cloud Processing
        </button>
      </div>
    );
  }

  // Show job status
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Processing Status</h3>
        <JobStatusBadge status={job.status} />
      </div>

      <div className="mt-4">
        {job.status === 'completed' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="font-medium">Transcription complete!</span>
            </div>
            {transcription && (
              <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                <p>
                  <span className="font-medium">Duration:</span>{' '}
                  {formatDuration(transcription.duration)}
                </p>
                <p>
                  <span className="font-medium">Words:</span> {transcription.wordCount}
                </p>
                <p>
                  <span className="font-medium">Language:</span> {transcription.language}
                </p>
              </div>
            )}
            {job.processing_minutes && (
              <p className="text-sm text-gray-500">
                Processed in {(job.processing_minutes * 60).toFixed(1)} seconds
              </p>
            )}
          </div>
        )}

        {job.status === 'failed' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span className="font-medium">Processing failed</span>
            </div>
            {job.error_message && <p className="text-sm text-red-600">{job.error_message}</p>}
            <button
              onClick={handleStartProcessing}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Retry Processing
            </button>
          </div>
        )}

        {job.status === 'cancelled' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
              <span className="font-medium">Processing cancelled</span>
            </div>
            <button
              onClick={handleStartProcessing}
              className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Start Again
            </button>
          </div>
        )}

        {/* Legacy states for any jobs still in processing (shouldn't happen with Groq) */}
        {(job.status === 'pending' || job.status === 'processing') && (
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
            <span className="text-gray-600">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
    processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Processing' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
    failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelled' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function ProcessingProgressBar() {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-blue-200">
      <div
        className="h-full rounded-full bg-blue-600"
        style={{
          width: '60%',
          animation: 'progress 1.5s ease-in-out infinite',
        }}
      />
      <style jsx>{`
        @keyframes progress {
          0% {
            width: 20%;
          }
          50% {
            width: 80%;
          }
          100% {
            width: 20%;
          }
        }
      `}</style>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}
