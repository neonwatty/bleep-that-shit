'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { WaveformVisualization } from './WaveformVisualization';
import type { ManualRegion } from '@/lib/types/bleep';

interface TranscriptWord {
  text: string;
  timestamp: [number, number];
}

interface WaveformEditorProps {
  audioFile: File | null;
  selectedWordIndices: Set<number>;
  onToggleWordIndex: (index: number) => void;
  disabled?: boolean;
  allTranscriptWords?: TranscriptWord[];
  manualRegions?: ManualRegion[];
  onManualRegionCreate?: (start: number, end: number) => void;
  onManualRegionDelete?: (id: string) => void;
}

export function WaveformEditor({
  audioFile,
  selectedWordIndices,
  onToggleWordIndex,
  disabled = false,
  allTranscriptWords = [],
  manualRegions = [],
  onManualRegionCreate,
  onManualRegionDelete,
}: WaveformEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const waveformRef = useRef<HTMLDivElement>(null);

  // Combine word-based and manual regions
  const regions = useMemo(() => {
    const wordRegions = allTranscriptWords
      .map((word, idx) => {
        if (!selectedWordIndices.has(idx)) return null;
        return {
          id: `manual-word-${idx}`,
          start: word.timestamp[0],
          end: word.timestamp[1],
          label: word.text,
          color: '#ec4899', // Pink color
          wordIndex: idx,
        };
      })
      .filter(r => r !== null) as ManualRegion[];

    // Combine with manual regions (which don't have wordIndex)
    return [...wordRegions, ...manualRegions];
  }, [selectedWordIndices, allTranscriptWords, manualRegions]);

  const handleWordClick = (word: TranscriptWord) => {
    if (disabled) return;

    // Find the word index in transcript
    const wordIndex = allTranscriptWords.findIndex(
      w =>
        Math.abs(w.timestamp[0] - word.timestamp[0]) < 0.01 &&
        Math.abs(w.timestamp[1] - word.timestamp[1]) < 0.01
    );

    if (wordIndex !== -1) {
      onToggleWordIndex(wordIndex);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedRegionId) {
      const region = regions.find(r => r.id === selectedRegionId);
      if (region && region.wordIndex !== undefined) {
        onToggleWordIndex(region.wordIndex);
        setSelectedRegionId(null);
      }
    }
  };

  const handleClearAll = () => {
    if (confirm(`Are you sure you want to deselect all ${regions.length} words?`)) {
      regions.forEach(r => {
        if (r.wordIndex !== undefined) {
          onToggleWordIndex(r.wordIndex);
        }
      });
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key - remove selected region
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRegionId && !disabled) {
        // Prevent default browser behavior (e.g., going back in history)
        e.preventDefault();
        handleDeleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedRegionId, disabled]);

  if (!audioFile) {
    return (
      <div className="rounded-lg border border-gray-300 bg-gray-50 p-8 text-center">
        <p className="text-gray-600">Upload an audio or video file to use the waveform editor</p>
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
          onReady={() => setIsReady(true)}
          selectedRegionId={selectedRegionId}
          onRegionClick={setSelectedRegionId}
          selectedWordIndices={selectedWordIndices}
          allTranscriptWords={allTranscriptWords}
          onWordClick={disabled ? undefined : handleWordClick}
          onRegionCreate={disabled ? undefined : onManualRegionCreate}
        />
      </div>

      {/* Playback Controls */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-gray-700">Playback Controls</div>
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

      {/* Selection Tools */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-gray-700">Selection Tools</div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDeleteSelected}
            disabled={!selectedRegionId || disabled}
            className="rounded bg-red-100 px-3 py-2 text-sm text-red-700 hover:bg-red-200 disabled:opacity-50"
          >
            Deselect Word
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
          Tip: Click words on the waveform or in the transcript to select/deselect
        </p>
      </div>

      {/* Selected Words List */}
      {regions.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-700">
              Selected Words ({regions.length})
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
                            onClick={e => {
                              e.stopPropagation();
                              playRegion(region);
                            }}
                            className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
                            title="Play this region"
                          >
                            ▶
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (region.wordIndex !== undefined) {
                                onToggleWordIndex(region.wordIndex);
                              }
                            }}
                            disabled={disabled}
                            className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 disabled:opacity-50"
                            title="Deselect this word"
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
              <span>Pink = Selected words (clickable on timeline or transcript)</span>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
        <div className="font-semibold text-blue-900">Tips:</div>
        <ul className="mt-1 list-inside list-disc space-y-1 text-blue-800">
          <li>Click any word in the transcript or on the timeline to select it</li>
          <li>Click a selected word again to deselect it</li>
          <li>Selected words appear in pink in both locations</li>
          <li>Use playback controls to preview selected sections</li>
          <li>Press Space to play/pause</li>
        </ul>
      </div>
    </div>
  );
}
