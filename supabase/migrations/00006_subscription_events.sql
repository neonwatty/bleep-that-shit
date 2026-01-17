-- Migration: Add subscription events tracking
-- This table logs all subscription-related events for audit purposes

-- Audit trail for subscription events
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  stripe_event_id text UNIQUE,
  previous_tier text,
  new_tier text,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription events
CREATE POLICY "Users can view own subscription events"
  ON public.subscription_events FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id
  ON public.subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_event_id
  ON public.subscription_events(stripe_event_id);

-- Helper function to check if user has active subscription
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

-- Helper function to get remaining minutes for user
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
