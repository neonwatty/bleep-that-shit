# Meta Pixel + Conversions API Implementation Plan

Status: Draft for review. No code written yet.
Date: 2026-04-15

## Goal

Install Meta Pixel (browser) + Conversions API (server) dual-send on
bleep-that-shit to support a new Meta ads campaign. Track conversion funnel
from marketing surfaces → signup → paid subscription.

## Locked-in decisions (from user)

1. **Dual-send architecture**: browser Pixel for client-side events, server-side
   Conversions API (CAPI) for high-value events. Not browser-only.

2. **Consent**: geo-gated via Vercel middleware. EU/UK visitors get a consent
   banner that blocks the pixel until accepted. Everyone else fires freely.
   Net-new — no consent banner exists today.

3. **Scope: marketing-only wrapper refactor (option b)**. All trackers
   (existing GA + Google Ads + new Meta Pixel) scoped to marketing surfaces
   only: `/`, `/premium`, `/for-educators`, `/blog/*`, `/auth/*`. Processing
   routes (`/bleep`, `/sampler`) and dashboard routes become tracker-free.
   Requires moving `GoogleAnalytics` out of root layout into a conditional
   wrapper. Matches the "100% private in-browser" marketing story for the
   client-side pipeline.

4. **Event taxonomy**:
   | Event | Channel | Fire location |
   |---|---|---|
   | `PageView` | Browser pixel | Auto-fires on every marketing surface |
   | `ViewContent` | Browser pixel | `/premium` page |
   | `Lead` | Browser pixel | Signup page — submit click (tight signal for paid ads) |
   | `CompleteRegistration` | CAPI only | `app/auth/callback/route.ts` (convergence point for email-confirm + OAuth — avoids counting unverified signups) |
   | `Purchase` | CAPI only | `app/api/webhooks/stripe/route.ts` → `handleCheckoutCompleted`. Uses `session.metadata.supabase_user_id` for user matching. Value pulled from the Stripe Session (`amount_total / 100`), respects promo codes/discounts/currency. |

5. **No bleep-completion event**. Revenue event (Purchase) matters more than
   free-tier usage events for this campaign.

## Secrets management: Vercel env vars

The project uses **Vercel env vars only**. Day-to-day dev reads from a local
`.env.local` pulled via `vercel env pull`.

A separate cleanup (done 2026-04-15, in the same branch as this plan) removed
stale Doppler references from `package.json`, `CLAUDE.md`, `.env.local.example`,
and `scripts/test-cloud-e2e.ts`. One intentional Doppler reference remains in
`CLAUDE.md` under the reddit-market-research external tool section — that's
for a separate CLI tool's own secrets management, not this project's config.

**For this feature**:

1. Add the three Meta env vars in Vercel project settings (Production, Preview, Development scopes as appropriate — `META_TEST_EVENT_CODE` only in Preview/Development).
2. Run `vercel env pull .env.local` locally to hydrate.
3. Run `npm run dev` (port 3004).
4. Link the project locally via `vercel link` if not already — there's no `.vercel/` directory in the repo today, so this is a prereq.

## Environment variables

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | Browser + server | `NEXT_PUBLIC_` prefix is required so the Pixel script can read it at runtime |
| `META_CAPI_ACCESS_TOKEN` | Server only | Secret — never expose to browser |
| `META_TEST_EVENT_CODE` | Server only | Set in dev/staging, unset (or empty) in prod. Enables Meta Events Manager → Test Events tab routing |

## Files to create

### `lib/meta/capi.ts`

Server-side CAPI wrapper. Exports `sendMetaEvent({ eventName, eventTime, userData, customData, eventSourceUrl, eventId? })`.

Responsibilities:

- SHA-256 hash email/phone/name per Meta spec:
  - Email: `sha256(email.trim().toLowerCase())`
  - Phone: `sha256(digits_only_with_country_code)`
  - First/last name: `sha256(name.trim().toLowerCase())`
