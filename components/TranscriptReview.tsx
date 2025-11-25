'use client';

import { useMemo } from 'react';
import { SentenceRow } from './SentenceRow';
import { TranscriptStats } from './TranscriptStats';
import { groupIntoSentences } from '@/lib/utils/sentenceGrouping';
import { TranscriptChunk } from '@/lib/types/transcript';

interface TranscriptReviewProps {
  chunks: TranscriptChunk[];
  censoredIndices: Set<number>;
  onToggleWord: (index: number) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  wordSource?: Map<number, 'manual' | number>;
  activeWordsets?: Set<number>;
}

export function TranscriptReview({
  chunks,
  censoredIndices,
  onToggleWord,
  searchQuery = '',
  onSearchChange,
  isExpanded = true,
  onToggleExpanded,
  wordSource,
  activeWordsets,
}: TranscriptReviewProps) {
  const sentences = useMemo(() => groupIntoSentences(chunks), [chunks]);

  const filteredSentences = useMemo(() => {
    if (!searchQuery) return sentences;

    return sentences
      .map(sentence => ({
        ...sentence,
        words: sentence.words.filter(word =>
          word.text.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter(sentence => sentence.words.length > 0);
  }, [sentences, searchQuery]);

  if (chunks.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        No transcript available. Upload a file and transcribe it first.
      </div>
    );
  }

  return (
    <div className="transcript-review-container">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onToggleExpanded && (
            <button
              onClick={onToggleExpanded}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
              aria-expanded={isExpanded}
            >
              <svg
                className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              {isExpanded ? 'Collapse' : 'Expand'} Transcript
            </button>
          )}
          <TranscriptStats censoredCount={censoredIndices.size} totalCount={chunks.length} />
        </div>
      </div>

      {isExpanded && (
        <div className="transcript-content">
          {/* Search input */}
          {onSearchChange && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold">Search Transcript</label>
              <input
                data-testid="search-transcript-input"
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Search for words in transcript..."
                className="min-h-touch w-full rounded-lg border border-gray-300 p-3 text-base focus:border-transparent focus:ring-2 focus:ring-blue-500 sm:p-2"
              />
            </div>
          )}

          {filteredSentences.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {searchQuery ? 'No words match your search query.' : 'No transcript available.'}
            </div>
          ) : (
            <div className="transcript-text">
              {filteredSentences.map((sentence, idx) => (
                <SentenceRow
                  key={idx}
                  words={sentence.words}
                  censoredIndices={censoredIndices}
                  onToggleWord={onToggleWord}
                  searchQuery={searchQuery}
                  wordSource={wordSource}
                  activeWordsets={activeWordsets}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
