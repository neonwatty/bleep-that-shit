'use client';

import { useState } from 'react';
import { useWordsets } from '@/lib/hooks/useWordsets';
import type { Wordset } from '@/lib/types/wordset';

interface WordsetSelectorProps {
  onApplyWordsets: (wordsetIds: number[]) => void;
  onManageClick?: () => void;
  activeWordsets?: Set<number>;
  onRemoveWordset?: (wordsetId: number) => void;
}

export function WordsetSelector({
  onApplyWordsets,
  onManageClick,
  activeWordsets = new Set(),
  onRemoveWordset,
}: WordsetSelectorProps) {
  const { wordsets, isInitialized } = useWordsets();
  const [selectedWordsets, setSelectedWordsets] = useState<Set<number>>(new Set());

  const handleToggleSelection = (wordsetId: number) => {
    const newSelection = new Set(selectedWordsets);
    if (newSelection.has(wordsetId)) {
      newSelection.delete(wordsetId);
    } else {
      newSelection.add(wordsetId);
    }
    setSelectedWordsets(newSelection);
  };

  const handleApply = () => {
    if (selectedWordsets.size > 0) {
      onApplyWordsets(Array.from(selectedWordsets));
      setSelectedWordsets(new Set()); // Clear selection after applying
    }
  };

  const activeWordsetsArray = Array.from(activeWordsets)
    .map(id => wordsets.find(ws => ws.id === id))
    .filter((ws): ws is Wordset => ws !== undefined);

  if (!isInitialized) {
    return (
      <div className="wordset-selector rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-gray-600">Loading wordsets...</p>
      </div>
    );
  }

  return (
    <div className="wordset-selector rounded-lg border border-purple-200 bg-purple-50 p-4">
      <h3 className="mb-3 text-sm font-bold text-gray-700 uppercase">
        Quick Apply Wordsets (Optional)
      </h3>

      {wordsets.length === 0 ? (
        <div className="text-sm text-gray-600">
          No wordsets available.{' '}
          {onManageClick && (
            <button
              onClick={onManageClick}
              className="font-medium text-purple-600 hover:text-purple-800 hover:underline"
            >
              Create your first wordset
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Wordset Selection */}
          <div className="mb-3 max-h-48 space-y-2 overflow-y-auto">
            {wordsets.map(wordset => (
              <label
                key={wordset.id}
                className="flex cursor-pointer items-center gap-3 rounded p-2 transition-colors hover:bg-purple-100"
              >
                <input
                  type="checkbox"
                  checked={selectedWordsets.has(wordset.id!)}
                  onChange={() => handleToggleSelection(wordset.id!)}
                  className="h-5 w-5 cursor-pointer"
                  data-testid={`wordset-checkbox-${wordset.id}`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {wordset.color && (
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: wordset.color }}
                        aria-label="Wordset color"
                      />
                    )}
                    <span className="font-semibold text-gray-900">{wordset.name}</span>
                    <span className="text-xs text-gray-500">({wordset.words.length} words)</span>
                    {wordset.isDefault && (
                      <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs font-semibold text-yellow-800">
                        DEFAULT
                      </span>
                    )}
                  </div>
                  {wordset.description && (
                    <p className="mt-0.5 text-xs text-gray-600">{wordset.description}</p>
                  )}
                </div>
              </label>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleApply}
              disabled={selectedWordsets.size === 0}
              className="btn btn-sm btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="apply-wordsets-button"
            >
              Apply Selected ({selectedWordsets.size})
            </button>
            {onManageClick && (
              <button onClick={onManageClick} className="btn btn-sm btn-secondary">
                Manage Wordsets
              </button>
            )}
          </div>
        </>
      )}

      {/* Active Wordsets Display */}
      {activeWordsetsArray.length > 0 && (
        <div className="mt-4 border-t border-purple-200 pt-3">
          <p className="mb-2 text-xs font-semibold text-gray-700 uppercase">
            Active Wordsets ({activeWordsetsArray.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {activeWordsetsArray.map(wordset => (
              <span
                key={wordset.id}
                className="inline-flex items-center gap-2 rounded-full border border-purple-300 bg-white px-3 py-1 text-sm"
              >
                {wordset.color && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: wordset.color }}
                    aria-label="Wordset color"
                  />
                )}
                <span className="font-medium">{wordset.name}</span>
                <span className="text-xs text-gray-500">({wordset.words.length})</span>
                {onRemoveWordset && (
                  <button
                    onClick={() => onRemoveWordset(wordset.id!)}
                    className="ml-1 text-gray-500 hover:text-red-600"
                    aria-label={`Remove ${wordset.name}`}
                    data-testid={`remove-wordset-${wordset.id}`}
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
