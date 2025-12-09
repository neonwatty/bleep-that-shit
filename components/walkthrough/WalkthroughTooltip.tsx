'use client';

import type { TooltipRenderProps } from 'react-joyride';
import { DemoVideo } from './DemoVideo';
import type { WalkthroughStep } from '@/lib/walkthrough/walkthroughSteps';

/**
 * Custom branded tooltip component for the walkthrough
 * Supports embedded demo videos and branded styling
 */
export function WalkthroughTooltip({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  size,
}: TooltipRenderProps) {
  const isLastStep = index === size - 1;
  const isFirstStep = index === 0;

  // Cast step to our extended type to access demoVideo
  const walkthroughStep = step as WalkthroughStep;

  return (
    <div
      {...tooltipProps}
      className="max-w-sm rounded-lg bg-white p-4 shadow-xl sm:max-w-md"
      style={{ zIndex: 10000 }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        {step.title && (
          <h3 className="font-inter text-lg font-bold text-gray-900">
            {typeof step.title === 'string' ? step.title : null}
          </h3>
        )}
        <span className="text-sm text-gray-500">
          {index + 1} / {size}
        </span>
      </div>

      {/* Demo Video (if available) */}
      {walkthroughStep.demoVideo && (
        <div className="mb-3 hidden sm:block">
          <DemoVideo videoName={walkthroughStep.demoVideo} />
        </div>
      )}

      {/* Content */}
      <div className="mb-4 text-sm leading-relaxed text-gray-700">{step.content}</div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-2">
        <button
          {...skipProps}
          className="text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          Skip tour
        </button>

        <div className="flex gap-2">
          {!isFirstStep && (
            <button
              {...backProps}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Back
            </button>
          )}

          {continuous && (
            <button
              {...primaryProps}
              className="rounded-lg bg-pink-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-pink-600"
            >
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          )}

          {!continuous && (
            <button
              {...closeProps}
              className="rounded-lg bg-pink-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-pink-600"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
