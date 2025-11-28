import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import {
  SITE_URL,
  applicationFeatures,
  browserRequirements,
  createBreadcrumbSchema,
} from '@/lib/constants/structuredData';

export const metadata: Metadata = {
  title: 'Bleep Your Audio & Video',
  description:
    'Upload your MP3 or MP4 file, transcribe with AI, and censor any words with customizable bleep sounds. Process files up to 10 minutes entirely in your browser.',
  keywords: [
    'bleep audio',
    'censor video',
    'audio transcription',
    'Whisper AI',
    'word censorship',
    'profanity bleep',
    'MP3 censorship',
    'MP4 censorship',
    'private audio editing',
    'browser-based censorship',
  ],
  openGraph: {
    title: 'Bleep Your Audio & Video | Bleep That Sh*t!',
    description:
      'Upload your MP3 or MP4 file, transcribe with AI, and censor any words with customizable bleep sounds. 100% private browser processing.',
    url: `${SITE_URL}/bleep`,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Bleep Your Audio & Video - Censorship Tool',
      },
    ],
  },
  twitter: {
    title: 'Bleep Your Audio & Video | Bleep That Sh*t!',
    description:
      'Upload your MP3 or MP4 file, transcribe with AI, and censor any words. 100% private browser processing.',
    images: [`${SITE_URL}/og-image.png`],
  },
  alternates: {
    canonical: `${SITE_URL}/bleep`,
  },
};

const bleepPageSchemas = [
  {
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/bleep#application`,
    name: 'Bleep Your Sh*t! - Audio/Video Censoring Tool',
    url: `${SITE_URL}/bleep`,
    description:
      'Process your entire audio or video file, censoring selected words with customizable matching and bleep sounds. Supports files up to 10 minutes.',
    applicationCategory: 'MultimediaApplication',
    applicationSubCategory: 'Audio Editor',
    operatingSystem: 'Any (Web Browser)',
    browserRequirements: browserRequirements,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    featureList: [
      ...applicationFeatures,
      'Tab-based workflow interface',
      'Manual timeline censoring',
      'Bleep volume control',
      'Original audio volume reduction',
      'Silence mode option',
    ],
    isAccessibleForFree: true,
    author: {
      '@id': `${SITE_URL}/#organization`,
    },
  },
  createBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Bleep Tool', url: `${SITE_URL}/bleep` },
  ]),
];

export default function BleepLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={bleepPageSchemas} />
      {children}
    </>
  );
}
