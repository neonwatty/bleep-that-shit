'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Database } from '@/types/supabase';
import { formatDuration } from '@/hooks/useFileUpload';

type Project = Database['public']['Tables']['projects']['Row'];

interface ProjectCardProps {
  project: Project;
  onDelete?: (id: string) => Promise<boolean>;
}

const statusColors: Record<Project['status'], { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  processing: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Processing' },
  ready: { bg: 'bg-green-100', text: 'text-green-700', label: 'Ready' },
  error: { bg: 'bg-red-100', text: 'text-red-700', label: 'Error' },
};

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const status = statusColors[project.status];
  const createdAt = new Date(project.created_at).toLocaleDateString();
  const updatedAt = new Date(project.updated_at).toLocaleDateString();

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    await onDelete(project.id);
    setIsDeleting(false);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/projects/${project.id}`}
            className="block truncate text-lg font-medium text-gray-900 hover:text-blue-600"
          >
            {project.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}
            >
              {status.label}
            </span>
            {project.duration_seconds && <span>{formatDuration(project.duration_seconds)}</span>}
          </div>
        </div>

        {/* Actions Menu */}
        <div className="ml-4 flex items-center gap-2">
          <Link
            href={`/dashboard/projects/${project.id}`}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Open
          </Link>
          {onDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              disabled={isDeleting}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
        <span>Created: {createdAt}</span>
        {createdAt !== updatedAt && <span>Updated: {updatedAt}</span>}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Project</h3>
            <p className="mt-2 text-gray-600">
              Are you sure you want to delete &quot;{project.title}&quot;? This action cannot be
              undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
