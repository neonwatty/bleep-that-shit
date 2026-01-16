'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';

interface PricingCardProps {
  tier: 'starter' | 'pro' | 'team';
  name: string;
  price: number;
  features: string[];
  highlighted?: boolean;
  cloudMinutes: number;
  maxFileLength: string;
  storage: string;
}

export function PricingCard({
  tier,
  name,
  price,
  features,
  highlighted = false,
  cloudMinutes,
  maxFileLength,
  storage,
}: PricingCardProps) {
  const { user, isPremium, subscriptionTier } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCurrentPlan = subscriptionTier === tier;

  const handleCheckout = async () => {
    // If not logged in, redirect to login with return URL
    if (!user) {
      router.push(`/auth/login?redirect=/premium`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 p-8 ${
        highlighted
          ? 'border-indigo-500 bg-gradient-to-b from-indigo-950/50 to-black'
          : 'border-gray-800 bg-gray-950/50'
      }`}
    >
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-1 text-sm font-bold text-white">
          Most Popular
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-white">{name}</h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-4xl font-black text-white">${price}</span>
          <span className="text-gray-500">/month</span>
        </div>
      </div>

      {/* Key stats */}
      <div className="mb-6 space-y-2 border-b border-gray-800 pb-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Cloud Minutes</span>
          <span className="font-semibold text-white">{cloudMinutes} min/mo</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Max File Length</span>
          <span className="font-semibold text-white">{maxFileLength}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Project Storage</span>
          <span className="font-semibold text-white">{storage}</span>
        </div>
      </div>

      {/* Features */}
      <ul className="mb-8 flex-grow space-y-3">
        {features.map(feature => (
          <li key={feature} className="flex items-start gap-3 text-sm text-gray-300">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      {/* Error message */}
      {error && <p className="mb-4 text-center text-sm text-red-400">{error}</p>}

      {/* CTA Button */}
      {isCurrentPlan ? (
        <button
          onClick={handleManageBilling}
          disabled={isLoading}
          className="w-full rounded-lg border border-gray-600 py-3 font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Manage Subscription'}
        </button>
      ) : isPremium ? (
        <button
          onClick={handleManageBilling}
          disabled={isLoading}
          className="w-full rounded-lg border border-gray-600 py-3 font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Change Plan'}
        </button>
      ) : (
        <button
          onClick={handleCheckout}
          disabled={isLoading}
          className={`w-full rounded-lg py-3 font-semibold transition-all disabled:opacity-50 ${
            highlighted
              ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600'
              : 'bg-white text-black hover:bg-gray-200'
          }`}
        >
          {isLoading ? 'Loading...' : 'Get Started'}
        </button>
      )}
    </div>
  );
}
