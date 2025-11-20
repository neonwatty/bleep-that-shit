'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { ManualRegion } from '@/lib/types/bleep';

interface TranscriptWord {
  text: string;
  timestamp: [number, number];
}

interface WaveformVisualizationProps {
  audioFile: File | null;
  regions: ManualRegion[];
  onReady?: () => void;
  onError?: (error: Error) => void;
  selectedRegionId?: string | null;
  onRegionClick?: (id: string) => void;
  selectedWordIndices?: Set<number>;
  allTranscriptWords?: TranscriptWord[];
  onWordClick?: (word: TranscriptWord) => void;
  onRegionCreate?: (start: number, end: number) => void;
}

export function WaveformVisualization({
  audioFile,
  regions,
  onReady,
  onError,
  selectedRegionId = null,
  onRegionClick,
  selectedWordIndices,
  allTranscriptWords = [],
  onWordClick,
  onRegionCreate,
}: WaveformVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformDataRef = useRef<Float32Array | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Drag state for creating manual regions
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  // Constants for timeline scaling
  const PIXELS_PER_SECOND = 80; // 80 pixels per second for good word spacing
  const CANVAS_HEIGHT = 160;

  // Extract audio waveform data using Web Audio API
  useEffect(() => {
    if (!audioFile) return;

    setIsLoading(true);
    setLoadError(null);

    const audioContext = new AudioContext();
    const fileReader = new FileReader();

    fileReader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Get audio data from first channel
        const rawData = audioBuffer.getChannelData(0);
        const samples = 1000; // Number of samples for visualization
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData = new Float32Array(samples);

        // Downsample the audio data
        for (let i = 0; i < samples; i++) {
          const start = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[start + j]);
          }
          filteredData[i] = sum / blockSize;
        }

        waveformDataRef.current = filteredData;
        setDuration(audioBuffer.duration);
        setIsReady(true);
        setIsLoading(false);
        onReady?.();
      } catch (error) {
        console.error('Failed to decode audio:', error);
        setLoadError('Failed to load audio waveform. The file may be corrupted or in an unsupported format.');
        setIsLoading(false);
        onError?.(error as Error);
      }
    };

    fileReader.onerror = () => {
      setLoadError('Failed to read audio file');
      setIsLoading(false);
    };

    fileReader.readAsArrayBuffer(audioFile);

    return () => {
      audioContext.close();
    };
  }, [audioFile, onReady, onError]);

  // Draw waveform on canvas
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !waveformDataRef.current) return;

    const { width, height } = canvas;
    const data = waveformDataRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw waveform
    ctx.fillStyle = '#9ca3af';
    const barWidth = width / data.length;
    const middle = height / 2;

    for (let i = 0; i < data.length; i++) {
      const barHeight = data[i] * middle;
      const x = i * barWidth;

      // Draw bar (centered vertically)
      ctx.fillRect(x, middle - barHeight, barWidth - 1, barHeight * 2);
    }

    // Draw all transcript words first (in grey or colored based on selection)
    if (allTranscriptWords.length > 0) {
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // Track vertical positions to avoid word overlap
      const wordPositions: Array<{ x: number; width: number; y: number }> = [];

      allTranscriptWords.forEach((word, idx) => {
        const [start, end] = word.timestamp;
        const centerX = ((start + end) / 2 / duration) * width;

        // Check if this word index is selected
        const isSelected = selectedWordIndices?.has(idx);

        // Determine color
        let textColor: string;
        let bgColor: string;
        if (isSelected) {
          textColor = '#831843'; // dark pink
          bgColor = 'rgba(236, 72, 153, 0.9)'; // pink
        } else {
          textColor = '#6b7280'; // grey
          bgColor = 'rgba(156, 163, 175, 0.7)'; // light grey
        }

        // Measure text
        const textMetrics = ctx.measureText(word.text);
        const textWidth = textMetrics.width;
        const padding = 4;

        // Find non-overlapping vertical position
        let yPos = 25; // Start below the top
        let foundPosition = false;
        while (!foundPosition && yPos < height - 40) {
          const overlaps = wordPositions.some(
            pos =>
              Math.abs(centerX - pos.x) < (textWidth + pos.width) / 2 + 5 &&
              Math.abs(yPos - pos.y) < 16
          );
          if (!overlaps) {
            foundPosition = true;
          } else {
            yPos += 18; // Move down for next row
          }
        }

        // Draw background for text
        ctx.fillStyle = bgColor;
        ctx.fillRect(centerX - textWidth / 2 - padding, yPos, textWidth + padding * 2, 14);

        // Draw text
        ctx.fillStyle = textColor;
        ctx.fillText(word.text, centerX, yPos + 2);

        // Store position for overlap detection
        wordPositions.push({ x: centerX, width: textWidth, y: yPos });
      });
    }

    // Draw manual regions (pink for selected words)
    regions.forEach(region => {
      const isSelected = region.id === selectedRegionId;
      const startX = (region.start / duration) * width;
      const endX = (region.end / duration) * width;
      ctx.fillStyle = isSelected ? 'rgba(236, 72, 153, 0.5)' : 'rgba(236, 72, 153, 0.3)';
      ctx.fillRect(startX, 0, endX - startX, height);

      // Draw region border
      ctx.strokeStyle = isSelected ? '#ec4899' : '#f472b6';
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, 0, endX - startX, height);
    });

    // Draw active drag selection
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const startX = (Math.min(dragStart, dragEnd) / duration) * width;
      const endX = (Math.max(dragStart, dragEnd) / duration) * width;
      ctx.fillStyle = 'rgba(236, 72, 153, 0.4)'; // Pink with more opacity for drag
      ctx.fillRect(startX, 0, endX - startX, height);

      // Draw border
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, 0, endX - startX, height);
    }

    // Draw timestamp markers
    if (duration > 0) {
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';

      // Calculate interval (every 5 or 10 seconds depending on duration)
      const interval = duration > 60 ? 10 : 5;

      for (let t = 0; t <= duration; t += interval) {
        const x = (t / duration) * width;

        // Draw tick mark
        ctx.beginPath();
        ctx.moveTo(x, height - 15);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Draw timestamp label
        const minutes = Math.floor(t / 60);
        const seconds = Math.floor(t % 60);
        const label = minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;
        ctx.fillText(label, x, height - 3);
      }
    }

    // Word labels are already drawn above with the transcript words

    // Draw playhead
    if (duration > 0) {
      const playheadX = (currentTime / duration) * width;
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
  }, [currentTime, duration, regions, selectedRegionId, selectedWordIndices, allTranscriptWords, isDragging, dragStart, dragEnd]);

  // Redraw when dependencies change
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      // Use duration-based width for horizontal scrolling
      const calculatedWidth = duration > 0 ? duration * PIXELS_PER_SECOND : container.clientWidth;
      canvas.width = calculatedWidth;
      canvas.height = CANVAS_HEIGHT;
      drawWaveform();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawWaveform, duration, PIXELS_PER_SECOND, CANVAS_HEIGHT]);

  // Mouse event handlers for region creation
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on a transcript word
    if (allTranscriptWords.length > 0 && onWordClick) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';

        for (const word of allTranscriptWords) {
          const [start, end] = word.timestamp;
          const centerX = ((start + end) / 2 / duration) * canvas.width;
          const textMetrics = ctx.measureText(word.text);
          const textWidth = textMetrics.width;
          const padding = 4;

          // Check if click is within word bounds (with tolerance)
          const wordLeft = centerX - textWidth / 2 - padding;
          const wordRight = centerX + textWidth / 2 + padding;

          // Approximate y position (we can't easily calculate exact y from click,
          // so we check if y is in the word area range: 25-120)
          if (x >= wordLeft && x <= wordRight && y >= 20 && y <= 120) {
            onWordClick(word);
            return; // Stop processing if word was clicked
          }
        }
      }
    }

    // Check if clicking on existing region
    const clickedRegion = regions.find(region => {
      const startX = (region.start / duration) * rect.width;
      const endX = (region.end / duration) * rect.width;
      return x >= startX && x <= endX;
    });

    if (clickedRegion && onRegionClick) {
      onRegionClick(clickedRegion.id);
      return;
    }

    // Start dragging to create new region
    const timeAtClick = (x / rect.width) * duration;
    setIsDragging(true);
    setDragStart(timeAtClick);
    setDragEnd(timeAtClick);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const timeAtMouse = (x / rect.width) * duration;
    setDragEnd(timeAtMouse);
  };

  const handleMouseUp = () => {
    if (isDragging && dragStart !== null && dragEnd !== null && onRegionCreate) {
      // Only create region if dragged at least 0.1 seconds
      const start = Math.min(dragStart, dragEnd);
      const end = Math.max(dragStart, dragEnd);
      if (end - start >= 0.1) {
        onRegionCreate(start, end);
      }
    }

    // Reset drag state
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  // Audio element for playback control
  useEffect(() => {
    if (!audioFile || !audioRef.current) return;

    const url = URL.createObjectURL(audioFile);
    audioRef.current.src = url;

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    };

    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      URL.revokeObjectURL(url);
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
      }
    };
  }, [audioFile]);

  // Public methods for playback control
  const play = () => audioRef.current?.play();
  const pause = () => audioRef.current?.pause();
  const isPlaying = () => !audioRef.current?.paused || false;
  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // Expose methods via ref (for parent components)
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as any).waveformControls = {
        play,
        pause,
        isPlaying,
        seekTo,
        getCurrentTime: () => currentTime,
        getDuration: () => duration,
      };
    }
  }, [currentTime, duration]);

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-400 bg-red-50 p-4">
        <p className="text-red-800">{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="waveform-container">
      {isLoading && <div className="mb-2 text-sm text-gray-600">Loading waveform...</div>}

      {/* Hidden audio element */}
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* Horizontal scrolling container for waveform */}
      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <canvas
          ref={canvasRef}
          className="cursor-crosshair"
          style={{ height: '160px', display: 'block' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {duration > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
          {allTranscriptWords.length > 0 && (
            <span className="ml-2">({allTranscriptWords.length} words)</span>
          )}
        </div>
      )}
    </div>
  );
}
