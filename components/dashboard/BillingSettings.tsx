'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { UsageMeter } from './UsageMeter';

const TIER_DISPLAY_NAMES: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  team: 'Team',
};

const TIER_PRICES: Record<string, number> = {
  free: 0,
  starter: 9,
  pro: 19,
  team: 39,
};

export function BillingSettings() {
  const { isPremium, subscriptionTier, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManageBilling = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing-portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const tierName = TIER_DISPLAY_NAMES[subscriptionTier] || 'Free';
  const tierPrice = TIER_PRICES[subscriptionTier] || 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">Subscription & Billing</h2>

      <div className="mt-4 space-y-4">
        {/* Current Plan */}
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
          <div>
            <p className="text-sm text-gray-500">Current Plan</p>
            <p className="text-lg font-semibold text-gray-900">
              {tierName}
              {isPremium && (
                <span className="ml-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-xs font-semibold text-white">
                  PRO
                </span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              ${tierPrice}
              <span className="text-sm font-normal text-gray-500">/mo</span>
            </p>
          </div>
        </div>

        {/* Subscription Status */}
        {profile?.subscription_status && profile.subscription_status !== 'active' && (
          <div
            className={`rounded-lg p-4 ${
              profile.subscription_status === 'past_due'
                ? 'bg-red-50 text-red-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            <p className="text-sm font-medium">
              {profile.subscription_status === 'past_due'
                ? 'Payment failed. Please update your payment method.'
                : 'Your subscription has been cancelled.'}
            </p>
            {profile.subscription_ends_at && (
              <p className="mt-1 text-xs">
                Access until:{' '}
                {new Date(profile.subscription_ends_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        )}

        {/* Usage Meter for Premium Users */}
        {isPremium && (
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Cloud Transcription Usage</p>
            <UsageMeter />
          </div>
        )}

        {/* Error Message */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          {isPremium ? (
            <button
              onClick={handleManageBilling}
              disabled={isLoading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Manage Billing'}
            </button>
          ) : (
            <Link
              href="/premium"
              className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-medium text-white hover:from-amber-600 hover:to-orange-600"
            >
              Upgrade to Pro
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
