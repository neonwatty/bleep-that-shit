'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { formatTime } from '@/lib/utils/timeFormat';
import type { ManualCensorSegment } from '@/lib/types/manualCensor';

interface TimelineBarProps {
  /** Total media duration in seconds */
  duration: number;
  /** Current playback position in seconds */
  currentTime: number;
  /** Censor segments to display */
  segments: ManualCensorSegment[];
  /** Callback when clicking timeline to seek */
  onSeek: (time: number) => void;
  /** Callback when dragging segment handles to adjust */
  onSegmentUpdate?: (id: string, start: number, end: number) => void;
  /** Callback when hovering over a segment */
  onSegmentHover?: (segment: ManualCensorSegment | null) => void;
  /** Callback when creating a new segment via Shift+drag */
  onCreateSegment?: (start: number, end: number) => void;
}

interface DragState {
  segmentId: string;
  type: 'start' | 'end' | 'move';
  initialMouseX: number;
  initialStart: number;
  initialEnd: number;
}

interface CreateDragState {
  startTime: number;
  endTime: number;
}

export function TimelineBar({
  duration,
  currentTime,
  segments,
  onSeek,
  onSegmentUpdate,
  onSegmentHover,
  onCreateSegment,
}: TimelineBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [createDrag, setCreateDrag] = useState<CreateDragState | null>(null);
  const [shiftHeld, setShiftHeld] = useState(false);
  // Ref to track latest createDrag value for global event handlers
  const createDragRef = useRef<CreateDragState | null>(null);
  createDragRef.current = createDrag;

  // Track Shift key state globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Convert time to percentage position
  const timeToPercent = useCallback(
    (time: number) => {
      if (duration <= 0) return 0;
      return Math.max(0, Math.min(100, (time / duration) * 100));
    },
    [duration]
  );

  // Convert mouse position to time
  const positionToTime = useCallback(
    (clientX: number) => {
      if (!containerRef.current || duration <= 0) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return percent * duration;
    },
    [duration]
  );

  // Handle mouse down - Shift+drag to create, otherwise prepare for seek
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (dragState) return;
      const time = positionToTime(e.clientX);

      // Shift+drag to create a new segment
      if (shiftHeld && onCreateSegment) {
        e.preventDefault();
        setCreateDrag({ startTime: time, endTime: time });
      }
    },
    [positionToTime, dragState, shiftHeld, onCreateSegment]
  );

  // Handle click to seek (only if not dragging and Shift not held)
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragState || createDrag || shiftHeld) return;
      const time = positionToTime(e.clientX);
      onSeek(time);
    },
    [positionToTime, onSeek, dragState, createDrag, shiftHeld]
  );

  // Handle mouse move for hover tooltip and create drag
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const time = positionToTime(e.clientX);
      setHoverTime(time);
      setHoverPosition(e.clientX - rect.left);

      // Update create drag end time
      if (createDrag) {
        setCreateDrag(prev => (prev ? { ...prev, endTime: time } : null));
      }
    },
    [positionToTime, createDrag]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverTime(null);
    onSegmentHover?.(null);
  }, [onSegmentHover]);

  const handleMouseUp = useCallback(() => {
    if (createDrag && onCreateSegment) {
      const start = Math.min(createDrag.startTime, createDrag.endTime);
      const end = Math.max(createDrag.startTime, createDrag.endTime);
      // Only create if dragged at least 0.1 seconds
      if (end - start >= 0.1) {
        onCreateSegment(start, end);
      }
    }
    setCreateDrag(null);
  }, [createDrag, onCreateSegment]);

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.MouseEvent, segment: ManualCensorSegment, type: 'start' | 'end' | 'move') => {
      e.stopPropagation();
      e.preventDefault();
      setDragState({
        segmentId: segment.id,
        type,
        initialMouseX: e.clientX,
        initialStart: segment.start,
        initialEnd: segment.end,
      });
    },
    []
  );

  // Global mouse move/up for dragging existing segments
  useEffect(() => {
    if (!dragState || !onSegmentUpdate) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const deltaTime = positionToTime(e.clientX) - positionToTime(dragState.initialMouseX);
      let newStart = dragState.initialStart;
      let newEnd = dragState.initialEnd;

      if (dragState.type === 'start') {
        newStart = Math.max(
          0,
          Math.min(dragState.initialEnd - 0.1, dragState.initialStart + deltaTime)
        );
      } else if (dragState.type === 'end') {
        newEnd = Math.max(
          dragState.initialStart + 0.1,
          Math.min(duration, dragState.initialEnd + deltaTime)
        );
      } else if (dragState.type === 'move') {
        const segmentDuration = dragState.initialEnd - dragState.initialStart;
        newStart = Math.max(
          0,
          Math.min(duration - segmentDuration, dragState.initialStart + deltaTime)
        );
        newEnd = newStart + segmentDuration;
      }

      onSegmentUpdate(dragState.segmentId, newStart, newEnd);
    };

    const handleGlobalMouseUp = () => {
      setDragState(null);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragState, onSegmentUpdate, positionToTime, duration]);

  // Global mouse move/up for creating new segments (Shift+drag)
  useEffect(() => {
    if (!createDrag) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const time = positionToTime(e.clientX);
      setCreateDrag(prev => (prev ? { ...prev, endTime: time } : null));
    };

    const handleGlobalMouseUp = () => {
      // Use ref to get the latest createDrag value
      const currentDrag = createDragRef.current;
      if (currentDrag && onCreateSegment) {
        const start = Math.min(currentDrag.startTime, currentDrag.endTime);
        const end = Math.max(currentDrag.startTime, currentDrag.endTime);
        // Only create if dragged at least 0.1 seconds
        if (end - start >= 0.1) {
          onCreateSegment(start, end);
        }
      }
      setCreateDrag(null);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [createDrag, onCreateSegment, positionToTime]);

  // Generate time markers
  const getTimeMarkers = useCallback(() => {
    if (duration <= 0) return [];
    const markers: number[] = [];
    // Dynamic interval based on duration
    let interval: number;
    if (duration <= 30) interval = 5;
    else if (duration <= 120) interval = 15;
    else if (duration <= 300) interval = 30;
    else interval = 60;

    for (let t = 0; t <= duration; t += interval) {
      markers.push(t);
    }
    // Always include end marker if not already there
    if (markers[markers.length - 1] !== duration) {
      markers.push(duration);
    }
    return markers;
  }, [duration]);

  const timeMarkers = getTimeMarkers();
  const playheadPercent = timeToPercent(currentTime);

  return (
    <div className="space-y-1">
      {/* Timeline Container */}
      <div
        ref={containerRef}
        data-testid="timeline-bar"
        className={`relative h-12 rounded-md bg-gray-200 transition-colors ${
          shiftHeld ? 'cursor-crosshair border-2 border-orange-400' : 'cursor-pointer'
        } ${dragState ? 'cursor-ew-resize' : ''} ${createDrag ? 'cursor-col-resize' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Preview segment while dragging to create */}
        {createDrag && (
          <div
            className="absolute top-1 bottom-1 rounded bg-orange-400 opacity-70"
            style={{
              left: `${timeToPercent(Math.min(createDrag.startTime, createDrag.endTime))}%`,
              width: `${Math.max(timeToPercent(Math.abs(createDrag.endTime - createDrag.startTime)), 0.5)}%`,
            }}
          />
        )}

        {/* Censor Segments */}
        {segments.map(segment => {
          const left = timeToPercent(segment.start);
          const width = timeToPercent(segment.end) - left;
          const isDragging = dragState?.segmentId === segment.id;

          return (
            <div
              key={segment.id}
              className={`group absolute top-1 bottom-1 rounded transition-colors ${
                isDragging ? 'bg-red-500' : 'bg-red-400 hover:bg-red-500'
              }`}
              style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%`, minWidth: '20px' }}
              onMouseEnter={() => onSegmentHover?.(segment)}
              onMouseLeave={() => onSegmentHover?.(null)}
              title={`${formatTime(segment.start)} - ${formatTime(segment.end)}`}
            >
              {/* Drag handle - start */}
              {onSegmentUpdate && (
                <div
                  className="absolute top-0 bottom-0 -left-1 w-3 cursor-ew-resize rounded-l bg-red-600 opacity-0 transition-opacity group-hover:opacity-100"
                  onMouseDown={e => handleDragStart(e, segment, 'start')}
                />
              )}
              {/* Drag handle - end */}
              {onSegmentUpdate && (
                <div
                  className="absolute top-0 -right-1 bottom-0 w-3 cursor-ew-resize rounded-r bg-red-600 opacity-0 transition-opacity group-hover:opacity-100"
                  onMouseDown={e => handleDragStart(e, segment, 'end')}
                />
              )}
              {/* Middle drag area */}
              {onSegmentUpdate && (
                <div
                  className="absolute inset-0 cursor-move"
                  onMouseDown={e => handleDragStart(e, segment, 'move')}
                />
              )}
            </div>
          );
        })}

        {/* Playhead */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-white shadow-md"
          style={{ left: `${playheadPercent}%` }}
        >
          {/* Playhead triangle */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-t-4 border-r-4 border-l-4 border-transparent border-t-white" />
        </div>

        {/* Hover Tooltip */}
        {hoverTime !== null && !dragState && (
          <div
            className="pointer-events-none absolute -top-8 z-20 -translate-x-1/2 rounded bg-gray-800 px-2 py-1 text-xs text-white"
            style={{ left: hoverPosition }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* Time Markers */}
      <div className="relative h-4 text-xs text-gray-500">
        {timeMarkers.map(time => (
          <span
            key={time}
            className="absolute -translate-x-1/2"
            style={{ left: `${timeToPercent(time)}%` }}
          >
            {formatTime(time)}
          </span>
        ))}
      </div>
    </div>
  );
}
