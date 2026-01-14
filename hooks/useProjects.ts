'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Database } from '@/types/supabase';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectStatus = Project['status'];

interface UseProjectsOptions {
  status?: ProjectStatus;
  limit?: number;
  offset?: number;
}

interface UseProjectsReturn {
  projects: Project[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createProject: (title: string) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
}

export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
  const { status, limit = 20, offset = 0 } = options;

  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (status) {
        params.set('status', status);
      }

      const response = await fetch(`/api/projects?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data.projects);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch projects'));
    } finally {
      setIsLoading(false);
    }
  }, [status, limit, offset]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = useCallback(
    async (title: string): Promise<Project | null> => {
      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create project');
        }

        const data = await response.json();
        // Refetch to update the list
        await fetchProjects();
        return data.project;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create project'));
        return null;
      }
    },
    [fetchProjects]
  );

  const deleteProject = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/projects/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete project');
        }

        // Refetch to update the list
        await fetchProjects();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete project'));
        return false;
      }
    },
    [fetchProjects]
  );

  return {
    projects,
    total,
    isLoading,
    error,
    refetch: fetchProjects,
    createProject,
    deleteProject,
  };
}
