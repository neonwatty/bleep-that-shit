# Bleep That Sh\*t - Premium Interest CTA Implementation Plan

## Overview

Add a "Premium Interest" CTA (Call-to-Action) after successful downloads in the Bleep That Sh\*t application. The goal is to measure user interest in a premium/full-stack offering before investing in paid advertising. This CTA will **replace** the existing feedback CTA as the primary post-download call-to-action.

### Business Context

- **Goal**: Gauge interest in premium features before ad spend
- **Target Audience**: Users who have successfully completed the bleeping workflow (highest engagement point)
- **Metric**: Track CTA impressions, clicks, and form submissions

## Prerequisites

1. **Premium Landing Page**: The `/premium` page must exist (see Plan 04)
2. **GA4 Setup**: Existing Google Analytics integration (already in place)
3. **No backend changes required**: Pure frontend implementation

## Implementation Steps

### Step 1: Add Premium CTA Component (Replaces Feedback CTA)

**File**: `app/bleep/components/BleepDownloadTab.tsx`

**Remove** the existing Feedback CTA (lines 193-208) and **replace** it with the Premium CTA. The CTA should:

- Use a violet color scheme
- Include a fade-in animation
- Be dismissible with state persisted to localStorage
- Include a brief privacy notice

```tsx
import { useState, useEffect } from 'react';

// Inside the component, add state for dismissal
const [isPremiumCtaDismissed, setIsPremiumCtaDismissed] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('premium_cta_dismissed') === 'true';
  }
  return false;
});

const handleDismissPremiumCta = () => {
  setIsPremiumCtaDismissed(true);
  localStorage.setItem('premium_cta_dismissed', 'true');
  trackEvent('premium_cta_dismissed', {
    location: 'download_success',
  });
};
```

**Required Import** (add at top of file):

```tsx
import Link from 'next/link';
```

**CTA JSX** (replaces the Feedback CTA block):

```tsx
{
  /* Premium Interest CTA */
}
{
  !isPremiumCtaDismissed && (
    <div
      data-testid="premium-cta"
      className="animate-fade-in mt-4 rounded border-l-4 border-violet-400 bg-violet-50 p-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-violet-900">
            <strong>Want more power?</strong> We&apos;re exploring premium features like longer
            files, faster processing, and saved projects.
          </p>
          <Link
            href="/premium"
            className="mt-2 inline-block rounded bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
            onClick={() =>
              trackEvent('premium_cta_clicked', {
                location: 'download_success',
                file_type: file?.type.includes('video') ? 'video' : 'audio',
              })
            }
          >
            Learn About Premium →
          </Link>
        </div>
        <button
          onClick={handleDismissPremiumCta}
          className="ml-2 text-violet-400 hover:text-violet-600"
          aria-label="Dismiss premium prompt"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
```

### Step 4: Add Fade-In Animation

**File**: `app/globals.css` (or Tailwind config)

Add the fade-in animation class:

```css
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
```

**Alternative**: Add to `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
};
```

### Step 5: Track CTA Impressions (Optional)

**Option A: Track on render (requires hooks)**

```tsx
useEffect(() => {
  if (censoredMediaUrl && !isPremiumCtaDismissed) {
    trackEvent('premium_cta_impression', {
      location: 'download_success',
      file_type: file?.type.includes('video') ? 'video' : 'audio',
    });
  }
}, [censoredMediaUrl, isPremiumCtaDismissed]);
```

**Option B: Click tracking only (recommended for simplicity)**

Skip impression tracking and focus on click-through rate relative to downloads. Calculate: `CTR = premium_cta_clicked / download_censored_file`

## Code Changes Summary

### Files to Modify

| File                                             | Changes                                                              |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| `app/bleep/components/BleepDownloadTab.tsx`      | Remove Feedback CTA, add Premium CTA with dismissibility and fade-in |
| `app/globals.css` or `tailwind.config.js`        | Add fade-in animation                                                |
| `app/bleep/components/BleepDownloadTab.test.tsx` | Update tests: remove Feedback CTA tests, add Premium CTA tests       |
| `tests/*.spec.ts`                                | Update E2E tests to verify Premium CTA behavior                      |

### New Google Analytics Events

| Event Name               | Parameters                                                      | When Fired                                 |
| ------------------------ | --------------------------------------------------------------- | ------------------------------------------ |
| `premium_cta_clicked`    | `location: 'download_success'`, `file_type: 'audio' \| 'video'` | User clicks "Learn About Premium" link     |
| `premium_cta_dismissed`  | `location: 'download_success'`                                  | User clicks dismiss button                 |
| `premium_cta_impression` | (optional) `location`, `file_type`                              | CTA becomes visible after successful bleep |

