import { describe, it, expect } from 'vitest';
import { levenshteinDistance } from './stringMatching';

describe('stringMatching', () => {
  describe('levenshteinDistance', () => {
    describe('basic functionality', () => {
      it('should return 0 for identical strings', () => {
        expect(levenshteinDistance('hello', 'hello')).toBe(0);
      });

      it('should return max distance for completely different strings', () => {
        expect(levenshteinDistance('abc', 'xyz')).toBe(3);
      });

      it('should return 1 for single character difference', () => {
        expect(levenshteinDistance('cat', 'bat')).toBe(1);
      });

      it('should return 1 for single insertion', () => {
        expect(levenshteinDistance('cat', 'cats')).toBe(1);
      });

      it('should return 1 for single deletion', () => {
        expect(levenshteinDistance('cats', 'cat')).toBe(1);
      });
    });

    describe('edge cases and boundary conditions', () => {
      it('should return 0 for two empty strings', () => {
        expect(levenshteinDistance('', '')).toBe(0);
      });

      it('should return length for empty to non-empty string', () => {
        expect(levenshteinDistance('', 'hello')).toBe(5);
      });

      it('should return length for non-empty to empty string', () => {
        expect(levenshteinDistance('hello', '')).toBe(5);
      });

      it('should return 0 for identical single characters', () => {
        expect(levenshteinDistance('a', 'a')).toBe(0);
      });

      it('should return 1 for different single characters', () => {
        expect(levenshteinDistance('a', 'b')).toBe(1);
      });

      it('should handle very long identical strings', () => {
        const longString = 'a'.repeat(1000);
        expect(levenshteinDistance(longString, longString)).toBe(0);
      });

      it('should handle very long completely different strings', () => {
        const stringA = 'a'.repeat(100);
        const stringB = 'b'.repeat(100);
        expect(levenshteinDistance(stringA, stringB)).toBe(100);
      });

      it('should handle unicode characters (emojis)', () => {
        // JavaScript charAt() treats emojis as single characters in this context
        expect(levenshteinDistance('hello 👋', 'hello 👍')).toBe(1);
      });
    });

    describe('fuzzy matching scenarios', () => {
      it('should handle common misspelling - single transposition', () => {
        expect(levenshteinDistance('shit', 'shti')).toBe(2);
      });

      it('should handle common misspelling - missing letter', () => {
        expect(levenshteinDistance('damn', 'dam')).toBe(1);
      });

      it('should handle common misspelling - extra letter', () => {
        expect(levenshteinDistance('ass', 'asss')).toBe(1);
      });

      it('should handle phonetic similarity - close pronunciation', () => {
        expect(levenshteinDistance('fuck', 'fuk')).toBe(1);
      });

      it('should be case-sensitive for uppercase vs lowercase', () => {
        // Function is case-sensitive - caller must normalize
        expect(levenshteinDistance('SHIT', 'shit')).toBe(4);
      });

      it('should handle word with punctuation attached', () => {
        expect(levenshteinDistance('shit', 'shit!')).toBe(1);
      });

      it('should handle common substitution - leetspeak', () => {
        expect(levenshteinDistance('shit', 'sh1t')).toBe(1);
      });

      it('should handle multiple character differences', () => {
        expect(levenshteinDistance('bitch', 'bytch')).toBe(1);
      });

      it('should calculate distance for substring relationship', () => {
        expect(levenshteinDistance('ass', 'badass')).toBe(3);
      });

      it('should handle similar length with single substitution', () => {
        // 'hell' -> 'help' is 1 substitution (second 'l' -> 'p')
        expect(levenshteinDistance('hell', 'help')).toBe(1);
      });

      it('should handle repeated characters', () => {
        expect(levenshteinDistance('fuuuuck', 'fuck')).toBe(3);
      });

      it('should handle word boundary scenarios - prefix match', () => {
        expect(levenshteinDistance('shit', 'shitty')).toBe(2);
      });
    });

    describe('algorithmic properties', () => {
      it('should satisfy symmetry property - distance(a,b) == distance(b,a)', () => {
        const distanceAB = levenshteinDistance('kitten', 'sitting');
        const distanceBA = levenshteinDistance('sitting', 'kitten');
        expect(distanceAB).toBe(3);
        expect(distanceBA).toBe(3);
        expect(distanceAB).toBe(distanceBA);
      });

      it('should satisfy triangle inequality', () => {
        const distanceAC = levenshteinDistance('abc', 'ayc');
        const distanceAB = levenshteinDistance('abc', 'axc');
        const distanceBC = levenshteinDistance('axc', 'ayc');
        expect(distanceAC).toBeLessThanOrEqual(distanceAB + distanceBC);
      });

      it('should always return non-negative distances', () => {
        const testCases = [
          ['hello', 'world'],
          ['test', 'test'],
          ['', 'abc'],
          ['abc', ''],
          ['a', 'z'],
        ];

        testCases.forEach(([a, b]) => {
          expect(levenshteinDistance(a, b)).toBeGreaterThanOrEqual(0);
        });
      });

      it('should handle multiple operations - classic example', () => {
        expect(levenshteinDistance('saturday', 'sunday')).toBe(3);
      });

      it('should complete in reasonable time for long strings', () => {
        const longStringA = 'a'.repeat(500) + 'b'.repeat(500);
        const longStringB = 'a'.repeat(500) + 'c'.repeat(500);

        const startTime = performance.now();
        const distance = levenshteinDistance(longStringA, longStringB);
        const endTime = performance.now();

        expect(distance).toBe(500);
        expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
      });
    });

    describe('real-world profanity matching integration', () => {
      it('should match profanity within fuzzy distance threshold', () => {
        const word = 'shit';
        const variations = ['shit', 'shti', 'sh1t', 'shiit'];
        const threshold = 2;

        variations.forEach(variant => {
          const distance = levenshteinDistance(word.toLowerCase(), variant.toLowerCase());
          expect(distance).toBeLessThanOrEqual(threshold);
        });
      });

      it('should reject words beyond fuzzy distance threshold', () => {
        const word = 'shit';
        const nonMatches = ['hello', 'world', 'test', 'xyz'];
        const threshold = 2;

        nonMatches.forEach(nonMatch => {
          const distance = levenshteinDistance(word.toLowerCase(), nonMatch.toLowerCase());
          expect(distance).toBeGreaterThan(threshold);
        });
      });

      it('should handle case-insensitive matching when normalized', () => {
        const word = 'FUCK';
        const variant = 'fuck';
        expect(levenshteinDistance(word.toLowerCase(), variant.toLowerCase())).toBe(0);
      });
    });
  });
});
