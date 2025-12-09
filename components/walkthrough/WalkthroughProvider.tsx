'use client';

import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  hasCompletedOnboarding,
  hasCompletedTour,
  isFirstVisit as checkFirstVisit,
  setOnboardingComplete,
  setTourComplete,
} from '@/lib/walkthrough/walkthroughStorage';

export interface WalkthroughContextValue {
  // State
  isTourRunning: boolean;
  currentStepIndex: number;
  isFirstVisit: boolean;
  showOnboardingWizard: boolean;
  hasCompletedTour: boolean;

  // Actions
  startTour: () => void;
  stopTour: () => void;
  skipTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  completeOnboarding: () => void;
  dismissOnboarding: () => void;
}

export const WalkthroughContext = createContext<WalkthroughContextValue | null>(null);

interface WalkthroughProviderProps {
  children: ReactNode;
}

export function WalkthroughProvider({ children }: WalkthroughProviderProps) {
  const [isTourRunning, setIsTourRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);

  // Initialize state from localStorage on mount
  useEffect(() => {
    const firstVisit = checkFirstVisit();
    const tourDone = hasCompletedTour();

    setIsFirstVisit(firstVisit);
    setTourCompleted(tourDone);

    // Show onboarding wizard on first visit
    if (firstVisit && !hasCompletedOnboarding()) {
      setShowOnboardingWizard(true);
    }
  }, []);

  const startTour = useCallback(() => {
    setCurrentStepIndex(0);
    setIsTourRunning(true);
  }, []);

  const stopTour = useCallback(() => {
    setIsTourRunning(false);
    setTourComplete(true);
    setTourCompleted(true);
  }, []);

  const skipTour = useCallback(() => {
    setIsTourRunning(false);
    // Don't mark as complete when skipping - user can restart later
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStepIndex(prev => prev + 1);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStepIndex(prev => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((index: number) => {
    setCurrentStepIndex(index);
  }, []);

  const completeOnboarding = useCallback(() => {
    setOnboardingComplete(true);
    setShowOnboardingWizard(false);
    setIsFirstVisit(false);
    // Optionally start the tour after onboarding
    startTour();
  }, [startTour]);

  const dismissOnboarding = useCallback(() => {
    setOnboardingComplete(true);
    setShowOnboardingWizard(false);
    setIsFirstVisit(false);
  }, []);

  const value: WalkthroughContextValue = {
    isTourRunning,
    currentStepIndex,
    isFirstVisit,
    showOnboardingWizard,
    hasCompletedTour: tourCompleted,
    startTour,
    stopTour,
    skipTour,
    nextStep,
    prevStep,
    goToStep,
    completeOnboarding,
    dismissOnboarding,
  };

  return <WalkthroughContext.Provider value={value}>{children}</WalkthroughContext.Provider>;
}
