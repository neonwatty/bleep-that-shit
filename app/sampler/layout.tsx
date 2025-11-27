import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { SITE_URL, browserRequirements, createBreadcrumbSchema } from '@/lib/constants/structuredData';

export const metadata: Metadata = {
  title: 'Transcription Sampler - Compare Whisper Models',
  description:
    'Compare different Whisper AI transcription models on your audio samples. Test accuracy and speed to find the best model for your needs. Free browser-based tool.',
  keywords: [
    'Whisper model comparison',
    'transcription sampler',
    'AI transcription test',
    'Whisper tiny',
    'Whisper base',
    'Whisper small',
    'speech to text',
    'audio transcription accuracy',
    'multilingual transcription',
    'browser AI',
  ],
  openGraph: {
    title: 'Transcription Sampler - Compare Whisper Models | Bleep That Sh*t!',
    description:
      'Compare different Whisper AI transcription models on your audio samples. Test accuracy and speed to find the best model for your needs.',
    url: `${SITE_URL}/sampler`,
    images: [
      {
        url: `${SITE_URL}/og-image.svg`,
        width: 1200,
        height: 630,
        alt: 'Transcription Sampler - Compare Whisper AI Models',
      },
    ],
  },
  twitter: {
    title: 'Transcription Sampler - Compare Whisper Models',
    description:
      'Compare different Whisper AI transcription models. Test accuracy and speed to find the best model for your needs.',
    images: [`${SITE_URL}/og-image.svg`],
  },
  alternates: {
    canonical: `${SITE_URL}/sampler`,
  },
};

const samplerPageSchemas = [
  {
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/sampler#application`,
    name: 'Transcription Sampler - Whisper Model Comparison Tool',
    url: `${SITE_URL}/sampler`,
    description:
      'Compare different Whisper AI models on a short audio sample to find the best balance of speed and accuracy for your transcription needs.',
    applicationCategory: 'MultimediaApplication',
    applicationSubCategory: 'Speech Recognition',
    operatingSystem: 'Any (Web Browser)',
    browserRequirements: browserRequirements,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    featureList: [
      'Compare 6 Whisper AI models side-by-side',
      'Test on custom audio/video samples',
      'Configurable sample start time and duration',
      'Multi-language support (11+ languages)',
      'Performance timing for each model',
      'Export transcription results',
      '100% client-side processing',
      'Models cached locally for faster subsequent use',
    ],
    isAccessibleForFree: true,
    author: {
      '@id': `${SITE_URL}/#organization`,
    },
  },
  createBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Transcription Sampler', url: `${SITE_URL}/sampler` },
  ]),
];

export default function SamplerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={samplerPageSchemas} />
      {children}
    </>
  );
}
