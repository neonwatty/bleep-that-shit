'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { ManualRegion, BleepSegment } from '@/lib/types/bleep';

interface WaveformVisualizationProps {
  audioFile: File | null;
  regions: ManualRegion[];
  onRegionCreate?: (region: ManualRegion) => void;
  onRegionUpdate?: (id: string, updates: Partial<ManualRegion>) => void;
  onRegionDelete?: (id: string) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
  wordBleepsOverlay?: BleepSegment[];
  selectedRegionId?: string | null;
  onRegionClick?: (id: string) => void;
}

export function WaveformVisualization({
  audioFile,
  regions,
  onRegionCreate,
  onRegionUpdate,
  onRegionDelete,
  onReady,
  onError,
  wordBleepsOverlay = [],
  selectedRegionId = null,
  onRegionClick,
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

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

    // Draw word bleeps overlay (pink)
    wordBleepsOverlay.forEach(bleep => {
      const startX = (bleep.start / duration) * width;
      const endX = (bleep.end / duration) * width;
      ctx.fillStyle = 'rgba(236, 72, 153, 0.3)';
      ctx.fillRect(startX, 0, endX - startX, height);
    });

    // Draw manual regions (blue)
    regions.forEach(region => {
      const isSelected = region.id === selectedRegionId;
      const startX = (region.start / duration) * width;
      const endX = (region.end / duration) * width;
      ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.3)';
      ctx.fillRect(startX, 0, endX - startX, height);

      // Draw region border
      ctx.strokeStyle = isSelected ? '#2563eb' : '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, 0, endX - startX, height);
    });

    // Draw drag selection
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const startX = Math.min(dragStart, dragEnd);
      const width = Math.abs(dragEnd - dragStart);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.fillRect(startX, 0, width, height);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, 0, width, height);
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

    // Draw word labels on word bleeps
    wordBleepsOverlay.forEach(bleep => {
      const startX = (bleep.start / duration) * width;
      const endX = (bleep.end / duration) * width;
      const centerX = (startX + endX) / 2;

      // Draw word label
      ctx.fillStyle = '#831843';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // Draw background for text
      const textMetrics = ctx.measureText(bleep.word);
      const textWidth = textMetrics.width;
      const padding = 4;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(centerX - textWidth / 2 - padding, 5, textWidth + padding * 2, 14);

      // Draw text
      ctx.fillStyle = '#831843';
      ctx.fillText(bleep.word, centerX, 7);
    });

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
  }, [currentTime, duration, regions, wordBleepsOverlay, selectedRegionId, isDragging, dragStart, dragEnd]);

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

      canvas.width = container.clientWidth;
      canvas.height = 160;
      drawWaveform();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawWaveform]);

  // Mouse event handlers for region creation
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Check if clicking on existing region
    const clickedRegion = regions.find(region => {
      const startX = (region.start / duration) * rect.width;
      const endX = (region.end / duration) * rect.width;
      return x >= startX && x <= endX;
    });

    if (clickedRegion && onRegionClick) {
      onRegionClick(clickedRegion.id);
    } else {
      // Start new region
      setIsDragging(true);
      setDragStart(x);
      setDragEnd(x);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setDragEnd(x);
  };

  const handleMouseUp = () => {
    if (!isDragging || dragStart === null || dragEnd === null || !canvasRef.current) {
      setIsDragging(false);
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const startTime = (Math.min(dragStart, dragEnd) / rect.width) * duration;
    const endTime = (Math.max(dragStart, dragEnd) / rect.width) * duration;

    // Only create region if drag is significant (> 0.1 seconds)
    if (endTime - startTime > 0.1 && onRegionCreate) {
      onRegionCreate({
        id: `manual-${Date.now()}`,
        start: startTime,
        end: endTime,
        label: 'Manual',
        color: '#3b82f6',
      });
    }

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

      {/* Canvas for waveform */}
      <canvas
        ref={canvasRef}
        className="w-full cursor-crosshair rounded border border-gray-200 bg-white"
        style={{ height: '160px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {duration > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
        </div>
      )}
    </div>
  );
}
