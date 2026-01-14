'use client';

import { useState, useCallback } from 'react';
import { uploadOriginalFile, UploadProgress, UploadResult } from '@/lib/supabase/storage';

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface UseFileUploadOptions {
  maxSizeBytes?: number;
  acceptedTypes?: string[];
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

export interface UseFileUploadReturn {
  status: UploadStatus;
  progress: UploadProgress | null;
  error: Error | null;
  result: UploadResult | null;
  upload: (file: File, userId: string, projectId: string) => Promise<UploadResult | null>;
  reset: () => void;
}

const DEFAULT_MAX_SIZE = 500 * 1024 * 1024; // 500MB
const DEFAULT_ACCEPTED_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

/**
 * Hook for handling file uploads to Supabase Storage with progress tracking
 */
export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    maxSizeBytes = DEFAULT_MAX_SIZE,
    acceptedTypes = DEFAULT_ACCEPTED_TYPES,
    onSuccess,
    onError,
  } = options;

  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const validateFile = useCallback(
    (file: File): Error | null => {
      // Check file size
      if (file.size > maxSizeBytes) {
        const maxSizeMB = Math.round(maxSizeBytes / 1024 / 1024);
        return new Error(`File size exceeds ${maxSizeMB}MB limit`);
      }

      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        return new Error(`File type not supported. Accepted types: ${acceptedTypes.join(', ')}`);
      }

      return null;
    },
    [maxSizeBytes, acceptedTypes]
  );

  const upload = useCallback(
    async (file: File, userId: string, projectId: string): Promise<UploadResult | null> => {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        setStatus('error');
        setError(validationError);
        onError?.(validationError);
        return null;
      }

      setStatus('uploading');
      setProgress({ loaded: 0, total: file.size, percentage: 0 });
      setError(null);
      setResult(null);

      try {
        // Simulate progress for better UX (since Supabase doesn't have real progress)
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (!prev || prev.percentage >= 90) return prev;
            const newPercentage = Math.min(prev.percentage + 10, 90);
            return {
              loaded: Math.round((newPercentage / 100) * file.size),
              total: file.size,
              percentage: newPercentage,
            };
          });
        }, 500);

        const uploadResult = await uploadOriginalFile(file, userId, projectId, setProgress);

        clearInterval(progressInterval);

        setStatus('success');
        setProgress({ loaded: file.size, total: file.size, percentage: 100 });
        setResult(uploadResult);
        onSuccess?.(uploadResult);

        return uploadResult;
      } catch (err) {
        const uploadError = err instanceof Error ? err : new Error('Upload failed');
        setStatus('error');
        setError(uploadError);
        onError?.(uploadError);
        return null;
      }
    },
    [validateFile, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(null);
    setError(null);
    setResult(null);
  }, []);

  return {
    status,
    progress,
    error,
    result,
    upload,
    reset,
  };
}

/**
 * Get the file duration for audio/video files
 */
export async function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const media = file.type.startsWith('video/')
      ? document.createElement('video')
      : document.createElement('audio');

    media.preload = 'metadata';

    media.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(media.duration));
    };

    media.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load media metadata'));
    };

    media.src = url;
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
