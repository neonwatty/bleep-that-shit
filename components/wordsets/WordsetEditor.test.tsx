import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WordsetEditor } from './WordsetEditor';
import type { Wordset } from '@/lib/types/wordset';

describe('WordsetEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  const mockWordset: Wordset = {
    id: 1,
    name: 'Test Wordset',
    description: 'Test description',
    words: ['bad', 'worse', 'worst'],
    matchMode: { exact: true, partial: false, fuzzy: false },
    fuzzyDistance: 1,
    color: '#EF4444',
    isDefault: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders in create mode when no wordset provided', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      expect(screen.getByTestId('wordset-name-input')).toHaveValue('');
      expect(screen.getByTestId('wordset-description-input')).toHaveValue('');
      expect(screen.getByTestId('save-wordset-button')).toHaveTextContent('Create Wordset');
    });

    it('renders in edit mode when wordset provided', () => {
      render(<WordsetEditor wordset={mockWordset} onSave={mockOnSave} onCancel={mockOnCancel} />);

      expect(screen.getByTestId('wordset-name-input')).toHaveValue('Test Wordset');
      expect(screen.getByTestId('wordset-description-input')).toHaveValue('Test description');
      expect(screen.getByTestId('save-wordset-button')).toHaveTextContent('Save Changes');
    });

    it('renders all form fields', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      expect(screen.getByTestId('wordset-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('wordset-description-input')).toBeInTheDocument();
      expect(screen.getByTestId('color-picker')).toBeInTheDocument();
      expect(screen.getByTestId('new-word-input')).toBeInTheDocument();
      expect(screen.getByTestId('add-word-button')).toBeInTheDocument();
    });

    it('displays existing words when editing', () => {
      render(<WordsetEditor wordset={mockWordset} onSave={mockOnSave} onCancel={mockOnCancel} />);

      expect(screen.getByText('bad')).toBeInTheDocument();
      expect(screen.getByText('worse')).toBeInTheDocument();
      expect(screen.getByText('worst')).toBeInTheDocument();
      expect(screen.getByText(/Manage Words \(3\)/)).toBeInTheDocument();
    });
  });

  describe('form input changes', () => {
    it('updates name field', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      const nameInput = screen.getByTestId('wordset-name-input');
      fireEvent.change(nameInput, { target: { value: 'My Wordset' } });

      expect(nameInput).toHaveValue('My Wordset');
    });

    it('updates description field', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      const descInput = screen.getByTestId('wordset-description-input');
      fireEvent.change(descInput, { target: { value: 'My description' } });

      expect(descInput).toHaveValue('My description');
    });

    it('updates color field', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      const colorPicker = screen.getByTestId('color-picker');
      fireEvent.change(colorPicker, { target: { value: '#FF0000' } });

      // Browsers normalize hex colors to lowercase
      expect(colorPicker).toHaveValue('#ff0000');
    });

    it('displays color preview', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      const colorPicker = screen.getByTestId('color-picker');
      fireEvent.change(colorPicker, { target: { value: '#FF0000' } });

      const preview = screen.getByLabelText('Color preview');
      expect(preview).toHaveStyle({ backgroundColor: 'rgb(255, 0, 0)' });
    });
  });

  describe('words management', () => {
    it('adds word when add button clicked', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByTestId('new-word-input');
      const addButton = screen.getByTestId('add-word-button');

      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.click(addButton);

      expect(screen.getByText('test')).toBeInTheDocument();
      expect(input).toHaveValue('');
    });

    it('adds word when Enter key pressed', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByTestId('new-word-input');

      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(screen.getByText('test')).toBeInTheDocument();
      expect(input).toHaveValue('');
    });

    it('trims and lowercases words when adding', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByTestId('new-word-input');
      const addButton = screen.getByTestId('add-word-button');

      fireEvent.change(input, { target: { value: '  TEST  ' } });
      fireEvent.click(addButton);

      expect(screen.getByText('test')).toBeInTheDocument();
    });

    it('prevents adding duplicate words', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByTestId('new-word-input');
      const addButton = screen.getByTestId('add-word-button');

      // Add first time
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.click(addButton);

      // Try to add again
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.click(addButton);

      const testElements = screen.getAllByText('test');
      expect(testElements.length).toBe(1);
    });

    it('prevents adding empty words', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByTestId('new-word-input');
      const addButton = screen.getByTestId('add-word-button');

      fireEvent.change(input, { target: { value: '   ' } });

      expect(addButton).toBeDisabled();
    });

    it('removes word when remove button clicked', () => {
      render(<WordsetEditor wordset={mockWordset} onSave={mockOnSave} onCancel={mockOnCancel} />);

      expect(screen.getByText('bad')).toBeInTheDocument();

      const removeButtons = screen.getAllByTestId('remove-word-button');
      fireEvent.click(removeButtons[0]); // Remove first word

      expect(screen.queryByText('bad')).not.toBeInTheDocument();
      expect(screen.getByText(/Manage Words \(2\)/)).toBeInTheDocument();
    });

    it('shows empty state when no words', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      expect(screen.getByText('No words yet. Add words above.')).toBeInTheDocument();
    });
  });

  describe('bulk edit mode', () => {
    it('toggles bulk edit mode', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      const bulkEditButton = screen.getByText('Bulk Edit');
      fireEvent.click(bulkEditButton);

      expect(screen.getByTestId('bulk-edit-textarea')).toBeInTheDocument();
      expect(screen.getByText('← Back to List')).toBeInTheDocument();

      fireEvent.click(screen.getByText('← Back to List'));

      expect(screen.queryByTestId('bulk-edit-textarea')).not.toBeInTheDocument();
      expect(screen.getByText('Bulk Edit')).toBeInTheDocument();
    });

    it('populates bulk text with existing words', () => {
      render(<WordsetEditor wordset={mockWordset} onSave={mockOnSave} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByText('Bulk Edit'));

      const textarea = screen.getByTestId('bulk-edit-textarea');
      expect(textarea).toHaveValue('bad\nworse\nworst');
    });

    it('updates words from bulk text with newlines', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByText('Bulk Edit'));

      const textarea = screen.getByTestId('bulk-edit-textarea');
      fireEvent.change(textarea, { target: { value: 'word1\nword2\nword3' } });
      fireEvent.click(screen.getByText('✓ Done Editing'));

      expect(screen.getByText('word1')).toBeInTheDocument();
      expect(screen.getByText('word2')).toBeInTheDocument();
      expect(screen.getByText('word3')).toBeInTheDocument();
    });

    it('updates words from bulk text with commas', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByText('Bulk Edit'));

      const textarea = screen.getByTestId('bulk-edit-textarea');
      fireEvent.change(textarea, { target: { value: 'word1,word2,word3' } });
      fireEvent.click(screen.getByText('✓ Done Editing'));

      expect(screen.getByText('word1')).toBeInTheDocument();
      expect(screen.getByText('word2')).toBeInTheDocument();
      expect(screen.getByText('word3')).toBeInTheDocument();
    });

    it('deduplicates words when bulk editing', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByText('Bulk Edit'));

      const textarea = screen.getByTestId('bulk-edit-textarea');
      fireEvent.change(textarea, { target: { value: 'test\ntest\nTEST' } });
      fireEvent.click(screen.getByText('✓ Done Editing'));

      const testElements = screen.getAllByText('test');
      expect(testElements.length).toBe(1);
    });
  });

  describe('word search/filter', () => {
    it('does not show search when 5 or fewer words', () => {
      render(<WordsetEditor wordset={mockWordset} onSave={mockOnSave} onCancel={mockOnCancel} />);

      expect(screen.queryByPlaceholderText('🔍 Filter words...')).not.toBeInTheDocument();
    });

    it('shows search when more than 5 words', () => {
      const manyWords = {
        ...mockWordset,
        words: ['word1', 'word2', 'word3', 'word4', 'word5', 'word6'],
      };

      render(<WordsetEditor wordset={manyWords} onSave={mockOnSave} onCancel={mockOnCancel} />);

      expect(screen.getByPlaceholderText('🔍 Filter words...')).toBeInTheDocument();
    });

    it('filters words when typing in search', () => {
      const manyWords = {
        ...mockWordset,
        words: ['apple', 'banana', 'apricot', 'cherry', 'avocado', 'berry'],
      };

      render(<WordsetEditor wordset={manyWords} onSave={mockOnSave} onCancel={mockOnCancel} />);

      const searchInput = screen.getByPlaceholderText('🔍 Filter words...');
      fireEvent.change(searchInput, { target: { value: 'ap' } });

      expect(screen.getByText('apple')).toBeInTheDocument();
      expect(screen.getByText('apricot')).toBeInTheDocument();
      expect(screen.queryByText('banana')).not.toBeInTheDocument();
      expect(screen.queryByText('cherry')).not.toBeInTheDocument();
    });

    it('shows no match message when filter returns no results', () => {
      const manyWords = {
        ...mockWordset,
        words: ['apple', 'banana', 'apricot', 'cherry', 'avocado', 'berry'],
      };

      render(<WordsetEditor wordset={manyWords} onSave={mockOnSave} onCancel={mockOnCancel} />);

      const searchInput = screen.getByPlaceholderText('🔍 Filter words...');
      fireEvent.change(searchInput, { target: { value: 'xyz' } });

      expect(screen.getByText('No words match your filter')).toBeInTheDocument();
    });
  });

  // Note: Match settings tests were removed because the UI for configuring
  // match modes (exact/partial/fuzzy) has been removed from the component.
  // The component now hardcodes matchMode to { exact: true, partial: false, fuzzy: false }

  describe('form submission', () => {
    it('calls onSave with correct data when creating', async () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      // Fill form
      fireEvent.change(screen.getByTestId('wordset-name-input'), { target: { value: 'My Set' } });
      fireEvent.change(screen.getByTestId('wordset-description-input'), {
        target: { value: 'My desc' },
      });
      fireEvent.change(screen.getByTestId('color-picker'), { target: { value: '#FF0000' } });

      // Add words
      const wordInput = screen.getByTestId('new-word-input');
      fireEvent.change(wordInput, { target: { value: 'word1' } });
      fireEvent.click(screen.getByTestId('add-word-button'));
      fireEvent.change(wordInput, { target: { value: 'word2' } });
      fireEvent.click(screen.getByTestId('add-word-button'));

      // Submit
      fireEvent.submit(screen.getByTestId('save-wordset-button').closest('form')!);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          name: 'My Set',
          description: 'My desc',
          words: ['word1', 'word2'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0, // Hardcoded since UI removed match mode controls
          color: '#ff0000', // Browsers normalize hex colors to lowercase
          isDefault: false,
        });
      });
    });

    it('calls onSave with updated data when editing', async () => {
      render(<WordsetEditor wordset={mockWordset} onSave={mockOnSave} onCancel={mockOnCancel} />);

      // Update name
      fireEvent.change(screen.getByTestId('wordset-name-input'), {
        target: { value: 'Updated Name' },
      });

      // Submit
      fireEvent.submit(screen.getByTestId('save-wordset-button').closest('form')!);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Updated Name',
            words: ['bad', 'worse', 'worst'],
          })
        );
      });
    });

    it('omits undefined description when empty', async () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      fireEvent.change(screen.getByTestId('wordset-name-input'), { target: { value: 'Test' } });

      const wordInput = screen.getByTestId('new-word-input');
      fireEvent.change(wordInput, { target: { value: 'word1' } });
      fireEvent.click(screen.getByTestId('add-word-button'));

      fireEvent.submit(screen.getByTestId('save-wordset-button').closest('form')!);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            description: undefined,
          })
        );
      });
    });
  });

  describe('button states', () => {
    it('disables save button when name is empty', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      const wordInput = screen.getByTestId('new-word-input');
      fireEvent.change(wordInput, { target: { value: 'word1' } });
      fireEvent.click(screen.getByTestId('add-word-button'));

      const saveButton = screen.getByTestId('save-wordset-button');
      expect(saveButton).toBeDisabled();
    });

    it('disables save button when no words added', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      fireEvent.change(screen.getByTestId('wordset-name-input'), { target: { value: 'Test' } });

      const saveButton = screen.getByTestId('save-wordset-button');
      expect(saveButton).toBeDisabled();
    });

    it('enables save button when name and words are valid', () => {
      render(<WordsetEditor onSave={mockOnSave} onCancel={mockOnCancel} />);

      fireEvent.change(screen.getByTestId('wordset-name-input'), { target: { value: 'Test' } });

      const wordInput = screen.getByTestId('new-word-input');
      fireEvent.change(wordInput, { target: { value: 'word1' } });
      fireEvent.click(screen.getByTestId('add-word-button'));

      const saveButton = screen.getByTestId('save-wordset-button');
      expect(saveButton).not.toBeDisabled();
    });

    it('disables save button when isSubmitting', () => {
      render(
        <WordsetEditor
          wordset={mockWordset}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isSubmitting={true}
        />
      );

      const saveButton = screen.getByTestId('save-wordset-button');
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveTextContent('Saving...');
    });

    it('disables cancel button when isSubmitting', () => {
      render(
        <WordsetEditor
          wordset={mockWordset}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isSubmitting={true}
        />
      );

      const cancelButton = screen.getByTestId('cancel-button');
      expect(cancelButton).toBeDisabled();
    });

    it('calls onCancel when cancel button clicked', () => {
      render(<WordsetEditor wordset={mockWordset} onSave={mockOnSave} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByTestId('cancel-button'));

      expect(mockOnCancel).toHaveBeenCalledOnce();
    });
  });
});
