'use client';

import { useState, useRef } from 'react';

interface WordWrapperProps {
  word: string;
  index: number;
  start: number;
  end: number;
  isCensored: boolean;
  isHighlighted?: boolean;
  onClick: (index: number) => void;
  wordsetColor?: string;
}

export function WordWrapper({
  word,
  index,
  start,
  end,
  isCensored,
  isHighlighted = false,
  onClick,
  wordsetColor,
}: WordWrapperProps) {
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const wordRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  const formatTimestamp = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) {
      return 'N/A';
    }
    return seconds.toFixed(2) + 's';
  };

  const handleMouseEnter = () => {
    if (wordRef.current) {
      const rect = wordRef.current.getBoundingClientRect();

      // Position tooltip above the word
      const left = rect.left + rect.width / 2;
      const top = rect.top - 8;

      setTooltipPosition({ top, left });
    }
  };

  const wordsetHighlightClass = wordsetColor ? 'wordset-highlighted' : '';

  return (
    <span
      ref={wordRef}
      className={`word-wrapper ${isCensored ? 'censored' : 'uncensored'} ${isHighlighted ? 'highlighted' : ''} ${wordsetHighlightClass}`}
      onClick={() => onClick(index)}
      onMouseEnter={handleMouseEnter}
      role="button"
      aria-pressed={isCensored}
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(index);
        }
      }}
      style={
        wordsetColor
          ? {
              borderBottom: `2px solid ${wordsetColor}`,
              backgroundColor: `${wordsetColor}20`, // 20 is for 12.5% opacity
            }
          : undefined
      }
    >
      <span className="word-text">{word}</span>
      <span
        ref={tooltipRef}
        className="timestamp"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
      >
        {formatTimestamp(start)} - {formatTimestamp(end)}
      </span>
    </span>
  );
}
