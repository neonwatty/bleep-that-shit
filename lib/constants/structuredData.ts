export const SITE_URL = 'https://bleep-that-sht.com';
export const SITE_NAME = 'Bleep That Sh*t!';

export const organizationSchema = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/icon.png`,
    width: 512,
    height: 512,
  },
  sameAs: ['https://github.com/neonwatty/bleep-that-shit', 'https://discord.gg/XuzjVXyjH4'],
};

export const websiteSchema = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  description:
    'Effortlessly bleep out any words or phrases from your audio or video. 100% private in-browser processing.',
  publisher: {
    '@id': `${SITE_URL}/#organization`,
  },
  inLanguage: 'en-US',
};

export const applicationFeatures = [
  'Audio file censoring (MP3)',
  'Video file censoring (MP4)',
  'Word-level transcription with Whisper AI',
  'Exact, partial, and fuzzy word matching',
  'Customizable bleep sounds',
  'Custom word lists/wordsets',
  '100% client-side processing',
  'No file uploads to servers',
];

export const browserRequirements =
  'Requires a modern browser with WebAssembly and Web Workers support (Chrome 80+, Firefox 75+, Safari 14+, Edge 80+)';

export function createBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ============================================
// FAQ Schema
// ============================================

export interface FAQItem {
  question: string;
  answer: string;
}

export const homepageFAQItems: FAQItem[] = [
  {
    question: 'How do I bleep out words in a video?',
    answer:
      'Upload your MP4 video file, click "Transcribe" to generate an AI-powered transcript, select words to censor, then preview and download. The entire process takes minutes and works entirely in your browser.',
  },
  {
    question: 'Is my data private?',
    answer:
      'Yes! All processing happens 100% locally in your browser. Your files never leave your device and no data is sent to any server.',
  },
  {
    question: 'Can teachers use this for classroom videos?',
    answer:
      'Absolutely! Teachers use Bleep That Sh*t! to censor inappropriate language from documentaries, YouTube videos, and TED Talks. Since it runs locally with no uploads, it helps maintain FERPA compliance.',
  },
  {
    question: 'Will this help avoid YouTube demonetization?',
    answer:
      "Yes! YouTube's algorithm flags videos with profanity for limited ads. By bleeping inappropriate words before upload, you can protect your revenue while keeping your content style.",
  },
];

export function createFAQPageSchema(faqItems: FAQItem[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

// ============================================
// VideoObject Schema
// ============================================

export interface VideoConfig {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string | string[];
  uploadDate: string;
  duration?: string;
  embedUrl?: string;
  contentUrl?: string;
}

export const DEMO_VIDEO_CONFIG: VideoConfig = {
  id: 'demo-video',
  name: 'Bleep That Sh*t Demo - Audio & Video Censorship Tool',
  description:
    'Watch a quick demo of how to use Bleep That Sh*t! to censor words in audio and video files. See the complete workflow from file upload through transcription to censored download.',
  thumbnailUrl: [
    'https://img.youtube.com/vi/wJzTvINvEbo/maxresdefault.jpg',
    'https://img.youtube.com/vi/wJzTvINvEbo/hqdefault.jpg',
  ],
  uploadDate: '2024-11-28T00:00:00Z',
  duration: 'PT2M30S',
  embedUrl: 'https://www.youtube.com/embed/wJzTvINvEbo',
};

export function createVideoSchema(config: VideoConfig) {
  const schema: Record<string, unknown> = {
    '@type': 'VideoObject',
    '@id': `${SITE_URL}/#${config.id}`,
    name: config.name,
    description: config.description,
    thumbnailUrl: Array.isArray(config.thumbnailUrl) ? config.thumbnailUrl : [config.thumbnailUrl],
    uploadDate: config.uploadDate,
    publisher: {
      '@id': `${SITE_URL}/#organization`,
    },
  };

  if (config.duration) {
    schema.duration = config.duration;
  }

  if (config.embedUrl) {
    schema.embedUrl = config.embedUrl;
  }

  if (config.contentUrl) {
    schema.contentUrl = config.contentUrl;
  }

  return schema;
}
