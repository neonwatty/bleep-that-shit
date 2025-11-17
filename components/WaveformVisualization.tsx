'use client';

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import HoverPlugin from 'wavesurfer.js/dist/plugins/hover';
import type { ManualRegion, BleepSegment } from '@/lib/types/bleep';

interface WaveformVisualizationProps {
  audioFile: File | null;
  regions: ManualRegion[];
  onRegionCreate?: (region: ManualRegion) => void;
  onRegionUpdate?: (id: string, updates: Partial<ManualRegion>) => void;
  onRegionDelete?: (id: string) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
  wordBleepsOverlay?: BleepSegment[]; // Read-only overlay of word-based bleeps
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
}: WaveformVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<RegionsPlugin | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Initialize Wavesurfer
  useEffect(() => {
    if (!containerRef.current || !audioFile) return;

    setIsLoading(true);
    setLoadError(null);

    // Create regions plugin
    const regionsPlugin = RegionsPlugin.create();
    regionsPluginRef.current = regionsPlugin;

    // Initialize Wavesurfer
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#ddd',
      progressColor: '#3b82f6',
      cursorColor: '#111',
      barWidth: 2,
      barRadius: 2,
      height: 128,
      normalize: true,
      plugins: [
        regionsPlugin,
        TimelinePlugin.create({
          height: 32,
          insertPosition: 'beforebegin',
          timeInterval: 5,
          primaryLabelInterval: 10,
          secondaryLabelInterval: 5,
          style: {
            fontSize: '12px',
            color: '#6b7280',
          },
        }),
        HoverPlugin.create({
          lineColor: '#111',
          lineWidth: 2,
          labelBackground: '#111',
          labelColor: '#fff',
          labelSize: '12px',
        }),
      ],
    });

    wavesurferRef.current = wavesurfer;

    // Load audio
    const url = URL.createObjectURL(audioFile);
    wavesurfer.load(url);

    // Event listeners
    wavesurfer.on('ready', () => {
      setIsLoading(false);
      setDuration(wavesurfer.getDuration());
      onReady?.();
    });

    wavesurfer.on('error', (error) => {
      const errorMsg =
        'Failed to load audio waveform. The file may be corrupted or in an unsupported format.';
      setLoadError(errorMsg);
      setIsLoading(false);
      onError?.(new Error(errorMsg));
    });

    wavesurfer.on('timeupdate', (time) => {
      setCurrentTime(time);
    });

    // Region events
    regionsPlugin.on('region-created', (region) => {
      // Only handle user-created regions (not programmatically added ones)
      if (onRegionCreate && region.drag !== false) {
        onRegionCreate({
          id: region.id,
          start: region.start,
          end: region.end,
          label: 'Manual',
          color: '#3b82f6',
        });
      }
    });

    regionsPlugin.on('region-updated', (region) => {
      if (onRegionUpdate) {
        onRegionUpdate(region.id, {
          start: region.start,
          end: region.end,
        });
      }
    });

    regionsPlugin.on('region-removed', (region) => {
      if (onRegionDelete) {
        onRegionDelete(region.id);
      }
    });

    // Enable drag selection
    regionsPlugin.enableDragSelection({
      color: 'rgba(59, 130, 246, 0.3)',
    });

    // Cleanup
    return () => {
      wavesurfer.destroy();
      URL.revokeObjectURL(url);
    };
  }, [audioFile, onRegionCreate, onRegionUpdate, onRegionDelete, onReady, onError]);

  // Sync regions from props to wavesurfer
  useEffect(() => {
    if (!regionsPluginRef.current) return;

    const plugin = regionsPluginRef.current;

    // Clear existing regions
    plugin.clearRegions();

    // Add word-based bleeps as read-only overlays (pink)
    wordBleepsOverlay.forEach((bleep) => {
      plugin.addRegion({
        id: bleep.id,
        start: bleep.start,
        end: bleep.end,
        color: 'rgba(236, 72, 153, 0.3)', // pink
        drag: false,
        resize: false,
      });
    });

    // Add manual regions (blue, editable)
    regions.forEach((region) => {
      plugin.addRegion({
        id: region.id,
        start: region.start,
        end: region.end,
        color: 'rgba(59, 130, 246, 0.3)', // blue
        drag: true,
        resize: true,
      });
    });
  }, [regions, wordBleepsOverlay]);

  // Public methods for playback control
  const play = () => wavesurferRef.current?.play();
  const pause = () => wavesurferRef.current?.pause();
  const isPlaying = () => wavesurferRef.current?.isPlaying() || false;
  const seekTo = (time: number) => {
    if (wavesurferRef.current && duration > 0) {
      wavesurferRef.current.setTime(time);
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
    <div className="waveform-container">
      {isLoading && (
        <div className="mb-2 text-sm text-gray-600">Loading waveform...</div>
      )}
      <div ref={containerRef} className="w-full" />
      {duration > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
        </div>
      )}
    </div>
  );
}
