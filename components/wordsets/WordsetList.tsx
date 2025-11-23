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
  // Separate default and custom wordsets
  const defaultWordsets = wordsets.filter(ws => ws.isDefault);
  const customWordsets = wordsets.filter(ws => !ws.isDefault);

  return (
    <div className="space-y-6">
      {/* Custom Wordsets */}
      {customWordsets.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase text-gray-700">
            Your Wordsets ({customWordsets.length})
          </h3>
          <div className="space-y-3">
            {customWordsets.map(wordset => (
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

      {/* Default Wordsets */}
      {defaultWordsets.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase text-gray-700">
            Default Wordsets (Read-only)
          </h3>
          <div className="space-y-3">
            {defaultWordsets.map(wordset => (
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
