'use client';

import { useState } from 'react';
import { useWalkthrough } from '@/hooks/useWalkthrough';
import { trackEvent } from '@/lib/analytics';

interface OnboardingSlide {
  title: string;
  description: string;
  icon: string;
}

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    title: 'Welcome to Bleep That Sh*t!',
    description:
      'The easiest way to censor audio and video files. All processing happens right in your browser - your files are never uploaded to any server.',
    icon: '🎬',
  },
  {
    title: 'How It Works',
    description:
      '1. Upload your file\n2. We transcribe it with AI\n3. Select words to bleep\n4. Download your censored file\n\nIt only takes a few minutes!',
    icon: '✨',
  },
  {
    title: 'Ready to Start?',
    description:
      "Would you like a quick guided tour? We'll show you exactly how to use each feature. You can always access the tour later from the help button.",
    icon: '🚀',
  },
];

/**
 * First-visit onboarding wizard modal
 * Shows welcome slides and offers to start the guided tour
 */
export function OnboardingWizard() {
  const { showOnboardingWizard, completeOnboarding, dismissOnboarding } = useWalkthrough();
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!showOnboardingWizard) {
    return null;
  }

  const slide = ONBOARDING_SLIDES[currentSlide];
  const isLastSlide = currentSlide === ONBOARDING_SLIDES.length - 1;
  const isFirstSlide = currentSlide === 0;

  const handleNext = () => {
    if (isLastSlide) {
      // User wants the tour
      trackEvent('onboarding_completed', { started_tour: true });
      completeOnboarding();
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    trackEvent('onboarding_completed', { started_tour: false, skipped_at_slide: currentSlide });
    dismissOnboarding();
  };

  const handleBack = () => {
    setCurrentSlide(prev => Math.max(0, prev - 1));
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        {/* Icon */}
        <div className="mb-4 text-center text-5xl sm:text-6xl">{slide.icon}</div>

        {/* Title */}
        <h2
          id="onboarding-title"
          className="font-inter mb-3 text-center text-xl font-bold text-gray-900 sm:text-2xl"
        >
          {slide.title}
        </h2>

        {/* Description */}
        <p className="mb-6 text-center text-sm leading-relaxed whitespace-pre-line text-gray-600 sm:text-base">
          {slide.description}
        </p>

        {/* Progress Dots */}
        <div className="mb-6 flex justify-center gap-2">
          {ONBOARDING_SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 w-2 rounded-full transition-all ${
                index === currentSlide ? 'w-6 bg-pink-500' : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 transition-colors hover:text-gray-700"
          >
            Skip
          </button>

          <div className="flex gap-2">
            {!isFirstSlide && (
              <button
                onClick={handleBack}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="rounded-lg bg-pink-500 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-pink-600"
            >
              {isLastSlide ? 'Start Tour' : 'Next'}
            </button>
          </div>
        </div>

        {/* Skip Tour Option on Last Slide */}
        {isLastSlide && (
          <button
            onClick={handleSkip}
            className="mt-4 block w-full text-center text-sm text-gray-500 underline transition-colors hover:text-gray-700"
          >
            No thanks, I&apos;ll explore on my own
          </button>
        )}
      </div>
    </div>
  );
}
