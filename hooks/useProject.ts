'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Database } from '@/types/supabase';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

interface UseProjectReturn {
  project: Project | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateProject: (updates: Partial<ProjectUpdate>) => Promise<boolean>;
}

export function useProject(id: string): UseProjectReturn {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProject = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${id}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch project');
      }

      const data = await response.json();
      setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch project'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const updateProject = useCallback(
    async (updates: Partial<ProjectUpdate>): Promise<boolean> => {
      try {
        const response = await fetch(`/api/projects/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update project');
        }

        const data = await response.json();
        setProject(data.project);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update project'));
        return false;
      }
    },
    [id]
  );

  return {
    project,
    isLoading,
    error,
    refetch: fetchProject,
    updateProject,
  };
}
