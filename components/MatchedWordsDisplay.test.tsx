import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MatchedWordsDisplay } from './MatchedWordsDisplay';

// Mock useWordsets hook
vi.mock('@/lib/hooks/useWordsets', () => ({
  useWordsets: () => ({
    wordsets: [
      {
        id: 1,
        name: 'Profanity',
        color: '#EF4444',
        words: ['bad', 'worse'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        name: 'Brands',
        color: '#3B82F6',
        words: ['nike', 'adidas'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    isInitialized: true,
    error: null,
    searchQuery: '',
    setSearchQuery: vi.fn(),
    clearError: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    duplicate: vi.fn(),
    exportCSV: vi.fn(),
    importCSV: vi.fn(),
    allWordsets: [],
  }),
}));

describe('MatchedWordsDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
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

  describe('source tracking', () => {
    it('displays manual source color for words without source', () => {
      const words = [{ word: 'bad', start: 1.0, end: 1.5 }];
      const { container } = render(<MatchedWordsDisplay matchedWords={words} isVisible={true} />);

      // Manual selections should use pink color (rgb(236, 72, 153) from #EC4899)
      const colorDot = container.querySelector('[style*="background-color"]');
      expect(colorDot).toBeInTheDocument();
      expect(colorDot?.getAttribute('style')).toMatch(/rgb\(236,\s*72,\s*153\)/);
    });

    it('displays wordset color for words with wordset source', () => {
      const words = [{ word: 'bad', start: 1.0, end: 1.5, source: 1 }];
      const { container } = render(<MatchedWordsDisplay matchedWords={words} isVisible={true} />);

      // Wordset 1 (Profanity) should use red color (rgb(239, 68, 68) from #EF4444)
      const colorDot = container.querySelector('[style*="background-color"]');
      expect(colorDot).toBeInTheDocument();
      expect(colorDot?.getAttribute('style')).toMatch(/rgb\(239,\s*68,\s*68\)/);
    });

    it('displays different colors for different wordset sources', () => {
      const words = [
        { word: 'bad', start: 1.0, end: 1.5, source: 1 }, // Profanity (rgb(239, 68, 68))
        { word: 'nike', start: 2.0, end: 2.5, source: 2 }, // Brands (rgb(59, 130, 246))
      ];
      const { container } = render(<MatchedWordsDisplay matchedWords={words} isVisible={true} />);

      const colorDots = container.querySelectorAll('[style*="background-color"]');
      expect(colorDots.length).toBeGreaterThanOrEqual(2);

      // Check that we have both colors
      const styles = Array.from(colorDots).map(el => el.getAttribute('style') || '');
      expect(styles.some(s => /rgb\(239,\s*68,\s*68\)/.test(s))).toBe(true);
      expect(styles.some(s => /rgb\(59,\s*130,\s*246\)/.test(s))).toBe(true);
    });

    it('displays manual source color when source is "manual"', () => {
      const words = [{ word: 'bad', start: 1.0, end: 1.5, source: 'manual' as const }];
      const { container } = render(<MatchedWordsDisplay matchedWords={words} isVisible={true} />);

      const colorDot = container.querySelector('[style*="background-color"]');
      expect(colorDot).toBeInTheDocument();
      expect(colorDot?.getAttribute('style')).toMatch(/rgb\(236,\s*72,\s*153\)/);
    });

    it('does not show legend when only one source', () => {
      const words = [
        { word: 'bad', start: 1.0, end: 1.5, source: 1 },
        { word: 'worse', start: 2.0, end: 2.5, source: 1 },
      ];
      render(<MatchedWordsDisplay matchedWords={words} isVisible={true} />);

      // Legend should not be present with single source
      expect(screen.queryByText(/Profanity/)).not.toBeInTheDocument();
    });

    it('shows legend when multiple sources present', () => {
      const words = [
        { word: 'bad', start: 1.0, end: 1.5, source: 1 },
        { word: 'nike', start: 2.0, end: 2.5, source: 2 },
      ];
      render(<MatchedWordsDisplay matchedWords={words} isVisible={true} />);

      // Legend should show both sources with counts
      expect(screen.getByText(/Profanity \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Brands \(1\)/)).toBeInTheDocument();
    });

    it('shows legend with correct counts for mixed sources', () => {
      const words = [
        { word: 'bad', start: 1.0, end: 1.5, source: 1 },
        { word: 'worse', start: 2.0, end: 2.5, source: 1 },
        { word: 'nike', start: 3.0, end: 3.5, source: 2 },
        { word: 'test', start: 4.0, end: 4.5, source: 'manual' as const },
      ];
      render(<MatchedWordsDisplay matchedWords={words} isVisible={true} />);

      // Legend should show all sources with correct counts
      expect(screen.getByText(/Profanity \(2\)/)).toBeInTheDocument();
      expect(screen.getByText(/Brands \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Manual \(1\)/)).toBeInTheDocument();
    });

    it('uses fallback color when wordset not found', () => {
      const words = [{ word: 'bad', start: 1.0, end: 1.5, source: 999 }]; // Non-existent wordset
      const { container } = render(<MatchedWordsDisplay matchedWords={words} isVisible={true} />);

      // Should fallback to pink (rgb(236, 72, 153))
      const colorDot = container.querySelector('[style*="background-color"]');
      expect(colorDot).toBeInTheDocument();
      expect(colorDot?.getAttribute('style')).toMatch(/rgb\(236,\s*72,\s*153\)/);
    });
  });
});
