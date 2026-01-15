'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  useFileUpload,
  getMediaDuration,
  formatFileSize,
  formatDuration,
  UploadStatus,
} from '@/hooks/useFileUpload';
import { UploadResult } from '@/lib/supabase/storage';

interface FileUploadWithProgressProps {
  userId: string;
  projectId: string;
  onUploadComplete: (result: UploadResult & { duration?: number }) => void;
  onUploadError?: (error: Error) => void;
  maxSizeBytes?: number;
  disabled?: boolean;
  className?: string;
}

export function FileUploadWithProgress({
  userId,
  projectId,
  onUploadComplete,
  onUploadError,
  maxSizeBytes = 500 * 1024 * 1024,
  disabled = false,
  className = '',
}: FileUploadWithProgressProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const { status, progress, error, upload, reset } = useFileUpload({
    maxSizeBytes,
    onError: onUploadError,
  });

  const handleFileDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setSelectedFile(file);

    // Get duration for audio/video files
    try {
      const fileDuration = await getMediaDuration(file);
      setDuration(fileDuration);
    } catch {
      // Duration extraction failed, continue without it
      setDuration(null);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    const result = await upload(selectedFile, userId, projectId);
    if (result) {
      onUploadComplete({
        ...result,
        duration: duration ?? undefined,
      });
    }
  }, [selectedFile, upload, userId, projectId, duration, onUploadComplete]);

  const handleCancel = useCallback(() => {
    setSelectedFile(null);
    setDuration(null);
    reset();
  }, [reset]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: {
      'audio/*': ['.mp3', '.wav'],
      'video/*': ['.mp4', '.mov', '.webm'],
    },
    maxFiles: 1,
    disabled: disabled || status === 'uploading',
  });

  const isUploading = status === 'uploading';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Dropzone */}
      {!selectedFile && (
        <div
          {...getRootProps()}
          className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : disabled
                ? 'cursor-not-allowed border-gray-200 bg-gray-50'
                : 'cursor-pointer border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="space-y-2">
            <div className="text-4xl">{isDragActive ? '📂' : '📁'}</div>
            <p className="text-lg font-medium text-gray-700">
              {isDragActive ? 'Drop your file here' : 'Drag & drop a file, or click to select'}
            </p>
            <p className="text-sm text-gray-500">
              Audio (MP3, WAV) or Video (MP4, MOV, WebM) up to {formatFileSize(maxSizeBytes)}
            </p>
          </div>
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && !isSuccess && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                {selectedFile.type.startsWith('video/') ? '🎬' : '🎵'}
              </div>
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(selectedFile.size)}
                  {duration && ` • ${formatDuration(duration)}`}
                </p>
              </div>
            </div>
            {!isUploading && (
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Remove file"
              >
                ✕
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {isUploading && progress && (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-600">Uploading...</span>
                <span className="text-gray-600">{progress.percentage}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {isError && error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3">
              <p className="text-sm text-red-700">{error.message}</p>
            </div>
          )}

          {/* Action Buttons */}
          {!isUploading && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleUpload}
                disabled={disabled}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Upload File
              </button>
              <button
                onClick={handleCancel}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Success State */}
      {isSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              ✓
            </div>
            <div>
              <p className="font-medium text-green-800">Upload complete!</p>
              <p className="text-sm text-green-600">
                {selectedFile?.name} has been uploaded successfully.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
