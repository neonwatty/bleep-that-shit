'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { TranscriptExport } from '@/components/TranscriptExport';
import { trackEvent } from '@/lib/analytics';

interface ModelResult {
  model: string;
  text: string;
  chunks?: Array<{ text: string; timestamp: [number, number] }>;
  time: number;
  status: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
}

function SamplerPageContent() {
  const searchParams = useSearchParams();
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [sampleStart, setSampleStart] = useState(0);
  const [sampleDuration, setSampleDuration] = useState(10);
  const [language, setLanguage] = useState('en');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ModelResult[]>([]);
  const [fileDurationWarning, setFileDurationWarning] = useState<string | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

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

          setFile(sampleFile);
          const url = URL.createObjectURL(sampleFile);
          setFileUrl(url);
          setResults([]);
          setFileDurationWarning(null);
        } catch (error) {
          console.error('Error loading sample video:', error);
        } finally {
          setIsLoadingSample(false);
        }
      };
      loadSampleVideo();
    }
  }, [searchParams, file, isLoadingSample]);

  const models = [
    { id: 'Xenova/whisper-tiny.en', name: 'Tiny (fastest, lower accuracy)', size: '~50 MB' },
    { id: 'Xenova/whisper-base.en', name: 'Base (balanced, recommended)', size: '~85 MB' },
    { id: 'Xenova/whisper-small.en', name: 'Small (best accuracy)', size: '~275 MB' },
    {
      id: 'onnx-community/whisper-medium.en_timestamped',
      name: 'Medium (highest accuracy, slowest)',
      size: '~800 MB',
    },
    { id: 'Xenova/whisper-tiny', name: 'Tiny Multilingual (90+ languages)', size: '~50 MB' },
    { id: 'Xenova/whisper-base', name: 'Base Multilingual (recommended)', size: '~85 MB' },
    { id: 'Xenova/whisper-small', name: 'Small Multilingual (best accuracy)', size: '~275 MB' },
    {
      id: 'onnx-community/whisper-medium_timestamped',
      name: 'Medium Multilingual (highest accuracy, slowest)',
      size: '~800 MB',
    },
  ];

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async acceptedFiles => {
      const file = acceptedFiles[0];
      if (file && (file.type.includes('audio') || file.type.includes('video'))) {
        setFile(file);
        const url = URL.createObjectURL(file);
        setFileUrl(url);
        setResults([]);
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

              trackEvent('sampler_file_upload', {
                file_type: file.type.includes('video') ? 'video' : 'audio',
                file_size_mb: Math.round((file.size / 1024 / 1024) * 100) / 100,
                duration_seconds: Math.round(duration),
              });

              if (duration > 600) {
                // 10 minutes = 600 seconds
                const minutes = Math.floor(duration / 60);
                const seconds = Math.floor(duration % 60);
                setFileDurationWarning(
                  `This file is ${minutes}:${seconds.toString().padStart(2, '0')} long. The sampler works on files of any length, but full transcription is limited to 10 minutes.`
                );
              }
              resolve(null);
            });
          });
        } catch (error) {
          console.error('Error checking file duration:', error);
        }
      }
    },
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a'],
      'video/*': ['.mp4', '.mov', '.avi'],
    },
    multiple: false,
  });

  const handleSampleAll = async () => {
    if (!file) return;

    setIsProcessing(true);
    const comparisonStartTime = Date.now();

    trackEvent('sampler_comparison_started', {
      language_code: language,
      model_count: models.length,
      sample_start: sampleStart,
      sample_duration: sampleDuration,
    });

    // Initialize results
    const initialResults: ModelResult[] = models.map(model => ({
      model: model.name,
      text: '',
      time: 0,
      status: 'pending',
    }));
    setResults(initialResults);

    // Process each model
    for (let i = 0; i < models.length; i++) {
      const model = models[i];

      // Update status to processing
      setResults(prev =>
        prev.map((r, idx) => (idx === i ? { ...r, status: 'processing' as const } : r))
      );

      try {
        const startTime = Date.now();

        // Create a webpack worker for this model
        const worker = new Worker(
          new URL('../workers/transcriptionSamplerWorker.ts', import.meta.url),
          { type: 'module' }
        );

        await new Promise<void>((resolve, reject) => {
          worker.onmessage = event => {
            const { type, result, error } = event.data;

            if (type === 'complete' && result) {
              const endTime = Date.now();
              const processingTime = (endTime - startTime) / 1000;

              trackEvent('sampler_model_completed', {
                model_name: model.name,
                processing_time_seconds: Math.round(processingTime * 100) / 100,
                word_count: result.chunks?.length || 0,
              });

              setResults(prev =>
                prev.map((r, idx) =>
                  idx === i
                    ? {
                        ...r,
                        text: result.text,
                        chunks: result.chunks || [],
                        time: processingTime,
                        status: 'complete' as const,
                      }
                    : r
                )
              );
              worker.terminate();
              resolve();
            }

            if (error) {
              setResults(prev =>
                prev.map((r, idx) =>
                  idx === i
                    ? {
                        ...r,
                        status: 'error' as const,
                        error: error,
                      }
                    : r
                )
              );
              worker.terminate();
              reject(error);
            }
          };

          // Extract and decode sample from file
          file.arrayBuffer().then(async buffer => {
            try {
              // Decode audio in main thread
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 16000,
              });
              const decodedBuffer = await audioContext.decodeAudioData(buffer.slice(0));

              // Extract the sample based on start and duration
              const startSample = Math.floor(sampleStart * 16000);
              const durationSamples = Math.floor(sampleDuration * 16000);
              const channelData = decodedBuffer.getChannelData(0);

              // Extract the sample
              const sampleAudio = new Float32Array(durationSamples);
              for (let i = 0; i < durationSamples && startSample + i < channelData.length; i++) {
                sampleAudio[i] = channelData[startSample + i];
              }

              // Send to worker
              const sampleCopy = new Float32Array(sampleAudio);
              worker.postMessage(
                {
                  audioData: sampleCopy,
                  model: model.id,
                  language,
                },
                [sampleCopy.buffer]
              );
            } catch (err) {
              console.error('Error decoding audio:', err);
              worker.postMessage({ error: 'Failed to decode audio' });
            }
          });
        });
      } catch (error) {
        console.error(`Error with model ${model.name}:`, error);
      }
    }

    // Track comparison completed
    const totalTime = (Date.now() - comparisonStartTime) / 1000;
    trackEvent('sampler_comparison_completed', {
      total_time_seconds: Math.round(totalTime * 100) / 100,
      model_count: models.length,
    });

    setIsProcessing(false);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      setSampleStart(Math.floor(currentTime));
    }
  };

  return (
    <div className="editorial-section">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-inter mb-4 text-4xl font-extrabold text-black uppercase md:text-5xl">
          Transcription Sampler
        </h1>
        <p className="text-lg text-gray-700">
          Compare different Whisper models on a short audio sample to find the best balance of speed
          and accuracy for your needs.
        </p>
      </div>

      {/* Info Box */}
      <div className="mb-8 border-l-4 border-blue-400 bg-blue-50 p-4">
        <h2 className="mb-2 font-bold text-blue-900">Why use the sampler?</h2>
        <ul className="list-disc pl-5 text-blue-800">
          <li>Test multiple models on the same audio snippet</li>
          <li>Compare transcription accuracy across models</li>
          <li>See performance differences (speed vs quality)</li>
          <li>Choose the right model before processing your full file</li>
        </ul>
        <div className="mt-3 text-sm text-blue-900">
          <span className="inline-flex items-center">
            ⏱️ <strong className="ml-1">Note:</strong> Full transcription supports files up to 10
            minutes.
          </span>
        </div>
      </div>

      {/* Step 1: Upload */}
      <section className="mb-12">
        <h2 className="font-inter mb-4 text-2xl font-bold">Step 1: Upload Audio/Video</h2>

        <div
          {...getRootProps()}
          data-testid="file-dropzone"
          className="cursor-pointer rounded-lg border-2 border-dashed border-gray-400 p-4 text-center transition-colors hover:border-blue-500 sm:p-8"
        >
          <input {...getInputProps()} data-testid="file-input" />
          {isDragActive ? (
            <p className="text-gray-700">Drop the file here...</p>
          ) : (
            <div>
              <p className="mb-2 text-gray-700">Drag and drop your audio or video file here</p>
              <p className="text-sm text-gray-500">or click to browse</p>
            </div>
          )}
        </div>

        {fileDurationWarning && (
          <div
            data-testid="file-duration-warning"
            className="mt-3 rounded border border-orange-400 bg-orange-100 p-3 text-orange-800"
          >
            <div className="flex items-start">
              <span className="mr-2">⚠️</span>
              <div>{fileDurationWarning}</div>
            </div>
          </div>
        )}

        {!file && !isLoadingSample && (
          <div className="mt-4 text-center">
            <p className="mb-2 text-sm text-gray-600">Don't have a file handy?</p>
            <a
              href="/sampler?sample=bob-ross"
              data-testid="try-demo-link"
              className="inline-flex items-center gap-2 font-medium text-blue-600 underline hover:text-blue-800"
            >
              Try with Bob Ross sample video
            </a>
          </div>
        )}

        {isLoadingSample && (
          <div className="mt-4 text-center" data-testid="loading-sample">
            <p className="text-gray-600">Loading sample video...</p>
          </div>
        )}

        {file && (
          <div className="mt-4">
            <p className="mb-2 font-semibold text-green-700">File loaded: {file.name}</p>
            {fileUrl &&
              (file.type.includes('video') ? (
                <video
                  ref={audioRef as React.RefObject<HTMLVideoElement>}
                  data-testid="audio-player"
                  controls
                  className="w-full"
                  onTimeUpdate={handleTimeUpdate}
                >
                  <source src={fileUrl} type={file.type} />
                </video>
              ) : (
                <audio
                  ref={audioRef}
                  data-testid="audio-player"
                  controls
                  className="w-full"
                  onTimeUpdate={handleTimeUpdate}
                >
                  <source src={fileUrl} type={file.type} />
                </audio>
              ))}
          </div>
        )}
      </section>

      {/* Step 2: Configure Sample */}
      {file && (
        <section className="mb-12">
          <h2 className="font-inter mb-4 text-2xl font-bold">Step 2: Configure Sample</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold">Sample Start (seconds)</label>
              <input
                data-testid="sample-start-input"
                type="number"
                value={sampleStart}
                onChange={e => setSampleStart(Number(e.target.value))}
                min="0"
                className="w-full rounded border border-gray-300 p-2"
              />
              <p className="mt-1 text-xs text-gray-500">
                Click on the audio player to set start time
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Sample Duration (seconds)</label>
              <input
                data-testid="sample-duration-input"
                type="number"
                value={sampleDuration}
                onChange={e => setSampleDuration(Number(e.target.value))}
                min="5"
                max="30"
                className="w-full rounded border border-gray-300 p-2"
              />
              <p className="mt-1 text-xs text-gray-500">5-30 seconds recommended</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Language</label>
              <select
                data-testid="language-select"
                value={language}
                onChange={e => {
                  setLanguage(e.target.value);
                  trackEvent('sampler_language_changed', { language_code: e.target.value });
                }}
                className="w-full rounded border border-gray-300 p-2"
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
          </div>
        </section>
      )}

      {/* Step 3: Run Comparison */}
      {file && (
        <section className="mb-12">
          <h2 className="font-inter mb-4 text-2xl font-bold">Step 3: Run Comparison</h2>

          <button
            data-testid="compare-all-button"
            onClick={handleSampleAll}
            disabled={isProcessing}
            className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Compare All Models'}
          </button>

          <div className="mt-6 text-sm text-gray-600">
            <p>⚠️ First-time model downloads may take longer (39-242 MB per model)</p>
            <p>Models are cached locally for faster subsequent use</p>
          </div>
        </section>
      )}

      {/* Results */}
      {results.length > 0 && (
        <section data-testid="results-container" className="mb-12">
          <h2 className="font-inter mb-4 text-2xl font-bold">Results</h2>

          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                data-testid="model-result"
                className={`rounded-lg border p-4 ${
                  result.status === 'complete'
                    ? 'border-green-400 bg-green-50'
                    : result.status === 'error'
                      ? 'border-red-400 bg-red-50'
                      : result.status === 'processing'
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-300 bg-gray-50'
                }`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="text-lg font-bold">{result.model}</h3>
                  <div className="text-right">
                    {result.status === 'complete' && (
                      <span className="font-semibold text-green-600">
                        ✓ {result.time.toFixed(2)}s
                      </span>
                    )}
                    {result.status === 'processing' && (
                      <span className="text-blue-600">Processing...</span>
                    )}
                    {result.status === 'error' && <span className="text-red-600">Error</span>}
                    {result.status === 'pending' && (
                      <span className="text-gray-500">Waiting...</span>
                    )}
                  </div>
                </div>

                {result.text && (
                  <div className="mt-2 rounded border border-gray-200 bg-white p-3">
                    <p className="text-sm">{result.text}</p>
                    {result.status === 'complete' && result.chunks && result.chunks.length > 0 && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <TranscriptExport
                          transcriptData={{ text: result.text, chunks: result.chunks }}
                          filename={`${file?.name?.replace(/\.[^/.]+$/, '') || 'sample'}-${result.model.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                        />
                      </div>
                    )}
                  </div>
                )}

                {result.error && (
                  <div className="mt-2 text-sm text-red-600">Error: {result.error}</div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          {results.every(r => r.status === 'complete') && (
            <div
              data-testid="recommendation"
              className="mt-6 rounded border border-yellow-400 bg-yellow-50 p-4"
            >
              <h3 className="mb-2 font-bold">Recommendation</h3>
              <p className="text-sm">
                Based on your results, consider using{' '}
                <strong>
                  {
                    results.reduce((fastest, current) =>
                      current.time < fastest.time ? current : fastest
                    ).model
                  }
                </strong>{' '}
                for the fastest processing, or review the transcriptions above for accuracy.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default function SamplerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <SamplerPageContent />
    </Suspense>
  );
}
