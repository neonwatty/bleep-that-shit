# Premium Landing Page Implementation Plan

## Overview

Create a `/premium` landing page to measure user interest in premium features before building them. The page will highlight potential premium capabilities, link to a Google Form waitlist, and integrate with the existing app through strategic CTAs at key touchpoints.

### Goals
1. Validate demand for premium features through waitlist signups
2. Gather user input on which features matter most
3. Track engagement via Google Analytics events

### Scope
- New page at `/premium` route
- Link to external Google Form for waitlist capture
- SEO-optimized with structured data

### Dependencies
- **Google Form**: Already created at `https://docs.google.com/forms/d/e/1FAIpQLSfsLPN_1a6NZlLSaaYz6DcsVPU85ZIcqFMV9-pygbRyF_XHyg/viewform`
- **Mock-up**: Approved design at `mock-ups/premium-landing.html`

## Page Design

### Visual Style (Dark Mode Premium Aesthetic)
- **Background**: Black (`bg-black`) with gray-950 section variants
- **Typography**: Inter for headlines (font-black uppercase), Merriweather for body
- **Accents**: Indigo → Purple → Pink gradient palette
- **Feature cards**: Gradient borders with black interior
- **Hero**: Split layout with bold stacked gradient text

### Page Sections

1. **Hero Section (Split Layout)**
   - Left side: Bold stacked typography "Bleep Faster. Longer. Smarter."
   - Right side: Feature cards with gradient borders
   - "Coming Soon" badge
   - Two CTAs: "Join Waitlist" and "See Features"

2. **Stats Bar**
   - Gradient background (indigo → purple)
   - 4 stats: 10K+ Files Processed, 500+ Discord Members, 100% Privacy First, 10x Faster (Premium)

3. **Use Cases Section ("Built For Creators")**
   - Alternating layout with large emoji icons
   - 4 personas: Teachers, Podcasters, YouTubers, Production Teams
   - Each with description and testimonial quote

4. **Free vs Premium Comparison**
   - Two-column minimal list
   - Free Forever: 10 min files, browser processing, 100% private, save wordsets
   - Premium Adds: 2+ hour files, 10x faster server processing, saved projects, project history, team features

5. **Waitlist CTA Section**
   - Large "Get Early Access" headline
   - 50% off for 3 months messaging
   - Button linking to Google Form
   - "Free version stays free forever" reassurance

6. **Footer**
   - Back to main app link
   - Discord link

## Content Structure

### External Links

**File: `lib/constants/externalLinks.ts`**

```typescript
// Premium waitlist Google Form
export const PREMIUM_WAITLIST_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfsLPN_1a6NZlLSaaYz6DcsVPU85ZIcqFMV9-pygbRyF_XHyg/viewform';
```

### Metadata

**File: `app/premium/page.tsx`**

```typescript
export const metadata: Metadata = {
  title: 'Premium Features - Coming Soon | Bleep That Sh*t!',
  description:
    'Process 2+ hour files with 10x faster server-side processing. Save projects, re-edit anytime. Join the waitlist for early access.',
  keywords: [
    'premium audio censorship',
    'long video censoring',
    'server-side transcription',
    'professional video bleeping',
    'saved projects',
  ],
  openGraph: {
    title: 'Bleep That Sh*t! Premium - Coming Soon',
    description:
      'Process 2+ hour files 10x faster. Save projects. Team features. Join the waitlist for 50% off.',
    url: `${SITE_URL}/premium`,
    type: 'website',
  },
  alternates: {
    canonical: `${SITE_URL}/premium`,
  },
};

## Full Page Component

**File: `app/premium/page.tsx`**

```tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { PREMIUM_WAITLIST_FORM_URL } from '@/lib/constants/externalLinks';
import { DISCORD_INVITE_URL } from '@/lib/constants/externalLinks';
import { SITE_URL } from '@/lib/constants/siteMetadata';
import { trackEvent } from '@/lib/analytics';

export const metadata: Metadata = {
  title: 'Premium Features - Coming Soon | Bleep That Sh*t!',
  description:
    'Process 2+ hour files with 10x faster server-side processing. Save projects, re-edit anytime. Join the waitlist for early access.',
  openGraph: {
    title: 'Bleep That Sh*t! Premium - Coming Soon',
    description:
      'Process 2+ hour files 10x faster. Save projects. Team features. Join the waitlist for 50% off.',
    url: `${SITE_URL}/premium`,
    type: 'website',
  },
  alternates: {
    canonical: `${SITE_URL}/premium`,
  },
};

const features = [
  { emoji: '⚡', title: '10x Faster Processing', description: 'Server-side OpenAI Whisper API' },
  { emoji: '⏱️', title: '2+ Hour Files', description: 'No more 10-minute limits' },
  { emoji: '💾', title: 'Saved Projects', description: 'Pick up where you left off' },
  { emoji: '🔄', title: 'Project History', description: 'Re-edit and re-export anytime' },
];

