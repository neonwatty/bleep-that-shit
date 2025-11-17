'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { decodeAudioToMono16kHzPCM } from '@/lib/utils/audioDecode';
import { applyBleeps, applyBleepsToVideo } from '@/lib/utils/audioProcessor';
import { getPublicPath } from '@/lib/utils/paths';
import { mergeOverlappingBleeps } from '@/lib/utils/bleepMerger';
import { levenshteinDistance } from '@/lib/utils/stringMatching';
import { TranscriptReview } from '@/components/TranscriptReview';
import { MatchedWordsDisplay } from '@/components/MatchedWordsDisplay';
import { WaveformEditor } from '@/components/WaveformEditor';
import type { ManualRegion, BleepSegment } from '@/lib/types/bleep';

interface TranscriptionResult {
  text: string;
  chunks: Array<{
    text: string;
    timestamp: [number, number];
  }>;
}

export default function BleepPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState('en');
  const [model, setModel] = useState('Xenova/whisper-tiny.en');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
  const [bleepSound, setBleepSound] = useState('bleep');
  const [bleepVolume, setBleepVolume] = useState(80);
  const [originalVolumeReduction, setOriginalVolumeReduction] = useState(0.0); // Default: completely mute original audio during bleeps
  const [censoredMediaUrl, setCensoredMediaUrl] = useState<string | null>(null);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [showFileWarning, setShowFileWarning] = useState(false);
  const [fileDurationWarning, setFileDurationWarning] = useState<string | null>(null);
  const [isPreviewingBleep, setIsPreviewingBleep] = useState(false);
  const [hasBleeped, setHasBleeped] = useState(false);
  const [lastBleepVolume, setLastBleepVolume] = useState<number | null>(null);
  const [bleepBuffer, setBleepBuffer] = useState<number>(0); // 0-0.5 seconds buffer before/after each word
  const [timestampWarning, setTimestampWarning] = useState<{ count: number; total: number } | null>(
    null
  );
  const [manualRegions, setManualRegions] = useState<ManualRegion[]>([]);
  const [showWaveformEditor, setShowWaveformEditor] = useState(false);

  // Derived state: compute matchedWords from censoredWordIndices
  const matchedWords = useMemo(() => {
    if (!transcriptionResult) return [];
    return Array.from(censoredWordIndices)
      .map(idx => transcriptionResult.chunks[idx])
      .filter(chunk => {
        // Filter out chunks with null timestamps
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
      .map(chunk => ({
        word: chunk.text,
        start: chunk.timestamp[0],
        end: chunk.timestamp[1],
      }))
      .sort((a, b) => a.start - b.start);
  }, [censoredWordIndices, transcriptionResult]);

  // Derived state: combine word-based and manual bleeps
  const allBleepSegments = useMemo(() => {
    const wordBleeps: BleepSegment[] = matchedWords.map(w => ({
      ...w,
      source: 'word' as const,
      id: `word-${w.start}-${w.end}`,
      color: '#ec4899', // pink for word-based
    }));

    const manualBleeps: BleepSegment[] = manualRegions.map(r => ({
      word: r.label || 'Manual',
      start: r.start,
      end: r.end,
      source: 'manual' as const,
      id: r.id,
      color: '#3b82f6', // blue for manual
    }));

    return [...wordBleeps, ...manualBleeps];
  }, [matchedWords, manualRegions]);

  const workerRef = useRef<Worker | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async acceptedFiles => {
      const file = acceptedFiles[0];
      if (file && (file.type.includes('audio') || file.type.includes('video'))) {
        setFile(file);
        const url = URL.createObjectURL(file);
        setFileUrl(url);
        setShowFileWarning(false);
        setFileDurationWarning(null);

        // Check file duration
        try {
          const mediaElement = document.createElement(
            file.type.includes('video') ? 'video' : 'audio'
          );
          mediaElement.src = url;

          await new Promise(resolve => {
            mediaElement.addEventListener('loadedmetadata', () => {
              const duration = mediaElement.duration;
              if (duration > 600) {
                // 10 minutes = 600 seconds
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
    },
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a'],
      'video/*': ['.mp4', '.mov', '.avi'],
    },
    multiple: false,
  });

  const handleTranscribe = async () => {
    if (!file) return;

    setIsTranscribing(true);
    setProgress(0);
    setProgressText('Initializing...');

    try {
      // Initialize worker using webpack
      if (!workerRef.current) {
        console.log('[Main] Creating new webpack worker');

        // Use webpack worker syntax
        workerRef.current = new Worker(
          new URL('../workers/transcriptionWorker.ts', import.meta.url),
          { type: 'module' }
        );
        console.log('[Main] Worker created successfully');
      } else {
        console.log('[Main] Using existing worker');
      }

      const worker = workerRef.current;

      // Set up error handler first
      worker.onerror = error => {
        console.error('[Main] Worker error:', error);
        setErrorMessage('Worker error occurred');
        setIsTranscribing(false);
      };

      // Set up message handler
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

          // Check for metadata about null timestamps
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
          // Handle extracted audio from video - decode it first
          const audioBuffer = event.data.audioBuffer;
          setProgressText('Decoding extracted audio...');

          // Decode in an async IIFE since onmessage can't be async
          (async () => {
            try {
              // Create AudioContext and decode the WAV buffer
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 16000,
              });
              const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
              const float32Audio = decodedAudio.getChannelData(0);

              console.log('Decoded extracted audio to Float32Array, length:', float32Audio.length);

              // Create a copy to transfer
              const audioCopy = new Float32Array(float32Audio);

              // Send decoded audio to worker with transfer
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
          // Show error in UI
          setTranscriptionResult(null);
        }
      };

      // For audio files, decode to Float32Array in main thread
      if (file.type.includes('audio')) {
        setProgressText('Decoding audio...');
        setProgress(30);

        try {
          // Decode audio to mono 16kHz Float32Array
          const audioData = await decodeAudioToMono16kHzPCM(file);
          console.log('Decoded audio to Float32Array, length:', audioData.length);

          // Create a copy to transfer
          const audioCopy = new Float32Array(audioData);

          console.log(
            '[Main] Sending to worker - type: transcribe, audioData length:',
            audioCopy.length,
            'model:',
            model,
            'language:',
            language
          );

          // Send decoded audio to worker with transfer
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
        // For video files, send to worker for extraction first
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

  const handleMatch = () => {
    if (!transcriptionResult || !wordsToMatch) return;

    console.log('Starting matching with transcription result:', transcriptionResult);
    console.log('Words to match:', wordsToMatch);
    console.log('Match mode:', matchMode);
    console.log(
      'First 5 chunks:',
      transcriptionResult.chunks.slice(0, 5).map(c => c.text)
    );

    const words = wordsToMatch
      .toLowerCase()
      .split(',')
      .map(w => w.trim())
      .filter(Boolean);

    // Start with existing selections (additive behavior)
    const newIndices = new Set(censoredWordIndices);

    if (transcriptionResult.chunks && transcriptionResult.chunks.length > 0) {
      console.log('Sample chunk structure:', transcriptionResult.chunks[0]);
    }

    transcriptionResult.chunks.forEach((chunk, index) => {
      const chunkText = chunk.text.toLowerCase().trim();
      // Remove common punctuation for exact matching
      const chunkTextClean = chunkText.replace(/[.,!?;:'"]/g, '');
      let isMatch = false;

      // Check all search words against this chunk
      for (const word of words) {
        if (matchMode.exact) {
          // Try both with and without punctuation
          if (chunkText === word || chunkTextClean === word) {
            console.log(`Exact match: "${chunk.text}" matches "${word}"`);
            isMatch = true;
            break;
          }
        }
        if (matchMode.partial && chunkText.includes(word)) {
          isMatch = true;
          break; // Stop checking other words once we have a match
        }
        if (matchMode.fuzzy) {
          // Simple fuzzy matching (Levenshtein distance)
          const distance = levenshteinDistance(chunkText, word);
          if (distance <= fuzzyDistance) {
            isMatch = true;
            break; // Stop checking other words once we have a match
          }
        }
      }

      // Add to censored indices if matched
      if (isMatch) {
        newIndices.add(index);
        const start = chunk.timestamp ? chunk.timestamp[0] : 0;
        const end = chunk.timestamp ? chunk.timestamp[1] : 0;
        console.log(`Match found: "${chunk.text}" at [${start}, ${end}]`);
      }
    });

    console.log('Total censored words:', newIndices.size);

    // Update censored indices (additive - doesn't clear existing selections)
    setCensoredWordIndices(newIndices);

    if (newIndices.size === 0) {
      console.log('No matches found. Check if words exist in transcription.');
    }
  };

  const handleBleep = async () => {
    if (!file || allBleepSegments.length === 0) {
      console.log('Cannot bleep: no file or no bleep segments');
      return;
    }

    try {
      setProgressText('Applying bleeps...');
      setProgress(0);

      // Convert volume percentage to 0-1 range
      const volumeValue = bleepVolume / 100;

      console.log(
        'Bleeping',
        allBleepSegments.length,
        'segments (',
        matchedWords.length,
        'word-based +',
        manualRegions.length,
        'manual) with',
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
      console.log('Original bleep segments (no buffer):', allBleepSegments);

      // Apply the current buffer to all bleep segments
      const segmentsWithBuffer = allBleepSegments.map(segment => ({
        word: segment.word,
        start: Math.max(0, segment.start - bleepBuffer),
        end: segment.end + bleepBuffer,
      }));

      // Merge overlapping bleeps (after buffer is applied)
      const finalBleepSegments = mergeOverlappingBleeps(segmentsWithBuffer);
      console.log(`After applying ${bleepBuffer}s buffer and merging:`, finalBleepSegments);

      let censoredBlob: Blob;

      if (file.type.includes('audio')) {
        // Process audio file
        censoredBlob = await applyBleeps(
          file,
          finalBleepSegments,
          bleepSound,
          volumeValue,
          originalVolumeReduction
        );
      } else if (file.type.includes('video')) {
        // Process video file
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

      // Create URL for the censored media
      const url = URL.createObjectURL(censoredBlob);
      setCensoredMediaUrl(url);

      setProgress(100);
      setProgressText('Bleeping complete!');

      // Track bleeping state for re-bleeping feature
      setHasBleeped(true);
      setLastBleepVolume(bleepVolume);

      // Clean up old URL
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
      // Load bleep sound based on bleepSound state
      const bleepPath = getPublicPath(`/bleeps/${bleepSound}.mp3`);
      const response = await fetch(bleepPath);
      const arrayBuffer = await response.arrayBuffer();

      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Create source and gain node
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;

      const gainNode = audioContext.createGain();
      gainNode.gain.value = bleepVolume / 100; // Convert to 0-1

      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Play for 1 second or full duration (whichever is shorter)
      const duration = Math.min(1, audioBuffer.duration);
      source.start(0, 0, duration);

      // Cleanup after playing
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

  // Simple Levenshtein distance implementation
  const handleToggleWord = (index: number) => {
    const newIndices = new Set(censoredWordIndices);
    if (newIndices.has(index)) {
      newIndices.delete(index);
    } else {
      newIndices.add(index);
    }
    setCensoredWordIndices(newIndices);
  };

  const handleClearAll = () => {
    setCensoredWordIndices(new Set());
  };

  useEffect(() => {
    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="editorial-section px-2 sm:px-4">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <span className="inline-block align-middle" aria-label="Waveform icon">
          <svg
            width="36"
            height="36"
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="2" y="14" width="4" height="8" rx="2" fill="#111" />
            <rect x="8" y="10" width="4" height="16" rx="2" fill="#111" />
            <rect x="14" y="6" width="4" height="24" rx="2" fill="#111" />
            <rect x="20" y="10" width="4" height="16" rx="2" fill="#111" />
            <rect x="26" y="14" width="4" height="8" rx="2" fill="#111" />
          </svg>
        </span>
        <span className="text-xl sm:text-2xl md:text-3xl" aria-label="Cursing emoji">
          🙊
        </span>
        <h1
          className="font-inter ml-3 text-2xl leading-tight font-extrabold tracking-tight text-black uppercase sm:text-3xl md:text-4xl lg:text-5xl"
          style={{ lineHeight: '0.95' }}
        >
          Bleep Your Sh*t!
        </h1>
      </div>

      <div className="mb-8 border-l-4 border-yellow-400 bg-yellow-100 p-3">
        <span className="rounded bg-pink-200 px-2 py-1 font-bold">
          Process your entire audio or video file
        </span>
        , censoring selected words with customizable matching and bleep sounds.
        <div className="mt-2 text-sm">
          <span className="inline-flex items-center">
            ⏱️ <strong className="ml-1">Note:</strong> Currently supports files up to 10 minutes in
            length.
          </span>
        </div>
      </div>

      {/* Workflow */}
      <div className="mb-2 text-xs font-semibold tracking-wide text-gray-700 uppercase sm:text-sm">
        How it works
      </div>
      <ol className="mb-8 list-decimal pl-4 text-sm text-gray-900 sm:text-base md:pl-6 md:text-lg">
        <li>
          <span className="rounded bg-blue-100 px-2 py-1 text-blue-900">Upload your file</span>{' '}
          (audio or video).
        </li>
        <li>
          <span className="rounded bg-green-100 px-2 py-1 text-green-900">
            Select language and model
          </span>{' '}
          for transcription.
        </li>
        <li>
          <span className="rounded bg-indigo-100 px-2 py-1 text-indigo-900">Transcribe</span> your
          file to generate a word-level transcript.
        </li>
        <li>
          <span className="rounded bg-purple-100 px-2 py-1 text-purple-900">
            Enter words and matching modes
          </span>{' '}
          (exact, partial, fuzzy).
        </li>
        <li>
          <span className="rounded bg-pink-100 px-2 py-1 text-pink-900">Run matching</span> to find
          words to censor.
        </li>
        <li>
          <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-900">
            Choose bleep sound and volume
          </span>{' '}
          for censorship.
        </li>
        <li>
          <span className="rounded bg-violet-100 px-2 py-1 text-violet-900">
            Bleep That Sh*t! and preview/download the censored result.
          </span>
        </li>
      </ol>

      {/* Step 1: Upload */}
      <section className="editorial-section mb-8 border-l-4 border-blue-500 pl-3 sm:mb-12 sm:pl-4">
        <div className="mb-2 flex items-center">
          <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-base font-bold text-white">
            1
          </span>
          <h2 className="font-inter text-lg font-extrabold text-black uppercase sm:text-xl md:text-2xl">
            Upload Your File
          </h2>
        </div>
        <p className="mb-2 text-sm text-blue-900 sm:text-base">
          Audio (MP3) or Video (MP4) supported. Files up to 10 minutes. Preview your input before
          processing.
        </p>

        <div
          {...getRootProps()}
          data-testid="file-dropzone"
          className="min-h-[120px] cursor-pointer rounded-lg border-2 border-dashed border-gray-400 p-8 text-center transition-all hover:border-blue-500 hover:bg-gray-50 active:bg-gray-100 sm:min-h-[100px] sm:p-6"
        >
          <input {...getInputProps()} data-testid="file-input" className="sr-only" />
          {isDragActive ? (
            <p className="text-gray-700">Drop the file here...</p>
          ) : (
            <p className="text-gray-700">
              Drag and drop your audio or video file here or click to browse
            </p>
          )}
        </div>

        {showFileWarning && (
          <div
            data-testid="file-warning"
            className="mt-2 rounded border border-red-400 bg-red-100 p-2 text-red-700"
          >
            Please upload a valid audio or video file (MP3, MP4, etc.)
          </div>
        )}

        {fileDurationWarning && (
          <div
            data-testid="file-duration-warning"
            className="mt-2 rounded border border-orange-400 bg-orange-100 p-3 text-orange-800"
          >
            <div className="flex items-start">
              <span className="mr-2">⚠️</span>
              <div>{fileDurationWarning}</div>
            </div>
          </div>
        )}

        {file && (
          <div className="mt-4">
            <p className="font-semibold text-green-700">File loaded: {file.name}</p>
            {fileUrl && file.type.includes('audio') && (
              <audio controls className="mt-2 w-full">
                <source src={fileUrl} type={file.type} />
              </audio>
            )}
            {fileUrl && file.type.includes('video') && (
              <video controls className="mx-auto mt-2 max-w-2xl rounded-lg shadow-sm">
                <source src={fileUrl} type={file.type} />
              </video>
            )}
          </div>
        )}
      </section>

      {/* Step 2: Language & Model */}
      <section className="editorial-section mb-8 border-l-4 border-green-500 pl-3 sm:mb-12 sm:pl-4">
        <div className="mb-2 flex items-center">
          <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-base font-bold text-white">
            2
          </span>
          <h2 className="font-inter text-lg font-extrabold text-black uppercase sm:text-xl md:text-2xl">
            Select Language & Model
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold">Language</label>
            <select
              data-testid="language-select"
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="min-h-touch w-full rounded-lg border border-gray-300 p-3 text-base focus:border-transparent focus:ring-2 focus:ring-blue-500 sm:p-2"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="nl">Dutch</option>
              <option value="pl">Polish</option>
              <option value="ja">Japanese</option>
              <option value="zh">Chinese</option>
              <option value="ko">Korean</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Model</label>
            <select
              data-testid="model-select"
              value={model}
              onChange={e => setModel(e.target.value)}
              className="min-h-touch w-full rounded-lg border border-gray-300 p-3 text-base focus:border-transparent focus:ring-2 focus:ring-blue-500 sm:p-2"
            >
              <option value="Xenova/whisper-tiny.en">Tiny (~50 MB, fastest, lower accuracy)</option>
              <option value="Xenova/whisper-base.en">Base (~85 MB, balanced, recommended)</option>
              <option value="Xenova/whisper-small.en">
                Small (~275 MB, best accuracy, slower)
              </option>
              <option value="Xenova/whisper-tiny">Tiny Multilingual (~50 MB, 90+ languages)</option>
              <option value="Xenova/whisper-base">Base Multilingual (~85 MB, recommended)</option>
              <option value="Xenova/whisper-small">
                Small Multilingual (~275 MB, best accuracy)
              </option>
            </select>
          </div>
        </div>
      </section>

      {/* Step 3: Transcribe */}
      <section className="editorial-section mb-8 border-l-4 border-indigo-500 pl-3 sm:mb-12 sm:pl-4">
        <div className="mb-2 flex items-center">
          <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-base font-bold text-white">
            3
          </span>
          <h2 className="font-inter text-lg font-extrabold text-black uppercase sm:text-xl md:text-2xl">
            Transcribe
          </h2>
        </div>

        <button
          data-testid="transcribe-button"
          onClick={handleTranscribe}
          disabled={!file || isTranscribing}
          className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isTranscribing ? 'Transcribing...' : 'Start Transcription'}
        </button>

        {isTranscribing && (
          <div className="mt-4">
            <div data-testid="progress-bar" className="h-2.5 w-full rounded-full bg-gray-200">
              <div
                className="h-2.5 rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p data-testid="progress-text" className="mt-2 text-sm text-gray-600">
              {progressText}
            </p>
          </div>
        )}

        {/* Error Display */}
        {errorMessage && (
          <div
            data-testid="error-message"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4"
          >
            <div className="flex items-start">
              <svg
                className="mt-0.5 mr-2 h-5 w-5 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-red-800">Transcription Error</p>
                <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="mt-2 text-sm text-red-600 underline hover:text-red-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {transcriptionResult && (
          <div data-testid="transcript-result" className="mt-4 rounded bg-gray-50 p-4">
            <h3 className="mb-2 font-bold">Transcript:</h3>
            <p data-testid="transcript-text" className="text-gray-800">
              {transcriptionResult.text}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Found {transcriptionResult.chunks.length} words with timestamps
            </p>
          </div>
        )}

        {/* Timestamp Quality Warning */}
        {timestampWarning && (
          <div
            data-testid="timestamp-warning"
            className="mt-2 rounded border border-orange-400 bg-orange-100 p-3 text-orange-800"
          >
            <div className="flex items-start">
              <span className="mr-2">⚠️</span>
              <div>
                <strong>Timestamp Quality Warning:</strong> {timestampWarning.count} out of{' '}
                {timestampWarning.total} words had invalid timestamps and were filtered out.
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Step 4: Word Matching and Review */}
      <section
        className={`editorial-section mb-8 border-l-4 border-purple-500 pl-3 sm:mb-12 sm:pl-4 ${!transcriptionResult ? 'opacity-50' : ''}`}
      >
        <div className="mb-2 flex items-center">
          <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-base font-bold text-white">
            4
          </span>
          <h2 className="font-inter text-lg font-extrabold text-black uppercase sm:text-xl md:text-2xl">
            Review & Select Words to Bleep
          </h2>
        </div>

        {/* Pattern Matching Controls */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-gray-700 uppercase">
            Pattern Matching (Optional)
          </h3>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold">
              Words to match (comma-separated)
            </label>
            <input
              data-testid="words-to-match-input"
              type="text"
              value={wordsToMatch}
              onChange={e => setWordsToMatch(e.target.value)}
              placeholder="e.g., bad, word, curse"
              className="min-h-touch w-full rounded-lg border border-gray-300 p-3 text-base focus:border-transparent focus:ring-2 focus:ring-blue-500 sm:p-2"
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold">Matching modes</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="-m-2 flex cursor-pointer items-center rounded p-2 hover:bg-gray-50">
                <input
                  data-testid="exact-match-checkbox"
                  type="checkbox"
                  checked={matchMode.exact}
                  onChange={e => setMatchMode({ ...matchMode, exact: e.target.checked })}
                  className="mr-3 h-5 w-5"
                />
                Exact match
              </label>
              <label className="-m-2 flex cursor-pointer items-center rounded p-2 hover:bg-gray-50">
                <input
                  data-testid="partial-match-checkbox"
                  type="checkbox"
                  checked={matchMode.partial}
                  onChange={e => setMatchMode({ ...matchMode, partial: e.target.checked })}
                  className="mr-3 h-5 w-5"
                />
                Partial match
              </label>
              <label className="-m-2 flex cursor-pointer items-center rounded p-2 hover:bg-gray-50">
                <input
                  data-testid="fuzzy-match-checkbox"
                  type="checkbox"
                  checked={matchMode.fuzzy}
                  onChange={e => setMatchMode({ ...matchMode, fuzzy: e.target.checked })}
                  className="mr-3 h-5 w-5"
                />
                Fuzzy match
              </label>
            </div>

            {matchMode.fuzzy && (
              <div className="mt-2">
                <label className="text-sm">Fuzzy distance: {fuzzyDistance}</label>
                <input
                  data-testid="fuzzy-distance-slider"
                  type="range"
                  min="1"
                  max="3"
                  value={fuzzyDistance}
                  onChange={e => setFuzzyDistance(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              data-testid="run-matching-button"
              onClick={handleMatch}
              disabled={!transcriptionResult || !wordsToMatch}
              className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Match Words
            </button>
            {censoredWordIndices.size > 0 && (
              <button
                data-testid="clear-all-button"
                onClick={handleClearAll}
                className="btn bg-gray-500 text-white hover:bg-gray-600"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Interactive Transcript */}
        {transcriptionResult && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
            <TranscriptReview
              chunks={transcriptionResult.chunks}
              censoredIndices={censoredWordIndices}
              onToggleWord={handleToggleWord}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isExpanded={transcriptExpanded}
              onToggleExpanded={() => setTranscriptExpanded(!transcriptExpanded)}
            />
          </div>
        )}

        {/* Matched Words Display */}
        <MatchedWordsDisplay matchedWords={matchedWords} isVisible={matchedWords.length > 0} />

        {/* Manual Time Selection - Collapsible */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-white">
          <button
            onClick={() => setShowWaveformEditor(!showWaveformEditor)}
            className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
          >
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase">
                Manual Time Selection
                {manualRegions.length > 0 && (
                  <span className="ml-2 rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">
                    {manualRegions.length}
                  </span>
                )}
              </h3>
              <p className="mt-1 text-xs text-gray-600">
                For precise control or poor transcription, select time segments directly from the
                waveform.
              </p>
            </div>
            <span className="text-gray-400">{showWaveformEditor ? '▲' : '▼'}</span>
          </button>

          {showWaveformEditor && (
            <div className="border-t border-gray-200 p-4">
              <WaveformEditor
                audioFile={file}
                regions={manualRegions}
                onRegionsChange={setManualRegions}
                existingWordBleeps={matchedWords.map(w => ({
                  ...w,
                  source: 'word' as const,
                  id: `word-${w.start}-${w.end}`,
                  color: '#ec4899',
                }))}
              />
            </div>
          )}
        </div>

        {/* Combined Total */}
        {allBleepSegments.length > 0 && (
          <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm">
            <strong>Total segments to bleep:</strong> {matchedWords.length} word-based +{' '}
            {manualRegions.length} manual = {allBleepSegments.length} total
          </div>
        )}
      </section>

      {/* Step 5: Bleep Sound */}
      <section
        className={`editorial-section mb-8 border-l-4 border-yellow-500 pl-3 sm:mb-12 sm:pl-4 ${allBleepSegments.length === 0 ? 'opacity-50' : ''}`}
      >
        <div className="mb-2 flex items-center">
          <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-base font-bold text-white">
            5
          </span>
          <h2 className="font-inter text-lg font-extrabold text-black uppercase sm:text-xl md:text-2xl">
            Choose Bleep Sound & Volume
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold">Bleep Sound</label>
            <select
              data-testid="bleep-sound-select"
              value={bleepSound}
              onChange={e => setBleepSound(e.target.value)}
              className="min-h-touch w-full rounded-lg border border-gray-300 p-3 text-base focus:border-transparent focus:ring-2 focus:ring-yellow-500 sm:max-w-xs sm:p-2"
            >
              <option value="bleep">Classic Bleep</option>
              <option value="brown">Brown Noise</option>
              <option value="dolphin">Dolphin Sounds Bleep</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Bleep Volume: <span className="font-bold text-yellow-600">{bleepVolume}%</span>
            </label>
            <input
              data-testid="bleep-volume-slider"
              type="range"
              min="0"
              max="150"
              step="5"
              value={bleepVolume}
              onChange={e => setBleepVolume(Number(e.target.value))}
              className="h-2 w-full cursor-pointer rounded-lg sm:max-w-xs"
            />
            <div className="mt-1 flex w-full justify-between text-xs text-gray-600 sm:max-w-xs">
              <span>Quiet</span>
              <span>Loud</span>
            </div>

            {/* New: Original Word Volume Reduction */}
            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold">
                Original Word Volume:{' '}
                <span className="font-bold text-yellow-600">
                  {Math.round(originalVolumeReduction * 100)}%
                </span>
              </label>
              <input
                data-testid="original-volume-slider"
                type="range"
                min="0"
                max="100"
                step="10"
                value={Math.round(originalVolumeReduction * 100)}
                onChange={e => setOriginalVolumeReduction(Number(e.target.value) / 100)}
                className="h-2 w-full cursor-pointer rounded-lg sm:max-w-xs"
              />
              <div className="mt-1 flex w-full justify-between text-xs text-gray-600 sm:max-w-xs">
                <span>Removed</span>
                <span>Original</span>
              </div>
            </div>

            {/* Bleep Buffer Control */}
            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold">
                Bleep Buffer:{' '}
                <span className="font-bold text-yellow-600">{bleepBuffer.toFixed(2)}s</span>
              </label>
              <input
                data-testid="bleep-buffer-slider"
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={bleepBuffer}
                onChange={e => setBleepBuffer(parseFloat(e.target.value))}
                className="h-2 w-full cursor-pointer rounded-lg sm:max-w-xs"
              />
              <div className="mt-1 flex w-full justify-between text-xs text-gray-600 sm:max-w-xs">
                <span>None</span>
                <span>0.5s</span>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                Extends bleep {bleepBuffer.toFixed(2)}s before and after each word
              </p>
            </div>
            <button
              data-testid="preview-bleep-button"
              onClick={handlePreviewBleep}
              disabled={isPreviewingBleep}
              className="min-h-touch mt-3 w-full rounded-lg bg-yellow-500 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-4 sm:py-2 sm:text-sm"
            >
              {isPreviewingBleep ? '🔊 Playing...' : '🔊 Preview Bleep'}
            </button>
          </div>
        </div>
      </section>

      {/* Step 6: Bleep! */}
      <section
        className={`editorial-section mb-8 border-l-4 border-violet-500 pl-3 sm:mb-12 sm:pl-4 ${matchedWords.length === 0 ? 'opacity-50' : ''}`}
      >
        <div className="mb-2 flex items-center">
          <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 text-base font-bold text-white">
            6
          </span>
          <h2 className="font-inter text-lg font-extrabold text-black uppercase sm:text-xl md:text-2xl">
            Bleep That Sh*t!
          </h2>
        </div>

        <button
          data-testid="apply-bleeps-button"
          onClick={handleBleep}
          disabled={!file || matchedWords.length === 0}
          className={`btn btn-pink transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
            hasBleeped && bleepVolume !== lastBleepVolume
              ? 'animate-pulse ring-4 ring-yellow-400'
              : ''
          }`}
        >
          {hasBleeped ? 'Re-apply Bleeps with New Settings' : 'Apply Bleeps!'}
        </button>

        {isProcessingVideo && (
          <div data-testid="video-processing-indicator" className="mt-4">
            <p className="text-gray-600">Processing video... This may take a few moments.</p>
          </div>
        )}

        {censoredMediaUrl && (
          <div data-testid="censored-result" className="mt-4">
            <h3 className="mb-2 font-bold">Censored Result:</h3>
            {file?.type.includes('video') ? (
              <div className="flex flex-col items-center">
                <video key={censoredMediaUrl} controls className="max-w-2xl rounded-lg shadow-md">
                  <source src={censoredMediaUrl} type="video/mp4" />
                </video>
                <a
                  data-testid="download-button"
                  href={censoredMediaUrl}
                  download="censored-video.mp4"
                  className="mt-2 inline-block rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                >
                  Download Censored Video
                </a>
              </div>
            ) : (
              <>
                <audio key={censoredMediaUrl} controls className="w-full">
                  <source src={censoredMediaUrl} type="audio/mpeg" />
                </audio>
                <a
                  data-testid="download-button"
                  href={censoredMediaUrl}
                  download="censored-audio.mp3"
                  className="mt-2 inline-block rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                >
                  Download Censored Audio
                </a>
              </>
            )}

            {/* Info message about re-bleeping */}
            <div className="mt-4 rounded border-l-4 border-blue-400 bg-blue-50 p-3 text-sm">
              <p className="text-blue-900">
                💡 <strong>Tip:</strong> Want to adjust the volume or try a different bleep sound?
                Change your settings in Step 5 and click "Re-apply Bleeps" above to generate a new
                version.
                {lastBleepVolume !== null && bleepVolume !== lastBleepVolume && (
                  <span className="mt-2 block font-semibold text-blue-700">
                    ⚡ Volume changed from {lastBleepVolume}% to {bleepVolume}% - ready to re-apply!
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
