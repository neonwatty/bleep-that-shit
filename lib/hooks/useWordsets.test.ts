import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWordsets } from './useWordsets';
import type { Wordset } from '@/lib/types/wordset';

// Mock wordsetOperations
const mockInitializeDefaultWordsets = vi.fn();
const mockGetAllWordsets = vi.fn();
const mockCreateWordset = vi.fn();
const mockUpdateWordset = vi.fn();
const mockDeleteWordset = vi.fn();
const mockDuplicateWordset = vi.fn();
const mockSearchWordsets = vi.fn();
const mockExportWordsetsCSV = vi.fn();
const mockImportWordsetsCSV = vi.fn();

vi.mock('@/lib/utils/db/wordsetOperations', () => ({
  initializeDefaultWordsets: (...args: unknown[]) => mockInitializeDefaultWordsets(...args),
  getAllWordsets: (...args: unknown[]) => mockGetAllWordsets(...args),
  createWordset: (...args: unknown[]) => mockCreateWordset(...args),
  updateWordset: (...args: unknown[]) => mockUpdateWordset(...args),
  deleteWordset: (...args: unknown[]) => mockDeleteWordset(...args),
  duplicateWordset: (...args: unknown[]) => mockDuplicateWordset(...args),
  searchWordsets: (...args: unknown[]) => mockSearchWordsets(...args),
  exportWordsetsCSV: (...args: unknown[]) => mockExportWordsetsCSV(...args),
  importWordsetsCSV: (...args: unknown[]) => mockImportWordsetsCSV(...args),
}));

// Mock dexie-react-hooks
let liveQueryCallbacks: Array<() => Promise<unknown>> = [];

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (callback: () => Promise<unknown>, deps: unknown[]) => {
    liveQueryCallbacks.push(callback);
    // Execute callback immediately and return the result
    const [result, setResult] = [null, () => {}];
    callback().then(setResult);
    return result;
  },
}));

