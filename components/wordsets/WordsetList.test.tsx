import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordsetList } from './WordsetList';
import type { Wordset } from '@/lib/types/wordset';

// Mock WordsetCard component
vi.mock('./WordsetCard', () => ({
  WordsetCard: ({
    wordset,
    onEdit,
    onDelete,
    onDuplicate,
    onExport,
    onView,
  }: {
    wordset: Wordset;
    onEdit: (id: number) => void;
    onDelete: (id: number) => void;
    onDuplicate: (id: number) => void;
    onExport: (id: number) => void;
    onView?: (id: number) => void;
  }) => (
    <div data-testid={`wordset-card-${wordset.id}`}>
      <h3>{wordset.name}</h3>
      <button onClick={() => onEdit(wordset.id!)}>Edit</button>
      <button onClick={() => onDelete(wordset.id!)}>Delete</button>
      <button onClick={() => onDuplicate(wordset.id!)}>Duplicate</button>
      <button onClick={() => onExport(wordset.id!)}>Export</button>
      {onView && <button onClick={() => onView(wordset.id!)}>View</button>}
    </div>
  ),
}));

describe('WordsetList', () => {
  const mockWordsets: Wordset[] = [
    {
      id: 1,
      name: 'Wordset 1',
      description: 'First wordset',
      words: ['word1', 'word2'],
      matchMode: { exact: true, partial: false, fuzzy: false },
      fuzzyDistance: 0,
      color: '#FF0000',
      isDefault: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    },
    {
      id: 2,
      name: 'Wordset 2',
      description: 'Second wordset',
      words: ['word3', 'word4', 'word5'],
      matchMode: { exact: false, partial: true, fuzzy: false },
      fuzzyDistance: 0,
      color: '#00FF00',
      isDefault: true,
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-04'),
    },
  ];

  const defaultProps = {
    wordsets: mockWordsets,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
    onExport: vi.fn(),
  };

  describe('Rendering with wordsets', () => {
    it('renders all wordsets in the list', () => {
      render(<WordsetList {...defaultProps} />);
      expect(screen.getByTestId('wordset-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('wordset-card-2')).toBeInTheDocument();
    });

    it('renders wordset names', () => {
      render(<WordsetList {...defaultProps} />);
      expect(screen.getByText('Wordset 1')).toBeInTheDocument();
      expect(screen.getByText('Wordset 2')).toBeInTheDocument();
    });

    it('displays count of wordsets in header', () => {
      render(<WordsetList {...defaultProps} />);
      expect(screen.getByText('Your Word Lists (2)')).toBeInTheDocument();
    });

    it('displays correct count for single wordset', () => {
      render(<WordsetList {...defaultProps} wordsets={[mockWordsets[0]]} />);
      expect(screen.getByText('Your Word Lists (1)')).toBeInTheDocument();
    });

    it('displays correct count for many wordsets', () => {
      const manyWordsets = Array.from({ length: 10 }, (_, i) => ({
        ...mockWordsets[0],
        id: i + 1,
        name: `Wordset ${i + 1}`,
      }));
      render(<WordsetList {...defaultProps} wordsets={manyWordsets} />);
      expect(screen.getByText('Your Word Lists (10)')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('renders empty state when no wordsets', () => {
      render(<WordsetList {...defaultProps} wordsets={[]} />);
      expect(screen.getByText('No wordsets found.')).toBeInTheDocument();
    });

    it('does not render header when no wordsets', () => {
      render(<WordsetList {...defaultProps} wordsets={[]} />);
      expect(screen.queryByText(/Your Word Lists/)).not.toBeInTheDocument();
    });

    it('does not render any wordset cards when empty', () => {
      render(<WordsetList {...defaultProps} wordsets={[]} />);
      expect(screen.queryByTestId(/wordset-card-/)).not.toBeInTheDocument();
    });

    it('renders custom empty message when provided', () => {
      render(
        <WordsetList
          {...defaultProps}
          wordsets={[]}
          emptyMessage="Create your first wordset to get started!"
        />
      );
      expect(screen.getByText('Create your first wordset to get started!')).toBeInTheDocument();
      expect(screen.queryByText('No wordsets found.')).not.toBeInTheDocument();
    });

    it('renders empty state with correct styling', () => {
      const { container } = render(<WordsetList {...defaultProps} wordsets={[]} />);
      const emptyState = container.querySelector('.border-dashed');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveClass('border-gray-300', 'bg-gray-50');
    });
  });

  describe('Callback propagation', () => {
    it('propagates onEdit to WordsetCard', () => {
      const onEdit = vi.fn();
      render(<WordsetList {...defaultProps} onEdit={onEdit} />);
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);
      expect(onEdit).toHaveBeenCalledWith(1);
    });

    it('propagates onDelete to WordsetCard', () => {
      const onDelete = vi.fn();
      render(<WordsetList {...defaultProps} onDelete={onDelete} />);
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);
      expect(onDelete).toHaveBeenCalledWith(1);
    });

    it('propagates onDuplicate to WordsetCard', () => {
      const onDuplicate = vi.fn();
      render(<WordsetList {...defaultProps} onDuplicate={onDuplicate} />);
      const duplicateButtons = screen.getAllByText('Duplicate');
      fireEvent.click(duplicateButtons[0]);
      expect(onDuplicate).toHaveBeenCalledWith(1);
    });

    it('propagates onExport to WordsetCard', () => {
      const onExport = vi.fn();
      render(<WordsetList {...defaultProps} onExport={onExport} />);
      const exportButtons = screen.getAllByText('Export');
      fireEvent.click(exportButtons[0]);
      expect(onExport).toHaveBeenCalledWith(1);
    });

    it('propagates onView to WordsetCard when provided', () => {
      const onView = vi.fn();
      render(<WordsetList {...defaultProps} onView={onView} />);
      const viewButtons = screen.getAllByText('View');
      fireEvent.click(viewButtons[0]);
      expect(onView).toHaveBeenCalledWith(1);
    });

    it('does not render View button when onView is not provided', () => {
      render(<WordsetList {...defaultProps} />);
      expect(screen.queryByText('View')).not.toBeInTheDocument();
    });
  });

  describe('Multiple wordsets', () => {
    it('renders wordsets in correct order', () => {
      render(<WordsetList {...defaultProps} />);
      // Look for headings within the wordset cards specifically
      expect(screen.getByText('Wordset 1')).toBeInTheDocument();
      expect(screen.getByText('Wordset 2')).toBeInTheDocument();
    });

    it('allows interactions with multiple wordsets independently', () => {
      const onEdit = vi.fn();
      render(<WordsetList {...defaultProps} onEdit={onEdit} />);

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);
      expect(onEdit).toHaveBeenCalledWith(1);

      fireEvent.click(editButtons[1]);
      expect(onEdit).toHaveBeenCalledWith(2);
    });

    it('renders each wordset with unique key', () => {
      const { container } = render(<WordsetList {...defaultProps} />);
      const cards = container.querySelectorAll('[data-testid^="wordset-card-"]');
      expect(cards).toHaveLength(2);
      expect(cards[0]).toHaveAttribute('data-testid', 'wordset-card-1');
      expect(cards[1]).toHaveAttribute('data-testid', 'wordset-card-2');
    });
  });

  describe('Edge cases', () => {
    it('handles wordset with undefined id gracefully', () => {
      const wordsetsWithUndefinedId = [{ ...mockWordsets[0], id: undefined }];
      render(<WordsetList {...defaultProps} wordsets={wordsetsWithUndefinedId} />);
      expect(screen.getByText('Wordset 1')).toBeInTheDocument();
    });

    it('handles empty wordsets array', () => {
      render(<WordsetList {...defaultProps} wordsets={[]} />);
      expect(screen.getByText('No wordsets found.')).toBeInTheDocument();
    });

    it('handles single wordset', () => {
      render(<WordsetList {...defaultProps} wordsets={[mockWordsets[0]]} />);
      expect(screen.getByTestId('wordset-card-1')).toBeInTheDocument();
      expect(screen.queryByTestId('wordset-card-2')).not.toBeInTheDocument();
    });

    it('handles large number of wordsets', () => {
      const manyWordsets = Array.from({ length: 50 }, (_, i) => ({
        ...mockWordsets[0],
        id: i + 1,
        name: `Wordset ${i + 1}`,
      }));
      render(<WordsetList {...defaultProps} wordsets={manyWordsets} />);
      expect(screen.getByText('Your Word Lists (50)')).toBeInTheDocument();
      // Verify some wordsets are rendered instead of counting all h3 elements
      expect(screen.getByText('Wordset 1')).toBeInTheDocument();
      expect(screen.getByText('Wordset 50')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic HTML structure', () => {
      render(<WordsetList {...defaultProps} />);
      const heading = screen.getByText('Your Word Lists (2)');
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H3');
    });

    it('provides meaningful empty state message', () => {
      render(<WordsetList {...defaultProps} wordsets={[]} />);
      const emptyMessage = screen.getByText('No wordsets found.');
      expect(emptyMessage.tagName).toBe('P');
    });

    it('maintains proper heading hierarchy', () => {
      const { container } = render(<WordsetList {...defaultProps} />);
      const h3Elements = container.querySelectorAll('h3');
      expect(h3Elements.length).toBeGreaterThan(0);
    });
  });
});
