import Dexie, { Table } from 'dexie';
import { Wordset } from '@/lib/types/wordset';

/**
 * Dexie database for wordset storage
 * Uses IndexedDB for client-side persistence
 */
class WordsetDatabase extends Dexie {
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
