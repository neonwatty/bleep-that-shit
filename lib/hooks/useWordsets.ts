import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  getAllWordsets,
  createWordset,
  updateWordset,
  deleteWordset,
  duplicateWordset,
  searchWordsets,
  exportWordsetsCSV,
  importWordsetsCSV,
  initializeDefaultWordsets,
} from '@/lib/utils/db/wordsetOperations';
import type { Wordset, WordsetCreateInput, WordsetUpdateInput } from '@/lib/types/wordset';

export function useWordsets() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Live query - automatically updates when DB changes
  const allWordsets = useLiveQuery(async () => {
    const result = await getAllWordsets();
    return result.success ? result.data : [];
  }, []);

  // Filtered wordsets based on search query
  const wordsets = useLiveQuery(async () => {
    if (!searchQuery) {
      const result = await getAllWordsets();
      return result.success ? result.data : [];
    }
    const result = await searchWordsets(searchQuery);
    return result.success ? result.data : [];
  }, [searchQuery]);

  // Initialize database on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initializeDefaultWordsets();
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize database');
      }
    };
    init();
  }, []);

  const create = useCallback(async (wordset: WordsetCreateInput) => {
    const result = await createWordset(wordset);
    if (!result.success) {
      setError(result.error || 'Failed to create wordset');
    }
    return result;
  }, []);

  const update = useCallback(async (id: number, updates: WordsetUpdateInput) => {
    const result = await updateWordset(id, updates);
    if (!result.success) {
      setError(result.error || 'Failed to update wordset');
    }
    return result;
  }, []);

  const remove = useCallback(async (id: number) => {
    const result = await deleteWordset(id);
    if (!result.success) {
      setError(result.error || 'Failed to delete wordset');
    }
    return result;
  }, []);

  const duplicate = useCallback(async (id: number) => {
    const result = await duplicateWordset(id);
    if (!result.success) {
      setError(result.error || 'Failed to duplicate wordset');
    }
    return result;
  }, []);

  const exportCSV = useCallback(async (ids?: number[]) => {
    return await exportWordsetsCSV(ids);
  }, []);

  const importCSV = useCallback(async (csvData: string, merge: boolean = true) => {
    const result = await importWordsetsCSV(csvData, { merge });
    if (!result.success) {
      setError(result.error || 'Failed to import CSV');
    }
    return result;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    wordsets: wordsets || [],
    allWordsets: allWordsets || [],
    isInitialized,
    error,
    searchQuery,
    setSearchQuery,
    clearError,
    create,
    update,
    remove,
    duplicate,
    exportCSV,
    importCSV,
  };
}
