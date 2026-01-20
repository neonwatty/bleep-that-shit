'use client';

interface PremiumBadgeProps {
  variant?: 'badge' | 'lock' | 'full';
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}

/**
 * Reusable premium badge component for marking premium features.
 *
 * Variants:
 * - badge: Just the "PRO" text badge
 * - lock: Just the lock icon
 * - full: Both lock icon and "PRO" badge
 */
export function PremiumBadge({
  variant = 'badge',
  size = 'sm',
  onClick,
  className = '',
}: PremiumBadgeProps) {
  const sizeClasses = {
    sm: {
      badge: 'px-2 py-0.5 text-xs',
      icon: 'h-3 w-3',
      iconContainer: 'h-5 w-5',
    },
    md: {
      badge: 'px-3 py-1 text-sm',
      icon: 'h-4 w-4',
      iconContainer: 'h-6 w-6',
    },
  };

  const sizes = sizeClasses[size];

  const badgeElement = (
    <span
      className={`rounded-full bg-gradient-to-r from-amber-400 to-orange-500 font-semibold text-white ${sizes.badge}`}
    >
      PRO
    </span>
  );

  const lockElement = (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-50 ${sizes.iconContainer}`}
    >
      <svg className={`text-amber-600 ${sizes.icon}`} fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );

  const content = {
    badge: badgeElement,
    lock: lockElement,
    full: (
      <div className="flex items-center gap-2">
        {lockElement}
        {badgeElement}
      </div>
    ),
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center ${className}`}
        aria-label="Premium feature - click to upgrade"
      >
        {content[variant]}
      </button>
    );
  }

  return <span className={`inline-flex items-center ${className}`}>{content[variant]}</span>;
}

/**
 * Lock icon component for use in selection indicators
 */
export function PremiumLockIcon({ className = 'h-3 w-3 text-amber-600' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
