import { db } from './wordsetDb';
import { DEFAULT_WORDSETS } from './defaultWordsets';
import type {
  Wordset,
  WordsetCreateInput,
  WordsetUpdateInput,
  OperationResult,
  ImportResult,
  WordsetCSVRow,
} from '@/lib/types/wordset';

/**
 * Validation helper
 */
function validateWordset(
  wordset: WordsetCreateInput | WordsetUpdateInput
): string | null {
  if ('name' in wordset && wordset.name !== undefined) {
    const trimmedName = wordset.name.trim();
    if (trimmedName.length === 0) {
      return 'Wordset name cannot be empty';
    }
    if (trimmedName.length > 100) {
      return 'Wordset name cannot exceed 100 characters';
    }
  }

  if ('description' in wordset && wordset.description !== undefined) {
    if (wordset.description.length > 500) {
      return 'Description cannot exceed 500 characters';
    }
  }

  if ('words' in wordset && wordset.words !== undefined) {
    if (wordset.words.length === 0) {
      return 'Wordset must contain at least one word';
    }
    if (wordset.words.some(w => !w || w.trim().length === 0)) {
      return 'Wordset cannot contain empty words';
    }
  }

  if ('fuzzyDistance' in wordset && wordset.fuzzyDistance !== undefined) {
    if (wordset.fuzzyDistance < 0 || wordset.fuzzyDistance > 10) {
      return 'Fuzzy distance must be between 0 and 10';
    }
  }

  return null;
}

/**
 * Normalizes and deduplicates words
 */
function normalizeWords(words: string[]): string[] {
  return Array.from(
    new Set(words.map(w => w.trim().toLowerCase()).filter(Boolean))
  );
}

/**
 * Initializes default wordsets on first run
 */
export async function initializeDefaultWordsets(): Promise<void> {
  try {
    const count = await db.wordsets.count();
    if (count === 0) {
      console.log('[DB] First-time initialization: loading default wordsets');
      await db.wordsets.bulkAdd(DEFAULT_WORDSETS);
      console.log(`[DB] Initialized with ${DEFAULT_WORDSETS.length} default wordsets`);
    } else {
      console.log(`[DB] Database already initialized (${count} wordsets)`);
    }
  } catch (error) {
    console.error('[DB] Initialization error:', error);
    throw new Error('Failed to initialize wordset database');
  }
}

/**
 * Creates a new wordset
 */
