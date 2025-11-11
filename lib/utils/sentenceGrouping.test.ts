import { describe, it, expect } from 'vitest';
import { groupIntoSentences } from './sentenceGrouping';
import { TranscriptChunk } from '@/lib/types/transcript';

describe('groupIntoSentences', () => {
  it('groups words by sentence-ending punctuation', () => {
    const chunks: TranscriptChunk[] = [
      { text: 'Hello', timestamp: [0, 0.5] },
      { text: 'world.', timestamp: [0.5, 1.0] },
      { text: 'How', timestamp: [1.0, 1.3] },
      { text: 'are', timestamp: [1.3, 1.6] },
      { text: 'you?', timestamp: [1.6, 2.0] },
    ];

    const sentences = groupIntoSentences(chunks);

    expect(sentences).toHaveLength(2);
    expect(sentences[0].words).toHaveLength(2);
    expect(sentences[0].words[0].text).toBe('Hello');
    expect(sentences[0].words[1].text).toBe('world.');
    expect(sentences[1].words).toHaveLength(3);
    expect(sentences[1].words[0].text).toBe('How');
  });

  it('handles edge case: no punctuation (single sentence)', () => {
    const chunks: TranscriptChunk[] = [
      { text: 'Hello', timestamp: [0, 0.5] },
      { text: 'world', timestamp: [0.5, 1.0] },
      { text: 'today', timestamp: [1.0, 1.5] },
    ];

    const sentences = groupIntoSentences(chunks);

    expect(sentences).toHaveLength(1);
    expect(sentences[0].words).toHaveLength(3);
    expect(sentences[0].startTime).toBe(0);
    expect(sentences[0].endTime).toBe(1.5);
  });

  it('handles edge case: empty array', () => {
    const sentences = groupIntoSentences([]);

    expect(sentences).toHaveLength(0);
  });

  it('preserves word indices', () => {
    const chunks: TranscriptChunk[] = [
      { text: 'First', timestamp: [0, 0.5] },
      { text: 'sentence.', timestamp: [0.5, 1.0] },
      { text: 'Second', timestamp: [1.0, 1.5] },
      { text: 'sentence.', timestamp: [1.5, 2.0] },
    ];

    const sentences = groupIntoSentences(chunks);

    expect(sentences[0].words[0].index).toBe(0);
    expect(sentences[0].words[1].index).toBe(1);
    expect(sentences[1].words[0].index).toBe(2);
    expect(sentences[1].words[1].index).toBe(3);
  });

  it('calculates sentence start/end times correctly', () => {
    const chunks: TranscriptChunk[] = [
      { text: 'First', timestamp: [1.5, 2.0] },
      { text: 'sentence.', timestamp: [2.0, 2.8] },
      { text: 'Second', timestamp: [3.0, 3.5] },
      { text: 'sentence.', timestamp: [3.5, 4.2] },
    ];

    const sentences = groupIntoSentences(chunks);

    expect(sentences[0].startTime).toBe(1.5);
    expect(sentences[0].endTime).toBe(2.8);
    expect(sentences[1].startTime).toBe(3.0);
    expect(sentences[1].endTime).toBe(4.2);
  });

  it('handles multiple punctuation marks', () => {
    const chunks: TranscriptChunk[] = [
      { text: 'Stop!', timestamp: [0, 0.5] },
      { text: 'Wait;', timestamp: [0.5, 1.0] },
      { text: 'Go.', timestamp: [1.0, 1.5] },
    ];

    const sentences = groupIntoSentences(chunks);

    expect(sentences).toHaveLength(3);
  });

  it('handles questions and exclamations', () => {
    const chunks: TranscriptChunk[] = [
      { text: 'What?', timestamp: [0, 0.5] },
      { text: 'Stop!', timestamp: [0.5, 1.0] },
      { text: 'Okay.', timestamp: [1.0, 1.5] },
    ];

    const sentences = groupIntoSentences(chunks);

    expect(sentences).toHaveLength(3);
    expect(sentences[0].words[0].text).toBe('What?');
    expect(sentences[1].words[0].text).toBe('Stop!');
    expect(sentences[2].words[0].text).toBe('Okay.');
  });

  it('handles single-word sentences', () => {
    const chunks: TranscriptChunk[] = [
      { text: 'Stop!', timestamp: [0, 0.5] },
      { text: 'Hello', timestamp: [0.5, 1.0] },
      { text: 'world.', timestamp: [1.0, 1.5] },
    ];

    const sentences = groupIntoSentences(chunks);

    expect(sentences).toHaveLength(2);
    expect(sentences[0].words).toHaveLength(1);
    expect(sentences[1].words).toHaveLength(2);
  });

  it('handles words with spaces and punctuation', () => {
    const chunks: TranscriptChunk[] = [
      { text: 'Hello,', timestamp: [0, 0.5] },
      { text: 'world.', timestamp: [0.5, 1.0] },
    ];

    const sentences = groupIntoSentences(chunks);

    expect(sentences).toHaveLength(1);
    expect(sentences[0].words).toHaveLength(2);
  });

  it('handles very long sentences', () => {
    const chunks: TranscriptChunk[] = [];
    for (let i = 0; i < 50; i++) {
      chunks.push({ text: `word${i}`, timestamp: [i * 0.5, (i + 1) * 0.5] });
    }
    chunks.push({ text: 'end.', timestamp: [25, 25.5] });

    const sentences = groupIntoSentences(chunks);

    expect(sentences).toHaveLength(1);
    expect(sentences[0].words).toHaveLength(51);
  });
});
