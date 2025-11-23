import { useState } from 'react';
import { TranscriptReview } from '@/components/TranscriptReview';
import { MatchedWordsDisplay } from '@/components/MatchedWordsDisplay';
import { WordsetSelector } from '@/components/wordsets/WordsetSelector';
import { WordsetManager } from '@/components/wordsets/WordsetManager';
import type { TranscriptionResult, MatchedWord } from '../hooks/useBleepState';

interface ReviewMatchTabProps {
  transcriptionResult: TranscriptionResult | null;
  wordsToMatch: string;
  matchMode: {
    exact: boolean;
    partial: boolean;
    fuzzy: boolean;
  };
  fuzzyDistance: number;
  censoredWordIndices: Set<number>;
  searchQuery: string;
  transcriptExpanded: boolean;
  matchedWords: MatchedWord[];
  activeWordsets?: Set<number>;
  wordSource?: Map<number, 'manual' | number>;
  onWordsToMatchChange: (words: string) => void;
  onMatchModeChange: (mode: { exact: boolean; partial: boolean; fuzzy: boolean }) => void;
  onFuzzyDistanceChange: (distance: number) => void;
  onSearchQueryChange: (query: string) => void;
  onTranscriptExpandedChange: (expanded: boolean) => void;
  onMatch: () => void;
  onToggleWord: (index: number) => void;
  onClearAll: () => void;
  onApplyWordsets?: (wordsetIds: number[]) => void;
  onRemoveWordset?: (wordsetId: number) => void;
}

export function ReviewMatchTab({
  transcriptionResult,
  wordsToMatch,
  matchMode,
  fuzzyDistance,
  censoredWordIndices,
  searchQuery,
  transcriptExpanded,
  matchedWords,
  activeWordsets,
  wordSource: _wordSource,
  onWordsToMatchChange,
  onMatchModeChange,
  onFuzzyDistanceChange,
  onSearchQueryChange,
  onTranscriptExpandedChange,
  onMatch,
  onToggleWord,
  onClearAll,
  onApplyWordsets,
  onRemoveWordset,
}: ReviewMatchTabProps) {
  const [showWordsetManager, setShowWordsetManager] = useState(false);

  return (
    <div className="space-y-6">
      <section className="border-l-4 border-purple-500 pl-3 sm:pl-4">
        <div className="mb-2 flex items-center">
          <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-base font-bold text-white">
            4
          </span>
          <h2 className="font-inter text-lg font-extrabold text-black uppercase sm:text-xl md:text-2xl">
            Review & Select Words to Bleep
          </h2>
        </div>

        {/* Wordset Selector */}
        {onApplyWordsets && (
          <>
            <div className="mb-4">
              <WordsetSelector
                onApplyWordsets={onApplyWordsets}
                onManageClick={() => setShowWordsetManager(true)}
                activeWordsets={activeWordsets}
                onRemoveWordset={onRemoveWordset}
              />
            </div>

            {/* OR Separator */}
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-gray-50 px-4 font-semibold text-gray-500">OR</span>
              </div>
            </div>
          </>
        )}

        {/* Manual Pattern Matching Controls */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-gray-700 uppercase">
            Manual Pattern Matching (Optional)
          </h3>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold">
              Words to match (comma-separated)
            </label>
            <input
              data-testid="words-to-match-input"
              type="text"
              value={wordsToMatch}
              onChange={e => onWordsToMatchChange(e.target.value)}
              placeholder="e.g., bad, word, curse"
              className="min-h-touch w-full rounded-lg border border-gray-300 p-3 text-base focus:border-transparent focus:ring-2 focus:ring-blue-500 sm:p-2"
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold">Matching modes</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="-m-2 flex cursor-pointer items-center rounded p-2 hover:bg-gray-50">
                <input
                  data-testid="exact-match-checkbox"
                  type="checkbox"
                  checked={matchMode.exact}
                  onChange={e => onMatchModeChange({ ...matchMode, exact: e.target.checked })}
                  className="mr-3 h-5 w-5"
                />
                Exact match
              </label>
              <label className="-m-2 flex cursor-pointer items-center rounded p-2 hover:bg-gray-50">
                <input
                  data-testid="partial-match-checkbox"
                  type="checkbox"
                  checked={matchMode.partial}
                  onChange={e => onMatchModeChange({ ...matchMode, partial: e.target.checked })}
                  className="mr-3 h-5 w-5"
                />
                Partial match
              </label>
              <label className="-m-2 flex cursor-pointer items-center rounded p-2 hover:bg-gray-50">
                <input
                  data-testid="fuzzy-match-checkbox"
                  type="checkbox"
                  checked={matchMode.fuzzy}
                  onChange={e => onMatchModeChange({ ...matchMode, fuzzy: e.target.checked })}
                  className="mr-3 h-5 w-5"
                />
                Fuzzy match
              </label>
            </div>

            {matchMode.fuzzy && (
              <div className="mt-2">
                <label className="text-sm">Fuzzy distance: {fuzzyDistance}</label>
                <input
                  data-testid="fuzzy-distance-slider"
                  type="range"
                  min="1"
                  max="3"
                  value={fuzzyDistance}
                  onChange={e => onFuzzyDistanceChange(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              data-testid="run-matching-button"
              onClick={onMatch}
              disabled={!transcriptionResult || !wordsToMatch}
              className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Match Words
            </button>
            {censoredWordIndices.size > 0 && (
              <button
                data-testid="clear-all-button"
                onClick={onClearAll}
                className="btn bg-gray-500 text-white hover:bg-gray-600"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Interactive Transcript */}
        {transcriptionResult && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
            <TranscriptReview
              chunks={transcriptionResult.chunks}
              censoredIndices={censoredWordIndices}
              onToggleWord={onToggleWord}
              searchQuery={searchQuery}
              onSearchChange={onSearchQueryChange}
              isExpanded={transcriptExpanded}
              onToggleExpanded={() => onTranscriptExpandedChange(!transcriptExpanded)}
            />
          </div>
        )}

        {/* Matched Words Display */}
        <MatchedWordsDisplay matchedWords={matchedWords} isVisible={matchedWords.length > 0} />

        {matchedWords.length > 0 && (
          <div className="mt-4 rounded border-l-4 border-yellow-400 bg-yellow-50 p-3 text-sm">
            <p className="text-yellow-900">
              ✅ <strong>{matchedWords.length} words selected!</strong> Continue to Bleep & Download
              tab to configure and apply bleeps.
            </p>
          </div>
        )}
      </section>

      {/* Wordset Manager Modal */}
      {showWordsetManager && (
        <WordsetManager
          onClose={() => setShowWordsetManager(false)}
          onWordsetUpdated={() => {
            // Optionally trigger a refresh or notification
          }}
        />
      )}
    </div>
  );
}
