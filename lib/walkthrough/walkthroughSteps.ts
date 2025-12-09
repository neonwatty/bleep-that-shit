import type { Step } from 'react-joyride';

/**
 * Tour step definitions for the simple word matching workflow
 *
 * Priority journey: Upload → Transcribe → Enter words → Match → Bleep → Download
 */

export interface WalkthroughStep extends Step {
  // Optional video file name (without path) for demo videos
  demoVideo?: string;
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    target: '[data-walkthrough="file-upload"]',
    title: 'Upload Your File',
    content:
      'Start by uploading an audio or video file. Drag and drop your MP3, MP4, or other media file here. Files up to 10 minutes are supported.',
    placement: 'bottom',
    disableBeacon: true,
    demoVideo: 'upload-file.mp4',
  },
  {
    target: '[data-walkthrough="transcribe-button"]',
    title: 'Transcribe Your Audio',
    content:
      'Click here to transcribe your file using AI. This process takes 30-60 seconds and runs entirely in your browser - no data is uploaded to any server.',
    placement: 'bottom',
    demoVideo: 'transcribe.mp4',
  },
  {
    target: '[data-walkthrough="words-input"]',
    title: 'Enter Words to Censor',
    content:
      'Type the words you want to bleep out, separated by commas. For example: "damn, hell, crap". The matcher will find all instances in your transcript.',
    placement: 'bottom',
    demoVideo: 'match-words.mp4',
  },
  {
    target: '[data-walkthrough="match-button"]',
    title: 'Match Words',
    content:
      'Click to find all instances of your words in the transcript. Matched words will be highlighted so you can review them before applying bleeps.',
    placement: 'bottom',
  },
  {
    target: '[data-walkthrough="bleep-tab"]',
    title: 'Go to Bleep Tab',
    content:
      'Navigate to the Bleep & Download tab to apply your bleeps and get your censored file.',
    placement: 'bottom',
    demoVideo: 'apply-bleep.mp4',
  },
  {
    target: '[data-walkthrough="apply-bleeps-button"]',
    title: 'Apply Bleeps',
    content:
      'Click to process your file with bleeps at all the matched timestamps. This creates a new version of your audio/video with the selected words censored.',
    placement: 'bottom',
  },
  {
    target: '[data-walkthrough="download-button"]',
    title: 'Download Your File',
    content:
      "That's it! Download your censored file. All processing happened locally in your browser - your file was never uploaded anywhere.",
    placement: 'bottom',
    demoVideo: 'download.mp4',
  },
];

/**
 * Get a step by its index
 */
export function getStepByIndex(index: number): WalkthroughStep | undefined {
  return WALKTHROUGH_STEPS[index];
}

/**
 * Get the total number of steps
 */
export function getTotalSteps(): number {
  return WALKTHROUGH_STEPS.length;
}

/**
 * Get all target selectors (useful for checking if elements exist)
 */
export function getAllTargetSelectors(): string[] {
  return WALKTHROUGH_STEPS.map(step => step.target as string);
}
