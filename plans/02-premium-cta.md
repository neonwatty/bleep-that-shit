# Bleep That Sh*t - Premium Interest CTA Implementation Plan

## Overview

Add a "Premium Interest" CTA (Call-to-Action) after successful downloads in the Bleep That Sh*t application. The goal is to measure user interest in a premium/full-stack offering before investing in paid advertising. This CTA will appear alongside the existing feedback CTA after users successfully download their censored media.

### Business Context
- **Goal**: Gauge interest in premium features before ad spend
- **Target Audience**: Users who have successfully completed the bleeping workflow (highest engagement point)
- **Metric**: Track CTA impressions, clicks, and form submissions

## Prerequisites

1. **Google Form**: Create a simple premium interest/waitlist form
2. **GA4 Setup**: Existing Google Analytics integration (already in place)
3. **No backend changes required**: Pure frontend implementation

## Implementation Steps

### Step 1: Create Google Form for Premium Waitlist

Create a Google Form with the following structure:

| Question | Type | Required |
|----------|------|----------|
| Email address | Short answer (email validation) | Yes |
| What features would you pay for? | Checkboxes | No |
| - Longer file support (over 10 minutes) | | |
| - Server-side processing (faster, no browser limits) | | |
| - Saved projects/history | | |
| - Team sharing/collaboration | | |
| - Transcript editing/export | | |
| - Other (please specify) | | |
| How much would you pay per month? | Multiple choice | No |
| - $5/month | | |
| - $10/month | | |
| - $15/month | | |
| - $20+/month | | |
| - Not interested in premium | | |
| What's your primary use case? | Short answer | No |

**Recommended Form Settings**:
- Collect email addresses: Yes
- Limit to 1 response: Yes (prevents spam)
- Confirmation message: "Thanks! We'll notify you when premium features launch."

### Step 2: Add External Link Constant

**File**: `lib/constants/externalLinks.ts`

Add a new constant for the premium waitlist form:

```typescript
// Premium feature interest/waitlist form
// Shown after successful export to gauge interest in paid features
export const PREMIUM_WAITLIST_URL = 'https://forms.gle/YOUR_FORM_ID_HERE';
```

### Step 3: Add Premium CTA Component

**File**: `app/bleep/components/BleepDownloadTab.tsx`

Add the Premium CTA immediately after the existing Feedback CTA (after line 208). The styling should use a purple/violet color scheme to differentiate from the yellow feedback CTA while maintaining consistency with the app's color palette.

```tsx
{/* Premium Interest CTA */}
<div className="mt-4 rounded border-l-4 border-violet-400 bg-violet-50 p-3">
  <p className="text-sm text-violet-900">
    <strong>Want more power?</strong> We&apos;re exploring premium features
    like longer files, faster processing, and saved projects.
  </p>
  <a
    href={PREMIUM_WAITLIST_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="mt-2 inline-block rounded bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
    onClick={() =>
      trackEvent('premium_cta_clicked', {
        location: 'download_success',
        file_type: file?.type.includes('video') ? 'video' : 'audio',
      })
    }
  >
    Join Premium Waitlist
  </a>
</div>
```

**Required Import Update** (line 6):

```typescript
import { FEEDBACK_FORM_URL, PREMIUM_WAITLIST_URL } from '@/lib/constants/externalLinks';
```

### Step 4: Track CTA Impressions (Optional)

**Option A: Track on render (requires hooks)**

```tsx
useEffect(() => {
  if (censoredMediaUrl) {
    trackEvent('premium_cta_impression', {
      location: 'download_success',
      file_type: file?.type.includes('video') ? 'video' : 'audio',
    });
  }
}, [censoredMediaUrl]);
```

**Option B: Click tracking only (recommended for simplicity)**

Skip impression tracking and focus on click-through rate relative to downloads. Calculate: `CTR = premium_cta_clicked / download_censored_file`

## Code Changes Summary

### Files to Modify

| File | Changes |
|------|---------|
| `lib/constants/externalLinks.ts` | Add `PREMIUM_WAITLIST_URL` constant |
| `app/bleep/components/BleepDownloadTab.tsx` | Add import, add Premium CTA JSX after Feedback CTA |
| `app/bleep/components/BleepDownloadTab.test.tsx` | Add tests for Premium CTA |

### New Google Analytics Events

| Event Name | Parameters | When Fired |
|------------|------------|------------|
| `premium_cta_clicked` | `location: 'download_success'`, `file_type: 'audio' \| 'video'` | User clicks "Join Premium Waitlist" button |
| `premium_cta_impression` | (optional) `location`, `file_type` | CTA becomes visible after successful bleep |

## Testing

### Unit Tests

Add tests to `app/bleep/components/BleepDownloadTab.test.tsx`:

```typescript
describe('Premium CTA', () => {
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

  it('renders premium waitlist link with correct attributes', () => {
    const mockFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
    render(
      <BleepDownloadTab {...defaultProps} file={mockFile} censoredMediaUrl="blob:test-url" />
    );

    const premiumLink = screen.getByRole('link', { name: /Join Premium Waitlist/i });
    expect(premiumLink).toBeInTheDocument();
    expect(premiumLink).toHaveAttribute('href', PREMIUM_WAITLIST_URL);
    expect(premiumLink).toHaveAttribute('target', '_blank');
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

    const premiumLink = screen.getByRole('link', { name: /Join Premium Waitlist/i });
    fireEvent.click(premiumLink);

    expect(mockGtag).toHaveBeenCalledWith('event', 'premium_cta_clicked', {
      location: 'download_success',
      file_type: 'audio',
    });
  });
});
```

### Manual Testing Checklist

- [ ] Premium CTA appears after applying bleeps (both audio and video)
- [ ] CTA link opens Google Form in new tab
- [ ] CTA does not appear before censored result is available
- [ ] CTA styling is consistent across mobile and desktop
- [ ] GA events fire correctly (check GA4 Realtime)
- [ ] CTA is visually distinct from feedback CTA (purple vs yellow)

## Success Metrics

| Metric | Calculation | Target |
|--------|-------------|--------|
| CTA Click Rate | `premium_cta_clicked / download_censored_file` | > 5% |
| Form Completion Rate | Google Form submissions / `premium_cta_clicked` | > 30% |
| Waitlist Size | Total Google Form submissions | 100+ before ad spend |

### GA4 Custom Report Setup

1. Navigate to GA4 > Explore > Create New Report
2. Add dimensions: `event_name`, `file_type`
3. Add metrics: `event_count`
4. Filter: `event_name` contains `premium_cta` or `download_censored_file`

## Rollback Plan

If CTA negatively impacts user experience:

1. Remove the Premium CTA JSX block from BleepDownloadTab.tsx
2. Keep the constant in externalLinks.ts for future use
3. Remove associated tests

## Critical Files

- `lib/constants/externalLinks.ts` - Add the new PREMIUM_WAITLIST_URL constant
- `app/bleep/components/BleepDownloadTab.tsx` - Add the Premium CTA component UI and tracking
- `app/bleep/components/BleepDownloadTab.test.tsx` - Add unit tests for the new CTA
