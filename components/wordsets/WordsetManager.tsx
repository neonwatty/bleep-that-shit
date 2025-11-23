'use client';

import { WordsetManagerContent } from './WordsetManagerContent';

interface WordsetManagerProps {
  onClose: () => void;
  onWordsetUpdated?: () => void;
}

export function WordsetManager({ onClose, onWordsetUpdated }: WordsetManagerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
          <h2 className="text-xl font-bold text-gray-900">Manage Word Lists</h2>
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
          <WordsetManagerContent onWordsetUpdated={onWordsetUpdated} />
        </div>
      </div>
    </div>
  );
}
