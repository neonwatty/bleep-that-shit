import { describe, it, expect } from 'vitest';
import { DISCORD_URL, FEEDBACK_FORM_URL, FEEDBACK_FORM_LONG_FILES_URL } from './externalLinks';

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

  describe('Feedback Form Links', () => {
    it('should have a valid Google Forms URL format for primary feedback form', () => {
      expect(FEEDBACK_FORM_URL).toMatch(/^https:\/\/forms\.gle\/[A-Za-z0-9]+$/);
    });

    it('should have a valid Google Forms URL format for long files form', () => {
      expect(FEEDBACK_FORM_LONG_FILES_URL).toMatch(/^https:\/\/forms\.gle\/[A-Za-z0-9]+$/);
    });

    it('should have the expected primary feedback form URL', () => {
      expect(FEEDBACK_FORM_URL).toBe('https://forms.gle/NbsDZeTWMVXe5Q1R8');
    });

    it('should have the expected long files form URL', () => {
      expect(FEEDBACK_FORM_LONG_FILES_URL).toBe('https://forms.gle/FKCSYGe95oa9p7Ey9');
    });

    it('should use different forms for different purposes', () => {
      expect(FEEDBACK_FORM_URL).not.toBe(FEEDBACK_FORM_LONG_FILES_URL);
    });
  });
});
