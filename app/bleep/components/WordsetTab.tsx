'use client';

import { WordsetManagerContent } from '@/components/wordsets/WordsetManagerContent';

interface WordsetTabProps {
  onWordsetUpdated?: () => void;
}

export function WordsetTab({ onWordsetUpdated }: WordsetTabProps) {
  return (
    <div className="space-y-4">
      <div className="mb-4 rounded-lg border-l-4 border-purple-500 bg-purple-50 p-4">
        <h3 className="mb-2 text-lg font-semibold text-purple-900">📚 Manage Your Word Lists</h3>
        <p className="text-sm text-purple-800">
          Create, edit, and organize custom word lists (wordsets) that can be quickly applied when
          censoring content. Word lists can be reused across multiple files and shared via CSV
          export/import.
        </p>
      </div>

      <WordsetManagerContent onWordsetUpdated={onWordsetUpdated} />
    </div>
  );
}