export async function createWordset(
  input: WordsetCreateInput
): Promise<OperationResult<number>> {
  try {
    // Validate input
    const validationError = validateWordset(input);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Check for duplicate name (case-insensitive)
    const existingWordset = await db.wordsets
      .filter(ws => ws.name.toLowerCase() === input.name.toLowerCase())
      .first();

    if (existingWordset) {
      return {
        success: false,
        error: `A wordset named "${input.name}" already exists`,
      };
    }

    // Normalize and deduplicate words
    const normalizedWords = normalizeWords(input.words);

    // Create wordset with timestamps
    const now = new Date();
    const id = await db.wordsets.add({
      ...input,
      words: normalizedWords,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, data: id };
  } catch (error) {
    console.error('[DB] Error creating wordset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Retrieves all wordsets
 */
export async function getAllWordsets(): Promise<OperationResult<Wordset[]>> {
  try {
    const wordsets = await db.wordsets.orderBy('updatedAt').reverse().toArray();
    return { success: true, data: wordsets };
  } catch (error) {
    console.error('[DB] Error getting wordsets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Retrieves a single wordset by ID
 */
export async function getWordsetById(
  id: number
): Promise<OperationResult<Wordset>> {
  try {
    const wordset = await db.wordsets.get(id);

    if (!wordset) {
      return { success: false, error: 'Wordset not found' };
    }

    return { success: true, data: wordset };
  } catch (error) {
    console.error('[DB] Error getting wordset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Updates an existing wordset
 */
export async function updateWordset(
  id: number,
  updates: WordsetUpdateInput
): Promise<OperationResult<void>> {
  try {
    // Check if wordset exists
    const existing = await db.wordsets.get(id);
    if (!existing) {
      return { success: false, error: 'Wordset not found' };
    }

    // Validate updates
    const validationError = validateWordset(updates);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // Check for duplicate name if name is being updated
    if (updates.name && updates.name !== existing.name) {
      const duplicate = await db.wordsets
        .filter(
          ws => ws.id !== id && ws.name.toLowerCase() === updates.name!.toLowerCase()
        )
        .first();

      if (duplicate) {
        return {
          success: false,
          error: `A wordset named "${updates.name}" already exists`,
        };
      }
    }

    // Normalize words if provided
    const normalizedUpdates = { ...updates };
    if (updates.words) {
      normalizedUpdates.words = normalizeWords(updates.words);
    }

    // Apply updates
    await db.wordsets.update(id, {
      ...normalizedUpdates,
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error('[DB] Error updating wordset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Deletes a wordset by ID
 */
export async function deleteWordset(id: number): Promise<OperationResult<void>> {
  try {
    const existing = await db.wordsets.get(id);
    if (!existing) {
      return { success: false, error: 'Wordset not found' };
    }

    // Prevent deletion of default wordsets
    if (existing.isDefault) {
      return {
        success: false,
        error: 'Cannot delete default wordsets. You can duplicate and modify them instead.',
      };
    }

    await db.wordsets.delete(id);
    return { success: true };
  } catch (error) {
    console.error('[DB] Error deleting wordset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Duplicates a wordset with a new name
 */
export async function duplicateWordset(
  id: number
): Promise<OperationResult<number>> {
  try {
    const original = await db.wordsets.get(id);
    if (!original) {
      return { success: false, error: 'Wordset not found' };
    }

    // Generate unique name
    let copyName = `${original.name} (Copy)`;
    let counter = 2;
    while (
      await db.wordsets
        .filter(ws => ws.name.toLowerCase() === copyName.toLowerCase())
        .first()
    ) {
      copyName = `${original.name} (Copy ${counter})`;
      counter++;
    }

    // Create duplicate (excluding id, timestamps, isDefault)
    const { id: _, createdAt, updatedAt, isDefault, ...rest } = original;
    return await createWordset({
      ...rest,
      name: copyName,
      isDefault: false, // Copies are never default
    });
  } catch (error) {
    console.error('[DB] Error duplicating wordset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Searches wordsets by query string
 */
export async function searchWordsets(
  query: string
): Promise<OperationResult<Wordset[]>> {
  try {
    const queryLower = query.toLowerCase();
    const wordsets = await db.wordsets
      .filter(ws => {
        const nameMatch = ws.name.toLowerCase().includes(queryLower);
        const descMatch = ws.description
          ? ws.description.toLowerCase().includes(queryLower)
          : false;
        return nameMatch || descMatch;
      })
      .toArray();

    return { success: true, data: wordsets };
  } catch (error) {
    console.error('[DB] Error searching wordsets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// CSV IMPORT/EXPORT
// ============================================================================

/**
 * Converts wordset to CSV row
 */
function wordsetToCSVRow(wordset: Wordset): WordsetCSVRow {
  return {
    name: wordset.name,
    description: wordset.description || '',
    words: wordset.words.join(';'), // Semicolon-separated
    exact: wordset.matchMode.exact.toString(),
    partial: wordset.matchMode.partial.toString(),
    fuzzy: wordset.matchMode.fuzzy.toString(),
    fuzzyDistance: wordset.fuzzyDistance.toString(),
    color: wordset.color || '',
  };
}

/**
 * Converts CSV row to wordset
 */
function csvRowToWordset(row: WordsetCSVRow): Omit<Wordset, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: row.name.trim(),
    description: row.description.trim() || undefined,
    words: row.words.split(';').map(w => w.trim()).filter(Boolean),
    matchMode: {
      exact: row.exact.toLowerCase() === 'true',
      partial: row.partial.toLowerCase() === 'true',
      fuzzy: row.fuzzy.toLowerCase() === 'true',
    },
    fuzzyDistance: parseInt(row.fuzzyDistance, 10) || 0,
    color: row.color?.trim() || undefined,
    isDefault: false, // Imported wordsets are never default
  };
}

/**
 * Exports wordsets to CSV format
 */
export async function exportWordsetsCSV(ids?: number[]): Promise<OperationResult<string>> {
  try {
    let wordsets: Wordset[];

    if (ids && ids.length > 0) {
      // Export specific wordsets
      const results = await db.wordsets.bulkGet(ids);
      wordsets = results.filter((ws): ws is Wordset => ws !== undefined);
    } else {
      // Export all wordsets
      const result = await getAllWordsets();
      if (!result.success || !result.data) {
        return { success: false, error: result.error };
      }
      wordsets = result.data;
    }

    // Convert to CSV
    const header = 'name,description,words,exact,partial,fuzzy,fuzzyDistance,color';
    const rows = wordsets.map(ws => {
      const row = wordsetToCSVRow(ws);
      // Escape fields that contain commas or quotes
      const escapeCsv = (field: string) => {
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      };

      return [
        escapeCsv(row.name),
        escapeCsv(row.description),
        escapeCsv(row.words),
        row.exact,
        row.partial,
        row.fuzzy,
        row.fuzzyDistance,
        escapeCsv(row.color || ''),
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    return { success: true, data: csv };
  } catch (error) {
    console.error('[DB] Error exporting CSV:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Imports wordsets from CSV format
 */
export async function importWordsetsCSV(
  csvData: string,
  options: { merge?: boolean } = {}
): Promise<OperationResult<ImportResult>> {
  try {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      return { success: false, error: 'CSV file is empty or invalid' };
    }

    // Parse header
    const header = lines[0].toLowerCase();
    if (!header.includes('name') || !header.includes('words')) {
      return {
        success: false,
        error: 'CSV must contain at least "name" and "words" columns',
      };
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Parse rows (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        // Simple CSV parsing (handles quoted fields)
        const fields: string[] = [];
        let field = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
          const char = line[j];

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            fields.push(field.trim());
            field = '';
          } else {
            field += char;
          }
        }
        fields.push(field.trim()); // Add last field

        if (fields.length < 8) {
          errors.push(`Line ${i + 1}: Not enough fields (expected 8, got ${fields.length})`);
          continue;
        }

        const row: WordsetCSVRow = {
          name: fields[0],
          description: fields[1],
          words: fields[2],
          exact: fields[3],
          partial: fields[4],
          fuzzy: fields[5],
          fuzzyDistance: fields[6],
          color: fields[7],
        };

        const wordset = csvRowToWordset(row);

        // Check if wordset with same name exists
        const existing = await db.wordsets
          .filter(ws => ws.name.toLowerCase() === wordset.name.toLowerCase())
          .first();

        if (existing && !options.merge) {
          skipped++;
          continue;
        }

        // If merging and exists, generate new name
        let finalName = wordset.name;
        if (existing && options.merge) {
          let counter = 1;
          finalName = `${wordset.name} (Imported)`;
          while (
            await db.wordsets
              .filter(ws => ws.name.toLowerCase() === finalName.toLowerCase())
              .first()
          ) {
            counter++;
            finalName = `${wordset.name} (Imported ${counter})`;
          }
        }

        // Create wordset
        const result = await createWordset({
          ...wordset,
          name: finalName,
        });

        if (result.success) {
          imported++;
        } else {
          errors.push(`${wordset.name}: ${result.error}`);
        }
      } catch (error) {
        errors.push(
          `Line ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`
        );
      }
    }

    return {
      success: true,
      data: { imported, skipped, errors },
    };
  } catch (error) {
    console.error('[DB] Error importing CSV:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
