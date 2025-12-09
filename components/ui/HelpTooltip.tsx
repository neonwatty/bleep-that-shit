'use client';

import { useState, useRef, useEffect, useId } from 'react';
import Image from 'next/image';

interface HelpTooltipProps {
  content: string;
  gifSrc?: string;
}

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export function HelpTooltip({ content, gifSrc }: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>('top');
  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate best position based on available space
  useEffect(() => {
    if (!isVisible || !triggerRef.current || !tooltipRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const padding = 8;

    // Check available space in each direction
    const spaceAbove = trigger.top;
    const spaceBelow = window.innerHeight - trigger.bottom;
    const spaceLeft = trigger.left;
    const spaceRight = window.innerWidth - trigger.right;

    // Prefer top, then bottom, then right, then left
    if (spaceAbove >= tooltip.height + padding) {
      setPosition('top');
    } else if (spaceBelow >= tooltip.height + padding) {
      setPosition('bottom');
    } else if (spaceRight >= tooltip.width + padding) {
      setPosition('right');
    } else if (spaceLeft >= tooltip.width + padding) {
      setPosition('left');
    } else {
      // Default to top if nothing fits well
      setPosition('top');
    }
  }, [isVisible]);

  // Close on Escape key
  useEffect(() => {
    if (!isVisible) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVisible(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible]);

  // Close when clicking outside (for mobile tap-to-show)
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible]);

  const positionClasses: Record<TooltipPosition, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses: Record<TooltipPosition, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-indigo-900 border-x-transparent border-b-transparent',
    bottom:
      'bottom-full left-1/2 -translate-x-1/2 border-b-indigo-900 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-indigo-900 border-y-transparent border-r-transparent',
    right:
      'right-full top-1/2 -translate-y-1/2 border-r-indigo-900 border-y-transparent border-l-transparent',
  };

  return (
    <span className="relative ml-1.5 inline-flex -translate-y-[3px] items-center align-baseline">
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-describedby={isVisible ? tooltipId : undefined}
        aria-expanded={isVisible}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        onClick={e => {
          e.stopPropagation();
          setIsVisible(!isVisible);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setIsVisible(!isVisible);
          }
        }}
        className="group inline-flex h-[18px] w-[18px] cursor-help items-center justify-center rounded-full border border-indigo-300 bg-indigo-50 text-[11px] font-bold text-indigo-600 shadow-sm transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-100 hover:text-indigo-700 hover:shadow focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:outline-none"
      >
        <span className="transition-transform duration-200 group-hover:scale-110">?</span>
      </span>

      {isVisible && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className={`absolute z-[9999] ${positionClasses[position]}`}
        >
          <div className="animate-fade-in relative w-72 max-w-[90vw] rounded-xl border border-indigo-800/50 bg-gradient-to-br from-indigo-900 via-indigo-900 to-indigo-950 px-4 py-3 text-sm shadow-xl shadow-indigo-950/30 sm:w-80">
            {/* Subtle glow effect */}
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-400/5 via-transparent to-transparent" />

            {gifSrc && (
              <div className="relative mb-3 overflow-hidden rounded-lg border border-indigo-700/30">
                <Image
                  src={gifSrc}
                  alt=""
                  width={248}
                  height={150}
                  className="h-auto max-h-[150px] w-full object-contain"
                  loading="lazy"
                />
              </div>
            )}
            <p className="relative leading-relaxed tracking-wide text-indigo-50 normal-case">
              {content}
            </p>
            {/* Arrow */}
            <span
              className={`absolute h-0 w-0 border-[6px] ${arrowClasses[position]}`}
              aria-hidden="true"
            />
          </div>
        </div>
      )}
    </span>
  );
}
