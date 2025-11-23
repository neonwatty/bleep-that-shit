/**
 * Match mode configuration for wordset matching
 */
export interface MatchModeConfig {
  exact: boolean;
  partial: boolean;
  fuzzy: boolean;
}

/**
 * Core wordset interface stored in IndexedDB
 */
export interface Wordset {
  id?: number; // Auto-incrementing primary key
  name: string; // User-friendly name
  description?: string; // Optional description
  words: string[]; // Array of words to match
  matchMode: MatchModeConfig; // Default match mode settings
  fuzzyDistance: number; // Default fuzzy distance (0-10)
  color?: string; // UI color tag (hex format)
  isDefault?: boolean; // System-provided wordset (cannot be deleted)
  createdAt: Date; // Creation timestamp
  updatedAt: Date; // Last update timestamp
}

/**
 * Input type for creating new wordsets (excludes auto-generated fields)
 */
export type WordsetCreateInput = Omit<Wordset, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Input type for updating wordsets (all fields optional except what changes)
 */
export type WordsetUpdateInput = Partial<Omit<Wordset, 'id' | 'createdAt'>>;

/**
 * CSV export/import format for wordsets
 */
export interface WordsetCSVRow {
  name: string;
  description: string;
  words: string; // Semicolon-separated
  exact: string; // 'true' or 'false'
  partial: string; // 'true' or 'false'
  fuzzy: string; // 'true' or 'false'
  fuzzyDistance: string; // Number as string
  color?: string; // Hex color
}

/**
 * JSON export format for wordsets (legacy support)
 */
export interface WordsetExportFormat {
  version: string; // Schema version (e.g., "1.0.0")
  exportedAt: string; // ISO timestamp
  wordsets: Omit<Wordset, 'id' | 'createdAt' | 'updatedAt'>[];
}

/**
 * Result type for operations that can fail
 */
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Import result with details
 */
export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}
