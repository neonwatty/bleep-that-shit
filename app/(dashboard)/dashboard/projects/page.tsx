'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProjects } from '@/hooks/useProjects';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';

export default function ProjectsPage() {
  const { projects, total, isLoading, error, deleteProject } = useProjects({ limit: 50 });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredProjects =
    statusFilter === 'all' ? projects : projects.filter(p => p.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-600">Manage all your video and audio projects</p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <span className="text-sm font-medium text-gray-700">Status:</span>
        <div className="flex gap-2">
          {['all', 'draft', 'processing', 'ready', 'error'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                statusFilter === status
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Projects List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-gray-200 bg-gray-100"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-700">Failed to load projects: {error.message}</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            {statusFilter === 'all' ? 'No projects yet.' : `No ${statusFilter} projects.`}
          </p>
          {statusFilter === 'all' && (
            <p className="mt-2 text-sm text-gray-400">
              Click &quot;New Project&quot; to get started.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} onDelete={deleteProject} />
          ))}
        </div>
      )}

      {/* Pagination info */}
      {!isLoading && total > 0 && (
        <div className="text-center text-sm text-gray-500">
          Showing {filteredProjects.length} of {total} projects
        </div>
      )}

      {/* Breadcrumb back to dashboard */}
      <div className="pt-4">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog isOpen={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
    </div>
  );
}
