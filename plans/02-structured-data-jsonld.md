# SEO Plan: Structured Data (JSON-LD)

## Overview

Add JSON-LD structured data to improve search engine understanding and enable rich results. Implement Organization, WebSite, WebApplication, HowTo, and BreadcrumbList schemas.

## Schema Distribution

| Page                 | Schemas                               |
| -------------------- | ------------------------------------- |
| Root Layout          | Organization, WebSite                 |
| Home (`/`)           | WebApplication, HowTo, BreadcrumbList |
| Bleep (`/bleep`)     | SoftwareApplication, BreadcrumbList   |
| Sampler (`/sampler`) | SoftwareApplication, BreadcrumbList   |

## Implementation

### 1. Create JSON-LD Component (`components/JsonLd.tsx`) - NEW FILE

```typescript
interface JsonLdProps {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function JsonLd({ data }: JsonLdProps) {
  const schemaData = Array.isArray(data)
    ? { '@context': 'https://schema.org', '@graph': data }
    : { '@context': 'https://schema.org', ...data };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}
```

### 2. Create Shared Constants (`lib/constants/structuredData.ts`) - NEW FILE

```typescript
export const SITE_URL = 'https://bleep-that-sht.com';
export const SITE_NAME = 'Bleep That Sh*t!';

export const organizationSchema = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.png`, width: 512, height: 512 },
  sameAs: ['https://github.com/neonwatty/bleep-that-shit'],
};

export const websiteSchema = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  description: 'Free audio and video censorship tool with AI-powered transcription',
  publisher: { '@id': `${SITE_URL}/#organization` },
  inLanguage: 'en-US',
};

export const applicationFeatures = [
  'Audio file censoring (MP3)',
  'Video file censoring (MP4)',
  'Word-level transcription with Whisper AI',
  'Exact, partial, and fuzzy word matching',
  'Customizable bleep sounds',
  '100% client-side processing',
];
```

### 3. Add to Root Layout (`app/layout.tsx`)

```typescript
import { JsonLd } from '@/components/JsonLd';
import { organizationSchema, websiteSchema } from '@/lib/constants/structuredData';

// In the <head> section:
<JsonLd data={[organizationSchema, websiteSchema]} />
```

### 4. Add to Home Page (`app/page.tsx`)

```typescript
const homePageSchemas = [
  {
    '@type': 'WebApplication',
    name: 'Bleep That Sh*t!',
    url: SITE_URL,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any (Web Browser)',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: applicationFeatures,
  },
  {
    '@type': 'HowTo',
    name: 'How to Censor Audio and Video',
    totalTime: 'PT5M',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Upload',
        text: 'Upload your audio or video file',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Transcribe',
        text: 'AI transcribes with word-level timestamps',
      },
      { '@type': 'HowToStep', position: 3, name: 'Censor', text: 'Select words to bleep' },
      { '@type': 'HowToStep', position: 4, name: 'Download', text: 'Preview and download' },
    ],
  },
  {
    '@type': 'BreadcrumbList',
    itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }],
  },
];
```

### 5. Add to Bleep Layout (`app/bleep/layout.tsx`)

```typescript
const bleepPageSchemas = [
  {
    '@type': 'SoftwareApplication',
    name: 'Bleep Your Sh*t! - Audio/Video Censoring Tool',
    url: `${SITE_URL}/bleep`,
    applicationCategory: 'MultimediaApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true,
  },
  {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Bleep Tool', item: `${SITE_URL}/bleep` },
    ],
  },
];
```

## Files to Create/Modify

| File                              | Action                              |
| --------------------------------- | ----------------------------------- |
| `components/JsonLd.tsx`           | Create                              |
| `lib/constants/structuredData.ts` | Create                              |
| `app/layout.tsx`                  | Modify - add Organization + WebSite |
| `app/page.tsx`                    | Modify - add WebApplication + HowTo |
| `app/bleep/layout.tsx`            | Modify - add SoftwareApplication    |
| `app/sampler/layout.tsx`          | Modify - add SoftwareApplication    |

## Testing

1. [Google Rich Results Test](https://search.google.com/test/rich-results)
2. [Schema.org Validator](https://validator.schema.org/)
3. Check JSON-LD in browser DevTools (search for `application/ld+json`)
