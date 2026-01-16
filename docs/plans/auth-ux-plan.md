# Auth UX Implementation Plan

## Executive Summary

This plan details the logged-in vs logged-out user experience differentiation for Bleep That Sh*t, including premium feature gating for cloud transcription.

## Current State

### Existing Auth Infrastructure

The app already has a robust authentication foundation:

1. **Supabase Integration**: Full setup with client, server, and middleware utilities
2. **AuthProvider** (`/providers/AuthProvider.tsx`): Complete auth context with email/password, OAuth, magic links, session management
3. **Middleware** (`/middleware.ts`): Route protection for `/dashboard/*` routes
4. **Auth Components** (`/components/auth/`): LoginForm, SignupForm, ResetPasswordForm, UpdatePasswordForm
5. **Database Schema**: profiles, projects, wordsets, usage tables with RLS

### Cloud Transcription (Premium Feature)

- `/components/TranscriptionControls.tsx` - model options include `cloud/whisper-large-v3-turbo`
- `/app/bleep/hooks/useBleepState.ts` - handles cloud transcription
- `/app/api/transcribe/cloud/route.ts` - Groq API integration (currently open, no auth check)

---

## User Tiers

| Tier | Description | Features |
|------|-------------|----------|
| **Anonymous** | No account | Local processing only, 10-min limit, local wordsets |
| **Free** | Has account, `subscription_tier = 'free'` | + wordsets sync + project storage (limited) |
| **Premium** | `subscription_tier` in ('starter', 'pro', 'team') | + cloud transcription + unlimited file length |

---

## UX by User Type

### Anonymous/Logged-Out Users

**Keep:**
- Full access to `/bleep` page with local processing
- All local Whisper models available
- Wordsets stored in IndexedDB
- 10-minute file limit

**Add:**
- Gate cloud model: Show "Large (Cloud)" with lock icon + "Premium" badge
- Clicking locked model shows upgrade modal with sign-in prompt
- Navbar: Add "Sign In" link
- Subtle prompt: "Save your work" banner after transcription

### Logged-in Free Users

**Access:**
- Same local processing as anonymous
- Wordsets auto-sync to Supabase
- Access to `/dashboard` with project list
- Can save projects (limited to 3-5)

**Add:**
- Gate cloud model: Same lock + "Upgrade to Premium"
- Navbar: Show user avatar + dropdown (Dashboard, Sign Out)
- Upgrade CTAs on dashboard and when hitting limits

### Premium Users

**Full Access:**
- Cloud transcription models unlocked
- Unlimited project storage
- Longer file processing
- Priority in job queue

**Show:**
- "Premium" badge in navbar dropdown
- Usage dashboard (minutes used vs. limit)

---

## Components to Create

| Component | Location | Purpose |
|-----------|----------|---------|
| `AuthButton` | `/components/auth/AuthButton.tsx` | Sign-in/user menu button for navbar |
| `UserDropdown` | `/components/auth/UserDropdown.tsx` | Dropdown for logged-in users |
| `UpgradeModal` | `/components/premium/UpgradeModal.tsx` | Modal when premium feature accessed |
| `PremiumBadge` | `/components/ui/PremiumBadge.tsx` | Lock icon + badge for gated features |
| `FeatureGate` | `/components/auth/FeatureGate.tsx` | Wrapper for premium-only features |
| `UsageMeter` | `/components/dashboard/UsageMeter.tsx` | Visual usage quota display |

## Components to Modify

| File | Changes |
|------|---------|
| `/components/MobileNav.tsx` | Add AuthButton, conditional logged-in state |
| `/components/BottomTabBar.tsx` | Add Dashboard tab for logged-in users |
| `/components/TranscriptionControls.tsx` | Wrap cloud models with FeatureGate |
| `/app/bleep/hooks/useBleepState.ts` | Check premium status before cloud transcription |
| `/providers/AuthProvider.tsx` | Add profile data (subscription_tier) to context |

## Pages to Create

| Page | Path | Purpose |
|------|------|---------|
| Login | `/app/auth/login/page.tsx` | Login form with OAuth |
| Signup | `/app/auth/signup/page.tsx` | Registration |
| Reset password | `/app/auth/reset-password/page.tsx` | Password reset request |
| Update password | `/app/auth/update-password/page.tsx` | Set new password |
| Pricing | `/app/pricing/page.tsx` | Plan comparison + upgrade CTAs |

---

## Cloud Transcription Gating

### Frontend (UX layer)

```tsx
// In TranscriptionControls.tsx
const { user, profile } = useAuth();
const isPremium = profile?.subscription_tier && profile.subscription_tier !== 'free';

// When rendering model options
{option.isPremium && !isPremium && (
  <PremiumBadge onClick={() => setShowUpgradeModal(true)} />
)}
```

### Backend (Security layer)

```typescript
// In /app/api/transcribe/cloud/route.ts
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  if (!profile || profile.subscription_tier === 'free') {
    return NextResponse.json({ error: 'Premium subscription required' }, { status: 403 });
  }

  // ... proceed with transcription
}
```

---

## Implementation Phases

### Phase A: Auth Pages (1-2 days)
1. Create login, signup, reset-password, update-password pages
2. Test full auth flow

### Phase B: Navbar Auth Integration (1 day)
1. Create AuthButton and UserDropdown components
2. Update MobileNav and desktop nav
3. Add Dashboard tab for logged-in users

### Phase C: Premium Gating (1-2 days)
1. Update AuthProvider with profile/subscription data
2. Create FeatureGate and PremiumBadge components
3. Update TranscriptionControls with gating
4. Add auth check to cloud API route
5. Create UpgradeModal

### Phase D: Upgrade Flow (1 day)
1. Create/update Pricing page
2. Connect to payment checkout
3. Add upgrade CTAs strategically
