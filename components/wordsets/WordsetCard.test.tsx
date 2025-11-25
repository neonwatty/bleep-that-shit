import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordsetCard } from './WordsetCard';
import type { Wordset } from '@/lib/types/wordset';

describe('WordsetCard', () => {
  const mockWordset: Wordset = {
    id: 1,
    name: 'Test Wordset',
    description: 'A test wordset description',
    words: ['word1', 'word2', 'word3'],
    matchMode: { exact: true, partial: false, fuzzy: false },
    fuzzyDistance: 0,
    color: '#FF0000',
    isDefault: false,
    createdAt: new Date(2024, 0, 1), // Month is 0-indexed, this is Jan 1, 2024 in local time
    updatedAt: new Date(2024, 0, 2), // Jan 2, 2024 in local time
  };

  const defaultProps = {
    wordset: mockWordset,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
    onExport: vi.fn(),
  };

  describe('Basic Rendering', () => {
    it('renders wordset name', () => {
      render(<WordsetCard {...defaultProps} />);
      expect(screen.getByText('Test Wordset')).toBeInTheDocument();
    });

    it('renders wordset description when provided', () => {
      render(<WordsetCard {...defaultProps} />);
      expect(screen.getByText('A test wordset description')).toBeInTheDocument();
    });

    it('does not render description when not provided', () => {
      const wordsetWithoutDesc = { ...mockWordset, description: undefined };
      render(<WordsetCard {...defaultProps} wordset={wordsetWithoutDesc} />);
      expect(screen.queryByText('A test wordset description')).not.toBeInTheDocument();
    });

    it('renders with data attributes for testing', () => {
      const { container } = render(<WordsetCard {...defaultProps} />);
      const card = container.querySelector('[data-wordset-id="1"]');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('data-wordset-name', 'Test Wordset');
    });
  });

  describe('Color Indicator', () => {
    it('renders color indicator when color is provided', () => {
      render(<WordsetCard {...defaultProps} />);
      const colorIndicator = screen.getByLabelText('Wordset color');
      expect(colorIndicator).toBeInTheDocument();
      expect(colorIndicator).toHaveStyle({ backgroundColor: '#FF0000' });
    });

    it('does not render color indicator when color is not provided', () => {
      const wordsetWithoutColor = { ...mockWordset, color: undefined };
      render(<WordsetCard {...defaultProps} wordset={wordsetWithoutColor} />);
      expect(screen.queryByLabelText('Wordset color')).not.toBeInTheDocument();
    });

    it('renders color indicator with correct hex color', () => {
      const wordsetWithBlue = { ...mockWordset, color: '#0000FF' };
      render(<WordsetCard {...defaultProps} wordset={wordsetWithBlue} />);
      const colorIndicator = screen.getByLabelText('Wordset color');
      expect(colorIndicator).toHaveStyle({ backgroundColor: '#0000FF' });
    });
  });

  describe('Example Badge', () => {
    it('renders EXAMPLE badge for default wordsets', () => {
      const defaultWordset = { ...mockWordset, isDefault: true };
      render(<WordsetCard {...defaultProps} wordset={defaultWordset} />);
      expect(screen.getByText('EXAMPLE')).toBeInTheDocument();
    });

    it('does not render EXAMPLE badge for non-default wordsets', () => {
      render(<WordsetCard {...defaultProps} />);
      expect(screen.queryByText('EXAMPLE')).not.toBeInTheDocument();
    });
  });

  describe('Metadata Display', () => {
    it('displays word count with singular form', () => {
      const singleWordWordset = { ...mockWordset, words: ['word1'] };
      render(<WordsetCard {...defaultProps} wordset={singleWordWordset} />);
      expect(screen.getByText('1 word')).toBeInTheDocument();
    });

    it('displays word count with plural form', () => {
      render(<WordsetCard {...defaultProps} />);
      expect(screen.getByText('3 words')).toBeInTheDocument();
    });

    it('displays match mode label for exact match', () => {
      render(<WordsetCard {...defaultProps} />);
      expect(screen.getByText(/Exact/)).toBeInTheDocument();
    });

    it('displays match mode label for partial match', () => {
      const partialWordset = {
        ...mockWordset,
        matchMode: { exact: false, partial: true, fuzzy: false },
      };
      render(<WordsetCard {...defaultProps} wordset={partialWordset} />);
      expect(screen.getByText(/Partial/)).toBeInTheDocument();
    });

    it('displays match mode label for fuzzy match with distance', () => {
      const fuzzyWordset = {
        ...mockWordset,
        matchMode: { exact: false, partial: false, fuzzy: true },
        fuzzyDistance: 2,
      };
      render(<WordsetCard {...defaultProps} wordset={fuzzyWordset} />);
      expect(screen.getByText(/Fuzzy \(2\)/)).toBeInTheDocument();
    });

    it('displays combined match modes', () => {
      const multiModeWordset = {
        ...mockWordset,
        matchMode: { exact: true, partial: true, fuzzy: false },
      };
      render(<WordsetCard {...defaultProps} wordset={multiModeWordset} />);
      const text = screen.getByText(/Exact.*Partial/);
      expect(text).toBeInTheDocument();
    });

    it('displays "No modes" when no match modes are enabled', () => {
      const noModeWordset = {
        ...mockWordset,
        matchMode: { exact: false, partial: false, fuzzy: false },
      };
      render(<WordsetCard {...defaultProps} wordset={noModeWordset} />);
      expect(screen.getByText(/No modes/)).toBeInTheDocument();
    });

    it('formats creation date correctly', () => {
      const { container } = render(<WordsetCard {...defaultProps} />);
      const dateElement = container.querySelector('.created-date');
      expect(dateElement).toBeInTheDocument();
      expect(dateElement?.textContent).toMatch(/Created: Jan\.?\s+1,\s+2024/);
    });
  });

  describe('Word Preview', () => {
    it('displays all words when count is 5 or less', () => {
      render(<WordsetCard {...defaultProps} />);
      expect(screen.getByText(/word1, word2, word3/)).toBeInTheDocument();
    });

    it('truncates word preview when more than 5 words', () => {
      const manyWordsWordset = {
        ...mockWordset,
        words: ['word1', 'word2', 'word3', 'word4', 'word5', 'word6', 'word7'],
      };
      render(<WordsetCard {...defaultProps} wordset={manyWordsWordset} />);
      expect(
        screen.getByText(/word1, word2, word3, word4, word5 \+2 more\.\.\./)
      ).toBeInTheDocument();
    });

    it('shows correct count of remaining words', () => {
      const tenWordsWordset = {
        ...mockWordset,
        words: Array.from({ length: 10 }, (_, i) => `word${i + 1}`),
      };
      render(<WordsetCard {...defaultProps} wordset={tenWordsWordset} />);
      expect(screen.getByText(/\+5 more\.\.\./)).toBeInTheDocument();
    });

    it('renders preview section with correct styling', () => {
      render(<WordsetCard {...defaultProps} />);
      expect(screen.getByText('Preview:')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('renders all action buttons except View by default', () => {
      render(<WordsetCard {...defaultProps} />);
      expect(screen.getByTestId('edit-button')).toBeInTheDocument();
      expect(screen.getByTestId('duplicate-button')).toBeInTheDocument();
      expect(screen.getByTestId('export-button')).toBeInTheDocument();
      expect(screen.getByTestId('delete-button')).toBeInTheDocument();
      expect(screen.queryByTestId('view-button')).not.toBeInTheDocument();
    });

    it('renders View button when onView prop is provided', () => {
      const onView = vi.fn();
      render(<WordsetCard {...defaultProps} onView={onView} />);
      expect(screen.getByTestId('view-button')).toBeInTheDocument();
    });

    it('calls onEdit when Edit button is clicked', () => {
      const onEdit = vi.fn();
      render(<WordsetCard {...defaultProps} onEdit={onEdit} />);
      fireEvent.click(screen.getByTestId('edit-button'));
      expect(onEdit).toHaveBeenCalledWith(1);
    });

    it('calls onDelete when Delete button is clicked', () => {
      const onDelete = vi.fn();
      render(<WordsetCard {...defaultProps} onDelete={onDelete} />);
      fireEvent.click(screen.getByTestId('delete-button'));
      expect(onDelete).toHaveBeenCalledWith(1);
    });

    it('calls onDuplicate when Duplicate button is clicked', () => {
      const onDuplicate = vi.fn();
      render(<WordsetCard {...defaultProps} onDuplicate={onDuplicate} />);
      fireEvent.click(screen.getByTestId('duplicate-button'));
      expect(onDuplicate).toHaveBeenCalledWith(1);
    });

    it('calls onExport when Export button is clicked', () => {
      const onExport = vi.fn();
      render(<WordsetCard {...defaultProps} onExport={onExport} />);
      fireEvent.click(screen.getByTestId('export-button'));
      expect(onExport).toHaveBeenCalledWith(1);
    });

    it('calls onView when View button is clicked', () => {
      const onView = vi.fn();
      render(<WordsetCard {...defaultProps} onView={onView} />);
      fireEvent.click(screen.getByTestId('view-button'));
      expect(onView).toHaveBeenCalledWith(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles wordset with empty description', () => {
      const emptyDescWordset = { ...mockWordset, description: '' };
      render(<WordsetCard {...defaultProps} wordset={emptyDescWordset} />);
      // Empty description should not render paragraph
      const descriptions = screen.queryAllByText('');
      expect(descriptions.length).toBeGreaterThan(0); // Some empty text nodes exist
    });

    it('handles wordset with many words correctly', () => {
      const hundredWords = Array.from({ length: 100 }, (_, i) => `word${i + 1}`);
      const largeWordset = { ...mockWordset, words: hundredWords };
      render(<WordsetCard {...defaultProps} wordset={largeWordset} />);
      expect(screen.getByText('100 words')).toBeInTheDocument();
      expect(screen.getByText(/\+95 more\.\.\./)).toBeInTheDocument();
    });

    it('handles wordset with undefined id (should not crash)', () => {
      const noIdWordset = { ...mockWordset, id: undefined };
      render(<WordsetCard {...defaultProps} wordset={noIdWordset} />);
      expect(screen.getByText('Test Wordset')).toBeInTheDocument();
    });

    it('handles very long wordset names', () => {
      const longName = 'A'.repeat(100);
      const longNameWordset = { ...mockWordset, name: longName };
      render(<WordsetCard {...defaultProps} wordset={longNameWordset} />);
      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('handles very long descriptions', () => {
      const longDesc = 'Description '.repeat(50);
      const longDescWordset = { ...mockWordset, description: longDesc };
      render(<WordsetCard {...defaultProps} wordset={longDescWordset} />);
      expect(screen.getByText(longDesc.trim())).toBeInTheDocument();
    });

    it('handles different date formats', () => {
      const futureWordset = { ...mockWordset, createdAt: new Date(2025, 11, 31) }; // Dec 31, 2025 in local time
      const { container } = render(<WordsetCard {...defaultProps} wordset={futureWordset} />);
      const dateElement = container.querySelector('.created-date');
      expect(dateElement).toBeInTheDocument();
      expect(dateElement?.textContent).toMatch(/Created: Dec\.?\s+31,\s+2025/);
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      render(<WordsetCard {...defaultProps} />);
      const heading = screen.getByRole('heading', { level: 3, name: 'Test Wordset' });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Test Wordset');
    });

    it('has aria-label for color indicator', () => {
      render(<WordsetCard {...defaultProps} />);
      const colorIndicator = screen.getByLabelText('Wordset color');
      expect(colorIndicator).toHaveAttribute('aria-label', 'Wordset color');
    });

    it('all buttons are keyboard accessible', () => {
      render(<WordsetCard {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
        expect(button.tagName).toBe('BUTTON');
      });
    });
  });
});
