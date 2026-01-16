# Payment & Subscription Implementation Plan

## Executive Summary

This plan details adding payment/subscription functionality to monetize premium features like cloud transcription, longer file processing, and saved projects.

## Current State

### Existing Infrastructure

**Database (Supabase):**

- `profiles` table already includes:
  - `stripe_customer_id` (text, unique)
  - `subscription_tier` ('free' | 'starter' | 'pro' | 'team')
  - `subscription_status` ('active' | 'cancelled' | 'past_due')
  - `subscription_ends_at` (timestamptz)
- `usage` table tracks `minutes_used` and `minutes_limit`
- Full RLS policies in place

**What Doesn't Exist:**

- Stripe SDK integration
- Webhook handlers
- Subscription status checking logic
- Pricing/checkout UI
- Billing management portal

---

## 1. Payment Provider: Stripe (Recommended)

| Factor               | Stripe          | Paddle       | LemonSqueezy |
| -------------------- | --------------- | ------------ | ------------ |
| Setup Complexity     | Medium          | Low          | Low          |
| MoR (Tax handling)   | No              | Yes          | Yes          |
| Pricing              | 2.9% + $0.30    | 5-8% + $0.50 | 5% + $0.50   |
| Next.js Support      | Excellent       | Good         | Good         |
| Supabase Integration | Native patterns | Manual       | Manual       |

**Why Stripe:**

1. Database already has `stripe_customer_id` field
2. Best Next.js integration
3. Lower fees for US customers
4. Most flexible for custom billing

---

## 2. Subscription Tiers

| Tier        | Price  | Cloud Minutes | File Length | Storage    |
| ----------- | ------ | ------------- | ----------- | ---------- |
| **Free**    | $0     | 0             | 10 min      | Local only |
| **Starter** | $9/mo  | 60 min        | 30 min      | 5 GB       |
| **Pro**     | $19/mo | 300 min       | 2 hours     | 25 GB      |
| **Team**    | $39/mo | 600 min       | 2 hours     | 100 GB     |

**Pricing Rationale:**

- Groq API ~$0.02/min → $9/mo for 60 min = $1.20 cost, 87% margin
- Graceful fallback to browser when limits hit

---

## 3. Database Schema Changes

```sql
-- New migration: 00006_subscription_enhancements.sql

-- Add Stripe subscription tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS price_id text;

-- Audit trail for subscription events
CREATE TABLE public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  stripe_event_id text UNIQUE,
  previous_tier text,
  new_tier text,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription events"
  ON public.subscription_events FOR SELECT
  USING (auth.uid() = user_id);

-- Helper functions
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid
    AND subscription_tier != 'free'
    AND subscription_status = 'active'
    AND (subscription_ends_at IS NULL OR subscription_ends_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_remaining_minutes(user_uuid uuid)
RETURNS numeric AS $$
DECLARE
  usage_record public.usage%ROWTYPE;
BEGIN
  SELECT * INTO usage_record FROM public.usage
  WHERE user_id = user_uuid
  AND billing_period_start <= CURRENT_DATE
  AND billing_period_end >= CURRENT_DATE
  LIMIT 1;

  IF usage_record IS NULL THEN RETURN 0; END IF;
  RETURN GREATEST(0, usage_record.minutes_limit - usage_record.minutes_used);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. Subscription Hook

```typescript
// /lib/hooks/useSubscription.ts
export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState({
    tier: 'free',
    status: null,
    minutesUsed: 0,
    minutesLimit: 0,
    isLoading: true,
  });

  // Fetch profile + usage on mount
  // Return: { isPremium, canUseCloud, remainingMinutes, refresh }
}
```

---

## 5. API Endpoints

### Checkout (`/app/api/checkout/route.ts`)

- Creates Stripe checkout session
- Links to user via metadata
- Redirects to Stripe-hosted checkout

### Billing Portal (`/app/api/billing-portal/route.ts`)

- Creates Stripe billing portal session
- User can manage subscription, update payment

### Webhooks (`/app/api/webhooks/stripe/route.ts`)

Handle events:

- `checkout.session.completed` → Create subscription
- `customer.subscription.updated` → Update tier/status
- `customer.subscription.deleted` → Set cancelled + grace period
- `invoice.payment_failed` → Set past_due status

---

## 6. UI Components

| Component         | Purpose                            |
| ----------------- | ---------------------------------- |
| `PricingPage`     | Tier comparison, checkout CTAs     |
| `PricingCard`     | Individual tier with features      |
| `UsageDashboard`  | Minutes used, upgrade prompts      |
| `PremiumUpsell`   | Modal when accessing gated feature |
| `BillingSettings` | Link to Stripe portal              |

---

## 7. Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_TEAM_PRICE_ID=price_...

# Supabase (service role for webhooks)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Implementation Phases

### Phase 1: Stripe Setup (1-2 days)

1. `npm install stripe @stripe/stripe-js`
2. Create Stripe account + products/prices
3. Add migration for subscription_events
4. Configure environment variables

### Phase 2: Checkout Flow (2-3 days)

1. Create checkout API route
2. Create billing portal API route
3. Build pricing page UI
4. Test checkout redirect

### Phase 3: Webhook Handling (2-3 days)

1. Create webhook handler
2. Handle all subscription events
3. Set up usage record management
4. Test with Stripe CLI: `stripe listen --forward-to localhost:3004/api/webhooks/stripe`

### Phase 4: Subscription Hook & Gating (2-3 days)

1. Create useSubscription hook
2. Gate cloud API with subscription check
3. Add premium upsell components
4. Update TranscriptionControls

### Phase 5: Dashboard & Polish (2-3 days)

1. Usage dashboard component
2. Billing management integration
3. Graceful fallback UX
4. E2E tests

---

## Critical Files

- `/lib/supabase/client.ts` - Add subscription queries
- `/providers/AuthProvider.tsx` - Extend with subscription context
- `/app/api/transcribe/cloud/route.ts` - Add subscription gating
- `/components/TranscriptionControls.tsx` - Premium badges for cloud models
