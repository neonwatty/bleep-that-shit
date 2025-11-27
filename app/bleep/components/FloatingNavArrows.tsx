interface FloatingNavArrowsProps {
  showBack: boolean;
  showForward: boolean;
  onBack: () => void;
  onForward: () => void;
  backLabel?: string;
  forwardLabel?: string;
}

export function FloatingNavArrows({
  showBack,
  showForward,
  onBack,
  onForward,
  backLabel = 'Previous step',
  forwardLabel = 'Next step',
}: FloatingNavArrowsProps) {
  if (!showBack && !showForward) return null;

  return (
    <div className="fixed right-6 bottom-6 z-50 flex gap-3">
      {showBack && (
        <button
          onClick={onBack}
          title={backLabel}
          aria-label={backLabel}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-600 shadow-lg transition-all duration-200 hover:scale-110 hover:bg-indigo-100 hover:text-indigo-600 hover:shadow-xl"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      )}
      {showForward && (
        <button
          onClick={onForward}
          title={forwardLabel}
          aria-label={forwardLabel}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:bg-indigo-600 hover:shadow-xl"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}
    </div>
  );
}
