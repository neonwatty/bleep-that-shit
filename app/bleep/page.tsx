'use client';

import { Suspense, useState, useEffect } from 'react';
import { useBleepState } from './hooks/useBleepState';
import { BleepTabs } from './components/BleepTabs';
import { SetupTranscribeTab } from './components/SetupTranscribeTab';
import { ReviewMatchTab } from './components/ReviewMatchTab';
import { WordsetTab } from './components/WordsetTab';
import { BleepDownloadTab } from './components/BleepDownloadTab';

function BleepPageContent() {
  const [activeTab, setActiveTab] = useState('setup');
  const bleepState = useBleepState();

  // Check if transcript exists to enable/disable tabs
  const hasTranscript = bleepState.transcription.transcriptionResult !== null;

  // Define tabs - Review & Bleep tabs locked until transcript created
  const tabs = [
    {
      id: 'setup',
      label: 'Setup & Transcribe',
      icon: '📋',
      enabled: true,
    },
    {
      id: 'review',
      label: 'Review & Match',
      icon: hasTranscript ? '📝' : '📝', // memo icon (same when enabled or locked)
      enabled: hasTranscript,
    },
    {
      id: 'bleep',
      label: 'Bleep & Download',
      icon: hasTranscript ? '🔊' : '📝', // speaker icon when enabled, memo when locked
      enabled: hasTranscript,
    },
    {
      id: 'wordsets',
      label: 'Manage Word Lists',
      icon: '📚',
      enabled: true,
    },
  ];

  // Auto-redirect to setup tab if user is on a locked tab
  useEffect(() => {
    if (!hasTranscript && (activeTab === 'review' || activeTab === 'bleep')) {
      setActiveTab('setup');
    }
  }, [hasTranscript, activeTab]);

  return (
    <div className="editorial-section px-2 sm:px-4">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <span className="inline-block align-middle" aria-label="Waveform icon">
          <svg
            width="36"
            height="36"
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="2" y="14" width="4" height="8" rx="2" fill="#111" />
            <rect x="8" y="10" width="4" height="16" rx="2" fill="#111" />
            <rect x="14" y="6" width="4" height="24" rx="2" fill="#111" />
            <rect x="20" y="10" width="4" height="16" rx="2" fill="#111" />
            <rect x="26" y="14" width="4" height="8" rx="2" fill="#111" />
          </svg>
        </span>
        <span className="text-xl sm:text-2xl md:text-3xl" aria-label="Cursing emoji">
          🙊
        </span>
        <h1
          className="font-inter ml-3 text-2xl leading-tight font-extrabold tracking-tight text-black uppercase sm:text-3xl md:text-4xl lg:text-5xl"
          style={{ lineHeight: '0.95' }}
        >
          Bleep Your Sh*t!
        </h1>
      </div>

      <div className="mb-8 border-l-4 border-yellow-400 bg-yellow-100 p-3">
        <span className="rounded bg-pink-200 px-2 py-1 font-bold">
          Process your entire audio or video file
        </span>
        , censoring selected words with customizable matching and bleep sounds.
        <div className="mt-2 text-sm">
          <span className="inline-flex items-center">
            ⏱️ <strong className="ml-1">Note:</strong> Currently supports files up to 10 minutes in
            length.
          </span>
        </div>
      </div>

      {/* Workflow */}
      <div className="mb-2 text-xs font-semibold tracking-wide text-gray-700 uppercase sm:text-sm">
        How it works
      </div>
      <ol className="mb-8 list-decimal pl-4 text-sm text-gray-900 sm:text-base md:pl-6 md:text-lg">
        <li>
          <span className="rounded bg-blue-100 px-2 py-1 text-blue-900">Upload your file</span>{' '}
          (audio or video).
        </li>
        <li>
          <span className="rounded bg-green-100 px-2 py-1 text-green-900">
            Select language and model
          </span>{' '}
          for transcription.
        </li>
        <li>
          <span className="rounded bg-indigo-100 px-2 py-1 text-indigo-900">Transcribe</span> your
          file to generate a word-level transcript.
        </li>
        <li>
          <span className="rounded bg-purple-100 px-2 py-1 text-purple-900">
            Enter words and matching modes
          </span>{' '}
          (exact, partial, fuzzy).
        </li>
        <li>
          <span className="rounded bg-pink-100 px-2 py-1 text-pink-900">Run matching</span> to find
          words to censor.
        </li>
        <li>
          <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-900">
            Choose bleep sound and volume
          </span>{' '}
          for censorship.
        </li>
        <li>
          <span className="rounded bg-violet-100 px-2 py-1 text-violet-900">
            Bleep That Sh*t! and preview/download the censored result.
          </span>
        </li>
      </ol>

      {/* Tab Navigation */}
      <BleepTabs activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />

      {/* Tab Content Area - connects to active tab */}
      <div className="-mt-px rounded-b-lg border-t-2 border-r-2 border-b-2 border-l-2 border-indigo-500 bg-white p-6 shadow-sm">
        {activeTab === 'setup' && (
          <SetupTranscribeTab
            file={bleepState.file.file}
            fileUrl={bleepState.file.fileUrl}
            isLoadingSample={bleepState.file.isLoadingSample}
            showFileWarning={bleepState.file.showFileWarning}
            fileDurationWarning={bleepState.file.fileDurationWarning}
            onFileUpload={bleepState.file.handleFileUpload}
            language={bleepState.transcription.language}
            model={bleepState.transcription.model}
            isTranscribing={bleepState.transcription.isTranscribing}
            transcriptionResult={bleepState.transcription.transcriptionResult}
            progress={bleepState.transcription.progress}
            progressText={bleepState.transcription.progressText}
            errorMessage={bleepState.transcription.errorMessage}
            timestampWarning={bleepState.transcription.timestampWarning}
            onLanguageChange={bleepState.transcription.setLanguage}
            onModelChange={bleepState.transcription.setModel}
            onTranscribe={bleepState.transcription.handleTranscribe}
            onDismissError={() => bleepState.transcription.setErrorMessage(null)}
          />
        )}

        {activeTab === 'review' && (
          <ReviewMatchTab
            transcriptionResult={bleepState.transcription.transcriptionResult}
            wordsToMatch={bleepState.wordSelection.wordsToMatch}
            matchMode={bleepState.wordSelection.matchMode}
            fuzzyDistance={bleepState.wordSelection.fuzzyDistance}
            censoredWordIndices={bleepState.wordSelection.censoredWordIndices}
            searchQuery={bleepState.wordSelection.searchQuery}
            matchedWords={bleepState.wordSelection.matchedWords}
            activeWordsets={bleepState.wordSelection.activeWordsets}
            wordSource={bleepState.wordSelection.wordSource}
            onWordsToMatchChange={bleepState.wordSelection.setWordsToMatch}
            onMatchModeChange={bleepState.wordSelection.setMatchMode}
            onFuzzyDistanceChange={bleepState.wordSelection.setFuzzyDistance}
            onSearchQueryChange={bleepState.wordSelection.setSearchQuery}
            onMatch={bleepState.wordSelection.handleMatch}
            onToggleWord={bleepState.wordSelection.handleToggleWord}
            onClearAll={bleepState.wordSelection.handleClearAll}
            onApplyWordsets={bleepState.wordSelection.handleApplyWordsets}
            onRemoveWordset={bleepState.wordSelection.handleRemoveWordset}
            onSwitchToWordsetsTab={() => setActiveTab('wordsets')}
          />
        )}

        {activeTab === 'wordsets' && <WordsetTab />}

        {activeTab === 'bleep' && (
          <BleepDownloadTab
            file={bleepState.file.file}
            matchedWords={bleepState.wordSelection.matchedWords}
            bleepSound={bleepState.bleepConfig.bleepSound}
            bleepVolume={bleepState.bleepConfig.bleepVolume}
            originalVolumeReduction={bleepState.bleepConfig.originalVolumeReduction}
            bleepBuffer={bleepState.bleepConfig.bleepBuffer}
            censoredMediaUrl={bleepState.bleepConfig.censoredMediaUrl}
            isProcessingVideo={bleepState.bleepConfig.isProcessingVideo}
            isPreviewingBleep={bleepState.bleepConfig.isPreviewingBleep}
            hasBleeped={bleepState.bleepConfig.hasBleeped}
            lastBleepVolume={bleepState.bleepConfig.lastBleepVolume}
            onBleepSoundChange={bleepState.bleepConfig.setBleepSound}
            onBleepVolumeChange={bleepState.bleepConfig.setBleepVolume}
            onOriginalVolumeChange={bleepState.bleepConfig.setOriginalVolumeReduction}
            onBleepBufferChange={bleepState.bleepConfig.setBleepBuffer}
            onPreviewBleep={bleepState.bleepConfig.handlePreviewBleep}
            onBleep={bleepState.bleepConfig.handleBleep}
          />
        )}
      </div>
    </div>
  );
}

export default function BleepPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <BleepPageContent />
    </Suspense>
  );
}
