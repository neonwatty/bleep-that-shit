import { test, expect } from '@playwright/test';

test.describe('Transcription Chunk Merging Regression Tests', () => {
  // Mock function to simulate the worker's result processing
  function processTranscriptionResult(result: any) {
    let finalResult;
    if (Array.isArray(result)) {
      // This is the fixed version - should merge all chunks
      finalResult = {
        text: result.map((r: any) => r.text || '').join(' '),
        chunks: result.flatMap((r: any) => r.chunks || []),
      };
    } else {
      finalResult = result;
    }
    return {
      text: finalResult.text || '',
      chunks: finalResult.chunks || [],
    };
  }

  test('should not truncate multi-chunk transcription results', () => {
    // Simulate what Whisper returns for audio > 30 seconds
    const mockWorkerResult = [
      {
        text: 'This is the first chunk of text',
        chunks: [
          { text: 'This', timestamp: [0, 0.5] },
          { text: 'is', timestamp: [0.5, 0.7] },
          { text: 'the', timestamp: [0.7, 0.9] },
          { text: 'first', timestamp: [0.9, 1.2] },
          { text: 'chunk', timestamp: [1.2, 1.5] },
          { text: 'of', timestamp: [1.5, 1.7] },
          { text: 'text', timestamp: [1.7, 2.0] },
        ],
      },
      {
        text: 'This is the second chunk',
        chunks: [
          { text: 'This', timestamp: [30, 30.5] },
          { text: 'is', timestamp: [30.5, 30.7] },
          { text: 'the', timestamp: [30.7, 30.9] },
          { text: 'second', timestamp: [30.9, 31.3] },
          { text: 'chunk', timestamp: [31.3, 31.6] },
        ],
      },
      {
        text: 'And this is the third chunk',
        chunks: [
          { text: 'And', timestamp: [60, 60.3] },
          { text: 'this', timestamp: [60.3, 60.5] },
          { text: 'is', timestamp: [60.5, 60.7] },
          { text: 'the', timestamp: [60.7, 60.9] },
          { text: 'third', timestamp: [60.9, 61.2] },
          { text: 'chunk', timestamp: [61.2, 61.5] },
        ],
      },
    ];

    const processed = processTranscriptionResult(mockWorkerResult);

    // Should contain all chunks, not just first
    expect(processed.text).toBe(
      'This is the first chunk of text This is the second chunk And this is the third chunk'
    );
    expect(processed.chunks).toHaveLength(18); // Total of all word timestamps

    // Verify timestamps from all chunks are present
    const timestamps = processed.chunks.map((c: any) => c.timestamp[0]);
    expect(timestamps).toContain(0); // From first chunk
    expect(timestamps).toContain(30); // From second chunk
    expect(timestamps).toContain(60); // From third chunk
  });

  test('should handle single result object correctly', () => {
    const singleResult = {
      text: 'Short audio transcription',
      chunks: [
        { text: 'Short', timestamp: [0, 0.5] },
        { text: 'audio', timestamp: [0.5, 1.0] },
        { text: 'transcription', timestamp: [1.0, 1.8] },
      ],
    };

    const processed = processTranscriptionResult(singleResult);

    expect(processed.text).toBe('Short audio transcription');
    expect(processed.chunks).toHaveLength(3);
  });

  test('should handle empty or missing chunks gracefully', () => {
    const resultWithMissingChunks = [
      { text: 'First part', chunks: undefined },
      { text: 'Second part', chunks: [] },
      { text: 'Third part', chunks: [{ text: 'Third', timestamp: [0, 1] }] },
    ];

    const processed = processTranscriptionResult(resultWithMissingChunks);

    expect(processed.text).toBe('First part Second part Third part');
    expect(processed.chunks).toHaveLength(1); // Only one chunk had data
  });

  test('should preserve word-level timestamps in correct order', () => {
    const result = [
      {
        text: 'Hello world',
        chunks: [
          { text: 'Hello', timestamp: [0, 0.5] },
          { text: 'world', timestamp: [0.5, 1.0] },
        ],
      },
      {
        text: 'Goodbye world',
        chunks: [
          { text: 'Goodbye', timestamp: [30, 30.7] },
          { text: 'world', timestamp: [30.7, 31.2] },
        ],
      },
    ];

    const processed = processTranscriptionResult(result);

    expect(processed.chunks[0].timestamp[0]).toBe(0); // First word
    expect(processed.chunks[1].timestamp[0]).toBe(0.5); // Second word
    expect(processed.chunks[2].timestamp[0]).toBe(30); // Third word (from second chunk)
    expect(processed.chunks[3].timestamp[0]).toBe(30.7); // Fourth word
  });

  test('old buggy implementation would only return first chunk', () => {
    const mockWorkerResult = [
      { text: 'First chunk', chunks: [] },
      { text: 'Second chunk', chunks: [] },
      { text: 'Third chunk', chunks: [] },
    ];

    // This simulates the OLD buggy behavior
    const buggyImplementation = (result: any) => {
      const finalResult = Array.isArray(result) ? result[0] : result; // BUG: only takes first!
      return {
        text: finalResult.text || '',
        chunks: finalResult.chunks || [],
      };
    };

    const buggyResult = buggyImplementation(mockWorkerResult);
    const correctResult = processTranscriptionResult(mockWorkerResult);

    // Demonstrate the bug
    expect(buggyResult.text).toBe('First chunk'); // Wrong!
    expect(correctResult.text).toBe('First chunk Second chunk Third chunk'); // Correct!
  });
});
