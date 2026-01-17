'use client';

import { useState, useMemo } from 'react';
import { HelpTooltip } from '@/components/ui/HelpTooltip';
import { MobileSelect } from '@/components/ui/MobileSelect';
import { UpgradeModal } from '@/components/premium/UpgradeModal';
import { useAuth } from '@/providers/AuthProvider';

interface TranscriptionControlsProps {
  language: string;
  model: string;
  onLanguageChange: (language: string) => void;
  onModelChange: (model: string) => void;
}

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'pl', label: 'Polish' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ko', label: 'Korean' },
];

const modelOptions = [
  {
    value: 'Xenova/whisper-tiny.en',
    label: 'Tiny (~50 MB)',
    description: 'Fastest, lower accuracy',
  },
  {
    value: 'Xenova/whisper-base.en',
    label: 'Base (~85 MB)',
    description: 'Balanced, recommended',
  },
  {
    value: 'Xenova/whisper-small.en',
    label: 'Small (~275 MB)',
    description: 'Best accuracy, slower',
  },
  {
    value: 'onnx-community/whisper-medium.en_timestamped',
    label: 'Medium (~800 MB)',
    description: 'Highest accuracy, slowest',
  },
  {
    value: 'cloud/whisper-large-v3-turbo',
    label: 'Large (Cloud)',
    description: 'Best accuracy, fast, requires internet',
    isPremium: true,
  },
  {
    value: 'Xenova/whisper-tiny',
    label: 'Tiny Multilingual (~50 MB)',
    description: '90+ languages',
  },
  {
    value: 'Xenova/whisper-base',
    label: 'Base Multilingual (~85 MB)',
    description: 'Recommended for non-English',
  },
  {
    value: 'Xenova/whisper-small',
    label: 'Small Multilingual (~275 MB)',
    description: 'Best accuracy for non-English',
  },
  {
    value: 'onnx-community/whisper-medium_timestamped',
    label: 'Medium Multilingual (~800 MB)',
    description: 'Highest accuracy, slowest',
  },
  {
    value: 'cloud/whisper-large-v3-turbo-multilingual',
    label: 'Large Multilingual (Cloud)',
    description: 'Best accuracy for all languages, fast',
    isPremium: true,
  },
];

export function TranscriptionControls({
  language,
  model,
  onLanguageChange,
  onModelChange,
}: TranscriptionControlsProps) {
  const { isPremium } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // If user is premium, remove the isPremium lock from cloud options
  const effectiveModelOptions = useMemo(() => {
    if (isPremium) {
      return modelOptions.map(opt => ({
        ...opt,
        isPremium: false, // Premium users can access all models
      }));
    }
    return modelOptions;
  }, [isPremium]);

  const handlePremiumClick = () => {
    setShowUpgradeModal(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold">Language</label>
          <MobileSelect
            data-testid="language-select"
            value={language}
            options={languageOptions}
            onChange={onLanguageChange}
            label="Select Language"
            placeholder="Select language"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Model
            <HelpTooltip content="Tiny = fast but less accurate. Base = balanced. Small = most accurate but slower. Use Multilingual for non-English. Cloud models require a Pro subscription." />
          </label>
          <MobileSelect
            data-testid="model-select"
            value={model}
            options={effectiveModelOptions}
            onChange={onModelChange}
            onPremiumClick={handlePremiumClick}
            label="Select Model"
            placeholder="Select model"
          />
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureName="Cloud Transcription"
      />
    </>
  );
}
