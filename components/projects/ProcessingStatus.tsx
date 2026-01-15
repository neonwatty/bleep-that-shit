'use client';

import { useJobStatus, useProjectJob } from '@/hooks/useJobStatus';
import type { Database } from '@/types/supabase';

type Job = Database['public']['Tables']['jobs']['Row'];

interface ProcessingStatusProps {
  projectId: string;
  onComplete?: (job: Job) => void;
  onError?: (job: Job) => void;
}

/**
 * Component that displays and manages cloud processing status
 * Uses async queue-based processing with PGMQ and Supabase Edge Functions
 */
export function ProcessingStatus({ projectId, onComplete, onError }: ProcessingStatusProps) {
  const { job, isLoading, isStarting, error, startProcessing, refetch } = useProjectJob(projectId);

  // Use job status polling when there's an active job
  const { job: polledJob, isPolling } = useJobStatus(
    job?.status === 'processing' || job?.status === 'pending' ? job.id : null,
    {
      pollInterval: 3000, // Poll every 3 seconds
      onComplete,
      onError,
    }
  );

  // Use polled job data if available, otherwise use initial job
  const currentJob = polledJob || job;

  const handleStartProcessing = async () => {
    const result = await startProcessing();
    if (result.error) {
      console.error('Failed to start processing:', result.error);
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

  // Show error state
  if (error && !currentJob) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="text-lg font-semibold text-red-800">Error</h3>
        <p className="mt-2 text-red-700">{error.message}</p>
        <button
          onClick={handleStartProcessing}
          disabled={isStarting}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isStarting ? 'Starting...' : 'Try Again'}
        </button>
      </div>
    );
  }

  // No job yet - show start button
  if (!currentJob) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h3 className="text-lg font-semibold text-blue-800">Cloud Transcription</h3>
        <p className="mt-2 text-blue-700">
          Use cloud processing for fast, accurate transcription. Your file will be processed using
          Groq&apos;s Whisper model - typically completing in seconds to minutes depending on file
          length.
        </p>
        <button
          onClick={handleStartProcessing}
          disabled={isStarting}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isStarting ? 'Starting...' : 'Start Cloud Processing'}
        </button>
      </div>
    );
  }

  // Show job status
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Processing Status</h3>
        <JobStatusBadge status={currentJob.status} />
      </div>

      <div className="mt-4">
        {currentJob.status === 'pending' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              <span className="text-gray-600">Job queued, waiting to start...</span>
            </div>
            <p className="text-sm text-gray-500">
              Your transcription job is in the queue and will begin processing shortly.
            </p>
          </div>
        )}

        {currentJob.status === 'processing' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              <span className="text-gray-600">Transcribing with Groq Whisper...</span>
            </div>
            <ProcessingProgressBar />
            <p className="text-sm text-gray-500">
              Processing your audio file. This may take a few seconds to a few minutes depending on
              file length.
              {isPolling && ' Checking status...'}
            </p>
            {currentJob.retry_count > 0 && (
              <p className="text-sm text-yellow-600">Retry attempt {currentJob.retry_count}/3</p>
            )}
          </div>
        )}

        {currentJob.status === 'completed' && (
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
            {currentJob.processing_minutes && (
              <p className="text-sm text-gray-500">
                Processed {(currentJob.processing_minutes * 60).toFixed(0)} seconds of audio
              </p>
            )}
          </div>
        )}

        {currentJob.status === 'failed' && (
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
            {currentJob.error_message && (
              <p className="text-sm text-red-600">{currentJob.error_message}</p>
            )}
            <button
              onClick={handleStartProcessing}
              disabled={isStarting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isStarting ? 'Starting...' : 'Retry Processing'}
            </button>
          </div>
        )}

        {currentJob.status === 'cancelled' && (
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
              disabled={isStarting}
              className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {isStarting ? 'Starting...' : 'Start Again'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Queued' },
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
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
      <div
        className="h-full rounded-full bg-blue-600"
        style={{
          width: '60%',
          animation: 'progress 2s ease-in-out infinite',
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
