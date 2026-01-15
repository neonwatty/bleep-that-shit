'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useProjects } from '@/hooks/useProjects';
import { ProjectList } from '@/components/projects/ProjectList';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';

export default function DashboardPage() {
  const { user } = useAuth();
  const { projects, isLoading } = useProjects({ limit: 100 });
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Calculate stats
  const totalProjects = projects.length;
  const processingProjects = projects.filter(p => p.status === 'processing').length;
  const readyProjects = projects.filter(p => p.status === 'ready').length;
  const totalMinutes = projects.reduce((acc, p) => acc + (p.processing_minutes || 0), 0);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
        <p className="mt-1 text-gray-600">
          {user?.user_metadata?.display_name
            ? `Hello, ${user.user_metadata.display_name}`
            : "Here's what's happening with your projects."}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm font-medium text-gray-500">Total Projects</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{isLoading ? '-' : totalProjects}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm font-medium text-gray-500">Processing</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {isLoading ? '-' : processingProjects}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm font-medium text-gray-500">Completed</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{isLoading ? '-' : readyProjects}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm font-medium text-gray-500">Minutes Used</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{isLoading ? '-' : totalMinutes}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-4">
          <button
            onClick={() => setShowCreateDialog(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Project
          </button>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
        <div className="mt-4">
          <ProjectList limit={5} showViewAllLink={true} />
        </div>
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog isOpen={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
    </div>
  );
}
