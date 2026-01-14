'use client';

import { useProjects } from '@/hooks/useProjects';
import { ProjectCard } from './ProjectCard';
import Link from 'next/link';

interface ProjectListProps {
  limit?: number;
  showCreateButton?: boolean;
  showViewAllLink?: boolean;
  emptyMessage?: string;
}

export function ProjectList({
  limit = 5,
  showCreateButton = true,
  showViewAllLink = false,
  emptyMessage = 'No projects yet.',
}: ProjectListProps) {
  const { projects, total, isLoading, error, deleteProject } = useProjects({ limit });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-gray-200 bg-gray-100"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-700">Failed to load projects: {error.message}</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <p>{emptyMessage}</p>
        {showCreateButton && (
          <p className="mt-2 text-sm">
            <Link href="/bleep" className="text-blue-600 hover:text-blue-700">
              Create your first project
            </Link>{' '}
            to get started.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} onDelete={deleteProject} />
      ))}

      {showViewAllLink && total > projects.length && (
        <div className="pt-2 text-center">
          <Link
            href="/dashboard/projects"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all {total} projects
          </Link>
        </div>
      )}
    </div>
  );
}
