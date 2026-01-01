'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BleepControls } from '@/components/BleepControls';
import { FloatingNavArrows } from './FloatingNavArrows';
import { HelpTooltip } from '@/components/ui/HelpTooltip';
import type { MatchedWord } from '../hooks/useBleepState';
import { trackEvent } from '@/lib/analytics';
import { downloadFile, isNativeApp } from '@/lib/utils/downloadFile';

interface BleepDownloadTabProps {
  file: File | null;
  matchedWords: MatchedWord[];
  bleepSound: string;
  bleepVolume: number;
  originalVolumeReduction: number;
  bleepBuffer: number;
  censoredMediaUrl: string | null;
  isProcessingVideo: boolean;
  isPreviewingBleep: boolean;
  hasBleeped: boolean;
  lastBleepVolume: number | null;
  onBleepSoundChange: (sound: string) => void;
  onBleepVolumeChange: (volume: number) => void;
  onOriginalVolumeChange: (volume: number) => void;
  onBleepBufferChange: (buffer: number) => void;
  onPreviewBleep: () => void;
  onBleep: () => void;
  onNavigate: (tabId: string) => void;
}

export function BleepDownloadTab({
  file,
  matchedWords,
  bleepSound,
  bleepVolume,
  originalVolumeReduction,
  bleepBuffer,
  censoredMediaUrl,
  isProcessingVideo,
  isPreviewingBleep,
  hasBleeped,
  lastBleepVolume,
  onBleepSoundChange,
  onBleepVolumeChange,
  onOriginalVolumeChange,
  onBleepBufferChange,
  onPreviewBleep,
  onBleep,
  onNavigate,
}: BleepDownloadTabProps) {
  const [isPremiumCtaDismissed, setIsPremiumCtaDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('premium_cta_dismissed') === 'true';
    }
    return false;
  });
  const [downloadStatus, setDownloadStatus] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDismissPremiumCta = () => {
    setIsPremiumCtaDismissed(true);
    localStorage.setItem('premium_cta_dismissed', 'true');
    trackEvent('premium_cta_dismissed', {
      location: 'download_success',
    });
  };

  const handleDownload = async (
    url: string,
    filename: string,
    mimeType: string,
    fileType: 'video' | 'audio'
  ) => {
    setIsDownloading(true);
    setDownloadStatus(null);

    trackEvent('download_censored_file', {
      file_type: fileType,
      file_format: fileType === 'video' ? 'mp4' : 'mp3',
      is_native: isNativeApp(),
    });

    const result = await downloadFile(url, filename, mimeType);

    setIsDownloading(false);
    setDownloadStatus({
      message: result.message,
      isError: !result.success,
    });

    // Clear status after 5 seconds
    setTimeout(() => setDownloadStatus(null), 5000);
  };

  return (
    <div className="space-y-8">
      {/* Step 5: Bleep Sound */}
      <section className="border-l-4 border-yellow-500 pl-3 sm:pl-4">
        <div className="mb-2 flex items-center">
          <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-base font-bold text-white">
            5
          </span>
          <h2 className="font-inter text-lg font-extrabold text-black uppercase sm:text-xl md:text-2xl">
            Choose Bleep Sound & Volume
          </h2>
        </div>

        <BleepControls
          bleepSound={bleepSound}
          bleepVolume={bleepVolume}
          originalVolumeReduction={originalVolumeReduction}
          bleepBuffer={bleepBuffer}
          isPreviewingBleep={isPreviewingBleep}
          onBleepSoundChange={onBleepSoundChange}
          onBleepVolumeChange={onBleepVolumeChange}
          onOriginalVolumeChange={onOriginalVolumeChange}
          onBleepBufferChange={onBleepBufferChange}
          onPreviewBleep={onPreviewBleep}
        />
      </section>

      {/* Step 6: Bleep! */}
      <section className="border-l-4 border-violet-500 pl-3 sm:pl-4">
        <div className="mb-2 flex items-center">
          <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 text-base font-bold text-white">
            6
          </span>
          <h2 className="font-inter text-lg font-extrabold text-black uppercase sm:text-xl md:text-2xl">
            Bleep That Sh*t!
            <HelpTooltip content="Apply bleeps to your file and download the censored result. You can re-apply with different settings." />
          </h2>
        </div>

        {/* Censor Summary */}
        {matchedWords.length > 0 && (
          <div className="mb-4 rounded-md bg-gray-50 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-medium text-gray-700">
                <strong className="text-lg">{matchedWords.length}</strong> censor point
                {matchedWords.length !== 1 ? 's' : ''} ready
              </span>
              {(() => {
                const fromTranscription = matchedWords.filter(
                  w => w.source !== 'manual-timeline'
                ).length;
                const fromTimeline = matchedWords.filter(
                  w => w.source === 'manual-timeline'
                ).length;
                return (
                  <>
                    {fromTranscription > 0 && (
                      <span className="text-pink-600">{fromTranscription} from transcription</span>
                    )}
                    {fromTimeline > 0 && (
                      <span className="text-orange-600">{fromTimeline} from timeline</span>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        <button
          data-testid="apply-bleeps-button"
          onClick={onBleep}
          disabled={!file || matchedWords.length === 0}
          className={`btn btn-pink transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
            hasBleeped && bleepVolume !== lastBleepVolume
              ? 'animate-pulse ring-4 ring-yellow-400'
              : ''
          }`}
        >
          {hasBleeped ? 'Re-apply Bleeps with New Settings' : 'Apply Bleeps!'}
        </button>

        {isProcessingVideo && (
          <div data-testid="video-processing-indicator" className="mt-4">
            <p className="text-gray-600">Processing video... This may take a few moments.</p>
          </div>
        )}

        {censoredMediaUrl && (
          <div data-testid="censored-result" className="mt-4">
            <h3 className="mb-2 font-bold">Censored Result:</h3>
            {file?.type.includes('video') ? (
              <div className="flex flex-col items-center">
                <video
                  key={censoredMediaUrl}
                  controls
                  className="w-full max-w-full rounded-lg shadow-md sm:max-w-2xl"
                >
                  <source src={censoredMediaUrl} type="video/mp4" />
                </video>
                <button
                  data-testid="download-button"
                  onClick={() =>
                    handleDownload(censoredMediaUrl, 'censored-video.mp4', 'video/mp4', 'video')
                  }
                  disabled={isDownloading}
                  className="mt-2 inline-block rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDownloading ? 'Saving...' : 'Download Censored Video'}
                </button>
              </div>
            ) : (
              <>
                <audio key={censoredMediaUrl} controls className="w-full">
                  <source src={censoredMediaUrl} type="audio/mpeg" />
                </audio>
                <button
                  data-testid="download-button"
                  onClick={() =>
                    handleDownload(censoredMediaUrl, 'censored-audio.mp3', 'audio/mpeg', 'audio')
                  }
                  disabled={isDownloading}
                  className="mt-2 inline-block rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDownloading ? 'Saving...' : 'Download Censored Audio'}
                </button>
              </>
            )}

            {/* Download status message */}
            {downloadStatus && (
              <div
                className={`mt-2 rounded p-2 text-sm ${
                  downloadStatus.isError
                    ? 'border border-red-300 bg-red-100 text-red-700'
                    : 'border border-green-300 bg-green-100 text-green-700'
                }`}
              >
                {downloadStatus.message}
              </div>
            )}

            <div className="mt-4 rounded border-l-4 border-blue-400 bg-blue-50 p-3 text-sm">
              <p className="text-blue-900">
                💡 <strong>Tip:</strong> Want to adjust the volume or try a different bleep sound?
                Change your settings in Step 5 and click "Re-apply Bleeps" above to generate a new
                version.
                {lastBleepVolume !== null && bleepVolume !== lastBleepVolume && (
                  <span className="mt-2 block font-semibold text-blue-700">
                    ⚡ Volume changed from {lastBleepVolume}% to {bleepVolume}% - ready to re-apply!
                  </span>
                )}
              </p>
            </div>

            {/* Pro Waitlist CTA */}
            {!isPremiumCtaDismissed && (
              <div
                data-testid="premium-cta"
                className="animate-fade-in mt-4 rounded border-l-4 border-violet-400 bg-violet-50 p-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-violet-900">
                      <strong>Need to process longer videos?</strong> Join the waitlist for Bleep
                      Pro with support for 60+ minute files, saved projects, and batch processing.
                    </p>
                    <Link
                      href="/#waitlist"
                      className="mt-2 inline-block rounded bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
                      onClick={() =>
                        trackEvent('waitlist_cta_clicked', {
                          location: 'download_success',
                          file_type: file?.type.includes('video') ? 'video' : 'audio',
                        })
                      }
                    >
                      Join the Pro Waitlist →
                    </Link>
                  </div>
                  <button
                    onClick={handleDismissPremiumCta}
                    className="ml-2 text-violet-400 hover:text-violet-600"
                    aria-label="Dismiss premium prompt"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <FloatingNavArrows
        showBack={true}
        showForward={false}
        onBack={() => onNavigate('review')}
        onForward={() => {}}
        backLabel="Back to Review & Match"
      />
    </div>
  );
}
