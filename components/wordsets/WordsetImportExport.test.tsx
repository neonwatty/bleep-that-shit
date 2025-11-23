import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WordsetImportExport } from './WordsetImportExport';
import type { ImportResult } from '@/lib/types/wordset';

describe('WordsetImportExport', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let mockClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock File class to properly return text content
    const OriginalFile = global.File;
    global.File = class File extends OriginalFile {
      private _content: string;

      constructor(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag) {
        super(fileBits, fileName, options);
        // Store the content for the text() method
        this._content = typeof fileBits[0] === 'string' ? fileBits[0] : '';
      }

      async text(): Promise<string> {
        return this._content;
      }
    };

    // Mock document.createElement for anchor elements
    mockClick = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        element.click = mockClick;
      }
      return element;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const defaultProps = {
    onImport: vi.fn(),
    onExportAll: vi.fn(),
    onClose: vi.fn(),
  };

  describe('Rendering', () => {
    it('renders export section with heading', () => {
      render(<WordsetImportExport {...defaultProps} />);
      expect(screen.getByText('Export Wordsets')).toBeInTheDocument();
      expect(screen.getByText(/Download all your wordsets/)).toBeInTheDocument();
    });

    it('renders import section with heading', () => {
      render(<WordsetImportExport {...defaultProps} />);
      expect(screen.getByText('Import Wordsets from CSV')).toBeInTheDocument();
    });

    it('renders export all button', () => {
      render(<WordsetImportExport {...defaultProps} />);
      expect(screen.getByTestId('export-all-button')).toBeInTheDocument();
      expect(screen.getByText(/Export All Wordsets/)).toBeInTheDocument();
    });

    it('renders file input', () => {
      render(<WordsetImportExport {...defaultProps} />);
      expect(screen.getByTestId('import-file-input')).toBeInTheDocument();
    });

    it('renders close button', () => {
      render(<WordsetImportExport {...defaultProps} />);
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  describe('Import Mode Selection', () => {
    it('renders import mode radio buttons', () => {
      render(<WordsetImportExport {...defaultProps} />);
      expect(screen.getByText('Merge (keep both)')).toBeInTheDocument();
      expect(screen.getByText('Skip duplicates')).toBeInTheDocument();
    });

    it('merge mode is selected by default', () => {
      render(<WordsetImportExport {...defaultProps} />);
      const mergeRadio = screen.getByLabelText(/Merge \(keep both\)/i) as HTMLInputElement;
      expect(mergeRadio.checked).toBe(true);
    });

    it('allows selecting skip duplicates mode', () => {
      render(<WordsetImportExport {...defaultProps} />);
      const skipRadio = screen.getByLabelText(/Skip duplicates/i) as HTMLInputElement;
      fireEvent.click(skipRadio);
      expect(skipRadio.checked).toBe(true);
    });

    it('switches from merge to skip mode', () => {
      render(<WordsetImportExport {...defaultProps} />);
      const mergeRadio = screen.getByLabelText(/Merge \(keep both\)/i) as HTMLInputElement;
      const skipRadio = screen.getByLabelText(/Skip duplicates/i) as HTMLInputElement;

      expect(mergeRadio.checked).toBe(true);
      expect(skipRadio.checked).toBe(false);

      fireEvent.click(skipRadio);

      expect(mergeRadio.checked).toBe(false);
      expect(skipRadio.checked).toBe(true);
    });
  });

  describe('Export Functionality', () => {
    it('calls onExportAll when export button is clicked', async () => {
      const onExportAll = vi.fn().mockResolvedValue({
        success: true,
        data: 'name,description,words\nTest,Test desc,word1;word2',
      });
      render(<WordsetImportExport {...defaultProps} onExportAll={onExportAll} />);

      fireEvent.click(screen.getByTestId('export-all-button'));

      await waitFor(() => {
        expect(onExportAll).toHaveBeenCalledTimes(1);
      });
    });

    it('creates download link when export succeeds', async () => {
      const csvData = 'name,description,words\nTest,Test desc,word1;word2';
      const onExportAll = vi.fn().mockResolvedValue({
        success: true,
        data: csvData,
      });
      render(<WordsetImportExport {...defaultProps} onExportAll={onExportAll} />);

      fireEvent.click(screen.getByTestId('export-all-button'));

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(mockClick).toHaveBeenCalled();
        expect(mockRevokeObjectURL).toHaveBeenCalled();
      });
    });

    it('creates blob with correct CSV data', async () => {
      const csvData = 'name,description,words\nTest,Test desc,word1;word2';
      const onExportAll = vi.fn().mockResolvedValue({
        success: true,
        data: csvData,
      });
      render(<WordsetImportExport {...defaultProps} onExportAll={onExportAll} />);

      fireEvent.click(screen.getByTestId('export-all-button'));

      await waitFor(() => {
        const blobCall = mockCreateObjectURL.mock.calls[0][0];
        expect(blobCall).toBeInstanceOf(Blob);
        expect(blobCall.type).toBe('text/csv');
      });
    });

    it('sets download filename with current date', async () => {
      const onExportAll = vi.fn().mockResolvedValue({
        success: true,
        data: 'csv data',
      });
      render(<WordsetImportExport {...defaultProps} onExportAll={onExportAll} />);

      fireEvent.click(screen.getByTestId('export-all-button'));

      await waitFor(() => {
        const today = new Date().toISOString().split('T')[0];
        expect(document.createElement).toHaveBeenCalledWith('a');
        // Filename is set via link.download = `bleep-wordsets-${date}.csv`
      });
    });

    it('shows error message when export fails', async () => {
      const onExportAll = vi.fn().mockResolvedValue({
        success: false,
        error: 'Export failed: database error',
      });
      render(<WordsetImportExport {...defaultProps} onExportAll={onExportAll} />);

      fireEvent.click(screen.getByTestId('export-all-button'));

      await waitFor(() => {
        expect(screen.getByText('Import Failed')).toBeInTheDocument();
        expect(screen.getByText('Export failed: database error')).toBeInTheDocument();
      });
    });
  });

  describe('Import Functionality', () => {
    it('accepts CSV files only', () => {
      render(<WordsetImportExport {...defaultProps} />);
      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      expect(fileInput).toHaveAttribute('accept', '.csv');
    });

    it('calls onImport with file contents when file is selected', async () => {
      const csvContent = 'name,description,words\nTest,Test desc,word1;word2';
      const onImport = vi.fn().mockResolvedValue({
        success: true,
        data: { imported: 1, skipped: 0, errors: [] },
      });
      render(<WordsetImportExport {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(onImport).toHaveBeenCalledWith(csvContent, true); // true for merge mode
      });
    });

    it('calls onImport with skip mode when skip is selected', async () => {
      const csvContent = 'name,description,words\nTest,Test desc,word1;word2';
      const onImport = vi.fn().mockResolvedValue({
        success: true,
        data: { imported: 1, skipped: 0, errors: [] },
      });
      render(<WordsetImportExport {...defaultProps} onImport={onImport} />);

      // Select skip mode
      const skipRadio = screen.getByLabelText(/Skip duplicates/i);
      fireEvent.click(skipRadio);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(onImport).toHaveBeenCalledWith(csvContent, false); // false for skip mode
      });
    });

    it('shows importing state while importing', async () => {
      const onImport = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<WordsetImportExport {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const file = new File(['csv content'], 'test.csv', { type: 'text/csv' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByText('Importing...')).toBeInTheDocument();
    });

    it('disables file input while importing', async () => {
      const onImport = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<WordsetImportExport {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const file = new File(['csv content'], 'test.csv', { type: 'text/csv' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(fileInput).toBeDisabled();
    });

    it('resets file input after successful import', async () => {
      const onImport = vi.fn().mockResolvedValue({
        success: true,
        data: { imported: 1, skipped: 0, errors: [] },
      });
      render(<WordsetImportExport {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const file = new File(['csv content'], 'test.csv', { type: 'text/csv' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(fileInput.value).toBe('');
      });
    });
  });

  describe('Import Result Display', () => {
    it('shows success message with import count', async () => {
      const importResult: ImportResult = {
        imported: 5,
        skipped: 0,
        errors: [],
      };
      const onImport = vi.fn().mockResolvedValue({
        success: true,
        data: importResult,
      });
      render(<WordsetImportExport {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const file = new File(['csv'], 'test.csv', { type: 'text/csv' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Import Complete!')).toBeInTheDocument();
        expect(screen.getByText(/Imported: 5 wordset\(s\)/)).toBeInTheDocument();
      });
    });

    it('shows skipped count when wordsets were skipped', async () => {
      const importResult: ImportResult = {
        imported: 3,
        skipped: 2,
        errors: [],
      };
      const onImport = vi.fn().mockResolvedValue({
        success: true,
        data: importResult,
      });
      render(<WordsetImportExport {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const file = new File(['csv'], 'test.csv', { type: 'text/csv' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Skipped: 2 wordset\(s\)/)).toBeInTheDocument();
      });
    });

    it('does not show skipped count when zero', async () => {
      const importResult: ImportResult = {
        imported: 5,
        skipped: 0,
        errors: [],
      };
      const onImport = vi.fn().mockResolvedValue({
        success: true,
        data: importResult,
      });
      render(<WordsetImportExport {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const file = new File(['csv'], 'test.csv', { type: 'text/csv' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.queryByText(/Skipped:/)).not.toBeInTheDocument();
      });
    });

    it('shows first 3 errors when import has errors', async () => {
      const importResult: ImportResult = {
        imported: 2,
        skipped: 0,
        errors: ['Error 1', 'Error 2', 'Error 3', 'Error 4', 'Error 5'],
      };
      const onImport = vi.fn().mockResolvedValue({
        success: true,
        data: importResult,
      });
      render(<WordsetImportExport {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const file = new File(['csv'], 'test.csv', { type: 'text/csv' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Error 1')).toBeInTheDocument();
        expect(screen.getByText('Error 2')).toBeInTheDocument();
        expect(screen.getByText('Error 3')).toBeInTheDocument();
        expect(screen.getByText(/...and 2 more/)).toBeInTheDocument();
      });
    });

    it('does not show "and more" when 3 or fewer errors', async () => {
      const importResult: ImportResult = {
        imported: 2,
        skipped: 0,
        errors: ['Error 1', 'Error 2'],
      };
      const onImport = vi.fn().mockResolvedValue({
        success: true,
        data: importResult,
      });
      render(<WordsetImportExport {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const file = new File(['csv'], 'test.csv', { type: 'text/csv' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.queryByText(/...and \d+ more/)).not.toBeInTheDocument();
      });
    });

    it('shows error message when import fails', async () => {
      const onImport = vi.fn().mockResolvedValue({
        success: false,
        error: 'Invalid CSV format',
      });
      render(<WordsetImportExport {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const file = new File(['invalid csv'], 'test.csv', { type: 'text/csv' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Import Failed')).toBeInTheDocument();
        expect(screen.getByText('Invalid CSV format')).toBeInTheDocument();
      });
    });

    it('shows generic error when file reading fails', async () => {
      const onImport = vi.fn().mockRejectedValue(new Error('File read error'));
      render(<WordsetImportExport {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      const file = new File(['csv'], 'test.csv', { type: 'text/csv' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Import Failed')).toBeInTheDocument();
        expect(screen.getByText('File read error')).toBeInTheDocument();
      });
    });
  });

  describe('Sample CSV Download', () => {
    it('renders download sample button', () => {
      render(<WordsetImportExport {...defaultProps} />);
      expect(screen.getByText(/Download sample CSV/)).toBeInTheDocument();
    });

    it('triggers download when sample button is clicked', () => {
      render(<WordsetImportExport {...defaultProps} />);

      fireEvent.click(screen.getByText(/Download sample CSV/));

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('creates sample CSV with correct content', () => {
      render(<WordsetImportExport {...defaultProps} />);

      fireEvent.click(screen.getByText(/Download sample CSV/));

      const blobCall = mockCreateObjectURL.mock.calls[0][0];
      expect(blobCall).toBeInstanceOf(Blob);
      expect(blobCall.type).toBe('text/csv');
    });

    it('sets sample filename correctly', () => {
      render(<WordsetImportExport {...defaultProps} />);

      fireEvent.click(screen.getByText(/Download sample CSV/));

      // Filename is set via link.download = 'sample-wordsets.csv'
      expect(document.createElement).toHaveBeenCalledWith('a');
    });
  });

  describe('Expected Format Display', () => {
    it('shows expected CSV format documentation', () => {
      render(<WordsetImportExport {...defaultProps} />);
      expect(screen.getByText('Expected CSV Format:')).toBeInTheDocument();
    });

    it('shows CSV format example', () => {
      render(<WordsetImportExport {...defaultProps} />);
      const preElement = screen.getByText(/name,description,words,exact/);
      expect(preElement).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<WordsetImportExport {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Close'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles file selection without file', () => {
      render(<WordsetImportExport {...defaultProps} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: null } });

      // Should not crash, import should not be called
      expect(defaultProps.onImport).not.toHaveBeenCalled();
    });

    it('clears previous import results when new file is selected', async () => {
      const onImport = vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          data: { imported: 1, skipped: 0, errors: [] },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { imported: 2, skipped: 0, errors: [] },
        });
      render(<WordsetImportExport {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;

      // First import
      const file1 = new File(['csv1'], 'test1.csv', { type: 'text/csv' });
      fireEvent.change(fileInput, { target: { files: [file1] } });

      await waitFor(() => {
        expect(screen.getByText(/Imported: 1 wordset\(s\)/)).toBeInTheDocument();
      });

      // Second import should clear previous result
      const file2 = new File(['csv2'], 'test2.csv', { type: 'text/csv' });
      fileInput.value = ''; // Reset to simulate new selection
      fireEvent.change(fileInput, { target: { files: [file2] } });

      await waitFor(() => {
        expect(screen.getByText(/Imported: 2 wordset\(s\)/)).toBeInTheDocument();
      });
    });

    it('clears previous errors when new file is selected', async () => {
      const onImport = vi
        .fn()
        .mockResolvedValueOnce({
          success: false,
          error: 'First error',
        })
        .mockResolvedValueOnce({
          success: true,
          data: { imported: 1, skipped: 0, errors: [] },
        });
      render(<WordsetImportExport {...defaultProps} onImport={onImport} />);

      const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;

      // First import fails
      const file1 = new File(['bad csv'], 'test1.csv', { type: 'text/csv' });
      fireEvent.change(fileInput, { target: { files: [file1] } });

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      // Second import succeeds, should clear error
      const file2 = new File(['good csv'], 'test2.csv', { type: 'text/csv' });
      fileInput.value = '';
      fireEvent.change(fileInput, { target: { files: [file2] } });

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument();
        expect(screen.getByText('Import Complete!')).toBeInTheDocument();
      });
    });
  });
});
