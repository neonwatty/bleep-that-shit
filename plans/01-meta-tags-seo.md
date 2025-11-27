# SEO Plan: Meta Tags & Page Descriptions

## Overview

Add comprehensive, SEO-optimized metadata to each page using Next.js 15's Metadata API, including Open Graph tags, Twitter Cards, and canonical URLs.

## Current State

- Root layout (`app/layout.tsx`) has basic metadata (title, description, icons)
- No per-page metadata - all 3 pages share the same generic metadata
- No Open Graph or Twitter Card tags
- No canonical URLs

## Implementation

### 1. Update Root Layout (`app/layout.tsx`)

Add comprehensive default metadata with template support:

```typescript
import type { Metadata, Viewport } from 'next';

const siteUrl = 'https://bleep-that-sht.com';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Bleep That Sh*t! - Free Audio & Video Censorship Tool',
    template: '%s | Bleep That Sh*t!',
  },
  description:
    'Effortlessly bleep out any words or phrases from your audio or video files. 100% private in-browser processing with AI-powered transcription.',
  keywords: [
    'audio censorship',
    'video censorship',
    'bleep audio',
    'censor words',
    'profanity filter',
    'content moderation',
    'browser-based',
    'privacy-focused',
  ],
  authors: [{ name: 'Bleep That Sh*t!' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Bleep That Sh*t!',
    title: 'Bleep That Sh*t! - Free Audio & Video Censorship Tool',
    description:
      'Effortlessly bleep out any words or phrases from your audio or video files. 100% private in-browser processing.',
    images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: 'Bleep That Sh*t!' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bleep That Sh*t! - Free Audio & Video Censorship Tool',
    description:
      'Effortlessly bleep out any words or phrases from your audio or video files. 100% private.',
    images: [`${siteUrl}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: { canonical: siteUrl },
};
```

### 2. Add Home Page Metadata (`app/page.tsx`)

```typescript
export const metadata: Metadata = {
  title: 'Bleep That Sh*t! - Free Audio & Video Censorship Tool',
  description:
    'Effortlessly bleep out any words or phrases from your audio or video. 100% private in-browser processing with AI transcription.',
  alternates: { canonical: 'https://bleep-that-sht.com' },
};
```

### 3. Create Bleep Page Layout (`app/bleep/layout.tsx`) - NEW FILE

```typescript
import type { Metadata } from 'next';

const siteUrl = 'https://bleep-that-sht.com';

export const metadata: Metadata = {
  title: 'Bleep Your Audio & Video',
  description: 'Upload your MP3 or MP4 file, transcribe with AI, and censor any words with customizable bleep sounds. Process files up to 10 minutes entirely in your browser.',
  keywords: ['bleep audio', 'censor video', 'audio transcription', 'Whisper AI', 'word censorship'],
  openGraph: {
    title: 'Bleep Your Audio & Video | Bleep That Sh*t!',
    description: 'Upload your MP3 or MP4, transcribe with AI, and censor any words. 100% private browser processing.',
    url: `${siteUrl}/bleep`,
  },
  alternates: { canonical: `${siteUrl}/bleep` },
};

export default function BleepLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

### 4. Create Sampler Page Layout (`app/sampler/layout.tsx`) - NEW FILE

```typescript
import type { Metadata } from 'next';

const siteUrl = 'https://bleep-that-sht.com';

export const metadata: Metadata = {
  title: 'Transcription Sampler - Compare Whisper Models',
  description: 'Compare different Whisper AI transcription models on your audio samples. Test accuracy and speed to find the best model for your needs.',
  keywords: ['Whisper model comparison', 'transcription sampler', 'AI transcription test', 'speech to text'],
  openGraph: {
    title: 'Transcription Sampler - Compare Whisper Models | Bleep That Sh*t!',
    description: 'Compare different Whisper AI transcription models. Test accuracy and speed.',
    url: `${siteUrl}/sampler`,
  },
  alternates: { canonical: `${siteUrl}/sampler` },
};

export default function SamplerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

### 5. Create Open Graph Image

Create `public/og-image.png` (1200x630 pixels) with:

- Title: "Bleep That Sh\*t!"
- Tagline: "Free Audio & Video Censorship"
- Visual: Monkey emoji icon + audio waveform

## Files to Create/Modify

| File                     | Action                                      |
| ------------------------ | ------------------------------------------- |
| `app/layout.tsx`         | Modify - add comprehensive default metadata |
| `app/page.tsx`           | Modify - add metadata export                |
| `app/bleep/layout.tsx`   | Create - page-specific metadata             |
| `app/sampler/layout.tsx` | Create - page-specific metadata             |
| `public/og-image.png`    | Create - 1200x630 OG image                  |

## Testing

1. Build: `npm run build`
2. Validate with [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
3. Validate with [Twitter Card Validator](https://cards-dev.twitter.com/validator)
4. Check with browser DevTools (inspect `<head>` elements)
