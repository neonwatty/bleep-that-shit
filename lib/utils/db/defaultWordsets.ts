import type { Wordset } from '@/lib/types/wordset';

const now = new Date();

/**
 * Default wordsets created on first database initialization
 * These are marked as isDefault=true and cannot be deleted
 */
export const DEFAULT_WORDSETS: Omit<Wordset, 'id'>[] = [
  {
    name: 'Common Profanity',
    description: 'Most frequently used profane words in English',
    words: [
      'fuck',
      'fucking',
      'fucked',
      'fucker',
      'shit',
      'shitting',
      'shitty',
      'damn',
      'damned',
      'hell',
      'ass',
      'asshole',
      'bitch',
      'bitching',
      'bastard',
      'cunt',
      'dick',
      'dickhead',
      'piss',
      'pissed',
    ],
    matchMode: { exact: true, partial: false, fuzzy: false },
    fuzzyDistance: 0,
    color: '#EF4444', // Red
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Mild Profanity',
    description: 'Milder swear words and euphemisms',
    words: ['crap', 'crappy', 'dang', 'darn', 'heck', 'frick', 'fricking', 'shoot', 'sucks'],
    matchMode: { exact: true, partial: false, fuzzy: false },
    fuzzyDistance: 0,
    color: '#F59E0B', // Amber
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Religious Terms',
    description: 'Religious terms some may find offensive',
    words: ['god', 'jesus', 'christ', 'goddamn', 'goddammit', 'jesus christ'],
    matchMode: { exact: true, partial: false, fuzzy: false },
    fuzzyDistance: 0,
    color: '#8B5CF6', // Violet
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Slurs & Offensive Terms',
    description: 'Discriminatory and offensive slurs',
    words: ['retard', 'retarded', 'fag', 'faggot'],
    matchMode: { exact: true, partial: false, fuzzy: false },
    fuzzyDistance: 0,
    color: '#DC2626', // Dark Red
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    name: 'Sexual Content',
    description: 'Sexual and explicit language',
    words: ['sex', 'sexy', 'porn', 'pornography', 'cock', 'pussy', 'tits', 'boobs', 'horny'],
    matchMode: { exact: true, partial: false, fuzzy: false },
    fuzzyDistance: 0,
    color: '#EC4899', // Pink
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  },
];
