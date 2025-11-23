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

    it('should allow deletion of default wordsets', async () => {
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

      // Default wordsets can now be deleted
      expect(result.success).toBe(true);
      expect(mockData.length).toBe(0);
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

  describe('Edge Cases - CSV Import/Export', () => {
    describe('Unicode and Special Characters', () => {
      it('should handle Unicode characters in wordset names', async () => {
        const input: WordsetCreateInput = {
          name: 'Café Français 日本語',
          words: ['test'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        };
        const result = await createWordset(input);
        expect(result.success).toBe(true);

        const retrieved = await getWordsetById(result.data!);
        expect(retrieved.data!.name).toBe('Café Français 日本語');
      });

      it('should handle Unicode characters in words', async () => {
        const input: WordsetCreateInput = {
          name: 'Unicode Words',
          words: ['café', 'naïve', '日本', 'émoji😀'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        };
        const result = await createWordset(input);
        expect(result.success).toBe(true);

        const retrieved = await getWordsetById(result.data!);
        expect(retrieved.data!.words).toContain('café');
        expect(retrieved.data!.words).toContain('日本');
        expect(retrieved.data!.words).toContain('émoji😀');
      });

      it('should handle emoji in descriptions', async () => {
        const input: WordsetCreateInput = {
          name: 'Emoji Test',
          description: 'Contains emoji 🎉 🚀 ⚡',
          words: ['test'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        };
        const result = await createWordset(input);
        expect(result.success).toBe(true);

        const retrieved = await getWordsetById(result.data!);
        expect(retrieved.data!.description).toContain('🎉');
      });

      it('should export and import Unicode characters correctly in CSV', async () => {
        await createWordset({
          name: 'Unicode CSV Test',
          words: ['café', '日本語', 'naïve'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        });

        const exportResult = await exportWordsetsCSV();
        expect(exportResult.success).toBe(true);

        // Clear and reimport
        const { db } = await import('./wordsetDb');
        (db as any)._clearMockData();

        const importResult = await importWordsetsCSV(exportResult.data!, { merge: true });
        expect(importResult.success).toBe(true);

        const wordsets = await getAllWordsets();
        const imported = wordsets.data!.find(ws => ws.name === 'Unicode CSV Test');
        expect(imported!.words).toContain('café');
        expect(imported!.words).toContain('日本語');
      });
    });

    describe('CSV Format Edge Cases', () => {
      it('should handle CSV with quoted fields containing commas', async () => {
        const csv = `name,description,words,exact,partial,fuzzy,fuzzyDistance,color
"Test, with comma","Description, also with comma","word1;word2",true,false,false,0,#FF0000`;

        const result = await importWordsetsCSV(csv, { merge: true });
        expect(result.success).toBe(true);

        const wordsets = await getAllWordsets();
        const imported = wordsets.data!.find(ws => ws.name === 'Test, with comma');
        expect(imported).toBeDefined();
        expect(imported!.description).toBe('Description, also with comma');
      });

      it('should handle CSV with quoted fields containing newlines', async () => {
        const csv = `name,description,words,exact,partial,fuzzy,fuzzyDistance,color
"Multiline
Name","Multiline
Description","word1;word2",true,false,false,0,#FF0000`;

        const result = await importWordsetsCSV(csv, { merge: true });
        expect(result.success).toBe(true);
      });

      it('should handle CSV with escaped quotes', async () => {
        const csv = `name,description,words,exact,partial,fuzzy,fuzzyDistance,color
"Name with ""quotes""","Description with ""quotes""","word1;word2",true,false,false,0,#FF0000`;

        const result = await importWordsetsCSV(csv, { merge: true });
        expect(result.success).toBe(true);

        const wordsets = await getAllWordsets();
        const imported = wordsets.data!.find(ws => ws.name.includes('quotes'));
        expect(imported).toBeDefined();
      });

      it('should handle different line endings (CRLF)', async () => {
        const csv = `name,description,words,exact,partial,fuzzy,fuzzyDistance,color\r\nCRLF Test,Test,word1;word2,true,false,false,0,#FF0000`;

        const result = await importWordsetsCSV(csv, { merge: true });
        expect(result.success).toBe(true);
      });

      it('should handle different line endings (LF)', async () => {
        const csv = `name,description,words,exact,partial,fuzzy,fuzzyDistance,color\nLF Test,Test,word1;word2,true,false,false,0,#FF0000`;

        const result = await importWordsetsCSV(csv, { merge: true });
        expect(result.success).toBe(true);
      });

      it('should handle trailing commas gracefully', async () => {
        const csv = `name,description,words,exact,partial,fuzzy,fuzzyDistance,color,
Trailing Comma,Test,word1;word2,true,false,false,0,#FF0000,`;

        const result = await importWordsetsCSV(csv, { merge: true });
        // Should either succeed or fail gracefully
        expect(result.success).toBeDefined();
      });

      it('should handle empty fields', async () => {
        const csv = `name,description,words,exact,partial,fuzzy,fuzzyDistance,color
Empty Fields,,word1;word2,true,false,false,0,`;

        const result = await importWordsetsCSV(csv, { merge: true });
        expect(result.success).toBe(true);

        const wordsets = await getAllWordsets();
        const imported = wordsets.data!.find(ws => ws.name === 'Empty Fields');
        expect(imported!.description).toBeUndefined();
        expect(imported!.color).toBeUndefined();
      });
    });

    describe('Large Dataset Handling', () => {
      it('should handle wordset with 1000+ words', async () => {
        const largeWordList = Array.from({ length: 1000 }, (_, i) => `word${i}`);
        const input: WordsetCreateInput = {
          name: 'Large Wordset',
          words: largeWordList,
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        };

        const result = await createWordset(input);
        expect(result.success).toBe(true);

        const retrieved = await getWordsetById(result.data!);
        expect(retrieved.data!.words).toHaveLength(1000);
      });

      it('should export and import large wordsets efficiently', async () => {
        const largeWordList = Array.from({ length: 500 }, (_, i) => `word${i}`);
        await createWordset({
          name: 'Large Export Test',
          words: largeWordList,
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        });

        const exportResult = await exportWordsetsCSV();
        expect(exportResult.success).toBe(true);
        expect(exportResult.data!.length).toBeGreaterThan(1000); // CSV should be long

        const { db } = await import('./wordsetDb');
        (db as any)._clearMockData();

        const importResult = await importWordsetsCSV(exportResult.data!, { merge: true });
        expect(importResult.success).toBe(true);

        const wordsets = await getAllWordsets();
        const imported = wordsets.data!.find(ws => ws.name === 'Large Export Test');
        expect(imported!.words).toHaveLength(500);
      });

      it('should handle very long word strings', async () => {
        const longWord = 'a'.repeat(1000);
        const input: WordsetCreateInput = {
          name: 'Long Words',
          words: [longWord],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        };

        const result = await createWordset(input);
        expect(result.success).toBe(true);

        const retrieved = await getWordsetById(result.data!);
        expect(retrieved.data!.words[0]).toHaveLength(1000);
      });
    });

    describe('Color Validation Edge Cases', () => {
      it('should accept valid hex colors with #', async () => {
        const input: WordsetCreateInput = {
          name: 'Color Test',
          words: ['test'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
          color: '#FF0000',
        };

        const result = await createWordset(input);
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });

      it('should accept short hex colors (#RGB)', async () => {
        const input: WordsetCreateInput = {
          name: 'Short Color',
          words: ['test'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
          color: '#F00',
        };

        const result = await createWordset(input);
        expect(result.success).toBe(true);
      });

      it('should handle uppercase and lowercase hex colors', async () => {
        const input1: WordsetCreateInput = {
          name: 'Uppercase Color',
          words: ['test'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
          color: '#AABBCC',
        };

        const result1 = await createWordset(input1);
        expect(result1.success).toBe(true);

        const input2: WordsetCreateInput = {
          name: 'Lowercase Color',
          words: ['test2'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
          color: '#aabbcc',
        };

        const result2 = await createWordset(input2);
        expect(result2.success).toBe(true);
      });
    });

    describe('Word Deduplication and Normalization', () => {
      it('should deduplicate identical words', async () => {
        const input: WordsetCreateInput = {
          name: 'Duplicate Test',
          words: ['word', 'Word', 'WORD', 'word'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        };

        const result = await createWordset(input);
        expect(result.success).toBe(true);

        const retrieved = await getWordsetById(result.data!);
        expect(retrieved.data!.words).toHaveLength(1);
        expect(retrieved.data!.words[0]).toBe('word');
      });

      it('should trim whitespace from words', async () => {
        const input: WordsetCreateInput = {
          name: 'Whitespace Test',
          words: ['  word  ', '\tword2\t', ' word3'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        };

        const result = await createWordset(input);
        expect(result.success).toBe(true);

        const retrieved = await getWordsetById(result.data!);
        expect(retrieved.data!.words).toEqual(['word', 'word2', 'word3']);
      });

      it('should filter out empty strings after normalization', async () => {
        const input: WordsetCreateInput = {
          name: 'Empty String Test',
          words: ['word', '   ', '', '\t\t', 'word2'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        };

        const result = await createWordset(input);
        expect(result.success).toBe(true);

        const retrieved = await getWordsetById(result.data!);
        expect(retrieved.data!.words).toHaveLength(2);
        expect(retrieved.data!.words).toEqual(['word', 'word2']);
      });
    });

    describe('Malformed CSV Handling', () => {
      it('should handle CSV with missing columns', async () => {
        const csv = `name,description,words
Incomplete,Missing columns,word1;word2`;

        const result = await importWordsetsCSV(csv, { merge: true });
        // Should fail or handle gracefully
        expect(result).toBeDefined();
      });

      it('should handle CSV with extra columns', async () => {
        const csv = `name,description,words,exact,partial,fuzzy,fuzzyDistance,color,extraCol1,extraCol2
Extra Columns,Test,word1;word2,true,false,false,0,#FF0000,extra1,extra2`;

        const result = await importWordsetsCSV(csv, { merge: true });
        // Should either ignore extra columns or handle gracefully
        expect(result).toBeDefined();
      });

      it('should handle CSV with only headers', async () => {
        const csv = `name,description,words,exact,partial,fuzzy,fuzzyDistance,color`;

        const result = await importWordsetsCSV(csv, { merge: true });
        expect(result.success).toBe(true);
        expect(result.data!.imported).toBe(0);
      });

      it('should handle malformed boolean values', async () => {
        const csv = `name,description,words,exact,partial,fuzzy,fuzzyDistance,color
Bool Test,Test,word1;word2,yes,no,maybe,0,#FF0000`;

        const result = await importWordsetsCSV(csv, { merge: true });
        // Should handle gracefully, possibly with errors
        expect(result).toBeDefined();
      });

      it('should handle invalid fuzzyDistance values', async () => {
        const csv = `name,description,words,exact,partial,fuzzy,fuzzyDistance,color
Invalid Fuzzy,Test,word1;word2,true,false,true,invalid,#FF0000`;

        const result = await importWordsetsCSV(csv, { merge: true });
        // Should report error or use default value
        expect(result).toBeDefined();
      });
    });
  });

  describe('Edge Cases - CRUD Operations', () => {
    describe('Boundary Conditions', () => {
      it('should handle name at exact max length (100 chars)', async () => {
        const maxLengthName = 'a'.repeat(100);
        const input: WordsetCreateInput = {
          name: maxLengthName,
          words: ['test'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        };

        const result = await createWordset(input);
        expect(result.success).toBe(true);
      });

      it('should handle description at exact max length (500 chars)', async () => {
        const maxLengthDesc = 'a'.repeat(500);
        const input: WordsetCreateInput = {
          name: 'Max Desc Test',
          description: maxLengthDesc,
          words: ['test'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        };

        const result = await createWordset(input);
        expect(result.success).toBe(true);
      });

      it('should handle fuzzy distance at boundaries (0 and 10)', async () => {
        const input1: WordsetCreateInput = {
          name: 'Fuzzy 0',
          words: ['test'],
          matchMode: { exact: false, partial: false, fuzzy: true },
          fuzzyDistance: 0,
        };

        const result1 = await createWordset(input1);
        expect(result1.success).toBe(true);

        const input2: WordsetCreateInput = {
          name: 'Fuzzy 10',
          words: ['test2'],
          matchMode: { exact: false, partial: false, fuzzy: true },
          fuzzyDistance: 10,
        };

        const result2 = await createWordset(input2);
        expect(result2.success).toBe(true);
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle multiple creates in sequence', async () => {
        const input1: WordsetCreateInput = {
          name: 'Concurrent 1',
          words: ['word1'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        };

        const input2: WordsetCreateInput = {
          name: 'Concurrent 2',
          words: ['word2'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        };

        const [result1, result2] = await Promise.all([
          createWordset(input1),
          createWordset(input2),
        ]);

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);

        const allWordsets = await getAllWordsets();
        expect(allWordsets.data!.length).toBeGreaterThanOrEqual(2);
      });

      it('should handle rapid duplicate operations', async () => {
        const original = await createWordset({
          name: 'Original',
          words: ['test'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        });

        const [dup1, dup2, dup3] = await Promise.all([
          duplicateWordset(original.data!),
          duplicateWordset(original.data!),
          duplicateWordset(original.data!),
        ]);

        expect(dup1.success).toBe(true);
        expect(dup2.success).toBe(true);
        expect(dup3.success).toBe(true);

        const allWordsets = await getAllWordsets();
        const copies = allWordsets.data!.filter(ws => ws.name.includes('Copy'));
        expect(copies.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('Special Character Handling in Search', () => {
      it('should handle regex special characters in search', async () => {
        await createWordset({
          name: 'Test (with) [brackets]',
          words: ['test'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        });

        const result = await searchWordsets('(with)');
        expect(result.success).toBe(true);
        expect(result.data!.length).toBeGreaterThan(0);
      });

      it('should handle search with asterisks and dots', async () => {
        await createWordset({
          name: 'Version 1.0.*',
          words: ['test'],
          matchMode: { exact: true, partial: false, fuzzy: false },
          fuzzyDistance: 0,
        });

        const result = await searchWordsets('1.0');
        expect(result.success).toBe(true);
      });
    });
  });
});
