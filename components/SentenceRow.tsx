'use client';

import { WordWrapper } from './WordWrapper';

interface SentenceRowProps {
  words: Array<{
    text: string;
    index: number;
    start: number;
    end: number;
  }>;
  censoredIndices: Set<number>;
  onToggleWord: (index: number) => void;
  searchQuery?: string;
}

export function SentenceRow({
  words,
  censoredIndices,
  onToggleWord,
  searchQuery = '',
}: SentenceRowProps) {
  if (words.length === 0) {
    return null;
  }

  const formatTimestamp = (seconds: number): string => {
    return seconds.toFixed(1) + 's';
  };

  const startTime = words[0].start;
  const endTime = words[words.length - 1].end;

  const isWordHighlighted = (word: string): boolean => {
    if (!searchQuery) return false;
    return word.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="sentence">
      <div className="sentence-timestamp">
        {formatTimestamp(startTime)} - {formatTimestamp(endTime)}
      </div>
      <div className="sentence-words">
        {words.map(word => (
          <WordWrapper
            key={word.index}
            word={word.text}
            index={word.index}
            start={word.start}
            end={word.end}
            isCensored={censoredIndices.has(word.index)}
            isHighlighted={isWordHighlighted(word.text)}
            onClick={onToggleWord}
          />
        ))}
      </div>
    </div>
  );
}
