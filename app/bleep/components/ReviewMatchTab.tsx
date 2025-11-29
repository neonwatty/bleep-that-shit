'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { TranscriptReview } from '@/components/TranscriptReview';
import { MatchedWordsDisplay } from '@/components/MatchedWordsDisplay';
import { WordsetSelector } from '@/components/wordsets/WordsetSelector';
import { TimelineBar } from '@/components/timeline/TimelineBar';
import { formatTime } from '@/lib/utils/timeFormat';
import { FloatingNavArrows } from './FloatingNavArrows';
import { trackEvent } from '@/lib/analytics';
import type { TranscriptionResult, MatchedWord } from '../hooks/useBleepState';
import type { ManualCensorSegment } from '@/lib/types/manualCensor';

interface ReviewMatchTabProps {
  transcriptionResult: TranscriptionResult | null;
  wordsToMatch: string;
  matchMode: {
    exact: boolean;
    partial: boolean;
    fuzzy: boolean;
  };
  fuzzyDistance: number;
  censoredWordIndices: Set<number>;
  searchQuery: string;
  matchedWords: MatchedWord[];
  activeWordsets?: Set<number>;
  wordSource?: Map<number, 'manual' | number>;
  onWordsToMatchChange: (words: string) => void;
  onMatchModeChange: (mode: { exact: boolean; partial: boolean; fuzzy: boolean }) => void;
  onFuzzyDistanceChange: (distance: number) => void;
  onSearchQueryChange: (query: string) => void;
  onMatch: () => void;
  onToggleWord: (index: number) => void;
  onClearAll: () => void;
  onApplyWordsets?: (wordsetIds: number[]) => void;
  onRemoveWordset?: (wordsetId: number) => void;
  onSwitchToWordsetsTab?: () => void;

  // Timeline props
  file: File | null;
  fileUrl: string | null;
  manualCensorSegments: ManualCensorSegment[];
  mediaDuration: number;
  onSetMediaDuration: (duration: number) => void;
  onAddManualCensor: (start: number, end: number) => void;
  onUpdateManualCensor: (id: string, updates: Partial<Omit<ManualCensorSegment, 'id'>>) => void;
  onRemoveManualCensor: (id: string) => void;
  onClearManualCensors: () => void;

  // Context flags
  hasFile: boolean;
  hasTranscription: boolean;

  // Navigation
  onNavigate: (tabId: string) => void;
}

type SectionId = 'timeline' | 'wordsets' | 'pattern' | 'transcript' | 'selected';