## Testing

### Unit Tests

Update `app/bleep/components/BleepDownloadTab.test.tsx`:

```typescript
describe('Premium CTA', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows premium CTA when censored result is available', () => {
    const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
    render(
      <BleepDownloadTab {...defaultProps} file={mockFile} censoredMediaUrl="blob:test-url" />
    );

    expect(screen.getByText(/Want more power\?/)).toBeInTheDocument();
    expect(
      screen.getByText(/premium features like longer files/)
    ).toBeInTheDocument();
  });

  it('renders premium link pointing to /premium page', () => {
    const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
    render(
      <BleepDownloadTab {...defaultProps} file={mockFile} censoredMediaUrl="blob:test-url" />
    );

    const premiumLink = screen.getByRole('link', { name: /Learn About Premium/i });
    expect(premiumLink).toBeInTheDocument();
    expect(premiumLink).toHaveAttribute('href', '/premium');
  });

  it('does not show premium CTA when no censored result', () => {
    render(<BleepDownloadTab {...defaultProps} censoredMediaUrl={null} />);
    expect(screen.queryByText(/Want more power\?/)).not.toBeInTheDocument();
  });

  it('tracks premium CTA click event', () => {
    const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
    const mockGtag = vi.fn();
    window.gtag = mockGtag;

    render(
      <BleepDownloadTab {...defaultProps} file={mockFile} censoredMediaUrl="blob:test-url" />
    );

    const premiumLink = screen.getByRole('link', { name: /Learn About Premium/i });
    fireEvent.click(premiumLink);

    expect(mockGtag).toHaveBeenCalledWith('event', 'premium_cta_clicked', {
      location: 'download_success',
      file_type: 'audio',
    });
  });

  it('can be dismissed and persists to localStorage', () => {
    const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
    render(
      <BleepDownloadTab {...defaultProps} file={mockFile} censoredMediaUrl="blob:test-url" />
    );

    const dismissButton = screen.getByLabelText(/Dismiss premium prompt/i);
    fireEvent.click(dismissButton);

    expect(screen.queryByText(/Want more power\?/)).not.toBeInTheDocument();
    expect(localStorage.getItem('premium_cta_dismissed')).toBe('true');
  });

  it('does not show CTA if previously dismissed', () => {
    localStorage.setItem('premium_cta_dismissed', 'true');
    const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });

    render(
      <BleepDownloadTab {...defaultProps} file={mockFile} censoredMediaUrl="blob:test-url" />
    );

    expect(screen.queryByText(/Want more power\?/)).not.toBeInTheDocument();
  });

  it('does not show old feedback CTA', () => {
    const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
    render(
      <BleepDownloadTab {...defaultProps} file={mockFile} censoredMediaUrl="blob:test-url" />
    );

    expect(screen.queryByText(/Was this helpful\?/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Share Quick Feedback/)).not.toBeInTheDocument();
  });
});
```

### E2E Tests

#### Step 1: Update BleepPage Page Object

**File**: `tests/helpers/pages/BleepPage.ts`

Add Premium CTA locators to the constructor:

```typescript
// In the constructor, add these locators:

// Premium CTA Elements
readonly premiumCta: Locator;
readonly premiumCtaLink: Locator;
readonly premiumCtaDismiss: Locator;

// In constructor body:
this.premiumCta = page.getByTestId('premium-cta');
this.premiumCtaLink = page.getByRole('link', { name: /Learn About Premium/i });
this.premiumCtaDismiss = page.getByLabel('Dismiss premium prompt');
```

Add helper methods:

```typescript
/**
 * Dismiss the Premium CTA
 */
async dismissPremiumCta() {
  await this.premiumCtaDismiss.click();
}

/**
 * Verify Premium CTA is visible
 */
async expectPremiumCtaVisible() {
  await expect(this.premiumCta).toBeVisible();
  await expect(this.premiumCtaLink).toBeVisible();
}

/**
 * Verify Premium CTA is not visible
 */
async expectPremiumCtaNotVisible() {
  await expect(this.premiumCta).not.toBeVisible();
}

/**
 * Complete a minimal workflow to get censored result (uses manual timeline, no transcription)
 * This is faster than full transcription workflow
 */
async completeFastWorkflow(filePath: string) {
  // Upload file
  await this.uploadFile(filePath);
  await expect(this.audioPlayer).toBeVisible({ timeout: 10000 });

  // Add manual censor via timeline (no transcription needed)
  await this.switchToTimelineSection();
  await expect(this.timelineBar).toBeVisible({ timeout: 10000 });
  await this.createTimelineSegment(10, 30);

  // Switch to bleep tab and apply
  await this.switchToBleepTab();
  await this.applyBleepsAndWait({ timeout: 60000 });
}
```

