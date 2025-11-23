import Dexie, { Table } from 'dexie';
import { Wordset } from '@/lib/types/wordset';

/**
 * Dexie database for wordset storage
 * Uses IndexedDB for client-side persistence
 */
export class WordsetDatabase extends Dexie {
  wordsets!: Table<Wordset, number>;

  constructor() {
    super('BleepThatShitDB');

    // Version 1: Initial schema
    this.version(1).stores({
      wordsets: '++id, name, createdAt, updatedAt, isDefault',
    });
  }
}

// Singleton instance
export const db = new WordsetDatabase();

/**
 * Validates database connection and health
 */
export async function validateDatabase(): Promise<boolean> {
  try {
    await db.open();
    return true;
  } catch (error) {
    console.error('[DB] Database validation failed:', error);
    return false;
  }
}
