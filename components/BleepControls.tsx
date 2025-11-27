interface BleepControlsProps {
  bleepSound: string;
  bleepVolume: number;
  originalVolumeReduction: number;
  bleepBuffer: number;
  isPreviewingBleep: boolean;
  onBleepSoundChange: (sound: string) => void;
  onBleepVolumeChange: (volume: number) => void;
  onOriginalVolumeChange: (volume: number) => void;
  onBleepBufferChange: (buffer: number) => void;
  onPreviewBleep: () => void;
}

export function BleepControls({
  bleepSound,
  bleepVolume,
  originalVolumeReduction,
  bleepBuffer,
  isPreviewingBleep,
  onBleepSoundChange,
  onBleepVolumeChange,
  onOriginalVolumeChange,
  onBleepBufferChange,
  onPreviewBleep,
}: BleepControlsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-semibold">Bleep Sound</label>
        <select
          data-testid="bleep-sound-select"
          value={bleepSound}
          onChange={e => onBleepSoundChange(e.target.value)}
          className="min-h-touch w-full rounded-lg border border-gray-300 p-3 text-base focus:border-transparent focus:ring-2 focus:ring-yellow-500 sm:max-w-xs sm:p-2"
        >
          <option value="bleep">Classic Bleep</option>
          <option value="brown">Brown Noise</option>
          <option value="dolphin">Dolphin Sounds Bleep</option>
          <option value="trex">T-Rex Roar</option>
          <option value="silence">Silence (No Sound)</option>
        </select>
      </div>

      <div>
        <label
          className={`mb-2 block text-sm font-semibold ${bleepSound === 'silence' ? 'text-gray-400' : ''}`}
        >
          Bleep Volume:{' '}
          <span
            className={`font-bold ${bleepSound === 'silence' ? 'text-gray-400' : 'text-yellow-600'}`}
          >
            {bleepSound === 'silence' ? 'N/A' : `${bleepVolume}%`}
          </span>
        </label>
        <input
          data-testid="bleep-volume-slider"
          type="range"
          min="0"
          max="150"
          step="5"
          value={bleepVolume}
          onChange={e => onBleepVolumeChange(Number(e.target.value))}
          disabled={bleepSound === 'silence'}
          className={`h-2 w-full rounded-lg sm:max-w-xs ${bleepSound === 'silence' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        />
        <div className="mt-1 flex w-full justify-between text-xs text-gray-600 sm:max-w-xs">
          <span>Quiet</span>
          <span>Loud</span>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-semibold">
            Original Word Volume:{' '}
            <span className="font-bold text-yellow-600">
              {Math.round(originalVolumeReduction * 100)}%
            </span>
          </label>
          <input
            data-testid="original-volume-slider"
            type="range"
            min="0"
            max="100"
            step="10"
            value={Math.round(originalVolumeReduction * 100)}
            onChange={e => onOriginalVolumeChange(Number(e.target.value) / 100)}
            className="h-2 w-full cursor-pointer rounded-lg sm:max-w-xs"
          />
          <div className="mt-1 flex w-full justify-between text-xs text-gray-600 sm:max-w-xs">
            <span>Removed</span>
            <span>Original</span>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-semibold">
            Bleep Buffer:{' '}
            <span className="font-bold text-yellow-600">{bleepBuffer.toFixed(2)}s</span>
          </label>
          <input
            data-testid="bleep-buffer-slider"
            type="range"
            min="0"
            max="0.5"
            step="0.05"
            value={bleepBuffer}
            onChange={e => onBleepBufferChange(parseFloat(e.target.value))}
            className="h-2 w-full cursor-pointer rounded-lg sm:max-w-xs"
          />
          <div className="mt-1 flex w-full justify-between text-xs text-gray-600 sm:max-w-xs">
            <span>None</span>
            <span>0.5s</span>
          </div>
          <p className="mt-1 text-xs text-gray-600">
            Extends bleep {bleepBuffer.toFixed(2)}s before and after each word
          </p>
        </div>

        <button
          data-testid="preview-bleep-button"
          onClick={onPreviewBleep}
          disabled={isPreviewingBleep || bleepSound === 'silence'}
          className="min-h-touch mt-3 w-full rounded-lg bg-yellow-500 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-4 sm:py-2 sm:text-sm"
        >
          {bleepSound === 'silence'
            ? 'Silence Mode'
            : isPreviewingBleep
              ? 'Playing...'
              : 'Preview Bleep'}
        </button>
      </div>
    </div>
  );
}
