'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { createClient } from '@/lib/supabase/client';

// Minutes limits per tier per month
const TIER_LIMITS: Record<string, number> = {
  free: 0,
  starter: 60,
  pro: 300,
  team: 600,
};

interface UsageData {
  minutesUsed: number;
  minutesLimit: number;
  minutesRemaining: number;
  percentUsed: number;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
}

interface UseUsageReturn {
  usage: UsageData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useUsage(): UseUsageReturn {
  const { user, subscriptionTier, isPremium } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!user || !isPremium) {
      setUsage({
        minutesUsed: 0,
        minutesLimit: 0,
        minutesRemaining: 0,
        percentUsed: 0,
        billingPeriodStart: null,
        billingPeriodEnd: null,
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startDate = startOfMonth.toISOString().split('T')[0];

      // Try to get existing usage record for this billing period
      const { data: usageRecord, error: fetchError } = await supabase
        .from('usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('billing_period_start', startDate)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        throw new Error('Failed to fetch usage data');
      }

      const limit = TIER_LIMITS[subscriptionTier] || 0;
      const used = usageRecord?.minutes_used || 0;
      const remaining = Math.max(0, limit - used);
      const percentUsed = limit > 0 ? (used / limit) * 100 : 0;

      setUsage({
        minutesUsed: used,
        minutesLimit: limit,
        minutesRemaining: remaining,
        percentUsed: Math.min(100, percentUsed),
        billingPeriodStart: usageRecord?.billing_period_start || startDate,
        billingPeriodEnd: usageRecord?.billing_period_end || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUsage(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, subscriptionTier, isPremium]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return {
    usage,
    isLoading,
    error,
    refresh: fetchUsage,
  };
}
