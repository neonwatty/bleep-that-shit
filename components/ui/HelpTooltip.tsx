'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

interface HelpTooltipProps {
  content: string;
  gifSrc?: string;
}

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export function HelpTooltip({ content, gifSrc }: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>('top');
  const [tooltipStyles, setTooltipStyles] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Track when component is mounted (for portal)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate best position based on available space and set absolute styles
  useEffect(() => {
    if (!isVisible || !triggerRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 320; // max-w-80 = 320px
    const tooltipHeight = 150; // estimated height
    const padding = 8;

    // Check available space in each direction
    const spaceAbove = trigger.top;
    const spaceBelow = window.innerHeight - trigger.bottom;
    const spaceLeft = trigger.left;
    const spaceRight = window.innerWidth - trigger.right;

    let newPosition: TooltipPosition = 'top';
    let styles: React.CSSProperties = {};

    // Prefer top, then bottom, then right, then left
    if (spaceAbove >= tooltipHeight + padding) {
      newPosition = 'top';
    } else if (spaceBelow >= tooltipHeight + padding) {
      newPosition = 'bottom';
    } else if (spaceRight >= tooltipWidth + padding) {
      newPosition = 'right';
    } else if (spaceLeft >= tooltipWidth + padding) {
      newPosition = 'left';
    }

    // Calculate absolute position based on trigger position
    const triggerCenterX = trigger.left + trigger.width / 2;
    const triggerCenterY = trigger.top + trigger.height / 2;

    switch (newPosition) {
      case 'top':
        styles = {
          left: Math.max(
            padding,
            Math.min(triggerCenterX - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding)
          ),
          top: trigger.top - padding,
          transform: 'translateY(-100%)',
        };
        break;
      case 'bottom':
        styles = {
          left: Math.max(
            padding,
            Math.min(triggerCenterX - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding)
          ),
          top: trigger.bottom + padding,
        };
        break;
      case 'left':
        styles = {
          left: trigger.left - tooltipWidth - padding,
          top: triggerCenterY,
          transform: 'translateY(-50%)',
        };
        break;
      case 'right':
        styles = {
          left: trigger.right + padding,
          top: triggerCenterY,
          transform: 'translateY(-50%)',
        };
        break;
    }

    setPosition(newPosition);
    setTooltipStyles(styles);
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

  const arrowClasses: Record<TooltipPosition, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-indigo-900 border-x-transparent border-b-transparent',
    bottom:
      'bottom-full left-1/2 -translate-x-1/2 border-b-indigo-900 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-indigo-900 border-y-transparent border-r-transparent',
    right:
      'right-full top-1/2 -translate-y-1/2 border-r-indigo-900 border-y-transparent border-l-transparent',
  };

  const tooltipContent = isVisible && mounted && (
    <div
      ref={tooltipRef}
      id={tooltipId}
      role="tooltip"
      className="fixed z-[99999]"
      style={tooltipStyles}
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
  );

  return (
    <span className="relative ml-1.5 inline-flex -translate-y-[3px] items-center align-baseline">
      <span
        ref={triggerRef}
        tabIndex={0}
        aria-label="Help"
        aria-describedby={isVisible ? tooltipId : undefined}
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

      {mounted && createPortal(tooltipContent, document.body)}
    </span>
  );
}