- Include `client_ip_address` and `client_user_agent` in `user_data` (from request headers where available) — improves match quality.
- POST to `https://graph.facebook.com/v21.0/{PIXEL_ID}/events`.
- Auth via `access_token` query param or bearer.
- Include `test_event_code` in payload when env var is set.
- Wrap fetch in try/catch — analytics failures must NEVER break the auth callback or Stripe webhook. Log and continue.
- Return `{ ok: boolean, error?: string }` for observability; callers intentionally ignore.

### `lib/meta/events.ts`

Typed event builders layered on `capi.ts`:

- `trackCompleteRegistration({ email, userId, ip, userAgent, eventSourceUrl })`
- `trackPurchase({ email, userId, value, currency, eventId, ip, userAgent })`

Keeps event-shape knowledge out of route handlers. Easier to unit test in isolation.

### `components/MetaPixel.tsx`

Mirrors `components/GoogleAnalytics.tsx` pattern exactly:

- `next/script` with `strategy="afterInteractive"`.
- Standard Meta Pixel init snippet + `fbq('track', 'PageView')`.
- Reads `NEXT_PUBLIC_META_PIXEL_ID`; renders nothing if unset.
- `<noscript>` fallback image for non-JS clients.

### `components/MarketingTrackers.tsx`

**Client component.** Central mount decision for ALL trackers.

Logic:

1. Read `usePathname()`.
2. Check against marketing allowlist: `/`, `/premium`, `/for-educators`, paths starting with `/blog`, paths starting with `/auth` (but NOT `/auth/callback` which is server-only).
3. Read `meta-consent-required` cookie (set by middleware based on geo).
4. Read `meta-consent-granted` cookie (set by banner on accept).
5. Mount `<GoogleAnalytics />` + `<MetaPixel />` only when: pathname is marketing-scoped AND (consent not required OR consent granted).
6. Render `<CookieConsent />` only when consent is required and not yet granted.

This is the **single source of truth** for whether any tracker loads — scattered conditional logic is anti-goal.

### `components/CookieConsent.tsx`

EU/UK consent banner.

- Fixed-position bottom bar (least intrusive; standard pattern).
- Accept: set `meta-consent-granted=1` cookie (1-year expiry), trigger re-render in parent wrapper so trackers mount.
- Reject: set `meta-consent-granted=0` cookie (30-day expiry — avoids nagging on every page view).
- Styling: match existing Navbar/Footer Tailwind conventions.

### `lib/constants/geo.ts`

EU country code constant + `GB`. Used by middleware geo check.

```ts
export const CONSENT_REQUIRED_COUNTRIES = new Set([
  // EU member states
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // UK
  'GB',
]);
```

## Files to modify

### `middleware.ts`

Add geo detection alongside existing auth guard (no conflict).

- Check `request.geo?.country` (Vercel-populated).
- If in `CONSENT_REQUIRED_COUNTRIES`, set response cookie `meta-consent-required=1` (session cookie or 1-day).
- Else ensure cookie is cleared/not set.
- `request.geo` is undefined in local `next dev` — wrapper must handle the `undefined` case gracefully (default: consent not required locally unless a dev override cookie is set).

### `app/layout.tsx`

- Remove `<GoogleAnalytics />` from root.
- Replace with `<MarketingTrackers />`.
- That's the entire diff — smallest change, highest blast radius.

### `lib/analytics.ts`

Extend existing wrapper (currently wraps `window.gtag`):

- Add `trackMetaEvent(name: string, params?: Record<string, unknown>)` — checks `window.fbq` exists, calls `fbq('track', name, params)`.
- Add unified convenience helpers where both GA and Meta should fire: `trackLead()`, `trackViewContent(params)`.
- Keep the existing GA API untouched for backward compatibility.

### `app/premium/page.tsx` (or a small client island inside it)

Fire `trackViewContent({ content_name: 'premium', content_category: 'subscription' })` on mount via `useEffect`.

