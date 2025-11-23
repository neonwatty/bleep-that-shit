import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WordsetManager } from './WordsetManager';
import type { Wordset } from '@/lib/types/wordset';

// Mock child components
vi.mock('./WordsetList', () => ({
  WordsetList: ({ wordsets, onEdit, onDelete, onDuplicate, onExport, emptyMessage }: any) => (
    <div data-testid="wordset-list">
      {wordsets.length === 0 ? (
        <p>{emptyMessage}</p>
      ) : (
        wordsets.map((ws: Wordset) => (
          <div key={ws.id} data-testid={`wordset-item-${ws.id}`}>
            <span>{ws.name}</span>
            <button onClick={() => onEdit(ws.id)}>Edit</button>
            <button onClick={() => onDelete(ws.id)}>Delete</button>
            <button onClick={() => onDuplicate(ws.id)}>Duplicate</button>
            <button onClick={() => onExport(ws.id)}>Export</button>
          </div>
        ))
      )}
    </div>
  ),
}));

vi.mock('./WordsetEditor', () => ({
  WordsetEditor: ({ wordset, onSave, onCancel, isSubmitting }: any) => (
    <div data-testid="wordset-editor">
      {wordset ? <p>Editing {wordset.name}</p> : <p>Creating new wordset</p>}
      <button
        onClick={() =>
          onSave({
            name: 'Test',
            words: ['test'],
            matchMode: { exact: true, partial: false, fuzzy: false },
            fuzzyDistance: 0,
          })
        }
      >
        {isSubmitting ? 'Saving...' : 'Save'}
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('./WordsetImportExport', () => ({
  WordsetImportExport: ({ onClose }: any) => (
    <div data-testid="import-export-view">
      <p>Import/Export</p>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock useWordsets hook
const mockWordsets: Wordset[] = [
  {
    id: 1,
    name: 'Profanity',
    description: 'Common profanity words',
    words: ['bad', 'worse'],
    matchMode: { exact: true, partial: false, fuzzy: false },
    fuzzyDistance: 0,
    color: '#EF4444',
    isDefault: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 2,
    name: 'Custom Set',
    words: ['test'],
    matchMode: { exact: true, partial: false, fuzzy: false },
    fuzzyDistance: 0,
    isDefault: false,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
];

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockDuplicate = vi.fn();
const mockExportCSV = vi.fn();
const mockImportCSV = vi.fn();
const mockSetSearchQuery = vi.fn();
const mockClearError = vi.fn();

vi.mock('@/lib/hooks/useWordsets', () => ({
  useWordsets: () => ({
    wordsets: mockWordsets,
    searchQuery: '',
    setSearchQuery: mockSetSearchQuery,
    create: mockCreate,
    update: mockUpdate,
    remove: mockRemove,
    duplicate: mockDuplicate,
    exportCSV: mockExportCSV,
    importCSV: mockImportCSV,
    error: null,
    clearError: mockClearError,
    isInitialized: true,
    allWordsets: mockWordsets,
  }),
}));

// Mock wordset operations
vi.mock('@/lib/utils/db/wordsetOperations', () => ({
  exportWordsetsCSV: vi.fn(async (ids?: number[]) => ({
    success: true,
    data: 'name,words\nTest,word1;word2',
  })),
  getWordsetById: vi.fn(async (id: number) => ({
    success: true,
    data: mockWordsets.find(ws => ws.id === id),
  })),
}));

// Mock URL and Blob APIs
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('WordsetManager', () => {
  const mockOnClose = vi.fn();
  const mockOnWordsetUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ success: true, data: 3 });
    mockUpdate.mockResolvedValue({ success: true });
    mockRemove.mockResolvedValue({ success: true });
    mockDuplicate.mockResolvedValue({ success: true, data: 4 });
    mockExportCSV.mockResolvedValue({ success: true, data: 'csv,data' });
  });

  describe('rendering', () => {
    it('renders manager modal with list view by default', () => {
      render(<WordsetManager onClose={mockOnClose} />);

      expect(screen.getByText('Manage Word Lists')).toBeInTheDocument();
      expect(screen.getByTestId('wordset-list')).toBeInTheDocument();
      expect(screen.getByTestId('close-manager')).toBeInTheDocument();
    });

    it('renders close button', () => {
      render(<WordsetManager onClose={mockOnClose} />);

      const closeButton = screen.getByTestId('close-manager');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveTextContent('✕');
    });

    it('displays wordsets in list view', () => {
      render(<WordsetManager onClose={mockOnClose} />);

      expect(screen.getByTestId('wordset-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('wordset-item-2')).toBeInTheDocument();
      expect(screen.getByText('Profanity')).toBeInTheDocument();
      expect(screen.getByText('Custom Set')).toBeInTheDocument();
    });
  });

  describe('view switching', () => {
    it('switches to create view when create button clicked', () => {
      render(<WordsetManager onClose={mockOnClose} />);

      const createButton = screen.getByTestId('new-wordset-button');
      fireEvent.click(createButton);

      // Check that WordsetEditor is rendered in create mode (no wordset being edited)
      expect(screen.getByTestId('wordset-editor')).toBeInTheDocument();
      expect(screen.getByText('Creating new wordset')).toBeInTheDocument();
      // The list should no longer be visible
      expect(screen.queryByTestId('wordset-list')).not.toBeInTheDocument();
    });

    it('switches to edit view when edit button clicked', () => {
      render(<WordsetManager onClose={mockOnClose} />);

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]); // Edit first wordset

      // Check that WordsetEditor is rendered in edit mode
      expect(screen.getByTestId('wordset-editor')).toBeInTheDocument();
      expect(screen.getByText('Editing Profanity')).toBeInTheDocument();
      // The list should no longer be visible
      expect(screen.queryByTestId('wordset-list')).not.toBeInTheDocument();
    });

    it('switches to delete confirm view when delete button clicked', () => {
      render(<WordsetManager onClose={mockOnClose} />);

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[1]); // Delete second wordset (custom)

      // Check for delete confirmation message
      expect(screen.getByText(/Are you sure you want to delete "Custom Set"/)).toBeInTheDocument();
      expect(screen.getByTestId('confirm-delete-button')).toBeInTheDocument();
      // The list should no longer be visible
      expect(screen.queryByTestId('wordset-list')).not.toBeInTheDocument();
    });

    it('switches to import-export view when import button clicked', () => {
      render(<WordsetManager onClose={mockOnClose} />);

      const importButton = screen.getByText('📥 Import CSV');
      fireEvent.click(importButton);

      // Check that import-export view is rendered
      expect(screen.getByTestId('import-export-view')).toBeInTheDocument();
      // The list should no longer be visible
      expect(screen.queryByTestId('wordset-list')).not.toBeInTheDocument();
    });

    it('returns to list view when cancel clicked in editor', () => {
      render(<WordsetManager onClose={mockOnClose} />);

      // Go to create view
      fireEvent.click(screen.getByTestId('new-wordset-button'));
      expect(screen.getByTestId('wordset-editor')).toBeInTheDocument();

      // Cancel back to list
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // Check that we're back to list view
      expect(screen.getByTestId('wordset-list')).toBeInTheDocument();
      expect(screen.queryByTestId('wordset-editor')).not.toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('renders search input', () => {
      render(<WordsetManager onClose={mockOnClose} />);

      const searchInput = screen.getByTestId('search-wordsets-input');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('placeholder', '🔍 Search wordsets...');
    });

    it('updates search query when typing', () => {
      render(<WordsetManager onClose={mockOnClose} />);

      const searchInput = screen.getByTestId('search-wordsets-input');
      fireEvent.change(searchInput, { target: { value: 'profanity' } });

      expect(mockSetSearchQuery).toHaveBeenCalledWith('profanity');
    });
  });

  describe('CRUD operations', () => {
    it('creates wordset successfully', async () => {
      render(<WordsetManager onClose={mockOnClose} onWordsetUpdated={mockOnWordsetUpdated} />);

      // Go to create view
      fireEvent.click(screen.getByTestId('new-wordset-button'));

      // Save
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith({
          name: 'Test',
          words: ['test'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        });
      });

      await waitFor(() => {
        expect(screen.getByText('✅ Wordset created successfully!')).toBeInTheDocument();
        expect(screen.getByText('Manage Word Lists')).toBeInTheDocument();
        expect(mockOnWordsetUpdated).toHaveBeenCalled();
      });
    });

    it('updates wordset successfully', async () => {
      render(<WordsetManager onClose={mockOnClose} onWordsetUpdated={mockOnWordsetUpdated} />);

      // Go to edit view
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      // Save
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(1, {
          name: 'Test',
          words: ['test'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        });
      });

      await waitFor(() => {
        expect(screen.getByText('✅ Wordset updated successfully!')).toBeInTheDocument();
        expect(mockOnWordsetUpdated).toHaveBeenCalled();
      });
    });

    it('deletes wordset successfully', async () => {
      render(<WordsetManager onClose={mockOnClose} onWordsetUpdated={mockOnWordsetUpdated} />);

      // Go to delete confirm view
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[1]);

      // Confirm delete
      const confirmButton = screen.getByTestId('confirm-delete-button');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockRemove).toHaveBeenCalledWith(2);
      });

      await waitFor(() => {
        expect(screen.getByText('✅ Wordset deleted successfully!')).toBeInTheDocument();
        expect(mockOnWordsetUpdated).toHaveBeenCalled();
      });
    });

    it('cancels delete operation', () => {
      render(<WordsetManager onClose={mockOnClose} />);

      // Go to delete confirm view
      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[1]);

      // Cancel delete
      const cancelButton = screen.getByTestId('cancel-delete-button');
      fireEvent.click(cancelButton);

      expect(screen.getByText('Manage Word Lists')).toBeInTheDocument();
      expect(mockRemove).not.toHaveBeenCalled();
    });

    it('duplicates wordset successfully', async () => {
      render(<WordsetManager onClose={mockOnClose} onWordsetUpdated={mockOnWordsetUpdated} />);

      const duplicateButtons = screen.getAllByText('Duplicate');
      fireEvent.click(duplicateButtons[0]);

      await waitFor(() => {
        expect(mockDuplicate).toHaveBeenCalledWith(1);
      });

      await waitFor(() => {
        expect(screen.getByText('✅ Wordset duplicated successfully!')).toBeInTheDocument();
        expect(mockOnWordsetUpdated).toHaveBeenCalled();
      });
    });
  });

  describe('import/export', () => {
    it('exports all wordsets as CSV', async () => {
      render(<WordsetManager onClose={mockOnClose} />);

      const exportButton = screen.getByText('📤 Export All CSV');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockExportCSV).toHaveBeenCalledWith();
      });
    });

    it('creates download link when exporting single wordset', async () => {
      const mockClick = vi.fn();
      const mockLink = { href: '', download: '', click: mockClick } as any;

      // Mock createElement only for 'a' tags
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return mockLink;
        }
        return originalCreateElement(tagName);
      });

      render(<WordsetManager onClose={mockOnClose} />);

      const exportButtons = screen.getAllByText('Export');
      fireEvent.click(exportButtons[0]);

      await waitFor(() => {
        expect(mockClick).toHaveBeenCalled();
        expect(mockLink.download).toContain('profanity');
      });

      // Restore original createElement
      vi.mocked(document.createElement).mockRestore();
    });
  });

  describe('success/error messages', () => {
    it('displays success message after creating wordset', async () => {
      render(<WordsetManager onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId('new-wordset-button'));
      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(screen.getByText('✅ Wordset created successfully!')).toBeInTheDocument();
      });
    });

    it('displays success message after updating wordset', async () => {
      render(<WordsetManager onClose={mockOnClose} />);

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);
      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(screen.getByText('✅ Wordset updated successfully!')).toBeInTheDocument();
      });
    });

    it('displays success message after deleting wordset', async () => {
      render(<WordsetManager onClose={mockOnClose} />);

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[1]);
      fireEvent.click(screen.getByTestId('confirm-delete-button'));

      await waitFor(() => {
        expect(screen.getByText('✅ Wordset deleted successfully!')).toBeInTheDocument();
      });
    });

    it('displays success message after duplicating wordset', async () => {
      render(<WordsetManager onClose={mockOnClose} />);

      const duplicateButtons = screen.getAllByText('Duplicate');
      fireEvent.click(duplicateButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('✅ Wordset duplicated successfully!')).toBeInTheDocument();
      });
    });
  });

  describe('delete confirmation', () => {
    it('shows wordset details in delete confirmation', () => {
      render(<WordsetManager onClose={mockOnClose} />);

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[1]);

      expect(screen.getByText(/Are you sure you want to delete "Custom Set"/)).toBeInTheDocument();
      expect(screen.getByText(/This wordset contains 1 word/)).toBeInTheDocument();
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
    });

    it('disables buttons during delete operation', async () => {
      mockRemove.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<WordsetManager onClose={mockOnClose} />);

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[1]);

      const confirmButton = screen.getByTestId('confirm-delete-button');
      fireEvent.click(confirmButton);

      expect(confirmButton).toBeDisabled();
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });
  });

  describe('closing', () => {
    it('calls onClose when close button clicked', () => {
      render(<WordsetManager onClose={mockOnClose} />);

      const closeButton = screen.getByTestId('close-manager');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledOnce();
    });
  });

  describe('action buttons', () => {
    it('renders all action buttons in list view', () => {
      render(<WordsetManager onClose={mockOnClose} />);

      expect(screen.getByTestId('new-wordset-button')).toBeInTheDocument();
      expect(screen.getByText('📥 Import CSV')).toBeInTheDocument();
      expect(screen.getByText('📤 Export All CSV')).toBeInTheDocument();
    });

    it('clears error when switching views', () => {
      render(<WordsetManager onClose={mockOnClose} />);

      fireEvent.click(screen.getByTestId('new-wordset-button'));
      expect(mockClearError).toHaveBeenCalled();

      vi.clearAllMocks();
      fireEvent.click(screen.getByText('Cancel'));

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);
      expect(mockClearError).toHaveBeenCalled();
    });
  });
});