#### Step 2: Add data-testid to Premium CTA Component

**File**: `app/bleep/components/BleepDownloadTab.tsx`

Ensure the Premium CTA div has a testid:

```tsx
{
  /* Premium Interest CTA */
}
{
  !isPremiumCtaDismissed && (
    <div
      data-testid="premium-cta"
      className="animate-fade-in mt-4 rounded border-l-4 border-violet-400 bg-violet-50 p-3"
    >
      {/* ... rest of CTA ... */}
    </div>
  );
}
```

#### Step 3: Create E2E Test File

**File**: `tests/premium-cta.spec.ts` (new file)

```typescript
import { test, expect } from '@playwright/test';
import { BleepPage } from './helpers';
import path from 'path';

// Use short-test.mp3 for faster processing
const TEST_AUDIO_PATH = path.join(__dirname, 'fixtures/files/short-test.mp3');

test.describe('Premium CTA', () => {
  let bleepPage: BleepPage;

  test.beforeEach(async ({ page, context }) => {
    // Clear localStorage before each test to reset CTA dismissed state
    await context.addInitScript(() => {
      localStorage.clear();
    });

    bleepPage = new BleepPage(page);
    await bleepPage.goto();
  });

  test.describe('CTA Visibility', () => {
    test('does not show premium CTA before censored result', async ({ page }) => {
      // Just upload a file, don't complete workflow
      await bleepPage.uploadFile(TEST_AUDIO_PATH);
      await expect(bleepPage.audioPlayer).toBeVisible({ timeout: 10000 });

      // Premium CTA should not be visible
      await bleepPage.expectPremiumCtaNotVisible();
    });

    test('shows premium CTA after successful bleep', async ({ page }) => {
      // Complete workflow to get censored result
      await bleepPage.completeFastWorkflow(TEST_AUDIO_PATH);

      // Verify censored result is visible
      await bleepPage.expectCensoredResultVisible();

      // Verify Premium CTA appears
      await bleepPage.expectPremiumCtaVisible();
      await expect(page.getByText('Want more power?')).toBeVisible();
    });

    test('does not show old feedback CTA', async ({ page }) => {
      await bleepPage.completeFastWorkflow(TEST_AUDIO_PATH);

      // Old feedback CTA text should not appear
      await expect(page.getByText('Was this helpful?')).not.toBeVisible();
      await expect(page.getByText('Share Quick Feedback')).not.toBeVisible();
    });
  });

  test.describe('CTA Link', () => {
    test('premium CTA link points to /premium page', async ({ page }) => {
      await bleepPage.completeFastWorkflow(TEST_AUDIO_PATH);

      // Verify link points to internal premium page
      await expect(bleepPage.premiumCtaLink).toHaveAttribute('href', '/premium');
    });

    test('clicking premium CTA navigates to /premium', async ({ page }) => {
      await bleepPage.completeFastWorkflow(TEST_AUDIO_PATH);

      // Click the link
      await bleepPage.premiumCtaLink.click();

      // Verify navigation
      await expect(page).toHaveURL(/\/premium/);
    });
  });

  test.describe('CTA Dismissal', () => {
    test('premium CTA can be dismissed', async ({ page }) => {
      await bleepPage.completeFastWorkflow(TEST_AUDIO_PATH);

      // Verify CTA is visible
      await bleepPage.expectPremiumCtaVisible();

      // Dismiss the CTA
      await bleepPage.dismissPremiumCta();

      // Verify it's hidden
      await bleepPage.expectPremiumCtaNotVisible();
    });

    test('dismissed CTA persists to localStorage', async ({ page }) => {
      await bleepPage.completeFastWorkflow(TEST_AUDIO_PATH);
      await bleepPage.dismissPremiumCta();

      // Check localStorage
      const dismissed = await page.evaluate(() => localStorage.getItem('premium_cta_dismissed'));
      expect(dismissed).toBe('true');
    });

    test('dismissed CTA stays hidden after page reload', async ({ page }) => {
      await bleepPage.completeFastWorkflow(TEST_AUDIO_PATH);
      await bleepPage.dismissPremiumCta();

      // Reload the page
      await page.reload();

      // Complete workflow again
      await bleepPage.completeFastWorkflow(TEST_AUDIO_PATH);

      // CTA should still be hidden
      await bleepPage.expectPremiumCtaNotVisible();
    });

    test('dismissed CTA stays hidden in new browser context with persisted storage', async ({
      browser,
    }) => {
      // This test verifies localStorage persistence across sessions
      // Create first context
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();
      const bleepPage1 = new BleepPage(page1);

      await bleepPage1.goto();
      await bleepPage1.completeFastWorkflow(TEST_AUDIO_PATH);
      await bleepPage1.dismissPremiumCta();

      // Get storage state
      const storageState = await context1.storageState();
      await context1.close();

      // Create new context with same storage
      const context2 = await browser.newContext({ storageState });
      const page2 = await context2.newPage();
      const bleepPage2 = new BleepPage(page2);

      await bleepPage2.goto();
      await bleepPage2.completeFastWorkflow(TEST_AUDIO_PATH);

      // CTA should still be hidden
      await bleepPage2.expectPremiumCtaNotVisible();
      await context2.close();
    });
  });

  test.describe('Visual & Animation', () => {
    test('premium CTA has fade-in animation class', async ({ page }) => {
      await bleepPage.completeFastWorkflow(TEST_AUDIO_PATH);

      // Verify the animation class is present
      await expect(bleepPage.premiumCta).toHaveClass(/animate-fade-in/);
    });
  });
});

test.describe('Premium CTA - Video Files', () => {
  const TEST_VIDEO_PATH = path.join(__dirname, 'fixtures/files/test.mp4');

  test('shows premium CTA after bleeping video file', async ({ page }) => {
    const bleepPage = new BleepPage(page);
    await bleepPage.goto();

    // Upload video file
    await bleepPage.uploadFile(TEST_VIDEO_PATH);
    await expect(bleepPage.videoPlayer).toBeVisible({ timeout: 15000 });

    // Add manual censor
    await bleepPage.switchToTimelineSection();
    await expect(bleepPage.timelineBar).toBeVisible({ timeout: 10000 });
    await bleepPage.createTimelineSegment(10, 30);

    // Apply bleeps (video processing takes longer)
    await bleepPage.switchToBleepTab();
    await bleepPage.applyBleepsAndWait({ timeout: 120000 });

    // Verify Premium CTA appears
    await expect(page.getByTestId('premium-cta')).toBeVisible();
    await expect(page.getByRole('link', { name: /Learn About Premium/i })).toBeVisible();
  });
});
```

