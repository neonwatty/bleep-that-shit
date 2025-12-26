import { describe, it, expect } from 'vitest';
import { DISCORD_URL, FEEDBACK_FORM_URL } from './externalLinks';

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

  describe('Feedback Form Link', () => {
    it('should have a valid Google Forms URL format', () => {
      expect(FEEDBACK_FORM_URL).toMatch(/^https:\/\/forms\.gle\/[A-Za-z0-9]+$/);
    });

    it('should have the expected feedback form URL', () => {
      expect(FEEDBACK_FORM_URL).toBe('https://forms.gle/NbsDZeTWMVXe5Q1R8');
    });
  });
});
