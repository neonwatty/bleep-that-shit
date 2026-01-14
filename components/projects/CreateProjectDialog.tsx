'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProjectDialog({ isOpen, onClose }: CreateProjectDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Please enter a project title');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const data = await response.json();
      onClose();
      router.push(`/dashboard/projects/${data.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-gray-900">Create New Project</h2>
        <p className="mt-1 text-sm text-gray-600">Give your project a name to get started.</p>

        <form onSubmit={handleSubmit} className="mt-4">
          <label htmlFor="project-title" className="block text-sm font-medium text-gray-700">
            Project Title
          </label>
          <input
            id="project-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="My Awesome Video"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            autoFocus
            disabled={isCreating}
          />

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={isCreating || !title.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
