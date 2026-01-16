'use client';

import { useEffect, useRef } from 'react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export function UpgradeModal({
  isOpen,
  onClose,
  featureName = 'Cloud Transcription',
}: UpgradeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      <div
        ref={modalRef}
        className="animate-in fade-in zoom-in-95 relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl duration-200"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Premium badge */}
        <div className="mb-4 flex justify-center">
          <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1.5 text-sm font-bold text-white shadow-lg">
            PRO Feature
          </span>
        </div>

        {/* Title */}
        <h2 id="upgrade-modal-title" className="mb-2 text-center text-xl font-bold text-gray-900">
          Unlock {featureName}
        </h2>

        {/* Description */}
        <p className="mb-6 text-center text-gray-600">
          Get access to cloud-powered transcription with the highest accuracy and fastest processing
          speeds.
        </p>

        {/* Features list */}
        <div className="mb-6 space-y-3">
          <FeatureItem icon="cloud" text="Cloud transcription with Whisper Large v3" />
          <FeatureItem icon="bolt" text="Up to 200x faster than browser processing" />
          <FeatureItem icon="star" text="Best-in-class accuracy for all languages" />
          <FeatureItem icon="clock" text="Process files up to 2 hours long" />
        </div>

        {/* CTA buttons */}
        <div className="space-y-3">
          <a
            href="/premium"
            className="block w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-center font-semibold text-white shadow-lg transition-all hover:from-amber-600 hover:to-orange-600 hover:shadow-xl"
          >
            View Pro Plans
          </a>
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-gray-300 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Continue with Free
          </button>
        </div>

        {/* Subtle note */}
        <p className="mt-4 text-center text-xs text-gray-500">
          Free users can still use browser-based transcription with local Whisper models.
        </p>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  const iconPath = {
    cloud:
      'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
    bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
    star: 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z',
    clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  }[icon];

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
        <svg
          className="h-4 w-4 text-amber-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
        </svg>
      </div>
      <span className="text-sm text-gray-700">{text}</span>
    </div>
  );
}
