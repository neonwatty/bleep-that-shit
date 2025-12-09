'use client';

import { useContext } from 'react';
import {
  WalkthroughContext,
  type WalkthroughContextValue,
} from '@/components/walkthrough/WalkthroughProvider';

/**
 * Hook to access walkthrough state and actions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isTourRunning, startTour, stopTour } = useWalkthrough();
 *
 *   return (
 *     <button onClick={startTour}>
 *       Start Tutorial
 *     </button>
 *   );
 * }
 * ```
 */
export function useWalkthrough(): WalkthroughContextValue {
  const context = useContext(WalkthroughContext);

  if (!context) {
    throw new Error('useWalkthrough must be used within a WalkthroughProvider');
  }

  return context;
}
