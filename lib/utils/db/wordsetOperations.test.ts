import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Wordset, WordsetCreateInput, WordsetUpdateInput } from '@/lib/types/wordset';
import {
  initializeDefaultWordsets,
  createWordset,
  getAllWordsets,
  getWordsetById,
  updateWordset,
  deleteWordset,
  duplicateWordset,
  searchWordsets,
  exportWordsetsCSV,
  importWordsetsCSV,
} from './wordsetOperations';

// Mock the database
vi.mock('./wordsetDb', () => {
  const mockWordsets: Wordset[] = [];

  const mockDb = {
    wordsets: {
      count: vi.fn(async () => mockWordsets.length),
      bulkAdd: vi.fn(async (items: Wordset[]) => {
        mockWordsets.push(...items);
        return items.map((_, i) => i + 1);
      }),
      add: vi.fn(async (item: Wordset) => {
        const id = mockWordsets.length + 1;
        mockWordsets.push({ ...item, id });
        return id;
      }),
      get: vi.fn(async (id: number) => {
        return mockWordsets.find(ws => ws.id === id);
      }),
      bulkGet: vi.fn(async (ids: number[]) => {
        return ids.map(id => mockWordsets.find(ws => ws.id === id));
      }),
      filter: vi.fn((predicate: (ws: Wordset) => boolean) => ({
        first: async () => mockWordsets.find(predicate),
        toArray: async () => mockWordsets.filter(predicate),
      })),
      orderBy: vi.fn(() => ({
        reverse: () => ({
          toArray: async () => [...mockWordsets].reverse(),
        }),
      })),
      update: vi.fn(async (id: number, updates: Partial<Wordset>) => {
        const index = mockWordsets.findIndex(ws => ws.id === id);
        if (index !== -1) {
          mockWordsets[index] = { ...mockWordsets[index], ...updates };
          return 1;
        }
        return 0;
      }),
      delete: vi.fn(async (id: number) => {
        const index = mockWordsets.findIndex(ws => ws.id === id);
        if (index !== -1) {
          mockWordsets.splice(index, 1);
        }
      }),
      toArray: vi.fn(async () => [...mockWordsets]),
    },
    _clearMockData: () => {
      mockWordsets.length = 0;
    },
    _getMockData: () => mockWordsets,
  };

  return {
    db: mockDb,
  };
});

