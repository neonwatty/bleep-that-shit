import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatSrtTimestamp,
  exportAsPlainText,
  exportAsSRT,
  exportAsJSON,
  exportTranscript,
  downloadTranscript,
  TranscriptData,
} from './transcriptExport';

describe('transcriptExport', () => {
  const sampleData: TranscriptData = {
    text: 'Hello world',
    chunks: [
      { text: 'Hello', timestamp: [1.5, 2.3] },
      { text: 'world', timestamp: [2.5, 3.1] },
    ],
  };

  const emptyData: TranscriptData = {
    text: '',
    chunks: [],
  };

  describe('formatSrtTimestamp', () => {
    it('should format zero seconds correctly', () => {
      expect(formatSrtTimestamp(0)).toBe('00:00:00,000');
    });

    it('should format seconds with milliseconds', () => {
      expect(formatSrtTimestamp(1.5)).toBe('00:00:01,500');
    });

    it('should format minutes correctly', () => {
      expect(formatSrtTimestamp(65.25)).toBe('00:01:05,250');
    });

    it('should format hours correctly', () => {
      expect(formatSrtTimestamp(3661.5)).toBe('01:01:01,500');
    });

    it('should handle large values', () => {
      expect(formatSrtTimestamp(7325.999)).toBe('02:02:05,999');
    });

    it('should round milliseconds to 3 decimal places', () => {
      expect(formatSrtTimestamp(1.5555)).toBe('00:00:01,556');
    });
  });

  describe('exportAsPlainText', () => {
    it('should return the text content only', () => {
      expect(exportAsPlainText(sampleData)).toBe('Hello world');
    });

    it('should handle empty transcript', () => {
      expect(exportAsPlainText(emptyData)).toBe('');
    });

    it('should preserve text with special characters', () => {
      const data: TranscriptData = {
        text: "Hello, world! It's a test.",
        chunks: [],
      };
      expect(exportAsPlainText(data)).toBe("Hello, world! It's a test.");
    });
  });

  describe('exportAsSRT', () => {
    it('should format with correct SRT structure', () => {
      const result = exportAsSRT(sampleData);
      expect(result).toContain('1\n');
      expect(result).toContain('00:00:01,500 --> 00:00:02,300');
      expect(result).toContain('Hello');
    });

    it('should use comma for millisecond separator', () => {
      const result = exportAsSRT(sampleData);
      expect(result).toMatch(/\d{2}:\d{2}:\d{2},\d{3}/);
    });

    it('should include sequential indices starting at 1', () => {
      const result = exportAsSRT(sampleData);
      const lines = result.split('\n\n');
      expect(lines[0]).toMatch(/^1\n/);
      expect(lines[1]).toMatch(/^2\n/);
    });

    it('should handle empty chunks', () => {
      expect(exportAsSRT(emptyData)).toBe('');
    });

    it('should filter out chunks with null timestamps', () => {
      const dataWithNulls: TranscriptData = {
        text: 'Hello world',
        chunks: [
          { text: 'Hello', timestamp: [1.5, 2.3] },
          { text: 'null', timestamp: [null as unknown as number, 2.0] },
          { text: 'world', timestamp: [2.5, 3.1] },
        ],
      };
      const result = exportAsSRT(dataWithNulls);
      expect(result).not.toContain('null');
      expect(result).toContain('Hello');
      expect(result).toContain('world');
    });

    it('should trim whitespace from chunk text', () => {
      const dataWithWhitespace: TranscriptData = {
        text: 'Hello',
        chunks: [{ text: '  Hello  ', timestamp: [1.0, 2.0] }],
      };
      const result = exportAsSRT(dataWithWhitespace);
      expect(result).toContain('Hello');
      expect(result).not.toContain('  Hello  ');
    });
  });

  describe('exportAsJSON', () => {
    it('should return valid JSON', () => {
      const result = exportAsJSON(sampleData);
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should preserve chunk data', () => {
      const result = JSON.parse(exportAsJSON(sampleData));
      expect(result.chunks).toHaveLength(2);
      expect(result.chunks[0].timestamp).toEqual([1.5, 2.3]);
    });

    it('should include text property', () => {
      const result = JSON.parse(exportAsJSON(sampleData));
      expect(result.text).toBe('Hello world');
    });

    it('should be pretty-printed with 2-space indentation', () => {
      const result = exportAsJSON(sampleData);
      expect(result).toContain('\n  ');
    });

    it('should filter out chunks with null timestamps', () => {
      const dataWithNulls: TranscriptData = {
        text: 'Hello world',
        chunks: [
          { text: 'Hello', timestamp: [1.5, 2.3] },
          { text: 'null', timestamp: [null as unknown as number, 2.0] },
        ],
      };
      const result = JSON.parse(exportAsJSON(dataWithNulls));
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].text).toBe('Hello');
    });
  });

  describe('exportTranscript', () => {
    it('should export as plain text when format is txt', () => {
      expect(exportTranscript(sampleData, 'txt')).toBe('Hello world');
    });

    it('should export as SRT when format is srt', () => {
      const result = exportTranscript(sampleData, 'srt');
      expect(result).toContain('-->');
    });

    it('should export as JSON when format is json', () => {
      const result = exportTranscript(sampleData, 'json');
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should default to plain text for unknown format', () => {
      const result = exportTranscript(sampleData, 'unknown' as 'txt');
      expect(result).toBe('Hello world');
    });
  });

  describe('downloadTranscript', () => {
    let mockCreateObjectURL: ReturnType<typeof vi.fn>;
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
    let mockClick: ReturnType<typeof vi.fn>;
    let mockAppendChild: ReturnType<typeof vi.fn>;
    let mockRemoveChild: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockCreateObjectURL = vi.fn(() => 'blob:test-url');
      mockRevokeObjectURL = vi.fn();
      mockClick = vi.fn();
      mockAppendChild = vi.fn();
      mockRemoveChild = vi.fn();

      vi.stubGlobal('URL', {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      });

      vi.spyOn(document, 'createElement').mockReturnValue({
        click: mockClick,
        href: '',
        download: '',
      } as unknown as HTMLAnchorElement);

      vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
      vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('should create a blob URL', () => {
      downloadTranscript(sampleData, 'txt', 'test');
      expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    it('should trigger click on anchor element', () => {
      downloadTranscript(sampleData, 'txt', 'test');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should revoke object URL after download', () => {
      downloadTranscript(sampleData, 'txt', 'test');
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });

    it('should append and remove anchor from body', () => {
      downloadTranscript(sampleData, 'txt', 'test');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });

    it('should create blob with correct MIME type for txt', () => {
      downloadTranscript(sampleData, 'txt', 'test');
      const blobArg = mockCreateObjectURL.mock.calls[0][0];
      expect(blobArg.type).toBe('text/plain');
    });

    it('should create blob with correct MIME type for json', () => {
      downloadTranscript(sampleData, 'json', 'test');
      const blobArg = mockCreateObjectURL.mock.calls[0][0];
      expect(blobArg.type).toBe('application/json');
    });
  });
});