Check current component structure — if the page is a server component, add a small `<PremiumViewContentBeacon />` client child rather than converting the whole page.

### `app/(auth)/auth/signup/page.tsx` or `components/auth/SignupForm.tsx`

Fire `trackLead()` on form submit click (pre-submit). Rationale: submit click = tight intent signal for a paid ads campaign; first-focus inflates with bounced fills.

### `app/auth/callback/route.ts`

After successful session exchange and before the redirect:

```ts
try {
  await trackCompleteRegistration({
    email: user.email,
    userId: user.id,
    ip: request.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
    eventSourceUrl: request.url,
  });
} catch (err) {
  console.error('[meta-capi] CompleteRegistration failed', err);
}
```

Fires for both email-confirm AND OAuth paths — that's why this is the chosen hook point, per locked-in decision 4.

### `app/api/webhooks/stripe/route.ts` → `handleCheckoutCompleted`

After the existing profile/subscription update, before the handler returns:

```ts
try {
  await trackPurchase({
    email: session.customer_details?.email ?? undefined,
    userId: session.metadata?.supabase_user_id,
    value: (session.amount_total ?? 0) / 100,
    currency: (session.currency ?? 'usd').toUpperCase(),
    eventId: session.id, // natural idempotency on Stripe webhook retry
    ip: request.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  });
} catch (err) {
  console.error('[meta-capi] Purchase failed', err);
}
```

Three details that matter:

- **`amount_total` is in cents** — dividing by 100 respects promo codes, discounts, and currency conversion without a tier lookup.
- **`event_id = session.id`** — gives dedup on Stripe webhook retries, and also sets up dedup if we ever add a browser-side Purchase event later.
- **Email normalization inside `capi.ts`** — callers pass plain values, wrapper hashes. Impossible to forget.

## Order of operations

1. **Resolve secrets question** (user action: pick option 1 or 2 above).
2. **Add env vars** to chosen location(s).
3. **`lib/meta/capi.ts`** — pure function, easiest to unit test first.
4. **`lib/meta/capi.test.ts`** — Vitest. Cover hashing correctness (known test vectors from Meta docs), payload shape, `test_event_code` passthrough, graceful failure on fetch rejection.
5. **`lib/meta/events.ts`** — thin builders.
6. **`components/MetaPixel.tsx`** — mirror GA component.
7. **`lib/constants/geo.ts`** + **`middleware.ts`** geo-cookie logic.
8. **`components/CookieConsent.tsx`** + **`components/MarketingTrackers.tsx`** — wrapper + banner pair.
9. **`app/layout.tsx`** swap — root-level change, verify smoke tests still pass.
10. **`lib/analytics.ts`** — extend with Meta helpers.
11. **Event wiring** in this order:
    1. ViewContent (`/premium`)
    2. Lead (signup form)
    3. CompleteRegistration (auth callback)
    4. Purchase (Stripe webhook)
12. **End-to-end verification** via Meta Test Events tool (see below).

**Why this order**: wrapper refactor is done BEFORE events are wired, so the pixel's mount-only-where-it-should behavior is proven before we start firing anything.

## Testing strategy

### Meta Test Events tool

- Events Manager → Data Sources → [Pixel] → Test Events tab.
- Enter `META_TEST_EVENT_CODE` value.
- Browser events (PageView / ViewContent / Lead) should appear within ~10s of firing in local dev.
- CAPI events appear with a "Server" label — lets you visually distinguish channels.

### Meta Pixel Helper (Chrome extension)

- Load `/bleep` → expect zero Pixel events (marketing-only scope working).
- Load `/premium` → expect PageView + ViewContent.
- Load `/auth/signup` in EU-simulated session → expect zero events until consent accepted.

### Stripe webhook testing

```bash
stripe listen --forward-to localhost:3004/api/webhooks/stripe
stripe trigger checkout.session.completed
```

Verify Purchase appears in Meta Test Events with correct `value`, `currency`, and `event_id`.

