'use client';

import type { Wordset } from '@/lib/types/wordset';

interface WordsetCardProps {
  wordset: Wordset;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
  onExport: (id: number) => void;
  onView?: (id: number) => void;
}

export function WordsetCard({
  wordset,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onView,
}: WordsetCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  const getMatchModeLabel = () => {
    const modes = [];
    if (wordset.matchMode.exact) modes.push('Exact');
    if (wordset.matchMode.partial) modes.push('Partial');
    if (wordset.matchMode.fuzzy) modes.push(`Fuzzy (${wordset.fuzzyDistance})`);
    return modes.join(', ') || 'No modes';
  };

  const getWordPreview = () => {
    const previewCount = 5;
    const preview = wordset.words.slice(0, previewCount).join(', ');
    const remaining = wordset.words.length - previewCount;
    return remaining > 0 ? `${preview} +${remaining} more...` : preview;
  };

  return (
    <div
      className="wordset-card rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
      data-wordset-id={wordset.id}
      data-wordset-name={wordset.name}
    >
      {/* Header with color indicator and name */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {wordset.color && (
            <span
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: wordset.color }}
              aria-label="Wordset color"
            />
          )}
          <h3 className="text-lg font-bold text-gray-900">{wordset.name}</h3>
          {wordset.isDefault && (
            <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
              DEFAULT
            </span>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        <span className="font-medium">
          {wordset.words.length} word{wordset.words.length !== 1 ? 's' : ''}
        </span>
        <span>|</span>
        <span>{getMatchModeLabel()}</span>
        <span>|</span>
        <span className="created-date">Created: {formatDate(wordset.createdAt)}</span>
      </div>

      {/* Description */}
      {wordset.description && (
        <p className="mb-3 text-sm text-gray-700">{wordset.description}</p>
      )}

      {/* Word preview */}
      <div className="mb-4 rounded border border-gray-200 bg-gray-50 p-2">
        <p className="text-xs font-semibold text-gray-500">Preview:</p>
        <p className="mt-1 text-sm text-gray-700">{getWordPreview()}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {onView && (
          <button
            onClick={() => onView(wordset.id!)}
            className="flex items-center gap-1 rounded bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            data-testid="view-button"
          >
            👁 View
          </button>
        )}
        <button
          onClick={() => onEdit(wordset.id!)}
          className="flex items-center gap-1 rounded bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200"
          data-testid="edit-button"
        >
          ✏️ Edit
        </button>
        <button
          onClick={() => onDuplicate(wordset.id!)}
          className="flex items-center gap-1 rounded bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-200"
          data-testid="duplicate-button"
        >
          📋 Duplicate
        </button>
        <button
          onClick={() => onExport(wordset.id!)}
          className="flex items-center gap-1 rounded bg-green-100 px-3 py-1 text-sm font-medium text-green-700 transition-colors hover:bg-green-200"
          data-testid="export-button"
        >
          📤 Export
        </button>
        {!wordset.isDefault && (
          <button
            onClick={() => onDelete(wordset.id!)}
            className="flex items-center gap-1 rounded bg-red-100 px-3 py-1 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
            data-testid="delete-button"
          >
            🗑 Delete
          </button>
        )}
        {wordset.isDefault && (
          <span className="flex items-center gap-1 rounded bg-gray-100 px-3 py-1 text-sm font-medium text-gray-500">
            🔒 Cannot Delete
          </span>
        )}
      </div>
    </div>
  );
}
