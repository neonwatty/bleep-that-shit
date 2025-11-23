'use client';

import { WordsetCard } from './WordsetCard';
import type { Wordset } from '@/lib/types/wordset';

interface WordsetListProps {
  wordsets: Wordset[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
  onExport: (id: number) => void;
  onView?: (id: number) => void;
  emptyMessage?: string;
}

export function WordsetList({
  wordsets,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  onView,
  emptyMessage = 'No wordsets found.',
}: WordsetListProps) {
  return (
    <div className="space-y-6">
      {/* Wordsets */}
      {wordsets.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-gray-700 uppercase">
            Your Word Lists ({wordsets.length})
          </h3>
          <div className="space-y-3">
            {wordsets.map(wordset => (
              <WordsetCard
                key={wordset.id}
                wordset={wordset}
                onEdit={onEdit}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onExport={onExport}
                onView={onView}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {wordsets.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-gray-600">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