### Vitest units (`lib/meta/capi.test.ts`)

- SHA-256 hashing of known email/phone test vectors (Meta spec samples).
- `test_event_code` included when env set, omitted when not.
- Graceful failure on fetch rejection (doesn't throw).

### Playwright smoke

- Extend existing `/premium` smoke test:
  - Assert `script[src*="connect.facebook.net"]` is present when consent not required.
  - Assert NO such script is present on `/bleep`.
- Catches accidental unmounting in future refactors.

### Geo-gate testing

- Vercel preview deploy is the only realistic way to test `request.geo` — local `next dev` doesn't populate it.
- For local, fake it via a cookie override (`meta-consent-required=1` manually) or a dev-only env flag like `NEXT_PUBLIC_FORCE_CONSENT_BANNER=1`.

## Effort estimate

| Phase | Estimate |
|---|---|
| CAPI wrapper + hashing + unit tests | 1.5 hrs |
| Pixel component + wrapper refactor + GA migration | 1 hr |
| Consent banner + middleware geo logic | 1.5 hrs |
| Event wiring (5 events across 4 files) | 1 hr |
| Verification via Meta Test Events + Stripe CLI + Playwright assertion | 1 hr |
| **Total** | **~6 hrs** |

Add ~30 min buffer for field-name mismatches with the Meta CAPI spec (inevitable on first integration).

## Open items requiring user input before execution

1. **Lead trigger point** — default: submit click (not first-focus). Tight signal for paid ads. User can override if they want wider funnel coverage.
2. **Consent banner UX** — default: fixed-position bottom bar. Alternatives: blocking modal, inline banner. Bottom bar is standard and least intrusive.
3. **Consent rejection persistence** — default: 30-day cookie. Avoids nagging on every page view. User can override to session-only or longer.
4. **CookieConsent styling primitives** — match existing Navbar/Footer Tailwind, unless user has a preferred component library already in use. Need to scan `components/` during implementation to confirm.

## Architectural notes for fresh-session analysis

Three details that trip up most CAPI integrations, called out so a future session doesn't hit them:

1. **Stripe amounts are in cents**. `amount_total: 999` = $9.99. Dividing by 100 respects the actual paid amount — promo codes, discounts, currency conversion — without a hardcoded tier lookup. Matches the locked-in "revenue from Session object" decision.

2. **Email hashing normalization**. Meta spec: `sha256(email.trim().toLowerCase())`. Phone: `sha256(digits_only_with_country_code)`. Unnormalized values cause silent match-quality degradation, not an API error — easy to ship broken.

3. **`event_id` for Purchase** = Stripe session ID. Two wins: (a) dedup on Stripe webhook retries; (b) if a browser-side Purchase event is ever added later, Meta auto-dedups across channels.

One subtle architectural coupling worth flagging: **consent + scope + geo all collapse into a single mount decision** inside `<MarketingTrackers>`. Centralizing the boolean in one wrapper is what makes option (b) safer than it looks — the tracker-free guarantee on `/bleep` and `/sampler` comes from a single code path, not from scattered conditionals.

## Files touched summary

**Created (6):**

- `lib/meta/capi.ts`
- `lib/meta/events.ts`
- `lib/meta/capi.test.ts`
- `lib/constants/geo.ts`
- `components/MetaPixel.tsx`
- `components/MarketingTrackers.tsx`
- `components/CookieConsent.tsx`

**Modified (7):**

- `middleware.ts`
- `app/layout.tsx`
- `lib/analytics.ts`
- `app/premium/page.tsx` (or client island within)
- `app/(auth)/auth/signup/page.tsx` or `components/auth/SignupForm.tsx`
- `app/auth/callback/route.ts`
- `app/api/webhooks/stripe/route.ts`

**Env vars added:**

- `NEXT_PUBLIC_META_PIXEL_ID`
- `META_CAPI_ACCESS_TOKEN`
- `META_TEST_EVENT_CODE`
