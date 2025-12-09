import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReviewMatchTab } from './ReviewMatchTab';

// Helper to expand a collapsible section by clicking its header
const expandSection = (sectionText: string) => {
  const sectionHeader = screen.getByText(sectionText);
  const button = sectionHeader.closest('button');
  if (button) {
    fireEvent.click(button);
  }
};

describe('ReviewMatchTab', () => {
  const mockTranscript = {
    text: 'Hello world this is a test',
    chunks: [
      { text: 'Hello', timestamp: [0, 0.5] as [number, number] },
      { text: 'world', timestamp: [0.5, 1.0] as [number, number] },
      { text: 'this', timestamp: [1.0, 1.3] as [number, number] },
      { text: 'is', timestamp: [1.3, 1.5] as [number, number] },
      { text: 'a', timestamp: [1.5, 1.6] as [number, number] },
      { text: 'test', timestamp: [1.6, 2.0] as [number, number] },
    ],
  };

  const defaultProps = {
    transcriptionResult: mockTranscript,
    wordsToMatch: '',
    matchMode: { exact: true, partial: false, fuzzy: false },
    fuzzyDistance: 1,
    censoredWordIndices: new Set<number>(),
    searchQuery: '',
    matchedWords: [],
    onWordsToMatchChange: vi.fn(),
    onMatchModeChange: vi.fn(),
    onFuzzyDistanceChange: vi.fn(),
    onSearchQueryChange: vi.fn(),
    onMatch: vi.fn(),
    onToggleWord: vi.fn(),
    onClearAll: vi.fn(),
    // Timeline props
    file: null,
    fileUrl: null,
    manualCensorSegments: [],
    mediaDuration: 0,
    onSetMediaDuration: vi.fn(),
    onAddManualCensor: vi.fn(),
    onUpdateManualCensor: vi.fn(),
    onRemoveManualCensor: vi.fn(),
    onClearManualCensors: vi.fn(),
    // Context flags
    hasFile: false,
    hasTranscription: true,
    // Navigation
    onNavigate: vi.fn(),
  };

  describe('Section rendering', () => {
    it('renders section heading with step number', () => {
      render(<ReviewMatchTab {...defaultProps} />);

      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('Review & Select Words to Bleep')).toBeInTheDocument();
    });

    it('renders pattern matching section heading', () => {
      render(<ReviewMatchTab {...defaultProps} />);

      expect(screen.getByText('Keyword Matching')).toBeInTheDocument();
    });
  });

  describe('Words to match input', () => {
    it('renders words to match input', () => {
      render(<ReviewMatchTab {...defaultProps} />);
      expandSection('Keyword Matching');

      expect(screen.getByTestId('words-to-match-input')).toBeInTheDocument();
    });

    it('displays current wordsToMatch value', () => {
      render(<ReviewMatchTab {...defaultProps} wordsToMatch="bad, worse, worst" />);
      expandSection('Keyword Matching');

      const input = screen.getByTestId('words-to-match-input') as HTMLInputElement;
      expect(input.value).toBe('bad, worse, worst');
    });

    it('shows placeholder text', () => {
      render(<ReviewMatchTab {...defaultProps} />);
      expandSection('Keyword Matching');

      const input = screen.getByTestId('words-to-match-input');
      expect(input).toHaveAttribute('placeholder', 'e.g., bad, word, curse');
    });

    it('calls onWordsToMatchChange when input changes', () => {
      const onWordsToMatchChange = vi.fn();
      render(<ReviewMatchTab {...defaultProps} onWordsToMatchChange={onWordsToMatchChange} />);
      expandSection('Keyword Matching');

      const input = screen.getByTestId('words-to-match-input');
      fireEvent.change(input, { target: { value: 'test, word' } });

      expect(onWordsToMatchChange).toHaveBeenCalledWith('test, word');
    });
  });

  describe('Match mode checkboxes', () => {
    it('renders all three match mode checkboxes', () => {
      render(<ReviewMatchTab {...defaultProps} />);
      expandSection('Keyword Matching');

      expect(screen.getByTestId('exact-match-checkbox')).toBeInTheDocument();
      expect(screen.getByTestId('partial-match-checkbox')).toBeInTheDocument();
      expect(screen.getByTestId('fuzzy-match-checkbox')).toBeInTheDocument();
    });

    it('shows correct checked state for exact match', () => {
      render(
        <ReviewMatchTab
          {...defaultProps}
          matchMode={{ exact: true, partial: false, fuzzy: false }}
        />
      );
      expandSection('Keyword Matching');

      const checkbox = screen.getByTestId('exact-match-checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('shows correct checked state for partial match', () => {
      render(
        <ReviewMatchTab
          {...defaultProps}
          matchMode={{ exact: false, partial: true, fuzzy: false }}
        />
      );
      expandSection('Keyword Matching');

      const checkbox = screen.getByTestId('partial-match-checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('shows correct checked state for fuzzy match', () => {
      render(
        <ReviewMatchTab
          {...defaultProps}
          matchMode={{ exact: false, partial: false, fuzzy: true }}
        />
      );
      expandSection('Keyword Matching');

      const checkbox = screen.getByTestId('fuzzy-match-checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('calls onMatchModeChange when exact match checkbox is toggled', () => {
      const onMatchModeChange = vi.fn();
      render(<ReviewMatchTab {...defaultProps} onMatchModeChange={onMatchModeChange} />);
      expandSection('Keyword Matching');

      const checkbox = screen.getByTestId('exact-match-checkbox');
      fireEvent.click(checkbox);

      expect(onMatchModeChange).toHaveBeenCalledWith({
        exact: false,
        partial: false,
        fuzzy: false,
      });
    });

    it('calls onMatchModeChange when partial match checkbox is toggled', () => {
      const onMatchModeChange = vi.fn();
      render(<ReviewMatchTab {...defaultProps} onMatchModeChange={onMatchModeChange} />);
      expandSection('Keyword Matching');

      const checkbox = screen.getByTestId('partial-match-checkbox');
      fireEvent.click(checkbox);

      expect(onMatchModeChange).toHaveBeenCalledWith({
        exact: true,
        partial: true,
        fuzzy: false,
      });
    });

    it('calls onMatchModeChange when fuzzy match checkbox is toggled', () => {
      const onMatchModeChange = vi.fn();
      render(<ReviewMatchTab {...defaultProps} onMatchModeChange={onMatchModeChange} />);
      expandSection('Keyword Matching');

      const checkbox = screen.getByTestId('fuzzy-match-checkbox');
      fireEvent.click(checkbox);

      expect(onMatchModeChange).toHaveBeenCalledWith({
        exact: true,
        partial: false,
        fuzzy: true,
      });
    });
  });

  describe('Fuzzy distance slider', () => {
    it('does not show fuzzy distance slider when fuzzy match is disabled', () => {
      render(
        <ReviewMatchTab
          {...defaultProps}
          matchMode={{ exact: true, partial: false, fuzzy: false }}
        />
      );
      expandSection('Keyword Matching');

      expect(screen.queryByTestId('fuzzy-distance-slider')).not.toBeInTheDocument();
    });

    it('shows fuzzy distance slider when fuzzy match is enabled', () => {
      render(
        <ReviewMatchTab
          {...defaultProps}
          matchMode={{ exact: false, partial: false, fuzzy: true }}
        />
      );
      expandSection('Keyword Matching');

      expect(screen.getByTestId('fuzzy-distance-slider')).toBeInTheDocument();
    });

    it('displays current fuzzy distance value', () => {
      render(
        <ReviewMatchTab
          {...defaultProps}
          matchMode={{ exact: false, partial: false, fuzzy: true }}
          fuzzyDistance={2}
        />
      );
      expandSection('Keyword Matching');

      expect(screen.getByText('Fuzzy distance: 2')).toBeInTheDocument();
    });

    it('calls onFuzzyDistanceChange when slider changes', () => {
      const onFuzzyDistanceChange = vi.fn();
      render(
        <ReviewMatchTab
          {...defaultProps}
          matchMode={{ exact: false, partial: false, fuzzy: true }}
          onFuzzyDistanceChange={onFuzzyDistanceChange}
        />
      );
      expandSection('Keyword Matching');

      const slider = screen.getByTestId('fuzzy-distance-slider');
      fireEvent.change(slider, { target: { value: '3' } });

      expect(onFuzzyDistanceChange).toHaveBeenCalledWith(3);
    });

    it('has correct slider attributes', () => {
      render(
        <ReviewMatchTab
          {...defaultProps}
          matchMode={{ exact: false, partial: false, fuzzy: true }}
        />
      );
      expandSection('Keyword Matching');

      const slider = screen.getByTestId('fuzzy-distance-slider') as HTMLInputElement;
      expect(slider.type).toBe('range');
      expect(slider.min).toBe('1');
      expect(slider.max).toBe('3');
    });
  });

  describe('Match Words button', () => {
    it('renders Match Words button', () => {
      render(<ReviewMatchTab {...defaultProps} />);
      expandSection('Keyword Matching');

      expect(screen.getByTestId('run-matching-button')).toBeInTheDocument();
      expect(screen.getByText('Match Words')).toBeInTheDocument();
    });

    it('disables Match Words button when no transcription result', () => {
      render(<ReviewMatchTab {...defaultProps} transcriptionResult={null} />);
      expandSection('Keyword Matching');

      const button = screen.getByTestId('run-matching-button');
      expect(button).toBeDisabled();
    });

    it('disables Match Words button when wordsToMatch is empty', () => {
      render(<ReviewMatchTab {...defaultProps} wordsToMatch="" />);
      expandSection('Keyword Matching');

      const button = screen.getByTestId('run-matching-button');
      expect(button).toBeDisabled();
    });

    it('enables Match Words button when both transcript and words are provided', () => {
      render(<ReviewMatchTab {...defaultProps} wordsToMatch="test" />);
      expandSection('Keyword Matching');

      const button = screen.getByTestId('run-matching-button');
      expect(button).toBeEnabled();
    });

    it('calls onMatch when clicked', () => {
      const onMatch = vi.fn();
      render(<ReviewMatchTab {...defaultProps} wordsToMatch="test" onMatch={onMatch} />);
      expandSection('Keyword Matching');

      const button = screen.getByTestId('run-matching-button');
      fireEvent.click(button);

      expect(onMatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Clear All button', () => {
    it('does not show Clear All button when no words are selected', () => {
      render(<ReviewMatchTab {...defaultProps} censoredWordIndices={new Set()} />);
      expandSection('Keyword Matching');

      expect(screen.queryByTestId('clear-all-button')).not.toBeInTheDocument();
    });

    it('shows Clear All button when words are selected', () => {
      render(<ReviewMatchTab {...defaultProps} censoredWordIndices={new Set([0, 1, 2])} />);
      expandSection('Keyword Matching');

      expect(screen.getByTestId('clear-all-button')).toBeInTheDocument();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('calls onClearAll when clicked', () => {
      const onClearAll = vi.fn();
      render(
        <ReviewMatchTab
          {...defaultProps}
          censoredWordIndices={new Set([0, 1])}
          onClearAll={onClearAll}
        />
      );
      expandSection('Keyword Matching');

      const button = screen.getByTestId('clear-all-button');
      fireEvent.click(button);

      expect(onClearAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('TranscriptReview integration', () => {
    it('does not render TranscriptReview when transcriptionResult is null', () => {
      render(<ReviewMatchTab {...defaultProps} transcriptionResult={null} />);

      // TranscriptStats component is rendered by TranscriptReview
      expect(screen.queryByText(/words selected/i)).not.toBeInTheDocument();
    });

    it('renders TranscriptReview when transcriptionResult is provided', () => {
      render(<ReviewMatchTab {...defaultProps} transcriptionResult={mockTranscript} />);
      expandSection('Interactive Transcript');

      // TranscriptReview renders TranscriptStats component
      expect(screen.getByText(/words selected/i)).toBeInTheDocument();
    });

    it('renders search input when transcript is expanded', () => {
      render(<ReviewMatchTab {...defaultProps} transcriptionResult={mockTranscript} />);
      expandSection('Interactive Transcript');

      expect(screen.getByTestId('search-transcript-input')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search for words in transcript/i)).toBeInTheDocument();
    });
  });

  describe('MatchedWordsDisplay integration', () => {
    it('does not show MatchedWordsDisplay when matchedWords is empty', () => {
      render(<ReviewMatchTab {...defaultProps} matchedWords={[]} />);

      // MatchedWordsDisplay shows a specific heading when visible
      expect(screen.queryByText(/Matched Words/i)).not.toBeInTheDocument();
    });

    it('shows MatchedWordsDisplay when matchedWords has items', () => {
      const matchedWords = [
        { word: 'bad', start: 1.0, end: 1.5, index: 0 },
        { word: 'worse', start: 2.0, end: 2.5, index: 1 },
      ];
      render(<ReviewMatchTab {...defaultProps} matchedWords={matchedWords} />);

      // Expand the Selected Words section to see the matched words
      expandSection('Selected Words (2)');

      // MatchedWordsDisplay renders the matched words
      expect(screen.getByText('bad')).toBeInTheDocument();
      expect(screen.getByText('worse')).toBeInTheDocument();
    });
  });

  describe('Success message', () => {
    it('does not show success message when no words are matched', () => {
      render(<ReviewMatchTab {...defaultProps} matchedWords={[]} />);

      // Section doesn't render at all when no words are matched
      expect(screen.queryByText(/words selected!/)).not.toBeInTheDocument();
    });

    it('shows success message when words are matched', () => {
      const matchedWords = [
        { word: 'bad', start: 1.0, end: 1.5, index: 0 },
        { word: 'worse', start: 2.0, end: 2.5, index: 1 },
        { word: 'worst', start: 3.0, end: 3.5, index: 2 },
      ];
      render(<ReviewMatchTab {...defaultProps} matchedWords={matchedWords} />);

      // Expand the Selected Words section to see the success message
      expandSection('Selected Words (3)');

      expect(screen.getByText(/3 words selected!/)).toBeInTheDocument();
      expect(
        screen.getByText(/Continue to Bleep & Download tab to configure and apply bleeps/)
      ).toBeInTheDocument();
    });

    it('shows correct count in success message', () => {
      const matchedWords = [{ word: 'test', start: 1.0, end: 1.5, index: 0 }];
      render(<ReviewMatchTab {...defaultProps} matchedWords={matchedWords} />);

      // Expand the Selected Words section to see the success message
      expandSection('Selected Words (1)');

      expect(screen.getByText(/1 words selected!/)).toBeInTheDocument();
    });
  });

  describe('Multiple match modes enabled', () => {
    it('can have multiple match modes checked at once', () => {
      render(
        <ReviewMatchTab
          {...defaultProps}
          matchMode={{ exact: true, partial: true, fuzzy: false }}
        />
      );
      expandSection('Keyword Matching');

      const exactCheckbox = screen.getByTestId('exact-match-checkbox') as HTMLInputElement;
      const partialCheckbox = screen.getByTestId('partial-match-checkbox') as HTMLInputElement;
      const fuzzyCheckbox = screen.getByTestId('fuzzy-match-checkbox') as HTMLInputElement;

      expect(exactCheckbox.checked).toBe(true);
      expect(partialCheckbox.checked).toBe(true);
      expect(fuzzyCheckbox.checked).toBe(false);
    });

    it('can have all match modes disabled', () => {
      render(
        <ReviewMatchTab
          {...defaultProps}
          matchMode={{ exact: false, partial: false, fuzzy: false }}
        />
      );
      expandSection('Keyword Matching');

      const exactCheckbox = screen.getByTestId('exact-match-checkbox') as HTMLInputElement;
      const partialCheckbox = screen.getByTestId('partial-match-checkbox') as HTMLInputElement;
      const fuzzyCheckbox = screen.getByTestId('fuzzy-match-checkbox') as HTMLInputElement;

      expect(exactCheckbox.checked).toBe(false);
      expect(partialCheckbox.checked).toBe(false);
      expect(fuzzyCheckbox.checked).toBe(false);
    });
  });
});
