import { describe, it, expect } from 'vitest';

// Central constant for the Discord invite URL
// This is validated by the daily link-check GitHub workflow
export const DISCORD_URL = 'https://discord.gg/XuzjVXyjH4';

describe('External Links Validation', () => {
  describe('Discord Link', () => {
    it('should have a valid Discord invite URL format', () => {
      expect(DISCORD_URL).toMatch(/^https:\/\/discord\.gg\/[A-Za-z0-9]+$/);
    });

    it('should use the discord.gg shortlink domain', () => {
      expect(DISCORD_URL).toContain('discord.gg/');
    });

    it('should have the expected invite code', () => {
      // This ensures the invite code hasn't been accidentally modified
      expect(DISCORD_URL).toBe('https://discord.gg/XuzjVXyjH4');
    });
  });
});
