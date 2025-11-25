'use client';

import { useWordsets } from '@/lib/hooks/useWordsets';

interface MatchedWord {
  word: string;
  start: number;
  end: number;
  source?: 'manual' | number;
}

interface MatchedWordsDisplayProps {
  matchedWords: MatchedWord[];
  isVisible: boolean;
}

export function MatchedWordsDisplay({ matchedWords, isVisible }: MatchedWordsDisplayProps) {
  const { wordsets } = useWordsets();

  if (!isVisible || matchedWords.length === 0) {
    return null;
  }

  const formatTimestamp = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) {
      return 'N/A';
    }
    return seconds.toFixed(2) + 's';
  };

  const getSourceColor = (source?: 'manual' | number): string => {
    if (!source || source === 'manual') {
      return '#EC4899'; // Pink for manual selections
    }
    const wordset = wordsets.find(ws => ws.id === source);
    return wordset?.color || '#EC4899';
  };

  const getSourceName = (source?: 'manual' | number): string => {
    if (!source || source === 'manual') {
      return 'Manual';
    }
    const wordset = wordsets.find(ws => ws.id === source);
    return wordset?.name || 'Unknown';
  };

  // Group words by source for legend
  const sourceGroups = new Map<string, { name: string; color: string; count: number }>();
  matchedWords.forEach(match => {
    const sourceName = getSourceName(match.source);
    const sourceColor = getSourceColor(match.source);
    const existing = sourceGroups.get(sourceName);
    if (existing) {
      existing.count++;
    } else {
      sourceGroups.set(sourceName, { name: sourceName, color: sourceColor, count: 1 });
    }
  });

  return (
    <div className="matched-words-display mt-6 rounded-lg border border-pink-200 bg-pink-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">Selected Words ({matchedWords.length})</h3>
      </div>

      {/* Legend */}
      {sourceGroups.size > 1 && (
        <div className="mb-3 flex flex-wrap gap-2 border-b border-pink-200 pb-3">
          {Array.from(sourceGroups.values()).map(source => (
            <div key={source.name} className="flex items-center gap-1.5 text-xs">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: source.color }} />
              <span className="font-medium text-gray-700">
                {source.name} ({source.count})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Word badges */}
      <div className="flex flex-wrap gap-2">
        {matchedWords.map((match, idx) => {
          const color = getSourceColor(match.source);
          return (
            <span
              key={idx}
              className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm"
              style={{ borderColor: color }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
                title={getSourceName(match.source)}
              />
              <span className="font-medium" style={{ color }}>
                {match.word}
              </span>
              <span className="text-xs text-gray-500">
                {formatTimestamp(match.start)} - {formatTimestamp(match.end)}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
