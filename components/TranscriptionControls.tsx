interface TranscriptionControlsProps {
  language: string;
  model: string;
  onLanguageChange: (language: string) => void;
  onModelChange: (model: string) => void;
}

export function TranscriptionControls({
  language,
  model,
  onLanguageChange,
  onModelChange,
}: TranscriptionControlsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-semibold">Language</label>
        <select
          data-testid="language-select"
          value={language}
          onChange={e => onLanguageChange(e.target.value)}
          className="min-h-touch w-full rounded-lg border border-gray-300 p-3 text-base focus:border-transparent focus:ring-2 focus:ring-blue-500 sm:p-2"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="it">Italian</option>
          <option value="pt">Portuguese</option>
          <option value="nl">Dutch</option>
          <option value="pl">Polish</option>
          <option value="ja">Japanese</option>
          <option value="zh">Chinese</option>
          <option value="ko">Korean</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Model</label>
        <select
          data-testid="model-select"
          value={model}
          onChange={e => onModelChange(e.target.value)}
          className="min-h-touch w-full rounded-lg border border-gray-300 p-3 text-base focus:border-transparent focus:ring-2 focus:ring-blue-500 sm:p-2"
        >
          <option value="Xenova/whisper-tiny.en">Tiny (~50 MB, fastest, lower accuracy)</option>
          <option value="Xenova/whisper-base.en">Base (~85 MB, balanced, recommended)</option>
          <option value="Xenova/whisper-small.en">Small (~275 MB, best accuracy, slower)</option>
          <option value="Xenova/whisper-tiny">Tiny Multilingual (~50 MB, 90+ languages)</option>
          <option value="Xenova/whisper-base">Base Multilingual (~85 MB, recommended)</option>
          <option value="Xenova/whisper-small">Small Multilingual (~275 MB, best accuracy)</option>
        </select>
      </div>
    </div>
  );
}
