'use client';

import dynamic from 'next/dynamic';
import { useCallback } from 'react';
import type { CallBackProps } from 'react-joyride';
import { STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { useWalkthrough } from '@/hooks/useWalkthrough';
import { WALKTHROUGH_STEPS } from '@/lib/walkthrough/walkthroughSteps';
import { WalkthroughTooltip } from './WalkthroughTooltip';
import { trackEvent } from '@/lib/analytics';

// Dynamically import Joyride to avoid SSR issues
const Joyride = dynamic(() => import('react-joyride'), { ssr: false });

/**
 * Main tour component that wraps react-joyride
 * Place this component in the bleep page to enable the walkthrough
 */
export function WalkthroughTour() {
  const { isTourRunning, currentStepIndex, stopTour, skipTour, goToStep } = useWalkthrough();

  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { status, type, index, action } = data;

      // Track step views
      if (type === EVENTS.STEP_AFTER) {
        const stepTitle = WALKTHROUGH_STEPS[index]?.title;
        trackEvent('walkthrough_step_viewed', {
          step_index: index,
          step_title: typeof stepTitle === 'string' ? stepTitle : 'Unknown',
        });
      }

      // Handle tour completion
      if (status === STATUS.FINISHED) {
        stopTour();
        trackEvent('walkthrough_completed', { total_steps: WALKTHROUGH_STEPS.length });
      }

      // Handle tour skip
      if (status === STATUS.SKIPPED) {
        skipTour();
        trackEvent('walkthrough_skipped', { skipped_at_step: index });
      }

      // Handle step navigation
      if (type === EVENTS.STEP_AFTER) {
        if (action === ACTIONS.NEXT) {
          goToStep(index + 1);
        } else if (action === ACTIONS.PREV) {
          goToStep(index - 1);
        }
      }

      // Handle close button
      if (action === ACTIONS.CLOSE) {
        skipTour();
        trackEvent('walkthrough_closed', { closed_at_step: index });
      }
    },
    [stopTour, skipTour, goToStep]
  );

  if (!isTourRunning) {
    return null;
  }

  return (
    <Joyride
      steps={WALKTHROUGH_STEPS}
      run={isTourRunning}
      stepIndex={currentStepIndex}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose
      disableScrolling={false}
      spotlightClicks
      callback={handleJoyrideCallback}
      tooltipComponent={WalkthroughTooltip}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#ec4899', // Pink-500 to match brand
          arrowColor: '#ffffff',
          backgroundColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          textColor: '#1f2937',
        },
        spotlight: {
          borderRadius: 8,
        },
        overlay: {
          mixBlendMode: undefined,
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  );
}
