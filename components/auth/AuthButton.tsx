'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { UsageMeter } from '@/components/dashboard/UsageMeter';
import { isAuthEnabled } from '@/lib/config/featureFlags';

export function AuthButton() {
  const { user, profile, isLoading, isPremium, signOut } = useAuth();

  // Hide auth button if auth is disabled (production)
  if (!isAuthEnabled) {
    return null;
  }
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
  };

  // Show loading state
  if (isLoading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" aria-label="Loading" />;
  }

  // Not logged in - show sign in link
  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="rounded-full border-2 border-black px-4 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-black hover:text-white"
      >
        Sign In
      </Link>
    );
  }

  // Logged in - show avatar with dropdown
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white">
          {initials}
        </div>
        {/* Premium badge (desktop only) */}
        {isPremium && (
          <span className="hidden rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-xs font-semibold text-white sm:inline">
            PRO
          </span>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {/* User info header */}
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">{displayName}</p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
            {isPremium && (
              <span className="mt-1 inline-block rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-xs font-semibold text-white">
                PRO Member
              </span>
            )}
          </div>

          {/* Usage meter for premium users */}
          {isPremium && (
            <div className="border-b border-gray-100 px-4 py-3">
              <UsageMeter compact />
            </div>
          )}

          {/* Menu items */}
          <div className="py-1">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/projects"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              My Projects
            </Link>
            {!isPremium && (
              <Link
                href="/premium"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50"
              >
                Upgrade to Pro
              </Link>
            )}
          </div>

          {/* Sign out */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleSignOut}
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