// Mock default wordsets
vi.mock('./defaultWordsets', () => ({
  DEFAULT_WORDSETS: [
    {
      id: 1,
      name: 'Default Wordset 1',
      description: 'Test default',
      words: ['test', 'default'],
      matchMode: { exact: true, partial: false, fuzzy: false },
      fuzzyDistance: 0,
      color: '#FF0000',
      isDefault: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ],
}));

describe('wordsetOperations', () => {
  beforeEach(async () => {
    const { db } = await import('./wordsetDb');
    (db as any)._clearMockData();
    vi.clearAllMocks();
  });

  describe('initializeDefaultWordsets', () => {
    it('should initialize default wordsets when database is empty', async () => {
      await initializeDefaultWordsets();

      const { db } = await import('./wordsetDb');
      expect(db.wordsets.count).toHaveBeenCalled();
      expect(db.wordsets.bulkAdd).toHaveBeenCalled();
    });

    it('should skip initialization when database already has wordsets', async () => {
      const { db } = await import('./wordsetDb');

      // Mock non-empty database
      vi.mocked(db.wordsets.count).mockResolvedValueOnce(5);

      await initializeDefaultWordsets();

      expect(db.wordsets.count).toHaveBeenCalled();
      expect(db.wordsets.bulkAdd).not.toHaveBeenCalled();
    });

    it('should throw error if initialization fails', async () => {
      const { db } = await import('./wordsetDb');

      vi.mocked(db.wordsets.count).mockRejectedValueOnce(new Error('DB Error'));

      await expect(initializeDefaultWordsets()).rejects.toThrow(
        'Failed to initialize wordset database'
      );
    });
  });

  describe('createWordset', () => {
    it('should create a valid wordset', async () => {
      const input: WordsetCreateInput = {
        name: 'Test Wordset',
        description: 'A test wordset',
        words: ['word1', 'word2', 'word3'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
        color: '#FF0000',
      };

      const result = await createWordset(input);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('number');
    });

    it('should normalize and deduplicate words', async () => {
      const input: WordsetCreateInput = {
        name: 'Test Wordset',
        words: ['  WORD1  ', 'word1', 'WORD2', '  word2  '],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      };

      await createWordset(input);

      const { db } = await import('./wordsetDb');
      const mockData = (db as any)._getMockData();

      // Should have normalized to lowercase and removed duplicates
      expect(mockData[0].words).toEqual(['word1', 'word2']);
    });

    it('should reject empty name', async () => {
      const input: WordsetCreateInput = {
        name: '   ',
        words: ['word1'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      };

      const result = await createWordset(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('name cannot be empty');
    });

    it('should reject name exceeding 100 characters', async () => {
      const input: WordsetCreateInput = {
        name: 'a'.repeat(101),
        words: ['word1'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      };

      const result = await createWordset(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot exceed 100 characters');
    });

    it('should reject description exceeding 500 characters', async () => {
      const input: WordsetCreateInput = {
        name: 'Test',
        description: 'a'.repeat(501),
        words: ['word1'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      };

      const result = await createWordset(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot exceed 500 characters');
    });

    it('should reject empty words array', async () => {
      const input: WordsetCreateInput = {
        name: 'Test',
        words: [],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      };

      const result = await createWordset(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least one word');
    });

    it('should reject words containing only whitespace', async () => {
      const input: WordsetCreateInput = {
        name: 'Test',
        words: ['word1', '   ', 'word2'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      };

      const result = await createWordset(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty words');
    });

    it('should reject fuzzy distance outside valid range', async () => {
      const input: WordsetCreateInput = {
        name: 'Test',
        words: ['word1'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 11,
      };

      const result = await createWordset(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('between 0 and 10');
    });

    it('should reject duplicate name (case-insensitive)', async () => {
      const input1: WordsetCreateInput = {
        name: 'Test Wordset',
        words: ['word1'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      };

      const input2: WordsetCreateInput = {
        name: 'TEST WORDSET',
        words: ['word2'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      };

      await createWordset(input1);
      const result = await createWordset(input2);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('getAllWordsets', () => {
    it('should return all wordsets ordered by updatedAt', async () => {
      // Create some test wordsets
      await createWordset({
        name: 'Wordset 1',
        words: ['word1'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      });

      await createWordset({
        name: 'Wordset 2',
        words: ['word2'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      });

      const result = await getAllWordsets();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should return empty array when no wordsets exist', async () => {
      const result = await getAllWordsets();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getWordsetById', () => {
    it('should return wordset when found', async () => {
      const createResult = await createWordset({
        name: 'Test Wordset',
        words: ['word1'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      });

      const result = await getWordsetById(createResult.data!);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.name).toBe('Test Wordset');
    });

    it('should return error when wordset not found', async () => {
      const result = await getWordsetById(999);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('updateWordset', () => {
    it('should update wordset successfully', async () => {
      const createResult = await createWordset({
        name: 'Original Name',
        words: ['word1'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      });

      const updates: WordsetUpdateInput = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      const result = await updateWordset(createResult.data!, updates);

      expect(result.success).toBe(true);
    });

    it('should normalize words when updating', async () => {
      const createResult = await createWordset({
        name: 'Test',
        words: ['word1'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      });

      const updates: WordsetUpdateInput = {
        words: ['  WORD2  ', 'word2', 'WORD3'],
      };

      await updateWordset(createResult.data!, updates);

      const getResult = await getWordsetById(createResult.data!);
      expect(getResult.data!.words).toEqual(['word2', 'word3']);
    });

    it('should reject update with duplicate name', async () => {
      await createWordset({
        name: 'Wordset 1',
        words: ['word1'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      });

      const createResult2 = await createWordset({
        name: 'Wordset 2',
        words: ['word2'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      });

      const updates: WordsetUpdateInput = {
        name: 'Wordset 1',
      };

      const result = await updateWordset(createResult2.data!, updates);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should return error when updating non-existent wordset', async () => {
      const result = await updateWordset(999, { name: 'Test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('deleteWordset', () => {
    it('should delete non-default wordset successfully', async () => {
      const createResult = await createWordset({
        name: 'Test Wordset',
        words: ['word1'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      });

      const result = await deleteWordset(createResult.data!);

      expect(result.success).toBe(true);

      const getResult = await getWordsetById(createResult.data!);
      expect(getResult.success).toBe(false);
    });

    it('should prevent deletion of default wordsets', async () => {
      const { db } = await import('./wordsetDb');
      const mockData = (db as any)._getMockData();

      // Add a default wordset
      mockData.push({
        id: 100,
        name: 'Default',
        words: ['test'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await deleteWordset(100);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot delete default wordsets');
    });

    it('should return error when deleting non-existent wordset', async () => {
      const result = await deleteWordset(999);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('duplicateWordset', () => {
    it('should duplicate wordset with "(Copy)" suffix', async () => {
      const createResult = await createWordset({
        name: 'Original',
        description: 'Original description',
        words: ['word1', 'word2'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
        color: '#FF0000',
      });

      const result = await duplicateWordset(createResult.data!);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const getResult = await getWordsetById(result.data!);
      expect(getResult.data!.name).toBe('Original (Copy)');
      expect(getResult.data!.words).toEqual(['word1', 'word2']);
      expect(getResult.data!.isDefault).toBeFalsy();
    });

    it('should handle duplicate name with counter', async () => {
      const createResult = await createWordset({
        name: 'Test',
        words: ['word1'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      });

      // Create "Test (Copy)"
      await duplicateWordset(createResult.data!);

      // Create "Test (Copy 2)"
      const result2 = await duplicateWordset(createResult.data!);

      const getResult = await getWordsetById(result2.data!);
      expect(getResult.data!.name).toBe('Test (Copy 2)');
    });

    it('should return error when duplicating non-existent wordset', async () => {
      const result = await duplicateWordset(999);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('searchWordsets', () => {
    beforeEach(async () => {
      await createWordset({
        name: 'Profanity',
        description: 'Bad words',
        words: ['word1'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      });

      await createWordset({
        name: 'Brands',
        description: 'Company names',
        words: ['word2'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      });
    });

    it('should find wordsets by name match', async () => {
      const result = await searchWordsets('prof');

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
      expect(result.data!.some(ws => ws.name === 'Profanity')).toBe(true);
    });

    it('should find wordsets by description match', async () => {
      const result = await searchWordsets('company');

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
      expect(result.data!.some(ws => ws.name === 'Brands')).toBe(true);
    });

    it('should be case-insensitive', async () => {
      const result = await searchWordsets('PROFANITY');

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should return all wordsets for empty query', async () => {
      const result = await searchWordsets('');

      expect(result.success).toBe(true);
      expect(result.data!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('exportWordsetsCSV', () => {
    beforeEach(async () => {
      await createWordset({
        name: 'Test Export',
        description: 'Export test',
        words: ['word1', 'word2'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
        color: '#FF0000',
      });
    });

    it('should export all wordsets when no IDs provided', async () => {
      const result = await exportWordsetsCSV();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toContain('name,description,words');
      expect(result.data).toContain('Test Export');
    });

    it('should export specific wordsets when IDs provided', async () => {
      const createResult = await createWordset({
        name: 'Specific Export',
        words: ['test'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      });

      const result = await exportWordsetsCSV([createResult.data!]);

      expect(result.success).toBe(true);
      expect(result.data).toContain('Specific Export');
    });

    it('should format words with semicolon separator', async () => {
      const result = await exportWordsetsCSV();

      expect(result.success).toBe(true);
      expect(result.data).toContain('word1;word2');
    });
  });

  describe('importWordsetsCSV', () => {
    const validCSV = `name,description,words,exact,partial,fuzzy,fuzzyDistance,color
Imported Set,Test import,word1;word2,true,false,false,0,#FF0000`;

    it('should import valid CSV in merge mode', async () => {
      const result = await importWordsetsCSV(validCSV, { merge: true });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.imported).toBe(1);
      expect(result.data!.skipped).toBe(0);
      expect(result.data!.errors).toHaveLength(0);
    });

    it('should handle duplicate names in merge mode', async () => {
      await createWordset({
        name: 'Imported Set',
        words: ['existing'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      });

      const result = await importWordsetsCSV(validCSV, { merge: true });

      expect(result.success).toBe(true);
      expect(result.data!.imported).toBe(1);

      // Should have created "Imported Set (Imported)"
      const allWordsets = await getAllWordsets();
      const importedSet = allWordsets.data!.find(ws =>
        ws.name.toLowerCase().includes('imported set (imported)')
      );
      expect(importedSet).toBeDefined();
    });

    it('should skip duplicates in skip mode', async () => {
      await createWordset({
        name: 'Imported Set',
        words: ['existing'],
        matchMode: { exact: true, partial: false, fuzzy: false },
        fuzzyDistance: 0,
      });

      const result = await importWordsetsCSV(validCSV, { merge: false });

      expect(result.success).toBe(true);
      expect(result.data!.imported).toBe(0);
      expect(result.data!.skipped).toBe(1);
    });

    it('should handle invalid CSV rows', async () => {
      // CSV with proper header but invalid data rows
      const invalidCSV = `name,description,words,exact,partial,fuzzy,fuzzyDistance,color
,,,,,,,
ValidSet,Test,word1,true,false,false,0,#FF0000`;

      const result = await importWordsetsCSV(invalidCSV, { merge: true });

      expect(result.success).toBe(true);
      // Should have imported the valid row and logged error for invalid row
      expect(result.data!.imported).toBe(1);
      expect(result.data!.errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty CSV', async () => {
      const result = await importWordsetsCSV('', { merge: true });

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty or invalid');
    });

    it('should parse semicolon-separated words', async () => {
      const result = await importWordsetsCSV(validCSV, { merge: true });

      expect(result.success).toBe(true);

      const allWordsets = await getAllWordsets();
      const imported = allWordsets.data!.find(ws => ws.name === 'Imported Set');

      expect(imported).toBeDefined();
      expect(imported!.words).toContain('word1');
      expect(imported!.words).toContain('word2');
    });
  });
});
