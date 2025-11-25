import { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { decodeAudioToMono16kHzPCM } from '@/lib/utils/audioDecode';
import { applyBleeps, applyBleepsToVideo } from '@/lib/utils/audioProcessor';
import { getPublicPath } from '@/lib/utils/paths';
import { mergeOverlappingBleeps } from '@/lib/utils/bleepMerger';
import { levenshteinDistance } from '@/lib/utils/stringMatching';
import { getWordsetById } from '@/lib/utils/db/wordsetOperations';

export interface TranscriptionResult {
  text: string;
  chunks: Array<{
    text: string;
    timestamp: [number, number];
  }>;
  metadata?: {
    nullTimestampCount: number;
    totalChunks: number;
  };
}

export interface MatchedWord {
  word: string;
  start: number;
  end: number;
  source?: 'manual' | number; // 'manual' or wordset ID
}

export function useBleepState() {
  const searchParams = useSearchParams();

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [showFileWarning, setShowFileWarning] = useState(false);
  const [fileDurationWarning, setFileDurationWarning] = useState<string | null>(null);

  // Transcription state
  const [language, setLanguage] = useState('en');
  const [model, setModel] = useState('Xenova/whisper-tiny.en');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timestampWarning, setTimestampWarning] = useState<{ count: number; total: number } | null>(
    null
  );

  // Word selection state
  const [wordsToMatch, setWordsToMatch] = useState('');
  const [matchMode, setMatchMode] = useState({
    exact: true,
    partial: false,
    fuzzy: false,
  });
  const [fuzzyDistance, setFuzzyDistance] = useState(1);
  const [censoredWordIndices, setCensoredWordIndices] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [transcriptExpanded, setTranscriptExpanded] = useState(true);

  // Wordset state
  const [activeWordsets, setActiveWordsets] = useState<Set<number>>(new Set());
  const [wordsetWords, setWordsetWords] = useState<Map<number, string[]>>(new Map());
  const [wordSource, setWordSource] = useState<Map<number, 'manual' | number>>(new Map());

  // Bleep configuration state
  const [bleepSound, setBleepSound] = useState('bleep');
  const [bleepVolume, setBleepVolume] = useState(80);
  const [originalVolumeReduction, setOriginalVolumeReduction] = useState(0.0);
  const [bleepBuffer, setBleepBuffer] = useState<number>(0);
  const [censoredMediaUrl, setCensoredMediaUrl] = useState<string | null>(null);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [isPreviewingBleep, setIsPreviewingBleep] = useState(false);
  const [hasBleeped, setHasBleeped] = useState(false);
  const [lastBleepVolume, setLastBleepVolume] = useState<number | null>(null);

  // Refs
  const workerRef = useRef<Worker | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Derived state: compute matchedWords from censoredWordIndices with source tracking
  const matchedWords = useMemo(() => {
    if (!transcriptionResult) return [];
    return Array.from(censoredWordIndices)
      .map(idx => {
        const chunk = transcriptionResult.chunks[idx];
        const source = wordSource.get(idx) || 'manual';
        return { chunk, idx, source };
      })
      .filter(({ chunk }) => {
        if (
          !chunk ||
          !chunk.timestamp ||
          chunk.timestamp[0] === null ||
          chunk.timestamp[1] === null
        ) {
          console.warn('Skipping chunk with null timestamp:', chunk?.text);
          return false;
        }
        return true;
      })
      .map(({ chunk, source }) => ({
        word: chunk.text,
        start: chunk.timestamp[0],
        end: chunk.timestamp[1],
        source,
      }))
      .sort((a, b) => a.start - b.start);
  }, [censoredWordIndices, transcriptionResult, wordSource]);

  // File handlers
  const handleFileUpload = async (uploadedFile: File) => {
    if (
      uploadedFile &&
      (uploadedFile.type.includes('audio') || uploadedFile.type.includes('video'))
    ) {
      setFile(uploadedFile);
      const url = URL.createObjectURL(uploadedFile);
      setFileUrl(url);
      setShowFileWarning(false);
      setFileDurationWarning(null);

      // Check file duration
      try {
        const mediaElement = document.createElement(
          uploadedFile.type.includes('video') ? 'video' : 'audio'
        );
        mediaElement.src = url;

        await new Promise(resolve => {
          mediaElement.addEventListener('loadedmetadata', () => {
            const duration = mediaElement.duration;
            if (duration > 600) {
              const minutes = Math.floor(duration / 60);
              const seconds = Math.floor(duration % 60);
              setFileDurationWarning(
                `This file is ${minutes}:${seconds.toString().padStart(2, '0')} long. Files longer than 10 minutes may not process correctly.`
              );
            }
            resolve(null);
          });
        });
      } catch (error) {
        console.error('Error checking file duration:', error);
      }
    } else {
      setShowFileWarning(true);
    }
  };

  // Load sample video if specified in URL
  useEffect(() => {
    const sample = searchParams.get('sample');
    if (sample === 'bob-ross' && !file && !isLoadingSample) {
      setIsLoadingSample(true);
      const loadSampleVideo = async () => {
        try {
          const videoUrl =
            'https://raw.githubusercontent.com/neonwatty/readme_gifs/main/bob-ross-trim.mp4';
          const response = await fetch(videoUrl);
          const blob = await response.blob();
          const sampleFile = new File([blob], 'bob-ross-trim.mp4', { type: 'video/mp4' });

          await handleFileUpload(sampleFile);
        } catch (error) {
          console.error('Error loading sample video:', error);
          setShowFileWarning(true);
        } finally {
          setIsLoadingSample(false);
        }
      };
      loadSampleVideo();
    }
  }, [searchParams, file, isLoadingSample]);

  // Transcription handlers
  const handleTranscribe = async () => {
    if (!file) return;

    setIsTranscribing(true);
    setProgress(0);
    setProgressText('Initializing...');

    try {
      if (!workerRef.current) {
        console.log('[Main] Creating new webpack worker');
        workerRef.current = new Worker(
          new URL('../../workers/transcriptionWorker.ts', import.meta.url),
          { type: 'module' }
        );
        console.log('[Main] Worker created successfully');
      } else {
        console.log('[Main] Using existing worker');
      }

      const worker = workerRef.current;

      worker.onerror = error => {
        console.error('[Main] Worker error:', error);
        setErrorMessage('Worker error occurred');
        setIsTranscribing(false);
      };

      worker.onmessage = event => {
        console.log('[Main] Received message from worker:', event.data);
        const { type, progress: workerProgress, status, result, error, debug } = event.data;

        if (debug) {
          console.log(debug);
        }
        if (workerProgress) {
          setProgress(workerProgress);
        }
        if (status) {
          setProgressText(status);
        }
        if (type === 'complete' && result) {
          setTranscriptionResult(result);

          if (result.metadata && result.metadata.nullTimestampCount > 0) {
            setTimestampWarning({
              count: result.metadata.nullTimestampCount,
              total: result.metadata.totalChunks,
            });
          } else {
            setTimestampWarning(null);
          }

          setIsTranscribing(false);
          setProgress(100);
          setProgressText('Transcription complete!');
        }
        if (type === 'extracted') {
          const audioBuffer = event.data.audioBuffer;
          setProgressText('Decoding extracted audio...');

          (async () => {
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 16000,
              });
              const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
              const float32Audio = decodedAudio.getChannelData(0);

              console.log('Decoded extracted audio to Float32Array, length:', float32Audio.length);

              const audioCopy = new Float32Array(float32Audio);

              worker.postMessage(
                {
                  type: 'transcribe',
                  audioData: audioCopy,
                  model,
                  language,
                },
                [audioCopy.buffer]
              );
            } catch (decodeError) {
              console.error('Failed to decode extracted audio:', decodeError);
              setErrorMessage('Failed to decode extracted audio from video');
              setIsTranscribing(false);
            }
          })();
        }
        if (error) {
          console.error('Worker error:', error);
          setIsTranscribing(false);
          setProgressText('Error: ' + error);
          setErrorMessage(error);
          setTranscriptionResult(null);
        }
      };

      if (file.type.includes('audio')) {
        setProgressText('Decoding audio...');
        setProgress(30);

        try {
          const audioData = await decodeAudioToMono16kHzPCM(file);
          console.log('Decoded audio to Float32Array, length:', audioData.length);

          const audioCopy = new Float32Array(audioData);

          console.log(
            '[Main] Sending to worker - type: transcribe, audioData length:',
            audioCopy.length,
            'model:',
            model,
            'language:',
            language
          );

          worker.postMessage(
            {
              type: 'transcribe',
              audioData: audioCopy,
              fileType: file.type,
              model,
              language,
            },
            [audioCopy.buffer]
          );

          console.log('[Main] Message sent to worker');
        } catch (decodeError) {
          console.error('Audio decode error:', decodeError);
          throw new Error("Failed to decode audio file. Please ensure it's a valid audio format.");
        }
      } else if (file.type.includes('video')) {
        const arrayBuffer = await file.arrayBuffer();
        worker.postMessage({
          type: 'extract',
          fileBuffer: arrayBuffer,
          fileType: file.type,
          model,
          language,
        });
      } else {
        throw new Error('Unsupported file type');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setIsTranscribing(false);
      setProgressText('Error during transcription');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  // Word matching handlers
  const handleMatch = (source: 'manual' | number = 'manual') => {
    if (!transcriptionResult || !wordsToMatch) return;

    console.log('Starting matching with transcription result:', transcriptionResult);
    console.log('Words to match:', wordsToMatch);
    console.log('Match mode:', matchMode);
    console.log('Source:', source);

    const words = wordsToMatch
      .toLowerCase()
      .split(',')
      .map(w => w.trim())
      .filter(Boolean);

    const newIndices = new Set(censoredWordIndices);
    const newSource = new Map(wordSource);

    transcriptionResult.chunks.forEach((chunk, index) => {
      const chunkText = chunk.text.toLowerCase().trim();
      const chunkTextClean = chunkText.replace(/[.,!?;:'"]/g, '');
      let isMatch = false;

      for (const word of words) {
        if (matchMode.exact) {
          if (chunkText === word || chunkTextClean === word) {
            console.log(`Exact match: "${chunk.text}" matches "${word}"`);
            isMatch = true;
            break;
          }
        }
        if (matchMode.partial && chunkText.includes(word)) {
          isMatch = true;
          break;
        }
        if (matchMode.fuzzy) {
          const distance = levenshteinDistance(chunkText, word);
          if (distance <= fuzzyDistance) {
            isMatch = true;
            break;
          }
        }
      }

      if (isMatch) {
        newIndices.add(index);
        newSource.set(index, source); // Track source
        const start = chunk.timestamp ? chunk.timestamp[0] : 0;
        const end = chunk.timestamp ? chunk.timestamp[1] : 0;
        console.log(`Match found: "${chunk.text}" at [${start}, ${end}] (source: ${source})`);
      }
    });

    console.log('Total censored words:', newIndices.size);
    setCensoredWordIndices(newIndices);
    setWordSource(newSource);

    if (newIndices.size === 0) {
      console.log('No matches found. Check if words exist in transcription.');
    }
  };

  const handleToggleWord = (index: number) => {
    const newIndices = new Set(censoredWordIndices);
    const newSource = new Map(wordSource);

    if (newIndices.has(index)) {
      newIndices.delete(index);
      newSource.delete(index);
    } else {
      newIndices.add(index);
      newSource.set(index, 'manual'); // Manual toggle
    }

    setCensoredWordIndices(newIndices);
    setWordSource(newSource);
  };

  const handleClearAll = () => {
    setCensoredWordIndices(new Set());
    setWordSource(new Map());
  };

  // Wordset handlers
  const handleApplyWordsets = async (wordsetIds: number[]) => {
    // Batch all wordset updates
    const newActiveWordsets = new Set(activeWordsets);
    const newWordsetWords = new Map(wordsetWords);
    const wordsetsToMatch: {
      id: number;
      words: string[];
      matchMode: { exact: boolean; partial: boolean; fuzzy: boolean };
      fuzzyDistance: number;
    }[] = [];

    for (const wordsetId of wordsetIds) {
      const result = await getWordsetById(wordsetId);
      if (!result.success || !result.data) continue;

      const wordset = result.data;

      // Add to active wordsets
      newActiveWordsets.add(wordsetId);

      // Store wordset words
      newWordsetWords.set(wordsetId, wordset.words);

      // Collect wordsets to match with their match settings
      wordsetsToMatch.push({
        id: wordsetId,
        words: wordset.words,
        matchMode: wordset.matchMode,
        fuzzyDistance: wordset.fuzzyDistance,
      });

      // Apply match mode from wordset if specified (use last wordset's settings)
      if (wordset.matchMode) {
        setMatchMode(wordset.matchMode);
      }
      if (wordset.fuzzyDistance !== undefined) {
        setFuzzyDistance(wordset.fuzzyDistance);
      }
    }

    // Update state
    setActiveWordsets(newActiveWordsets);
    setWordsetWords(newWordsetWords);

    // Populate wordsToMatch input field with all words from applied wordsets
    const allWordsetWords = wordsetsToMatch.flatMap(ws => ws.words);
    const uniqueWords = Array.from(new Set(allWordsetWords));
    setWordsToMatch(uniqueWords.join(', '));

    // Only try to match if transcription exists
    if (transcriptionResult) {
      // Start with current indices and sources
      const newIndices = new Set(censoredWordIndices);
      const newSource = new Map(wordSource);

      // Match each wordset's words using its own match settings
      for (const wordset of wordsetsToMatch) {
        // Perform matching inline using wordset's match settings
        // Handle both array of words and comma-separated strings
        const words = wordset.words
          .flatMap(w => w.split(','))
          .map(w => w.toLowerCase().trim())
          .filter(Boolean);

        transcriptionResult.chunks.forEach((chunk, index) => {
          const chunkText = chunk.text.toLowerCase().trim();
          const chunkTextClean = chunkText.replace(/[.,!?;:'"]/g, '');
          let isMatch = false;

          for (const word of words) {
            if (wordset.matchMode.exact) {
              if (chunkText === word || chunkTextClean === word) {
                isMatch = true;
                break;
              }
            }
            if (wordset.matchMode.partial && chunkText.includes(word)) {
              isMatch = true;
              break;
            }
            if (wordset.matchMode.fuzzy) {
              const distance = levenshteinDistance(chunkText, word);
              if (distance <= wordset.fuzzyDistance) {
                isMatch = true;
                break;
              }
            }
          }

          if (isMatch) {
            newIndices.add(index);
            newSource.set(index, wordset.id); // Track wordset as source
          }
        });
      }

      // Update censored indices with all matches
      setCensoredWordIndices(newIndices);
      setWordSource(newSource);
    }
  };

  const handleRemoveWordset = (wordsetId: number) => {
    // Remove from active wordsets
    const newActiveWordsets = new Set(activeWordsets);
    newActiveWordsets.delete(wordsetId);
    setActiveWordsets(newActiveWordsets);

    // Remove wordset words
    const newWordsetWords = new Map(wordsetWords);
    newWordsetWords.delete(wordsetId);
    setWordsetWords(newWordsetWords);

    // Remove all censoredWordIndices from this wordset
    const newIndices = new Set(censoredWordIndices);
    const newSource = new Map(wordSource);

    wordSource.forEach((source, idx) => {
      if (source === wordsetId) {
        newIndices.delete(idx);
        newSource.delete(idx);
      }
    });

    setCensoredWordIndices(newIndices);
    setWordSource(newSource);

    // Recalculate wordsToMatch based on remaining active wordsets
    const remainingWords: string[] = [];
    newWordsetWords.forEach(words => {
      remainingWords.push(...words);
    });
    const uniqueWords = Array.from(new Set(remainingWords));
    setWordsToMatch(uniqueWords.join(', '));
  };

  // Bleep handlers
  const handleBleep = async () => {
    if (!file || matchedWords.length === 0) {
      console.log('Cannot bleep: no file or no matched words');
      return;
    }

    try {
      setProgressText('Applying bleeps...');
      setProgress(0);

      const volumeValue = bleepVolume / 100;

      console.log(
        'Bleeping',
        matchedWords.length,
        'words with',
        bleepSound,
        'sound at',
        bleepVolume + '% volume'
      );
      console.log('Volume settings:');
      console.log(`- Bleep volume: ${bleepVolume}% (converted to ${volumeValue})`);
      console.log(
        `- Original word volume: ${Math.round(originalVolumeReduction * 100)}% (value: ${originalVolumeReduction})`
      );
      console.log(`- Bleep buffer: ${bleepBuffer}s`);

      const wordsWithBuffer = matchedWords.map(word => ({
        word: word.word,
        start: Math.max(0, word.start - bleepBuffer),
        end: word.end + bleepBuffer,
      }));

      const finalBleepSegments = mergeOverlappingBleeps(wordsWithBuffer);
      console.log(`After applying ${bleepBuffer}s buffer and merging:`, finalBleepSegments);

      let censoredBlob: Blob;

      if (file.type.includes('audio')) {
        censoredBlob = await applyBleeps(
          file,
          finalBleepSegments,
          bleepSound,
          volumeValue,
          originalVolumeReduction
        );
      } else if (file.type.includes('video')) {
        setIsProcessingVideo(true);
        setProgressText('Processing video (this may take a moment)...');
        censoredBlob = await applyBleepsToVideo(
          file,
          finalBleepSegments,
          bleepSound,
          volumeValue,
          originalVolumeReduction
        );
        setIsProcessingVideo(false);
      } else {
        throw new Error('Unsupported file type for bleeping');
      }

      const url = URL.createObjectURL(censoredBlob);
      setCensoredMediaUrl(url);

      setProgress(100);
      setProgressText('Bleeping complete!');

      setHasBleeped(true);
      setLastBleepVolume(bleepVolume);

      if (censoredMediaUrl) {
        URL.revokeObjectURL(censoredMediaUrl);
      }
    } catch (error) {
      console.error('Error applying bleeps:', error);
      setErrorMessage(
        'Failed to apply bleeps: ' + (error instanceof Error ? error.message : 'Unknown error')
      );
      setProgressText('Error applying bleeps');
    }
  };

  const handlePreviewBleep = async () => {
    setIsPreviewingBleep(true);

    try {
      const bleepPath = getPublicPath(`/bleeps/${bleepSound}.mp3`);
      const response = await fetch(bleepPath);
      const arrayBuffer = await response.arrayBuffer();

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;

      const gainNode = audioContext.createGain();
      gainNode.gain.value = bleepVolume / 100;

      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const duration = Math.min(1, audioBuffer.duration);
      source.start(0, 0, duration);

      setTimeout(() => {
        try {
          source.stop();
        } catch {
          // Ignore errors if already stopped
        }
        audioContext.close();
        setIsPreviewingBleep(false);
      }, duration * 1000);
    } catch (error) {
      console.error('Preview error:', error);
      setIsPreviewingBleep(false);
    }
  };

  // Test hook for loading pre-generated transcripts
  useEffect(() => {
    const handleTestTranscript = (event: Event) => {
      const customEvent = event as CustomEvent<TranscriptionResult>;
      console.log('[Test Hook] Loading pre-generated transcript:', customEvent.detail);

      setTranscriptionResult(customEvent.detail);
      setIsTranscribing(false);
      setProgress(100);
      setProgressText('Transcription complete!');

      // Handle timestamp warnings if present in metadata
      if (customEvent.detail.metadata && customEvent.detail.metadata.nullTimestampCount > 0) {
        setTimestampWarning({
          count: customEvent.detail.metadata.nullTimestampCount,
          total: customEvent.detail.metadata.totalChunks,
        });
      } else {
        setTimestampWarning(null);
      }
    };

    window.addEventListener('test:loadTranscript', handleTestTranscript);
    return () => window.removeEventListener('test:loadTranscript', handleTestTranscript);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    file: {
      file,
      fileUrl,
      isLoadingSample,
      showFileWarning,
      fileDurationWarning,
      handleFileUpload,
    },
    transcription: {
      language,
      model,
      isTranscribing,
      transcriptionResult,
      progress,
      progressText,
      errorMessage,
      timestampWarning,
      setLanguage,
      setModel,
      setErrorMessage,
      setTranscriptionResult, // Exposed for testing
      handleTranscribe,
    },
    wordSelection: {
      wordsToMatch,
      matchMode,
      fuzzyDistance,
      censoredWordIndices,
      searchQuery,
      transcriptExpanded,
      matchedWords,
      activeWordsets,
      wordsetWords,
      wordSource,
      setWordsToMatch,
      setMatchMode,
      setFuzzyDistance,
      setSearchQuery,
      setTranscriptExpanded,
      handleMatch,
      handleToggleWord,
      handleClearAll,
      handleApplyWordsets,
      handleRemoveWordset,
    },
    bleepConfig: {
      bleepSound,
      bleepVolume,
      originalVolumeReduction,
      bleepBuffer,
      censoredMediaUrl,
      isProcessingVideo,
      isPreviewingBleep,
      hasBleeped,
      lastBleepVolume,
      setBleepSound,
      setBleepVolume,
      setOriginalVolumeReduction,
      setBleepBuffer,
      handleBleep,
      handlePreviewBleep,
    },
  };
}
