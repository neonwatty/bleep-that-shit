import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type SubscriptionTier = 'free' | 'starter' | 'pro' | 'team';

// Minutes limits per tier per month
const TIER_LIMITS: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 60, // 1 hour
  pro: 300, // 5 hours
  team: 600, // 10 hours
};

/**
 * Get or create the current billing period usage record for a user
 */
export async function getOrCreateUsageRecord(
  supabase: SupabaseClient<Database>,
  userId: string,
  tier: SubscriptionTier
) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const startDate = startOfMonth.toISOString().split('T')[0];
  const endDate = endOfMonth.toISOString().split('T')[0];

  // Try to get existing usage record for this billing period
  const { data: existingUsage, error: fetchError } = await supabase
    .from('usage')
    .select('*')
    .eq('user_id', userId)
    .eq('billing_period_start', startDate)
    .single();

  if (existingUsage && !fetchError) {
    return { data: existingUsage, error: null };
  }

  // Create new usage record for this billing period
  const { data: newUsage, error: insertError } = await supabase
    .from('usage')
    .insert({
      user_id: userId,
      billing_period_start: startDate,
      billing_period_end: endDate,
      minutes_used: 0,
      minutes_limit: TIER_LIMITS[tier],
    })
    .select()
    .single();

  if (insertError) {
    // Handle race condition - another request might have created the record
    if (insertError.code === '23505') {
      // Unique violation - fetch the record that was just created
      const { data: raceUsage, error: raceError } = await supabase
        .from('usage')
        .select('*')
        .eq('user_id', userId)
        .eq('billing_period_start', startDate)
        .single();

      return { data: raceUsage, error: raceError };
    }
    return { data: null, error: insertError };
  }

  return { data: newUsage, error: null };
}

/**
 * Check if user has enough minutes remaining for a transcription
 */
export async function checkUsageLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
  tier: SubscriptionTier,
  estimatedMinutes: number = 0
): Promise<{
  allowed: boolean;
  remainingMinutes: number;
  usedMinutes: number;
  limitMinutes: number;
  error?: string;
}> {
  const { data: usage, error } = await getOrCreateUsageRecord(supabase, userId, tier);

  if (error || !usage) {
    return {
      allowed: false,
      remainingMinutes: 0,
      usedMinutes: 0,
      limitMinutes: TIER_LIMITS[tier],
      error: 'Could not fetch usage data',
    };
  }

  const remaining = usage.minutes_limit - usage.minutes_used;
  const allowed = remaining >= estimatedMinutes;

  return {
    allowed,
    remainingMinutes: Math.max(0, remaining),
    usedMinutes: usage.minutes_used,
    limitMinutes: usage.minutes_limit,
    error: allowed ? undefined : 'Usage limit exceeded',
  };
}

/**
 * Record usage after a successful transcription
 */
export async function recordUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
  tier: SubscriptionTier,
  minutesUsed: number
): Promise<{ success: boolean; error?: string }> {
  const { data: usage, error: fetchError } = await getOrCreateUsageRecord(supabase, userId, tier);

  if (fetchError || !usage) {
    return { success: false, error: 'Could not fetch usage record' };
  }

  // Update the usage record
  const { error: updateError } = await supabase
    .from('usage')
    .update({
      minutes_used: usage.minutes_used + minutesUsed,
    })
    .eq('id', usage.id);

  if (updateError) {
    return { success: false, error: 'Could not update usage record' };
  }

  return { success: true };
}

/**
 * Get the minutes limit for a subscription tier
 */
export function getTierLimit(tier: SubscriptionTier): number {
  return TIER_LIMITS[tier];
}
