import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MatchedWordsDisplay } from './MatchedWordsDisplay';

describe('MatchedWordsDisplay', () => {
  it('is hidden when no words matched', () => {
    const { container } = render(<MatchedWordsDisplay matchedWords={[]} isVisible={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('is visible when words are matched', () => {
    const words = [{ word: 'bad', start: 1.0, end: 1.5 }];
    render(<MatchedWordsDisplay matchedWords={words} isVisible={true} />);

    expect(screen.getByText(/Selected Words/)).toBeInTheDocument();
    expect(screen.getByText('bad')).toBeInTheDocument();
  });

  it('displays correct word count', () => {
    const words = [
      { word: 'bad', start: 1.0, end: 1.5 },
      { word: 'worse', start: 2.0, end: 2.5 },
      { word: 'worst', start: 3.0, end: 3.5 },
    ];
    render(<MatchedWordsDisplay matchedWords={words} isVisible={true} />);

    expect(screen.getByText(/Selected Words \(3\)/)).toBeInTheDocument();
  });

  it('shows word chips with timestamps', () => {
    const words = [{ word: 'bad', start: 1.23, end: 2.45 }];
    render(<MatchedWordsDisplay matchedWords={words} isVisible={true} />);

    expect(screen.getByText('bad')).toBeInTheDocument();
    expect(screen.getByText(/1.23s - 2.45s/)).toBeInTheDocument();
  });

  it('displays multiple words', () => {
    const words = [
      { word: 'bad', start: 1.0, end: 1.5 },
      { word: 'worse', start: 2.0, end: 2.5 },
    ];
    render(<MatchedWordsDisplay matchedWords={words} isVisible={true} />);

    expect(screen.getByText('bad')).toBeInTheDocument();
    expect(screen.getByText('worse')).toBeInTheDocument();
  });
});
