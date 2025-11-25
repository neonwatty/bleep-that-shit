export interface TranscriptChunk {
  text: string;
  timestamp: [number, number];
}

export interface TranscriptWord {
  text: string;
  index: number;
  start: number;
  end: number;
}

export interface Sentence {
  words: TranscriptWord[];
  startTime: number;
  endTime: number;
}
