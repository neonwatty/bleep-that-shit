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
  sameAs: ['https://github.com/neonwatty/bleep-that-shit', 'https://discord.gg/8EUxqR93'],
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