const useCases = [
  {
    emoji: '👩‍🏫',
    title: 'Teachers & Educators',
    description: 'Show real-world content in your classroom without worrying about inappropriate language.',
    quote: '"I use documentaries in my history class but had to skip certain clips. Now I can show the full video."',
    color: 'blue',
  },
  {
    emoji: '🎙️',
    title: 'Podcasters',
    description: 'Create ad-friendly versions of your 2+ hour episodes in minutes instead of hours.',
    quote: '"Our interviews get heated sometimes. Now I can quickly make a clean version for YouTube."',
    color: 'purple',
  },
  {
    emoji: '🎬',
    title: 'YouTube Creators',
    description: 'Keep your videos monetization-safe without losing authenticity or spending hours editing.',
    quote: '"My gaming videos always had slip-ups. Now I bleep them out in minutes."',
    color: 'red',
  },
  {
    emoji: '👥',
    title: 'Production Teams',
    description: 'Standardize censoring across your team with shared wordsets and project collaboration.',
    quote: '"We process client videos daily. Shared wordsets mean everyone uses the same standards."',
    color: 'green',
  },
];

export default function PremiumPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero - Split Layout */}
      <section className="flex min-h-screen flex-col lg:flex-row">
        {/* Left: Typography */}
        <div className="relative flex flex-1 flex-col justify-center px-8 py-16 lg:px-16">
          {/* Gradient orb */}
          <div className="absolute left-0 top-20 h-96 w-96 rounded-full bg-indigo-600 opacity-20 blur-[180px]" />

          <div className="relative z-10">
            <span className="mb-6 inline-block rounded bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              Coming Soon
            </span>

            <h1 className="font-inter font-black uppercase leading-[0.85] tracking-tight">
              <span className="block text-5xl md:text-7xl lg:text-8xl">Bleep</span>
              <span className="block bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-5xl text-transparent md:text-7xl lg:text-8xl">
                Faster.
              </span>
              <span className="block bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-5xl text-transparent md:text-7xl lg:text-8xl">
                Longer.
              </span>
              <span className="block bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-5xl text-transparent md:text-7xl lg:text-8xl">
                Smarter.
              </span>
            </h1>

            <p className="mt-8 max-w-md font-merriweather text-xl text-gray-400">
              Premium unlocks server-powered processing, 2+ hour files, and saved projects.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="#waitlist"
                className="inline-block bg-white px-8 py-4 text-center text-lg font-bold text-black transition-all hover:bg-gray-100"
                onClick={() => trackEvent('premium_cta_clicked', { location: 'hero' })}
              >
                Join Waitlist →
              </a>
              <a
                href="#features"
                className="inline-block border border-gray-700 px-8 py-4 text-center text-lg font-bold transition-all hover:bg-white/5"
              >
                See Features
              </a>
            </div>
          </div>
        </div>

        {/* Right: Feature Stack */}
        <div className="flex flex-1 items-center justify-center bg-gray-950/50 px-8 py-16 lg:px-16">
          <div className="w-full max-w-md space-y-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[2px]"
              >
                <div className="flex items-center gap-4 rounded-xl bg-black p-6">
                  <div className="text-4xl">{feature.emoji}</div>
                  <div>
                    <h3 className="font-inter text-lg font-bold">{feature.title}</h3>
                    <p className="text-sm text-gray-500">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
            <div className="pt-4 text-center">
              <p className="text-sm text-gray-600">+ Team sharing, priority support, and more</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            <div>
              <div className="text-3xl font-black md:text-4xl">10K+</div>
              <div className="text-sm text-white/70">Files Processed</div>
            </div>
            <div>
              <div className="text-3xl font-black md:text-4xl">500+</div>
              <div className="text-sm text-white/70">Discord Members</div>
            </div>
            <div>
              <div className="text-3xl font-black md:text-4xl">100%</div>
              <div className="text-sm text-white/70">Privacy First</div>
            </div>
            <div>
              <div className="text-3xl font-black md:text-4xl">10x</div>
              <div className="text-sm text-white/70">Faster (Premium)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="features" className="bg-black px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center font-inter text-3xl font-black uppercase md:text-5xl">
            Built For Creators
          </h2>
          <p className="mx-auto mb-16 max-w-xl text-center text-gray-500">
            Whether you&apos;re a teacher, podcaster, or content creator - premium gives you the tools to work faster.
          </p>

          <div className="space-y-16">
            {useCases.map((useCase, index) => (
              <div
                key={useCase.title}
                className={`flex flex-col items-center gap-8 ${
                  index % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'
                }`}
              >
                <div
                  className={`flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-br border-${useCase.color}-500/30 from-${useCase.color}-500/20 to-${useCase.color}-600/10`}
                >
                  <span className="text-6xl">{useCase.emoji}</span>
                </div>
                <div className={index % 2 === 1 ? 'md:text-right' : ''}>
                  <h3 className="mb-2 font-inter text-2xl font-bold uppercase">{useCase.title}</h3>
                  <p className="mb-3 font-merriweather text-lg text-gray-400">{useCase.description}</p>
                  <p className={`text-sm italic text-${useCase.color}-400`}>{useCase.quote}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free vs Premium Comparison */}
      <section className="bg-gray-950 px-4 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-12 font-inter text-3xl font-black uppercase">Free Stays Free</h2>

          <div className="grid gap-8 text-left md:grid-cols-2">
            <div>
              <h3 className="mb-4 font-inter text-lg font-bold uppercase text-gray-500">Free Forever</h3>
              <ul className="space-y-3 text-gray-400">
                <li>✓ 10 minute files</li>
                <li>✓ Browser processing</li>
                <li>✓ 100% private</li>
                <li>✓ Save wordsets locally</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 font-inter text-lg font-bold uppercase text-indigo-400">Premium Adds</h3>
              <ul className="space-y-3">
                <li>✓ 2+ hour files</li>
                <li>✓ 10x faster server processing</li>
                <li>✓ Saved projects</li>
                <li>✓ Project history & re-export</li>
                <li>✓ Team features</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist CTA */}
      <section id="waitlist" className="relative overflow-hidden bg-black px-4 py-24">
        {/* Gradient background */}
        <div className="absolute bottom-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 transform rounded-full bg-gradient-to-t from-indigo-600/20 to-transparent blur-3xl" />

        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <h2 className="mb-8 font-inter text-5xl font-black uppercase leading-none md:text-7xl">
            Get
            <br />
            Early
            <br />
            Access
          </h2>
          <p className="mb-4 font-merriweather text-xl text-gray-400">
            Join the waitlist and lock in <span className="font-bold text-white">50% off</span> for 3 months.
          </p>
          <p className="mb-8 text-gray-600">Free version stays free forever. Premium is for power users.</p>
          <a
            href={PREMIUM_WAITLIST_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-12 py-5 text-xl font-bold shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 hover:from-indigo-500 hover:to-purple-500"
            onClick={() => trackEvent('premium_waitlist_clicked', { location: 'cta_section' })}
          >
            Join Premium Waitlist →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-900 bg-black px-4 py-8 text-center">
        <Link href="/" className="text-gray-500 transition-colors hover:text-white">
          ← Back to Bleep That Sh*t!
        </Link>
        <div className="mt-4">
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 transition-colors hover:text-indigo-400"
          >
            <i className="fab fa-discord text-xl" />
          </a>
        </div>
      </footer>
    </div>
  );
}
```

## Implementation Steps

### Phase 1: Core Setup

1. **Add external link constant** to `lib/constants/externalLinks.ts`:
   ```typescript
   export const PREMIUM_WAITLIST_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfsLPN_1a6NZlLSaaYz6DcsVPU85ZIcqFMV9-pygbRyF_XHyg/viewform';
   ```

2. **Create page file** `app/premium/page.tsx` with the component above

3. **Add analytics event** to `lib/analytics.ts` if not already present:
   - `premium_cta_clicked` with `location` parameter
   - `premium_waitlist_clicked` with `location` parameter

### Phase 2: Integration Points (handled by Plan 02)

4. **Update BleepDownloadTab.tsx** - Add premium CTA after successful download (see Plan 02 for details)

### Phase 3: Testing

5. **Add E2E tests** in `tests/premium-page.spec.ts`:
   - Page loads at /premium route
   - All sections render (hero, stats, use cases, comparison, CTA)
   - Waitlist button links to Google Form
   - Back to home link works
   - Discord link is present
    - Navigation links work
    - Mobile responsive

## GA Tracking Events

| Event Name | Parameters | Trigger |
|------------|------------|---------|
| `premium_cta_clicked` | `location` | CTA click (hero, download_success) |
| `premium_waitlist_clicked` | `location` | Waitlist button click |

## Success Metrics

### Primary Metrics
1. **Waitlist signups**: Number of email captures via Google Form
2. **Page visits**: Unique visitors to /premium
3. **Conversion rate**: Signups / Visitors

### Secondary Metrics
1. **Traffic sources**: Which integration points drive most traffic
2. **Feature interest**: Which checkbox options are most selected in form

## File Structure Summary

```
app/
├── premium/
│   └── page.tsx            # NEW: Premium landing page

lib/constants/
└── externalLinks.ts        # UPDATE: Add PREMIUM_WAITLIST_FORM_URL

app/bleep/components/
└── BleepDownloadTab.tsx    # UPDATE: Add premium CTA (see Plan 02)

tests/
└── premium-page.spec.ts    # NEW: E2E tests
```

## Notes

- The page uses a dark mode design that differs from the rest of the app - this is intentional to make it feel "premium"
- Dynamic Tailwind classes for colors (e.g., `text-${color}-400`) require the colors to be included in safelist or use static classes
- Consider adding the colors explicitly in the component if Tailwind purging removes them
