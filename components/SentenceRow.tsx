'use client';

import { WordWrapper } from './WordWrapper';
import { useWordsets } from '@/lib/hooks/useWordsets';

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
  wordSource?: Map<number, 'manual' | number>;
  activeWordsets?: Set<number>;
}

export function SentenceRow({
  words,
  censoredIndices,
  onToggleWord,
  searchQuery = '',
  wordSource,
  activeWordsets,
}: SentenceRowProps) {
  const { wordsets } = useWordsets();
  if (words.length === 0) {
    return null;
  }

  const formatTimestamp = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) {
      return 'N/A';
    }
    return seconds.toFixed(1) + 's';
  };

  const startTime = words[0].start;
  const endTime = words[words.length - 1].end;

  const isWordHighlighted = (word: string): boolean => {
    if (!searchQuery) return false;
    return word.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const getWordsetColor = (wordIndex: number): string | undefined => {
    if (!wordSource || !activeWordsets) return undefined;

    const source = wordSource.get(wordIndex);
    if (!source || source === 'manual') return undefined;

    // Only show color if the wordset is active
    if (!activeWordsets.has(source)) return undefined;

    const wordset = wordsets.find(ws => ws.id === source);
    return wordset?.color;
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
            wordsetColor={getWordsetColor(word.index)}
          />
        ))}
      </div>
    </div>
  );
}
