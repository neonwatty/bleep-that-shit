# Premium Landing Page Implementation Plan

## Overview

Create a `/premium` landing page to measure user interest in premium features before building them. The page will highlight potential premium capabilities, capture email signups via a Google Form embed, and integrate with the existing app through strategic CTAs at key touchpoints.

### Goals
1. Validate demand for premium features through email capture
2. Gather user input on which features matter most
3. Establish a design pattern for future marketing pages
4. Track engagement via Google Analytics events

### Scope
- New page at `/premium` route
- Integration with 3-4 existing touchpoints
- Email capture via Google Form embed (no backend required)
- SEO-optimized with structured data

## Page Design

### Visual Style (matching existing editorial aesthetic)
- Use `editorial-section font-merriweather` container
- H1 with `font-inter` extrabold uppercase styling
- Section dividers: `<div className="mx-auto my-10 h-0.5 w-24 rounded bg-black md:w-40"></div>`
- Feature cards with gradient backgrounds (`bg-gradient-to-r from-yellow-100 to-pink-100`)
- Accent colors: yellow-400/500 for highlights, indigo-600 for CTAs
- Alert/info boxes with border-l-4 pattern

### Page Sections

1. **Hero Section**
   - Headline: "Unlock the Full Power of Bleep That Sh*t!"
   - Subheadline: "Process longer files, save projects, and more."
   - Yellow badge: "Coming Soon - Join the Waitlist"
   - Primary CTA button linking to email form section

2. **Current Limits vs Premium Comparison**
   - Two-column comparison table/cards
   - Free tier: 10-minute files, no saved projects, browser processing
   - Premium tier: Longer files, saved projects, batch processing, priority support

3. **Premium Features List**
   - **Longer Files**: Process videos up to 60+ minutes
   - **Saved Projects**: Return to previous work, re-edit transcripts
   - **Batch Processing**: Upload multiple files, queue processing
   - **API Access**: Integrate censoring into your workflow
   - **Team Features**: Shared wordsets, collaboration
   - **Priority Support**: Dedicated Discord channel, faster response

4. **Pricing Preview (Placeholder)**
   - "Pricing coming soon" message
   - Option to show placeholder tiers
   - Emphasize "Help us decide" and link to form

5. **Email Capture / Waitlist Form**
   - Google Form embed (iframe) for email capture
   - Fields: Email, "Which features interest you most?" (checkboxes)
   - Fallback link to open form in new tab

6. **FAQ Section**
   - "When will premium be available?"
   - "Will the free version still exist?"
   - "How will my data be handled?"
   - "Can I suggest features?"

7. **Community CTA**
   - Link to Discord for feature discussions
   - GitHub link for transparency

## Content Structure

### Metadata

**File: `app/premium/page.tsx`**

```typescript
export const metadata: Metadata = {
  title: 'Premium Features - Coming Soon',
  description:
    'Unlock longer file processing, saved projects, batch processing, and more. Join the waitlist for Bleep That Sh*t! Premium.',
  keywords: [
    'premium audio censorship',
    'long video censoring',
    'batch audio processing',
    'professional video bleeping',
    'audio censorship API',
  ],
  openGraph: {
    title: 'Premium Features Coming Soon | Bleep That Sh*t!',
    description:
      'Process longer files, save projects, and access advanced features. Join the waitlist today.',
    url: `${SITE_URL}/premium`,
    type: 'website',
  },
  alternates: {
    canonical: `${SITE_URL}/premium`,
  },
};
```

### Structured Data Schema

**File: `lib/constants/structuredData.ts`**

```typescript
export const premiumPageFAQItems: FAQItem[] = [
  {
    question: 'When will Bleep That Sh*t! Premium be available?',
    answer: 'We are currently gauging interest. Join the waitlist to be notified when premium features launch.',
  },
  {
    question: 'Will the free version still be available?',
    answer: 'Yes! The free version with 10-minute file support will remain available. Premium adds extended capabilities.',
  },
  {
    question: 'What payment methods will be accepted?',
    answer: 'We plan to accept major credit cards via Stripe. Final payment options will be announced at launch.',
  },
  {
    question: 'Can I suggest premium features?',
    answer: 'Absolutely! Join our Discord community or fill out the waitlist form to share your feature requests.',
  },
];
```

### External Links Addition

**File: `lib/constants/externalLinks.ts`**

```typescript
// Premium waitlist Google Form
export const PREMIUM_WAITLIST_FORM_URL = 'https://forms.gle/[NEW_FORM_ID]';
```

## Implementation Steps

### Phase 1: Core Page Setup

1. **Create page file**: `app/premium/page.tsx`
2. **Add structured data exports** to `lib/constants/structuredData.ts`
3. **Add external link constant** to `lib/constants/externalLinks.ts`
4. **Create Google Form** for email capture

### Phase 2: Page Content Implementation

5. **Build page sections** in order:
   - Hero with headline, badges, and CTA
   - Free vs Premium comparison grid
   - Feature cards (6 premium features)
   - Pricing placeholder
   - Google Form embed (with fallback link)
   - FAQ accordion (using existing pattern from homepage)
   - Discord/community CTA

