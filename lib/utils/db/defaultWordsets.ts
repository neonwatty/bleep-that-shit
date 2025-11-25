import type { Wordset } from '@/lib/types/wordset';

const now = new Date();

/**
 * Default wordsets created on first database initialization
 * These are marked as isDefault=true and cannot be deleted
 */
export const DEFAULT_WORDSETS: Omit<Wordset, 'id'>[] = [
  {
    name: 'Example Word List',
    description: 'A simple example word list to get you started',
    words: ['welcome', 'to', 'bleep', 'that', 'word', 'lists'],
    matchMode: { exact: true, partial: false, fuzzy: false },
    fuzzyDistance: 0,
    color: '#8B5CF6', // Purple
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  },
];
