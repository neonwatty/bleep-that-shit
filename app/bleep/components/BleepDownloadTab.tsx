import { BleepControls } from '@/components/BleepControls';
import { FloatingNavArrows } from './FloatingNavArrows';
import type { MatchedWord } from '../hooks/useBleepState';
import { trackEvent } from '@/lib/analytics';
import { FEEDBACK_FORM_URL } from '@/lib/constants/externalLinks';

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
          data-walkthrough="apply-bleeps-button"
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
                <a
                  data-testid="download-button"
                  data-walkthrough="download-button"
                  href={censoredMediaUrl}
                  download="censored-video.mp4"
                  className="mt-2 inline-block rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                  onClick={() =>
                    trackEvent('download_censored_file', { file_type: 'video', file_format: 'mp4' })
                  }
                >
                  Download Censored Video
                </a>
              </div>
            ) : (
              <>
                <audio key={censoredMediaUrl} controls className="w-full">
                  <source src={censoredMediaUrl} type="audio/mpeg" />
                </audio>
                <a
                  data-testid="download-button"
                  data-walkthrough="download-button"
                  href={censoredMediaUrl}
                  download="censored-audio.mp3"
                  className="mt-2 inline-block rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                  onClick={() =>
                    trackEvent('download_censored_file', { file_type: 'audio', file_format: 'mp3' })
                  }
                >
                  Download Censored Audio
                </a>
              </>
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

            {/* Feedback CTA */}
            <div className="mt-4 rounded border-l-4 border-yellow-400 bg-yellow-50 p-3">
              <p className="text-sm text-yellow-900">
                <strong>Was this helpful?</strong> We&apos;re building new features and would love
                your input.
              </p>
              <a
                href={FEEDBACK_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block rounded bg-yellow-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-yellow-600"
                onClick={() => trackEvent('feedback_cta_clicked', { location: 'download_success' })}
              >
                Share Quick Feedback (30 sec)
              </a>
            </div>
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