### Manual Testing Checklist

- [ ] Premium CTA appears after applying bleeps (both audio and video)
- [ ] CTA has smooth fade-in animation
- [ ] CTA link navigates to `/premium` page
- [ ] CTA does not appear before censored result is available
- [ ] Dismiss button hides the CTA
- [ ] Dismissed state persists across page reloads
- [ ] Dismissed state persists across browser sessions
- [ ] CTA styling is consistent across mobile and desktop
- [ ] GA events fire correctly (check GA4 Realtime):
  - [ ] `premium_cta_clicked` on link click
  - [ ] `premium_cta_dismissed` on dismiss
- [ ] Old feedback CTA is no longer visible

## Success Metrics

| Metric                  | Calculation                                         | Target |
| ----------------------- | --------------------------------------------------- | ------ |
| CTA Click Rate          | `premium_cta_clicked / download_censored_file`      | > 5%   |
| Premium Page Conversion | `/premium` form submissions / `premium_cta_clicked` | > 20%  |
| Dismiss Rate            | `premium_cta_dismissed / premium_cta_impression`    | < 50%  |

### GA4 Custom Report Setup

1. Navigate to GA4 > Explore > Create New Report
2. Add dimensions: `event_name`, `file_type`
3. Add metrics: `event_count`
4. Filter: `event_name` contains `premium_cta` or `download_censored_file`

## Rollback Plan

If CTA negatively impacts user experience:

1. Remove the Premium CTA JSX block from BleepDownloadTab.tsx
2. Restore the original Feedback CTA
3. Remove associated tests

## Critical Files

| File                                             | Changes                                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `app/bleep/components/BleepDownloadTab.tsx`      | Replace Feedback CTA with Premium CTA (dismissible, animated, links to `/premium`) |
| `app/globals.css` or `tailwind.config.js`        | Add `animate-fade-in` animation                                                    |
| `app/bleep/components/BleepDownloadTab.test.tsx` | Update unit tests for Premium CTA                                                  |
| `tests/helpers/pages/BleepPage.ts`               | Add Premium CTA locators and helper methods                                        |
| `tests/premium-cta.spec.ts`                      | New E2E test file (11 tests)                                                       |

## Dependencies

This plan requires **Plan 04 (Premium Landing Page)** to be implemented first, as the CTA links to `/premium`.
