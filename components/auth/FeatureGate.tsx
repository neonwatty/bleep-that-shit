'use client';

import { useAuth } from '@/providers/AuthProvider';
import type { ReactNode } from 'react';

type FeatureType = 'cloud_transcription' | 'long_files' | 'unlimited_projects' | 'priority_support';

interface FeatureGateProps {
  /** The premium feature being gated */
  feature: FeatureType;
  /** Content to render when user has access */
  children: ReactNode;
  /** Content to render when user doesn't have access (optional) */
  fallback?: ReactNode;
  /** If true, renders nothing instead of fallback when user doesn't have access */
  hideWhenLocked?: boolean;
}

/**
 * FeatureGate - Conditional rendering based on premium status.
 *
 * Wraps UI elements that should only be visible/accessible to premium users.
 * Uses the AuthProvider to check isPremium status.
 *
 * @example
 * // Show content only for premium users
 * <FeatureGate feature="cloud_transcription">
 *   <CloudTranscriptionOptions />
 * </FeatureGate>
 *
 * @example
 * // Show different content for free vs premium
 * <FeatureGate
 *   feature="long_files"
 *   fallback={<UpgradePrompt />}
 * >
 *   <LongFileUpload />
 * </FeatureGate>
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
  hideWhenLocked = false,
}: FeatureGateProps) {
  const { isPremium, isLoading } = useAuth();

  // Don't render anything while loading to avoid flicker
  if (isLoading) {
    return null;
  }

  // Premium users get access to all features
  if (isPremium) {
    return <>{children}</>;
  }

  // Non-premium users see fallback or nothing
  if (hideWhenLocked) {
    return null;
  }

  return <>{fallback}</>;
}

/**
 * Hook to check if a user has access to a premium feature.
 * Useful when you need the boolean value rather than conditional rendering.
 */
export function useFeatureAccess(feature: FeatureType): {
  hasAccess: boolean;
  isLoading: boolean;
  isPremium: boolean;
} {
  const { isPremium, isLoading } = useAuth();

  return {
    hasAccess: isPremium,
    isLoading,
    isPremium,
  };
}
