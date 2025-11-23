'use client';

import { useState } from 'react';
import { useWordsets } from '@/lib/hooks/useWordsets';
import { exportWordsetsCSV, getWordsetById } from '@/lib/utils/db/wordsetOperations';
import { WordsetList } from './WordsetList';
import { WordsetEditor } from './WordsetEditor';
import { WordsetImportExport } from './WordsetImportExport';
import type { WordsetCreateInput, WordsetUpdateInput } from '@/lib/types/wordset';

interface WordsetManagerProps {
  onClose: () => void;
  onWordsetUpdated?: () => void;
}

type View = 'list' | 'create' | 'edit' | 'import-export' | 'delete-confirm';

export function WordsetManager({ onClose, onWordsetUpdated }: WordsetManagerProps) {
  const {
    wordsets,
    searchQuery,
    setSearchQuery,
    create,
    update,
    remove,
    duplicate,
    exportCSV,
    importCSV,
    error,
    clearError,
  } = useWordsets();

  const [currentView, setCurrentView] = useState<View>('list');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingId(null);
    setCurrentView('create');
    clearError();
  };

  const handleEdit = async (id: number) => {
    setEditingId(id);
    setCurrentView('edit');
    clearError();
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    setCurrentView('delete-confirm');
    clearError();
  };

  const handleDuplicate = async (id: number) => {
    setIsSubmitting(true);
    const result = await duplicate(id);
    setIsSubmitting(false);

    if (result.success) {
      setSuccessMessage(`Wordset duplicated successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      onWordsetUpdated?.();
    }
  };

  const handleExportSingle = async (id: number) => {
    const result = await exportCSV([id]);

    if (result.success && result.data) {
      const wordsetResult = await getWordsetById(id);
      const wordsetName =
        wordsetResult.success && wordsetResult.data
          ? wordsetResult.data.name.toLowerCase().replace(/\s+/g, '-')
          : 'wordset';

      const blob = new Blob([result.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${wordsetName}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleSave = async (data: WordsetCreateInput | WordsetUpdateInput) => {
    setIsSubmitting(true);
    let result;

    if (currentView === 'create') {
      result = await create(data as WordsetCreateInput);
    } else if (currentView === 'edit' && editingId) {
      result = await update(editingId, data);
    }

    setIsSubmitting(false);

    if (result?.success) {
      setSuccessMessage(
        currentView === 'create' ? 'Wordset created successfully!' : 'Wordset updated successfully!'
      );
      setCurrentView('list');
      setTimeout(() => setSuccessMessage(null), 3000);
      onWordsetUpdated?.();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;

    setIsSubmitting(true);
    const result = await remove(deletingId);
    setIsSubmitting(false);

    if (result.success) {
      setSuccessMessage('Wordset deleted successfully!');
      setCurrentView('list');
      setDeletingId(null);
      setTimeout(() => setSuccessMessage(null), 3000);
      onWordsetUpdated?.();
    }
  };

  const handleCancel = () => {
    setCurrentView('list');
    setEditingId(null);
    setDeletingId(null);
    clearError();
  };

  const editingWordset = editingId ? wordsets.find(ws => ws.id === editingId) : undefined;
  const deletingWordset = deletingId ? wordsets.find(ws => ws.id === deletingId) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
          <h2 className="text-xl font-bold text-gray-900">
            {currentView === 'list' && 'Manage Word Lists'}
            {currentView === 'create' && 'Create New Wordset'}
            {currentView === 'edit' && 'Edit Wordset'}
            {currentView === 'import-export' && 'Import / Export'}
            {currentView === 'delete-confirm' && 'Delete Wordset'}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-500 hover:text-gray-700"
            aria-label="Close"
            data-testid="close-manager"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-6">
          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-green-800">
              ✅ {successMessage}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-800">
              ⚠️ {error}
            </div>
          )}

          {/* List View */}
          {currentView === 'list' && (
            <div className="space-y-6">
              {/* Search and actions */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="🔍 Search wordsets..."
                  className="flex-1 rounded-lg border border-gray-300 p-2 text-sm focus:border-transparent focus:ring-2 focus:ring-purple-500"
                  data-testid="search-wordsets-input"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCreate}
                  className="btn btn-primary"
                  data-testid="new-wordset-button"
                >
                  + Create New Wordset
                </button>
                <button
                  onClick={() => setCurrentView('import-export')}
                  className="btn btn-secondary"
                >
                  📥 Import CSV
                </button>
                <button
                  onClick={async () => {
                    const result = await exportCSV();
                    if (result.success && result.data) {
                      const blob = new Blob([result.data], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `bleep-wordsets-${new Date().toISOString().split('T')[0]}.csv`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                  className="btn btn-secondary"
                >
                  📤 Export All CSV
                </button>
              </div>

              {/* Wordsets list */}
              <WordsetList
                wordsets={wordsets}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onExport={handleExportSingle}
                emptyMessage={
                  searchQuery
                    ? `No wordsets match "${searchQuery}"`
                    : 'No wordsets yet. Create your first wordset!'
                }
              />
            </div>
          )}

          {/* Create/Edit View */}
          {(currentView === 'create' || currentView === 'edit') && (
            <WordsetEditor
              wordset={editingWordset}
              onSave={handleSave}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
            />
          )}

          {/* Import/Export View */}
          {currentView === 'import-export' && (
            <WordsetImportExport
              onImport={importCSV}
              onExportAll={exportCSV}
              onClose={handleCancel}
            />
          )}

          {/* Delete Confirmation */}
          {currentView === 'delete-confirm' && deletingWordset && (
            <div className="space-y-4">
              <div className="rounded border border-orange-200 bg-orange-50 p-4">
                <p className="mb-2 text-lg font-semibold text-orange-900">
                  ⚠️ Are you sure you want to delete &quot;{deletingWordset.name}&quot;?
                </p>
                <p className="text-sm text-orange-800">
                  This wordset contains {deletingWordset.words.length} word(s) and was created on{' '}
                  {new Date(deletingWordset.createdAt).toLocaleDateString()}.
                </p>
                <p className="mt-2 font-semibold text-orange-900">
                  ⚠️ This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmDelete}
                  disabled={isSubmitting}
                  className="btn flex-1 bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="confirm-delete-button"
                >
                  {isSubmitting ? 'Deleting...' : '🗑 Delete Permanently'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="btn flex-1 bg-gray-500 text-white hover:bg-gray-600"
                  data-testid="cancel-delete-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
