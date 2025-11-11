'use client';

interface MatchedWordsDisplayProps {
  matchedWords: Array<{ word: string; start: number; end: number }>;
  isVisible: boolean;
}

export function MatchedWordsDisplay({ matchedWords, isVisible }: MatchedWordsDisplayProps) {
  if (!isVisible || matchedWords.length === 0) {
    return null;
  }

  const formatTimestamp = (seconds: number): string => {
    return seconds.toFixed(2) + 's';
  };

  return (
    <div className="matched-words-display mt-6 rounded-lg border border-pink-200 bg-pink-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">Selected Words ({matchedWords.length})</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {matchedWords.map((match, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-white px-3 py-1 text-sm"
          >
            <span className="font-medium text-pink-900">{match.word}</span>
            <span className="text-xs text-gray-500">
              {formatTimestamp(match.start)} - {formatTimestamp(match.end)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
