'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Database } from '@/types/supabase';

type Job = Database['public']['Tables']['jobs']['Row'];

interface UseJobStatusOptions {
  /** Polling interval in milliseconds (default: 3000) */
  pollInterval?: number;
  /** Whether to automatically start polling (default: true) */
  autoStart?: boolean;
  /** Callback when job completes */
  onComplete?: (job: Job) => void;
  /** Callback when job fails */
  onError?: (job: Job) => void;
}

interface UseJobStatusReturn {
  job: Job | null;
  isLoading: boolean;
  error: Error | null;
  isPolling: boolean;
  startPolling: () => void;
  stopPolling: () => void;
  refetch: () => Promise<void>;
}

/**
 * Hook for polling job status
 * Polls the API to check job progress and calls callbacks on completion/failure
 */
export function useJobStatus(
  jobId: string | null,
  options: UseJobStatusOptions = {}
): UseJobStatusReturn {
  const { pollInterval = 3000, autoStart = true, onComplete, onError } = options;

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  const fetchJob = useCallback(async () => {
    if (!jobId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/jobs/${jobId}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch job');
      }

      const data = await response.json();
      setJob(data.job);

      // Check for terminal states
      if (data.job.status === 'completed') {
        onCompleteRef.current?.(data.job);
        return true; // Stop polling
      } else if (data.job.status === 'failed' || data.job.status === 'cancelled') {
        onErrorRef.current?.(data.job);
        return true; // Stop polling
      }

      return false; // Continue polling
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch job'));
      return true; // Stop polling on error
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(() => {
    if (!jobId || pollingRef.current) return;

    setIsPolling(true);

    // Fetch immediately
    fetchJob().then(shouldStop => {
      if (shouldStop) {
        setIsPolling(false);
        return;
      }

      // Start interval polling
      pollingRef.current = setInterval(async () => {
        const shouldStop = await fetchJob();
        if (shouldStop) {
          stopPolling();
        }
      }, pollInterval);
    });
  }, [jobId, fetchJob, pollInterval, stopPolling]);

  // Auto-start polling when jobId changes
  useEffect(() => {
    if (jobId && autoStart) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [jobId, autoStart, startPolling, stopPolling]);

  return {
    job,
    isLoading,
    error,
    isPolling,
    startPolling,
    stopPolling,
    refetch: fetchJob as () => Promise<void>,
  };
}

/**
 * Hook for fetching latest job for a project
 * With Groq's synchronous API, processing completes during the startProcessing call
 */
export function useProjectJob(projectId: string | null): {
  job: Job | null;
  isLoading: boolean;
  isProcessing: boolean;
  error: Error | null;
  transcription: TranscriptionResult | null;
  refetch: () => Promise<void>;
  startProcessing: () => Promise<{
    job?: Job;
    transcription?: TranscriptionResult;
    error?: string;
  }>;
} {
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);

  const fetchJob = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/jobs`);

      if (!response.ok) {
        if (response.status === 404) {
          // No jobs yet
          setJob(null);
          return;
        }
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch job');
      }

      const data = await response.json();
      setJob(data.job);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch job'));
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const startProcessing = useCallback(async () => {
    if (!projectId) return { error: 'No project ID' };

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/process/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(new Error(data.error || 'Failed to process'));
        return { error: data.error || 'Failed to start processing' };
      }

      // Groq returns results synchronously - update state immediately
      if (data.transcription) {
        setTranscription(data.transcription);
      }

      // Refetch job to get the completed job record
      await fetchJob();

      return { job: data.job, transcription: data.transcription };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start processing';
      setError(new Error(errorMessage));
      return { error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, fetchJob]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  return {
    job,
    isLoading,
    isProcessing,
    error,
    transcription,
    refetch: fetchJob,
    startProcessing,
  };
}

interface TranscriptionResult {
  text: string;
  wordCount: number;
  duration: number;
  language: string;
}