describe('useWordsets', () => {
  const mockWordset1: Wordset = {
    id: 1,
    name: 'Test Wordset 1',
    description: 'Test description',
    words: ['word1', 'word2'],
    matchMode: { exact: true, partial: false, fuzzy: false },
    fuzzyDistance: 0,
    color: '#FF0000',
    isDefault: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockWordset2: Wordset = {
    id: 2,
    name: 'Test Wordset 2',
    words: ['word3', 'word4'],
    matchMode: { exact: false, partial: true, fuzzy: false },
    fuzzyDistance: 0,
    isDefault: false,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  };

  beforeEach(() => {
    liveQueryCallbacks = [];
    vi.clearAllMocks();

    // Default mock implementations
    mockInitializeDefaultWordsets.mockResolvedValue(undefined);
    mockGetAllWordsets.mockResolvedValue({
      success: true,
      data: [mockWordset1, mockWordset2],
    });
    mockSearchWordsets.mockResolvedValue({
      success: true,
      data: [],
    });
  });

  afterEach(() => {
    liveQueryCallbacks = [];
  });

  describe('initialization', () => {
    it('should initialize database on mount', async () => {
      renderHook(() => useWordsets());

      await waitFor(() => {
        expect(mockInitializeDefaultWordsets).toHaveBeenCalledOnce();
      });
    });

    it('should set isInitialized to true after successful initialization', async () => {
      const { result } = renderHook(() => useWordsets());

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
    });

    it('should set error when initialization fails', async () => {
      mockInitializeDefaultWordsets.mockRejectedValue(new Error('Init failed'));

      const { result } = renderHook(() => useWordsets());

      await waitFor(() => {
        expect(result.current.error).toContain('Init failed');
      });
    });
  });

  describe('wordsets state', () => {
    it('should return empty array initially', () => {
      const { result } = renderHook(() => useWordsets());

      expect(result.current.wordsets).toEqual([]);
    });

    it('should return allWordsets separately', () => {
      const { result } = renderHook(() => useWordsets());

      expect(result.current.allWordsets).toEqual([]);
    });
  });

  describe('searchQuery', () => {
    it('should have empty search query by default', () => {
      const { result } = renderHook(() => useWordsets());

      expect(result.current.searchQuery).toBe('');
    });

    it('should update search query when setSearchQuery is called', () => {
      const { result } = renderHook(() => useWordsets());

      act(() => {
        result.current.setSearchQuery('test');
      });

      expect(result.current.searchQuery).toBe('test');
    });
  });

  describe('create', () => {
    it('should create a wordset successfully', async () => {
      mockCreateWordset.mockResolvedValue({
        success: true,
        data: 1,
      });

      const { result } = renderHook(() => useWordsets());

      let createResult;
      await act(async () => {
        createResult = await result.current.create({
          name: 'New Wordset',
          words: ['test'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        });
      });

      expect(mockCreateWordset).toHaveBeenCalledWith({
        name: 'New Wordset',
        words: ['test'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      });
      expect(createResult).toEqual({ success: true, data: 1 });
    });

    it('should set error when create fails', async () => {
      mockCreateWordset.mockResolvedValue({
        success: false,
        error: 'Create failed',
      });

      const { result } = renderHook(() => useWordsets());

      await act(async () => {
        await result.current.create({
          name: 'New Wordset',
          words: ['test'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        });
      });

      expect(result.current.error).toBe('Create failed');
    });
  });

  describe('update', () => {
    it('should update a wordset successfully', async () => {
      mockUpdateWordset.mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useWordsets());

      let updateResult;
      await act(async () => {
        updateResult = await result.current.update(1, {
          name: 'Updated Name',
        });
      });

      expect(mockUpdateWordset).toHaveBeenCalledWith(1, {
        name: 'Updated Name',
      });
      expect(updateResult).toEqual({ success: true });
    });

    it('should set error when update fails', async () => {
      mockUpdateWordset.mockResolvedValue({
        success: false,
        error: 'Update failed',
      });

      const { result } = renderHook(() => useWordsets());

      await act(async () => {
        await result.current.update(1, { name: 'Updated' });
      });

      expect(result.current.error).toBe('Update failed');
    });
  });

  describe('remove', () => {
    it('should delete a wordset successfully', async () => {
      mockDeleteWordset.mockResolvedValue({
        success: true,
      });

      const { result } = renderHook(() => useWordsets());

      let removeResult;
      await act(async () => {
        removeResult = await result.current.remove(1);
      });

      expect(mockDeleteWordset).toHaveBeenCalledWith(1);
      expect(removeResult).toEqual({ success: true });
    });

    it('should set error when delete fails', async () => {
      mockDeleteWordset.mockResolvedValue({
        success: false,
        error: 'Delete failed',
      });

      const { result } = renderHook(() => useWordsets());

      await act(async () => {
        await result.current.remove(1);
      });

      expect(result.current.error).toBe('Delete failed');
    });
  });

  describe('duplicate', () => {
    it('should duplicate a wordset successfully', async () => {
      mockDuplicateWordset.mockResolvedValue({
        success: true,
        data: 3,
      });

      const { result } = renderHook(() => useWordsets());

      let duplicateResult;
      await act(async () => {
        duplicateResult = await result.current.duplicate(1);
      });

      expect(mockDuplicateWordset).toHaveBeenCalledWith(1);
      expect(duplicateResult).toEqual({ success: true, data: 3 });
    });

    it('should set error when duplicate fails', async () => {
      mockDuplicateWordset.mockResolvedValue({
        success: false,
        error: 'Duplicate failed',
      });

      const { result } = renderHook(() => useWordsets());

      await act(async () => {
        await result.current.duplicate(1);
      });

      expect(result.current.error).toBe('Duplicate failed');
    });
  });

  describe('exportCSV', () => {
    it('should export all wordsets when no IDs provided', async () => {
      mockExportWordsetsCSV.mockResolvedValue({
        success: true,
        data: 'csv,data',
      });

      const { result } = renderHook(() => useWordsets());

      let exportResult;
      await act(async () => {
        exportResult = await result.current.exportCSV();
      });

      expect(mockExportWordsetsCSV).toHaveBeenCalledWith(undefined);
      expect(exportResult).toEqual({ success: true, data: 'csv,data' });
    });

    it('should export specific wordsets when IDs provided', async () => {
      mockExportWordsetsCSV.mockResolvedValue({
        success: true,
        data: 'csv,data',
      });

      const { result } = renderHook(() => useWordsets());

      await act(async () => {
        await result.current.exportCSV([1, 2]);
      });

      expect(mockExportWordsetsCSV).toHaveBeenCalledWith([1, 2]);
    });
  });

  describe('importCSV', () => {
    it('should import CSV in merge mode by default', async () => {
      mockImportWordsetsCSV.mockResolvedValue({
        success: true,
        data: { imported: 1, skipped: 0, errors: [] },
      });

      const { result } = renderHook(() => useWordsets());

      const csvData = 'name,words\nTest,word1;word2';

      await act(async () => {
        await result.current.importCSV(csvData);
      });

      expect(mockImportWordsetsCSV).toHaveBeenCalledWith(csvData, { merge: true });
    });

    it('should import CSV in skip mode when specified', async () => {
      mockImportWordsetsCSV.mockResolvedValue({
        success: true,
        data: { imported: 1, skipped: 0, errors: [] },
      });

      const { result } = renderHook(() => useWordsets());

      const csvData = 'name,words\nTest,word1;word2';

      await act(async () => {
        await result.current.importCSV(csvData, false);
      });

      expect(mockImportWordsetsCSV).toHaveBeenCalledWith(csvData, { merge: false });
    });

    it('should set error when import fails', async () => {
      mockImportWordsetsCSV.mockResolvedValue({
        success: false,
        error: 'Import failed',
      });

      const { result } = renderHook(() => useWordsets());

      await act(async () => {
        await result.current.importCSV('invalid,csv');
      });

      expect(result.current.error).toBe('Import failed');
    });
  });

  describe('clearError', () => {
    it('should clear error when called', async () => {
      mockCreateWordset.mockResolvedValue({
        success: false,
        error: 'Test error',
      });

      const { result } = renderHook(() => useWordsets());

      // Set an error
      await act(async () => {
        await result.current.create({
          name: 'Test',
          words: ['test'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        });
      });

      expect(result.current.error).toBe('Test error');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('callbacks stability', () => {
    it('should return stable callbacks', () => {
      const { result, rerender } = renderHook(() => useWordsets());

      const firstCreate = result.current.create;
      const firstUpdate = result.current.update;
      const firstRemove = result.current.remove;
      const firstDuplicate = result.current.duplicate;
      const firstExportCSV = result.current.exportCSV;
      const firstImportCSV = result.current.importCSV;
      const firstClearError = result.current.clearError;

      rerender();

      expect(result.current.create).toBe(firstCreate);
      expect(result.current.update).toBe(firstUpdate);
      expect(result.current.remove).toBe(firstRemove);
      expect(result.current.duplicate).toBe(firstDuplicate);
      expect(result.current.exportCSV).toBe(firstExportCSV);
      expect(result.current.importCSV).toBe(firstImportCSV);
      expect(result.current.clearError).toBe(firstClearError);
    });
  });
});
