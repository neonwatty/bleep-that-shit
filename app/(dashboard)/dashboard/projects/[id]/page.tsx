'use client';

import { use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { useProject } from '@/hooks/useProject';
import { FileUploadWithProgress } from '@/components/projects/FileUploadWithProgress';
import { ProcessingStatus } from '@/components/projects/ProcessingStatus';
import { formatDuration } from '@/hooks/useFileUpload';
import type { UploadResult } from '@/lib/supabase/storage';
import type { Database } from '@/types/supabase';

type Job = Database['public']['Tables']['jobs']['Row'];

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  processing: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Processing' },
  ready: { bg: 'bg-green-100', text: 'text-green-700', label: 'Ready' },
  error: { bg: 'bg-red-100', text: 'text-red-700', label: 'Error' },
};

export default function ProjectDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { user } = useAuth();
  const { project, isLoading, error, updateProject, refetch } = useProject(resolvedParams.id);

  const handleUploadComplete = async (result: UploadResult & { duration?: number }) => {
    await updateProject({
      original_file_path: result.path,
      original_file_size: result.metadata.size,
      duration_seconds: result.duration || null,
    });
  };

  const handleJobComplete = async () => {
    // Refresh project data to get transcription
    await refetch();
  };

  const handleJobError = async (error: string) => {
    console.error('Job error:', error);
    // Refresh project data to get error status
    await refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/projects" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back to Projects
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-semibold text-red-800">Project Not Found</h1>
          <p className="mt-2 text-red-600">
            {error?.message || 'This project does not exist or you do not have access to it.'}
          </p>
        </div>
      </div>
    );
  }

  const status = statusColors[project.status] || statusColors.draft;
  const hasFile = !!project.original_file_path;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/projects" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Back to Projects
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{project.title}</h1>
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}
            >
              {status.label}
            </span>
            {project.duration_seconds && (
              <span>Duration: {formatDuration(project.duration_seconds)}</span>
            )}
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      {!hasFile && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Upload Media File</h2>
          <p className="mt-1 text-sm text-gray-600">
            Upload an audio or video file to get started with transcription and bleeping.
          </p>
          <div className="mt-4">
            {user && (
              <FileUploadWithProgress
                userId={user.id}
                projectId={project.id}
                onUploadComplete={handleUploadComplete}
              />
            )}
          </div>
        </div>
      )}

      {/* File Info */}
      {hasFile && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Media File</h2>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-2xl">
              {project.original_file_path?.includes('video') ? '🎬' : '🎵'}
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {project.original_file_path?.split('/').pop() || 'Media file'}
              </p>
              <p className="text-sm text-gray-500">
                {project.original_file_size
                  ? `${(project.original_file_size / (1024 * 1024)).toFixed(1)} MB`
                  : 'Unknown size'}
                {project.duration_seconds && ` • ${formatDuration(project.duration_seconds)}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Processing Section */}
      {hasFile &&
        (project.status === 'draft' ||
          project.status === 'processing' ||
          project.status === 'error') && (
          <ProcessingStatus
            projectId={project.id}
            onComplete={handleJobComplete}
            onError={handleJobError}
          />
        )}

      {/* Browser Processing Option */}
      {hasFile && project.status === 'draft' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Or Use Browser Processing</h2>
          <p className="mt-2 text-gray-600">
            Process locally in your browser. Works offline but may be slower for longer files.
          </p>
          <div className="mt-4">
            <Link
              href={`/bleep?project=${project.id}`}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Use Browser Processing
            </Link>
          </div>
        </div>
      )}

      {/* Ready Status */}
      {project.status === 'ready' && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <h2 className="text-lg font-semibold text-green-800">Ready for Download</h2>
          <p className="mt-2 text-green-700">
            Your processed media is ready. You can download the censored version.
          </p>
          <div className="mt-4">
            <Link
              href={`/bleep?project=${project.id}`}
              className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              View &amp; Download
            </Link>
          </div>
        </div>
      )}

      {/* Project Metadata */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Project Details</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd className="mt-1 text-gray-900">
              {new Date(project.created_at).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Last Updated</dt>
            <dd className="mt-1 text-gray-900">
              {new Date(project.updated_at).toLocaleDateString()}
            </dd>
          </div>
          {project.processing_minutes !== null && (
            <div>
              <dt className="text-gray-500">Processing Time</dt>
              <dd className="mt-1 text-gray-900">{project.processing_minutes} minutes</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
