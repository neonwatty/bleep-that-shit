'use client';

import { useState } from 'react';

interface DemoVideoProps {
  videoName: string;
  className?: string;
}

/**
 * Lazy-loaded video component for walkthrough demo videos
 * Videos are stored in /public/walkthrough/demos/
 */
export function DemoVideo({ videoName, className = '' }: DemoVideoProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const videoPath = `/walkthrough/demos/${videoName}`;

  if (hasError) {
    // Silently fail - don't show broken video placeholder
    return null;
  }

  return (
    <div className={`relative overflow-hidden rounded-lg bg-gray-100 ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
        </div>
      )}
      <video
        src={videoPath}
        autoPlay
        loop
        muted
        playsInline
        className={`w-full ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoadedData={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