export function ReviewMatchTab({
  transcriptionResult,
  wordsToMatch,
  matchMode,
  fuzzyDistance,
  censoredWordIndices,
  searchQuery,
  matchedWords,
  activeWordsets,
  wordSource,
  onWordsToMatchChange,
  onMatchModeChange,
  onFuzzyDistanceChange,
  onSearchQueryChange,
  onMatch,
  onToggleWord,
  onClearAll,
  onApplyWordsets,
  onRemoveWordset,
  onSwitchToWordsetsTab,
  // Timeline props
  file,
  fileUrl,
  manualCensorSegments,
  mediaDuration,
  onSetMediaDuration,
  onAddManualCensor,
  onUpdateManualCensor,
  onRemoveManualCensor,
  onClearManualCensors,
  // Context flags
  hasFile,
  hasTranscription,
  // Navigation
  onNavigate,
}: ReviewMatchTabProps) {
  // Collapse states - default to expanded
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [wordsetsExpanded, setWordsetsExpanded] = useState(true);
  const [manualMatchingExpanded, setManualMatchingExpanded] = useState(true);
  const [transcriptSectionExpanded, setTranscriptSectionExpanded] = useState(true);
  const [matchedWordsExpanded, setMatchedWordsExpanded] = useState(true);

  // Sidebar navigation state - default to first visible section
  const [activeSection, setActiveSection] = useState<SectionId>(() => {
    if (hasTranscription && onApplyWordsets) return 'wordsets';
    if (hasTranscription) return 'pattern';
    return 'timeline';
  });
  const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({
    timeline: null,
    wordsets: null,
    pattern: null,
    transcript: null,
    selected: null,
  });

  // Timeline state
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const animationRef = useRef<number | undefined>(undefined);

  const isVideo = file?.type.includes('video');

  // Scroll spy effect - track which section is visible
  useEffect(() => {
    const observerOptions: IntersectionObserverInit = {
      threshold: 0.3,
      rootMargin: '-100px 0px -60% 0px',
    };

    const handleIntersect: IntersectionObserverCallback = entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id as SectionId);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);

    Object.values(sectionRefs.current).forEach(el => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [hasFile, hasTranscription, matchedWords.length]);

  // Scroll to section and expand it
  const scrollToSection = useCallback(
    (sectionId: SectionId) => {
      // Expand the target section
      switch (sectionId) {
        case 'timeline':
          setTimelineExpanded(true);
          break;
        case 'wordsets':
          setWordsetsExpanded(true);
          break;
        case 'pattern':
          setManualMatchingExpanded(true);
          break;
        case 'transcript':
          setTranscriptSectionExpanded(true);
          break;
        case 'selected':
          setMatchedWordsExpanded(true);
          break;
      }

      // Scroll after a short delay to allow expansion animation
      setTimeout(() => {
        sectionRefs.current[sectionId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    },
    [
      setTimelineExpanded,
      setWordsetsExpanded,
      setManualMatchingExpanded,
      setTranscriptSectionExpanded,
      setMatchedWordsExpanded,
    ]
  );

  // Update current time using requestAnimationFrame for smooth playhead
  const updateTime = useCallback(() => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
    }
    animationRef.current = requestAnimationFrame(updateTime);
  }, []);

  // Start/stop animation frame on play/pause
  const handlePlay = useCallback(() => {
    animationRef.current = requestAnimationFrame(updateTime);
  }, [updateTime]);

  const handlePause = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Handle loaded metadata to get duration
  const handleLoadedMetadata = useCallback(() => {
    if (mediaRef.current) {
      onSetMediaDuration(mediaRef.current.duration);
    }
  }, [onSetMediaDuration]);

  // Seek to a specific time
  const handleSeek = useCallback((time: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Handle segment update from timeline drag
  const handleSegmentUpdate = useCallback(
    (id: string, start: number, end: number) => {
      onUpdateManualCensor(id, { start, end });
    },
    [onUpdateManualCensor]
  );

  // Dynamic header based on transcription state
  const sectionHeader = hasTranscription
    ? 'Review & Select Words to Bleep'
    : 'Manual Timeline Censoring';

  // Wrapper for match mode change with analytics
  const handleMatchModeWithTracking = useCallback(
    (newMode: { exact: boolean; partial: boolean; fuzzy: boolean }) => {
      trackEvent('match_mode_changed', {
        exact: newMode.exact,
        partial: newMode.partial,
        fuzzy: newMode.fuzzy,
        fuzzy_distance: fuzzyDistance,
      });
      onMatchModeChange(newMode);
    },
    [onMatchModeChange, fuzzyDistance]
  );

  // Build navigation items based on available sections
  const navItems: { id: SectionId; label: string; count?: number; visible: boolean }[] = [
    {
      id: 'wordsets',
      label: 'Word Lists',
      visible: hasTranscription && !!onApplyWordsets,
    },
    {
      id: 'pattern',
      label: 'Pattern Match',
      visible: hasTranscription,
    },
    {
      id: 'transcript',
      label: 'Transcript',
      visible: hasTranscription && !!transcriptionResult,
    },
    {
      id: 'selected',
      label: 'Selected',
      count: matchedWords.length > 0 ? matchedWords.length : undefined,
      visible: hasTranscription && matchedWords.length > 0,
    },
    {
      id: 'timeline',
      label: 'Timeline',
      count: manualCensorSegments.length > 0 ? manualCensorSegments.length : undefined,
      visible: hasFile,
    },
  ];

  const visibleNavItems = navItems.filter(item => item.visible);

  return (
    <div className="space-y-6">
      <section className="border-l-4 border-purple-500 pl-3 sm:pl-4">
        <div className="mb-4 flex items-center">
          <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-base font-bold text-white">
            4
          </span>
          <h2 className="font-inter text-lg font-extrabold text-black uppercase sm:text-xl md:text-2xl">
            {sectionHeader}
          </h2>
        </div>

        {/* Mobile Navigation - Horizontal sticky bar */}
        {visibleNavItems.length > 1 && (
          <nav
            className="mb-4 flex gap-2 overflow-x-auto pb-2 md:hidden"
            aria-label="Section navigation"
          >
            {visibleNavItems.map(item => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeSection === item.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {item.label}
                {item.count !== undefined && ` (${item.count})`}
              </button>
            ))}
          </nav>
        )}

        {/* Desktop Layout - Sidebar + Content */}
        <div className="flex gap-6">
          {/* Desktop Sidebar Navigation */}
          {visibleNavItems.length > 1 && (
            <nav className="hidden w-40 shrink-0 md:block" aria-label="Section navigation">
              <div className="sticky top-4 space-y-1">
                {visibleNavItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      activeSection === item.id
                        ? 'bg-purple-100 font-semibold text-purple-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {item.label}
                    {item.count !== undefined && (
                      <span className="ml-1 text-xs text-gray-500">({item.count})</span>
                    )}
                  </button>
                ))}
              </div>
            </nav>
          )}

          {/* Main Content */}
          <div className="min-w-0 flex-1">
            {/* Info message when no transcription */}
            {hasFile && !hasTranscription && (
              <div className="mb-6 rounded-md border-l-4 border-blue-400 bg-blue-50 p-4 text-sm text-blue-700">
                Transcribe your file to enable word-based matching and word list features.
              </div>
            )}

            {/* Word-based sections - only shown when transcription exists */}
            {hasTranscription && (
              <>
                {/* Wordset Selector */}
                {onApplyWordsets && (
                  <div
                    id="wordsets"
                    ref={el => {
                      sectionRefs.current.wordsets = el;
                    }}
                    className="mb-6 rounded-lg border border-gray-200 bg-white"
                  >
                    <button
                      onClick={() => setWordsetsExpanded(!wordsetsExpanded)}
                      className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
                    >
                      <h3 className="text-sm font-bold text-gray-700 uppercase">
                        Quick Apply Word Lists
                      </h3>
                      <span
                        className={`text-xl transition-transform duration-200 ${wordsetsExpanded ? '' : '-rotate-90'}`}
                      >
                        ▼
                      </span>
                    </button>
                    {wordsetsExpanded && (
                      <>
                        <div className="border-t border-gray-200 p-4">
                          <WordsetSelector
                            onApplyWordsets={onApplyWordsets}
                            onManageClick={onSwitchToWordsetsTab}
                            activeWordsets={activeWordsets}
                            onRemoveWordset={onRemoveWordset}
                          />
                        </div>

                        {/* OR Separator */}
                        <div className="relative mb-4 px-4">
                          <div className="absolute inset-0 flex items-center px-4">
                            <div className="w-full border-t border-gray-300"></div>
                          </div>
                          <div className="relative flex justify-center text-sm">
                            <span className="bg-white px-4 font-semibold text-gray-500">OR</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Manual Pattern Matching Controls */}
                <div
                  id="pattern"
                  ref={el => {
                    sectionRefs.current.pattern = el;
                  }}
                  className="mb-6 rounded-lg border border-gray-200 bg-white"
                >
                  <button
                    onClick={() => setManualMatchingExpanded(!manualMatchingExpanded)}
                    className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
                  >
                    <h3 className="text-sm font-bold text-gray-700 uppercase">
                      Manual Pattern Matching (Optional)
                    </h3>
                    <span
                      className={`text-xl transition-transform duration-200 ${manualMatchingExpanded ? '' : '-rotate-90'}`}
                    >
                      ▼
                    </span>
                  </button>
                  {manualMatchingExpanded && (
                    <div className="border-t border-gray-200 p-4">
                      <div className="mb-4">
                        <label className="mb-2 block text-sm font-semibold">
                          Words to match (comma-separated)
                        </label>
                        <input
                          data-testid="words-to-match-input"
                          type="text"
                          value={wordsToMatch}
                          onChange={e => onWordsToMatchChange(e.target.value)}
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
                              onChange={e =>
                                handleMatchModeWithTracking({
                                  ...matchMode,
                                  exact: e.target.checked,
                                })
                              }
                              className="mr-3 h-5 w-5"
                            />
                            Exact match
                          </label>
                          <label className="-m-2 flex cursor-pointer items-center rounded p-2 hover:bg-gray-50">
                            <input
                              data-testid="partial-match-checkbox"
                              type="checkbox"
                              checked={matchMode.partial}
                              onChange={e =>
                                handleMatchModeWithTracking({
                                  ...matchMode,
                                  partial: e.target.checked,
                                })
                              }
                              className="mr-3 h-5 w-5"
                            />
                            Partial match
                          </label>
                          <label className="-m-2 flex cursor-pointer items-center rounded p-2 hover:bg-gray-50">
                            <input
                              data-testid="fuzzy-match-checkbox"
                              type="checkbox"
                              checked={matchMode.fuzzy}
                              onChange={e =>
                                handleMatchModeWithTracking({
                                  ...matchMode,
                                  fuzzy: e.target.checked,
                                })
                              }
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
                              onChange={e => onFuzzyDistanceChange(Number(e.target.value))}
                              className="w-full"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          data-testid="run-matching-button"
                          onClick={onMatch}
                          disabled={!transcriptionResult || !wordsToMatch}
                          className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Match Words
                        </button>
                        {censoredWordIndices.size > 0 && (
                          <button
                            data-testid="clear-all-button"
                            onClick={onClearAll}
                            className="btn bg-gray-500 text-white hover:bg-gray-600"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Interactive Transcript */}
                {transcriptionResult && (
                  <div
                    id="transcript"
                    ref={el => {
                      sectionRefs.current.transcript = el;
                    }}
                    className="mb-6 rounded-lg border border-gray-200 bg-white"
                  >
                    <button
                      onClick={() => setTranscriptSectionExpanded(!transcriptSectionExpanded)}
                      className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
                    >
                      <h3 className="text-sm font-bold text-gray-700 uppercase">
                        Interactive Transcript
                      </h3>
                      <span
                        className={`text-xl transition-transform duration-200 ${transcriptSectionExpanded ? '' : '-rotate-90'}`}
                      >
                        ▼
                      </span>
                    </button>
                    {transcriptSectionExpanded && (
                      <div className="border-t border-gray-200 p-4">
                        <TranscriptReview
                          chunks={transcriptionResult.chunks}
                          censoredIndices={censoredWordIndices}
                          onToggleWord={onToggleWord}
                          searchQuery={searchQuery}
                          onSearchChange={onSearchQueryChange}
                          wordSource={wordSource}
                          activeWordsets={activeWordsets}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Matched Words Display */}
                {matchedWords.length > 0 && (
                  <div
                    id="selected"
                    ref={el => {
                      sectionRefs.current.selected = el;
                    }}
                    className="rounded-lg border border-gray-200 bg-white"
                  >
                    <button
                      onClick={() => setMatchedWordsExpanded(!matchedWordsExpanded)}
                      className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
                    >
                      <h3 className="text-sm font-bold text-gray-700 uppercase">
                        Selected Words ({matchedWords.length})
                      </h3>
                      <span
                        className={`text-xl transition-transform duration-200 ${matchedWordsExpanded ? '' : '-rotate-90'}`}
                      >
                        ▼
                      </span>
                    </button>
                    {matchedWordsExpanded && (
                      <div className="border-t border-gray-200 p-4">
                        <MatchedWordsDisplay matchedWords={matchedWords} isVisible={true} />
                        <div className="mt-4 rounded border-l-4 border-yellow-400 bg-yellow-50 p-3 text-sm">
                          <p className="text-yellow-900">
                            <strong>{matchedWords.length} words selected!</strong> Continue to Bleep
                            & Download tab to configure and apply bleeps.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Manual Timeline Section */}
            {hasFile && (
              <div
                id="timeline"
                ref={el => {
                  sectionRefs.current.timeline = el;
                }}
                className="mt-6 rounded-lg border border-gray-200 bg-white"
                data-testid="timeline-section"
              >
                <button
                  onClick={() => setTimelineExpanded(!timelineExpanded)}
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
                  data-testid="timeline-section-toggle"
                >
                  <h3 className="text-sm font-bold text-gray-700 uppercase">
                    Manual Timeline
                    {manualCensorSegments.length > 0 ? ` (${manualCensorSegments.length})` : ''}
                  </h3>
                  <span
                    className={`text-xl transition-transform duration-200 ${timelineExpanded ? '' : '-rotate-90'}`}
                  >
                    ▼
                  </span>
                </button>
                {timelineExpanded && (
                  <div className="border-t border-gray-200 p-4">
                    {/* Media Player */}
                    {fileUrl && (
                      <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Preview
                        </label>
                        <div className="overflow-hidden rounded-lg bg-black">
                          {isVideo ? (
                            <video
                              ref={mediaRef as React.RefObject<HTMLVideoElement>}
                              src={fileUrl}
                              className="w-full"
                              controls
                              onLoadedMetadata={handleLoadedMetadata}
                              onPlay={handlePlay}
                              onPause={handlePause}
                              onSeeked={() => setCurrentTime(mediaRef.current?.currentTime || 0)}
                            />
                          ) : (
                            <audio
                              ref={mediaRef as React.RefObject<HTMLAudioElement>}
                              src={fileUrl}
                              className="w-full"
                              controls
                              onLoadedMetadata={handleLoadedMetadata}
                              onPlay={handlePlay}
                              onPause={handlePause}
                              onSeeked={() => setCurrentTime(mediaRef.current?.currentTime || 0)}
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timeline Bar */}
                    {mediaDuration > 0 && (
                      <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Timeline
                        </label>
                        <TimelineBar
                          duration={mediaDuration}
                          currentTime={currentTime}
                          segments={manualCensorSegments}
                          onSeek={handleSeek}
                          onSegmentUpdate={handleSegmentUpdate}
                          onCreateSegment={onAddManualCensor}
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          <strong>Hold Shift + drag</strong> to add a censor. Drag segment edges to
                          resize. Click to seek.
                        </p>
                      </div>
                    )}

                    {/* Segment Chips */}
                    {manualCensorSegments.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            {manualCensorSegments.length} censor point
                            {manualCensorSegments.length !== 1 ? 's' : ''}
                          </span>
                          <button
                            type="button"
                            onClick={onClearManualCensors}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Clear all
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {manualCensorSegments.map(segment => (
                            <div
                              key={segment.id}
                              className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm"
                            >
                              <button
                                type="button"
                                onClick={() => handleSeek(segment.start)}
                                className="font-mono text-red-700 hover:text-red-900"
                                title="Click to seek"
                              >
                                {formatTime(segment.start)} - {formatTime(segment.end)}
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveManualCensor(segment.id)}
                                className="ml-1 text-red-400 hover:text-red-600"
                                title="Remove"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <FloatingNavArrows
        showBack={true}
        showForward={matchedWords.length > 0}
        onBack={() => onNavigate('setup')}
        onForward={() => onNavigate('bleep')}
        backLabel="Back to Setup & Transcribe"
        forwardLabel="Continue to Bleep & Download"
      />
    </div>
  );
}
