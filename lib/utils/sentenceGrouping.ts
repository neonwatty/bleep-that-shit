import { TranscriptChunk, Sentence, TranscriptWord } from '@/lib/types/transcript';

/**
 * Groups transcript chunks (words) into sentences based on punctuation.
 * Each sentence includes its words with indices and timing information.
 */
export function groupIntoSentences(chunks: TranscriptChunk[]): Sentence[] {
  if (chunks.length === 0) {
    return [];
  }

  const sentences: Sentence[] = [];
  let currentWords: TranscriptWord[] = [];

  // Sentence-ending punctuation (period, question mark, exclamation, etc.)
  const sentenceEnders = /[.!?;]$/;

  chunks.forEach((chunk, index) => {
    const word: TranscriptWord = {
      text: chunk.text,
      index,
      start: chunk.timestamp[0],
      end: chunk.timestamp[1],
    };

    currentWords.push(word);

    // Check if this word ends a sentence
    const trimmedText = chunk.text.trim();
    if (sentenceEnders.test(trimmedText)) {
      // End current sentence
      if (currentWords.length > 0) {
        sentences.push({
          words: currentWords,
          startTime: currentWords[0].start,
          endTime: currentWords[currentWords.length - 1].end,
        });
        currentWords = [];
      }
    }
  });

  // Add remaining words as final sentence (if any)
  if (currentWords.length > 0) {
    sentences.push({
      words: currentWords,
      startTime: currentWords[0].start,
      endTime: currentWords[currentWords.length - 1].end,
    });
  }

  return sentences;
}
