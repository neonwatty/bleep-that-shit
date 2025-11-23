'use client';

import { useState, useEffect } from 'react';
import type { Wordset, WordsetCreateInput, WordsetUpdateInput } from '@/lib/types/wordset';

interface WordsetEditorProps {
  wordset?: Wordset; // If editing existing wordset
  onSave: (data: WordsetCreateInput | WordsetUpdateInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function WordsetEditor({ wordset, onSave, onCancel, isSubmitting }: WordsetEditorProps) {
  const isEditing = !!wordset;

  // Form state
  const [name, setName] = useState(wordset?.name || '');
  const [description, setDescription] = useState(wordset?.description || '');
  const [words, setWords] = useState<string[]>(wordset?.words || []);
  const [matchMode, setMatchMode] = useState(
    wordset?.matchMode || { exact: true, partial: false, fuzzy: false }
  );
  const [fuzzyDistance, setFuzzyDistance] = useState(wordset?.fuzzyDistance || 1);
  const [color, setColor] = useState(wordset?.color || '#3B82F6');

  // Word input state
  const [newWord, setNewWord] = useState('');
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Initialize bulk text when entering bulk edit mode
  useEffect(() => {
    if (bulkEditMode) {
      setBulkText(words.join('\n'));
    }
  }, [bulkEditMode, words]);

  const handleAddWord = () => {
    const trimmed = newWord.trim().toLowerCase();
    if (trimmed && !words.includes(trimmed)) {
      setWords([...words, trimmed]);
      setNewWord('');
    }
  };

  const handleRemoveWord = (word: string) => {
    setWords(words.filter(w => w !== word));
  };

  const handleBulkEditDone = () => {
    const newWords = bulkText
      .split(/[\n,]/)
      .map(w => w.trim().toLowerCase())
      .filter(Boolean);
    const uniqueWords = Array.from(new Set(newWords));
    setWords(uniqueWords);
    setBulkEditMode(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: WordsetCreateInput | WordsetUpdateInput = {
      name,
      description: description || undefined,
      words,
      matchMode,
      fuzzyDistance,
      color: color || undefined,
      isDefault: false,
    };

    await onSave(data);
  };

  const filteredWords = searchFilter
    ? words.filter(w => w.includes(searchFilter.toLowerCase()))
    : words;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          maxLength={100}
          placeholder="e.g., My Custom Wordset"
          className="min-h-touch w-full rounded-lg border border-gray-300 p-3 text-base focus:border-transparent focus:ring-2 focus:ring-purple-500 sm:p-2"
          data-testid="wordset-name-input"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="e.g., Words I want to censor in my videos"
          className="min-h-touch w-full rounded-lg border border-gray-300 p-3 text-base focus:border-transparent focus:ring-2 focus:ring-purple-500 sm:p-2"
          data-testid="wordset-description-input"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700">Color Tag</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="h-10 w-20 cursor-pointer rounded border border-gray-300"
            data-testid="color-picker"
          />
          <span className="text-sm text-gray-600">Preview:</span>
          <span
            className="h-6 w-24 rounded"
            style={{ backgroundColor: color }}
            aria-label="Color preview"
          />
        </div>
      </div>

      {/* Words Management */}
      <div className="border-t border-gray-200 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Manage Words ({words.length})</h3>
          <button
            type="button"
            onClick={() => setBulkEditMode(!bulkEditMode)}
            className="text-sm font-medium text-purple-600 hover:text-purple-800"
          >
            {bulkEditMode ? '← Back to List' : 'Bulk Edit'}
          </button>
        </div>

        {!bulkEditMode ? (
          <>
            {/* Add new word */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWord}
                  onChange={e => setNewWord(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddWord();
                    }
                  }}
                  placeholder="Type a word and press Enter"
                  className="min-h-touch flex-1 rounded-lg border border-gray-300 p-3 text-base focus:border-transparent focus:ring-2 focus:ring-purple-500 sm:p-2"
                  data-testid="new-word-input"
                />
                <button
                  type="button"
                  onClick={handleAddWord}
                  disabled={!newWord.trim()}
                  className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="add-word-button"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Search/filter */}
            {words.length > 5 && (
              <div className="mb-3">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="🔍 Filter words..."
                  className="w-full rounded border border-gray-300 p-2 text-sm"
                />
              </div>
            )}

            {/* Words list */}
            <div className="max-h-64 space-y-1 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-2">
              {filteredWords.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-500">
                  {searchFilter ? 'No words match your filter' : 'No words yet. Add words above.'}
                </p>
              ) : (
                filteredWords.map(word => (
                  <div
                    key={word}
                    className="flex items-center justify-between rounded bg-white p-2 hover:bg-gray-100"
                  >
                    <span className="text-sm text-gray-900">{word}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWord(word)}
                      className="text-sm font-medium text-red-600 hover:text-red-800"
                      data-testid="remove-word-button"
                    >
                      ✕ Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* Bulk edit mode */
          <div>
            <p className="mb-2 text-sm text-gray-600">
              💡 Enter one word per line, or separate with commas
            </p>
            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              rows={12}
              className="w-full rounded-lg border border-gray-300 p-3 font-mono text-sm focus:border-transparent focus:ring-2 focus:ring-purple-500"
              data-testid="bulk-edit-textarea"
            />
            <button type="button" onClick={handleBulkEditDone} className="btn btn-secondary mt-2">
              ✓ Done Editing
            </button>
          </div>
        )}
      </div>

      {/* Match Settings */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="mb-3 text-lg font-bold text-gray-900">Match Settings</h3>

        <div className="mb-4 space-y-2">
          <label className="flex cursor-pointer items-center rounded p-2 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={matchMode.exact}
              onChange={e => setMatchMode({ ...matchMode, exact: e.target.checked })}
              className="mr-3 h-5 w-5"
              data-testid="exact-match-toggle"
            />
            <div>
              <span className="font-medium">Exact match</span>
              <p className="text-sm text-gray-600">
                Matches whole words only (e.g., "hell" matches "hell" but not "hello")
              </p>
            </div>
          </label>

          <label className="flex cursor-pointer items-center rounded p-2 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={matchMode.partial}
              onChange={e => setMatchMode({ ...matchMode, partial: e.target.checked })}
              className="mr-3 h-5 w-5"
              data-testid="partial-match-toggle"
            />
            <div>
              <span className="font-medium">Partial match</span>
              <p className="text-sm text-gray-600">
                Matches words that contain the text (e.g., "hell" matches "hello")
              </p>
            </div>
          </label>

          <label className="flex cursor-pointer items-center rounded p-2 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={matchMode.fuzzy}
              onChange={e => setMatchMode({ ...matchMode, fuzzy: e.target.checked })}
              className="mr-3 h-5 w-5"
              data-testid="fuzzy-match-toggle"
            />
            <div>
              <span className="font-medium">Fuzzy match</span>
              <p className="text-sm text-gray-600">
                Matches similar words (e.g., "hell" might match "hall")
              </p>
            </div>
          </label>
        </div>

        {matchMode.fuzzy && (
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Fuzzy Distance: {fuzzyDistance}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={fuzzyDistance}
              onChange={e => setFuzzyDistance(Number(e.target.value))}
              className="h-2 w-full cursor-pointer rounded-lg sm:max-w-xs"
              data-testid="fuzzy-distance-input"
            />
            <div className="mt-1 flex w-full justify-between text-xs text-gray-600 sm:max-w-xs">
              <span>Strict (1)</span>
              <span>Loose (5)</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 border-t border-gray-200 pt-6">
        <button
          type="submit"
          disabled={isSubmitting || !name.trim() || words.length === 0}
          className="btn btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="save-wordset-button"
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Wordset'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="btn bg-gray-500 text-white hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="cancel-button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
