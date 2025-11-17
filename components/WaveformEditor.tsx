'use client';

import { useState, useRef } from 'react';
import { WaveformVisualization } from './WaveformVisualization';
import type { ManualRegion, BleepSegment } from '@/lib/types/bleep';

interface WaveformEditorProps {
  audioFile: File | null;
  regions: ManualRegion[];
  onRegionsChange: (regions: ManualRegion[]) => void;
  existingWordBleeps?: BleepSegment[];
  disabled?: boolean;
}

export function WaveformEditor({
  audioFile,
  regions,
  onRegionsChange,
  existingWordBleeps = [],
  disabled = false,
}: WaveformEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const waveformRef = useRef<HTMLDivElement>(null);

  const handleRegionCreate = (region: ManualRegion) => {
    onRegionsChange([...regions, region]);
  };

  const handleRegionUpdate = (id: string, updates: Partial<ManualRegion>) => {
    onRegionsChange(
      regions.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const handleRegionDelete = (id: string) => {
    onRegionsChange(regions.filter((r) => r.id !== id));
    if (selectedRegionId === id) {
      setSelectedRegionId(null);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedRegionId) {
      handleRegionDelete(selectedRegionId);
    }
  };

  const handleClearAll = () => {
    if (
      confirm(`Are you sure you want to delete all ${regions.length} manual regions?`)
    ) {
      onRegionsChange([]);
      setSelectedRegionId(null);
    }
  };

  const togglePlayPause = () => {
    const controls = (waveformRef.current as any)?.waveformControls;
    if (!controls) return;

    if (controls.isPlaying()) {
      controls.pause();
      setIsPlaying(false);
    } else {
      controls.play();
      setIsPlaying(true);
    }
  };

  const skipBackward = (seconds: number) => {
    const controls = (waveformRef.current as any)?.waveformControls;
    if (!controls) return;

    const currentTime = controls.getCurrentTime();
    controls.seekTo(Math.max(0, currentTime - seconds));
  };

  const skipForward = (seconds: number) => {
    const controls = (waveformRef.current as any)?.waveformControls;
    if (!controls) return;

    const currentTime = controls.getCurrentTime();
    const duration = controls.getDuration();
    controls.seekTo(Math.min(duration, currentTime + seconds));
  };

  const playRegion = (region: ManualRegion) => {
    const controls = (waveformRef.current as any)?.waveformControls;
    if (!controls) return;

    controls.seekTo(region.start);
    controls.play();
    setIsPlaying(true);

    // Stop at region end
    const checkTime = setInterval(() => {
      const currentTime = controls.getCurrentTime();
      if (currentTime >= region.end) {
        controls.pause();
        setIsPlaying(false);
        clearInterval(checkTime);
      }
    }, 100);
  };

  if (!audioFile) {
    return (
      <div className="rounded-lg border border-gray-300 bg-gray-50 p-8 text-center">
        <p className="text-gray-600">
          Upload an audio or video file to use the waveform editor
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Waveform Visualization */}
      <div ref={waveformRef}>
        <WaveformVisualization
          audioFile={audioFile}
          regions={regions}
          onRegionCreate={disabled ? undefined : handleRegionCreate}
          onRegionUpdate={disabled ? undefined : handleRegionUpdate}
          onRegionDelete={disabled ? undefined : handleRegionDelete}
          onReady={() => setIsReady(true)}
          wordBleepsOverlay={existingWordBleeps}
        />
      </div>

      {/* Playback Controls */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-gray-700">
          Playback Controls
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => skipBackward(10)}
            disabled={!isReady || disabled}
            className="rounded bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200 disabled:opacity-50"
            title="Skip back 10 seconds"
          >
            ◄◄ -10s
          </button>
          <button
            onClick={togglePlayPause}
            disabled={!isReady || disabled}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={() => skipForward(10)}
            disabled={!isReady || disabled}
            className="rounded bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200 disabled:opacity-50"
            title="Skip forward 10 seconds"
          >
            ►►︎ +10s
          </button>
        </div>
      </div>

      {/* Region Tools */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-gray-700">
          Region Tools
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDeleteSelected}
            disabled={!selectedRegionId || disabled}
            className="rounded bg-red-100 px-3 py-2 text-sm text-red-700 hover:bg-red-200 disabled:opacity-50"
          >
            Delete Selected
          </button>
          <button
            onClick={handleClearAll}
            disabled={regions.length === 0 || disabled}
            className="rounded bg-red-100 px-3 py-2 text-sm text-red-700 hover:bg-red-200 disabled:opacity-50"
          >
            Clear All ({regions.length})
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Tip: Click and drag on the waveform to create a region
        </p>
      </div>

      {/* Region List */}
      {regions.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-700">
              Manual Regions ({regions.length})
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left">#</th>
                  <th className="px-2 py-2 text-left">Start</th>
                  <th className="px-2 py-2 text-left">End</th>
                  <th className="px-2 py-2 text-left">Duration</th>
                  <th className="px-2 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {regions.map((region, index) => {
                  const duration = region.end - region.start;
                  const isSelected = selectedRegionId === region.id;

                  return (
                    <tr
                      key={region.id}
                      className={`border-b border-gray-100 ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedRegionId(region.id)}
                    >
                      <td className="px-2 py-2">{index + 1}</td>
                      <td className="px-2 py-2">{region.start.toFixed(2)}s</td>
                      <td className="px-2 py-2">{region.end.toFixed(2)}s</td>
                      <td className="px-2 py-2">{duration.toFixed(2)}s</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playRegion(region);
                            }}
                            className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
                            title="Play this region"
                          >
                            ▶
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRegionDelete(region.id);
                            }}
                            disabled={disabled}
                            className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 disabled:opacity-50"
                            title="Delete this region"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-3 space-y-1 border-t border-gray-200 pt-3 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="h-3 w-8 rounded bg-pink-200"></div>
              <span>Pink = Word-based bleeps (from transcript)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-8 rounded bg-blue-200"></div>
              <span>Blue = Manual regions (editable)</span>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
        <div className="font-semibold text-blue-900">Tips:</div>
        <ul className="mt-1 list-inside list-disc space-y-1 text-blue-800">
          <li>Click and drag on waveform to create a region</li>
          <li>Drag region edges to resize</li>
          <li>Click a region to select it, then press Delete to remove</li>
          <li>Press Space to play/pause</li>
        </ul>
      </div>
    </div>
  );
}
