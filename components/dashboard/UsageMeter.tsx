'use client';

import { useUsage } from '@/hooks/useUsage';
import Link from 'next/link';

interface UsageMeterProps {
  compact?: boolean;
}

export function UsageMeter({ compact = false }: UsageMeterProps) {
  const { usage, isLoading, error } = useUsage();

  if (isLoading) {
    return (
      <div
        className={`animate-pulse ${compact ? 'h-4 w-24' : 'h-20 w-full'} rounded bg-gray-200`}
      />
    );
  }

  if (error || !usage) {
    return null;
  }

  // Don't show for free tier
  if (usage.minutesLimit === 0) {
    return null;
  }

  const formatMinutes = (minutes: number) => {
    if (minutes < 1) {
      return `${(minutes * 60).toFixed(0)}s`;
    }
    if (minutes < 60) {
      return `${minutes.toFixed(1)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Determine color based on usage percentage
  const getBarColor = () => {
    if (usage.percentUsed >= 90) return 'bg-red-500';
    if (usage.percentUsed >= 75) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full ${getBarColor()} transition-all duration-300`}
            style={{ width: `${Math.min(100, usage.percentUsed)}%` }}
          />
        </div>
        <span className="text-gray-600">{formatMinutes(usage.minutesRemaining)} left</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Cloud Transcription Usage</h3>
        <span className="text-sm text-gray-500">
          {usage.billingPeriodStart &&
            new Date(usage.billingPeriodStart).toLocaleDateString('en-US', { month: 'short' })}{' '}
          billing period
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full ${getBarColor()} transition-all duration-300`}
          style={{ width: `${Math.min(100, usage.percentUsed)}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          {formatMinutes(usage.minutesUsed)} of {formatMinutes(usage.minutesLimit)} used
        </span>
        <span
          className={`font-medium ${usage.percentUsed >= 90 ? 'text-red-600' : 'text-green-600'}`}
        >
          {formatMinutes(usage.minutesRemaining)} remaining
        </span>
      </div>

      {/* Warning message when near limit */}
      {usage.percentUsed >= 90 && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {usage.percentUsed >= 100 ? (
            <>
              You&apos;ve reached your monthly limit.{' '}
              <Link href="/premium" className="font-medium underline">
                Upgrade your plan
              </Link>{' '}
              for more minutes.
            </>
          ) : (
            <>
              You&apos;re almost at your monthly limit.{' '}
              <Link href="/premium" className="font-medium underline">
                Consider upgrading
              </Link>{' '}
              for more minutes.
            </>
          )}
        </div>
      )}
    </div>
  );
}
