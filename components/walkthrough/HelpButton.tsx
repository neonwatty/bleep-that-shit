'use client';

import { usePathname } from 'next/navigation';
import { useWalkthrough } from '@/hooks/useWalkthrough';
import { trackEvent } from '@/lib/analytics';

/**
 * Floating Action Button (FAB) for accessing the walkthrough
 * Only visible on the bleep page, positioned in bottom-right
 * Repositioned on mobile to avoid tab bar
 */
export function HelpButton() {
  const pathname = usePathname();
  const { startTour, isTourRunning } = useWalkthrough();

  // Only show on bleep page
  if (pathname !== '/bleep') {
    return null;
  }

  // Hide when tour is running
  if (isTourRunning) {
    return null;
  }

  const handleClick = () => {
    trackEvent('help_button_clicked', { location: 'fab' });
    startTour();
  };

  return (
    <button
      onClick={handleClick}
      className="fixed right-4 bottom-20 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg transition-all hover:scale-110 hover:bg-pink-600 focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:outline-none sm:right-6 sm:bottom-6"
      aria-label="Start guided tour"
      title="Need help? Start the guided tour"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="h-6 w-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
        />
      </svg>
    </button>
  );
}