6. **Add analytics tracking**:
   - Page view tracking (automatic via GA)
   - Custom events for form interactions
   - Track CTA clicks from different sources

### Phase 3: Integration Points

7. **Update FileUpload.tsx** (10-minute limit warning):
   ```tsx
   <a
     href="/premium"
     className="mt-1 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800"
     onClick={() => trackEvent('premium_cta_clicked', { location: 'file_duration_warning' })}
   >
     Need longer files? Learn about Premium
   </a>
   ```

8. **Update BleepDownloadTab.tsx** (download success):
   ```tsx
   <div className="mt-4 rounded border-l-4 border-indigo-400 bg-indigo-50 p-3">
     <p className="text-sm text-indigo-900">
       <strong>Want more?</strong> Premium features are coming soon -
       longer files, saved projects, and more.
     </p>
     <Link
       href="/premium"
       className="mt-2 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800"
       onClick={() => trackEvent('premium_cta_clicked', { location: 'download_success' })}
     >
       Join the Waitlist →
     </Link>
   </div>
   ```

9. **Update Footer.tsx** - Add premium icon link:
   ```tsx
   <Link
     href="/premium"
     className="text-gray-700 transition-colors hover:text-black"
     aria-label="Premium features"
   >
     <i className="fas fa-crown text-2xl"></i>
   </Link>
   ```

10. **Update homepage** (`app/page.tsx`) - Make 10-min badge clickable:
    ```tsx
    <Link
      href="/premium"
      className="inline-block rounded-full bg-blue-200 px-4 py-2 font-semibold transition-all hover:bg-blue-300"
    >
      ⏱️ Currently supports files up to 10 minutes
    </Link>
    ```

11. **Update MobileNav.tsx** (optional) - Add menu item:
    ```tsx
    <Link
      href="/premium"
      onClick={closeMenu}
      className="block rounded-lg bg-gradient-to-r from-yellow-400 to-orange-400 px-4 py-3 text-white"
    >
      <div className="flex items-center">
        <span className="mr-3 text-2xl">👑</span>
        <div>
          <span className="font-semibold">Premium</span>
          <span className="ml-2 rounded bg-white/20 px-2 py-0.5 text-xs">Coming Soon</span>
        </div>
      </div>
    </Link>
    ```

### Phase 4: Testing

12. **Add E2E tests** in `tests/e2e/premium-page.spec.ts`:
    - Page loads correctly
    - All sections render
    - Form embed is accessible
    - Navigation links work
    - Mobile responsive

## SEO Considerations

### On-Page SEO
- **Title**: "Premium Features - Coming Soon | Bleep That Sh*t!"
- **Meta description**: Focus on benefits (longer files, saved projects)
- **H1**: Single, clear headline about premium features
- **Internal linking**: Links from homepage, /bleep, footer
- **Canonical URL**: `https://bleepthatshit.com/premium`

### Structured Data
- WebPage schema linking to main site
- FAQPage schema for premium FAQ items
- Breadcrumb schema: Home > Premium

## GA Tracking Events

| Event Name | Parameters | Trigger |
|------------|------------|---------|
| `premium_page_view` | `source` | Page load |
| `premium_cta_clicked` | `location` | CTA click from any integration point |
| `premium_form_started` | - | User starts interacting with form |
| `premium_form_submitted` | `features_selected[]` | Form submission |
| `premium_faq_expanded` | `question` | FAQ accordion opened |

## Success Metrics

### Primary Metrics
1. **Waitlist signups**: Number of email captures via Google Form
2. **Page visits**: Unique visitors to /premium
3. **Conversion rate**: Signups / Visitors

### Secondary Metrics
1. **Traffic sources**: Which integration points drive most traffic
2. **Feature interest**: Which checkbox options are most selected
3. **Time on page**: Engagement indicator
4. **FAQ engagement**: Which questions are most viewed

## File Structure Summary

```
app/
├── premium/
│   └── page.tsx            # NEW: Premium landing page

lib/constants/
├── structuredData.ts       # UPDATE: Add premium schemas
└── externalLinks.ts        # UPDATE: Add waitlist form URL

components/
├── FileUpload.tsx          # UPDATE: Add premium link
├── Footer.tsx              # UPDATE: Add premium icon link
└── MobileNav.tsx           # UPDATE: Add premium menu item (optional)

app/bleep/components/
└── BleepDownloadTab.tsx    # UPDATE: Add premium upsell

app/
└── page.tsx                # UPDATE: Make 10-min badge clickable

tests/e2e/
└── premium-page.spec.ts    # NEW: E2E tests
```

## Critical Files

- `app/page.tsx` - Pattern reference for page structure and JsonLd usage
- `lib/constants/structuredData.ts` - Add new schema definitions
- `components/FileUpload.tsx` - Primary integration point for 10-min limit upsell
- `app/bleep/components/BleepDownloadTab.tsx` - Integration point for download success upsell
- `lib/constants/externalLinks.ts` - Add the Google Form URL constant
