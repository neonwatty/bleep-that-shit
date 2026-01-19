'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { isAuthEnabled } from '@/lib/config/featureFlags';

interface TabItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchPaths?: string[];
}

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg
    className={`h-6 w-6 ${active ? 'text-black' : 'text-gray-500'}`}
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={active ? 0 : 2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const BleepIcon = ({ active }: { active: boolean }) => (
  <svg
    className={`h-6 w-6 ${active ? 'text-black' : 'text-gray-500'}`}
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={active ? 0 : 2}
      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
    />
  </svg>
);

const SamplerIcon = ({ active }: { active: boolean }) => (
  <svg
    className={`h-6 w-6 ${active ? 'text-black' : 'text-gray-500'}`}
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={active ? 0 : 2}
      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
    />
  </svg>
);

const AccountIcon = ({ active }: { active: boolean }) => (
  <svg
    className={`h-6 w-6 ${active ? 'text-black' : 'text-gray-500'}`}
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={active ? 0 : 2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const baseTabs: TabItem[] = [
  {
    href: '/',
    label: 'Home',
    icon: <HomeIcon active={false} />,
    matchPaths: ['/'],
  },
  {
    href: '/bleep',
    label: 'Bleep',
    icon: <BleepIcon active={false} />,
    matchPaths: ['/bleep'],
  },
  {
    href: '/sampler',
    label: 'Sampler',
    icon: <SamplerIcon active={false} />,
    matchPaths: ['/sampler'],
  },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Hide on premium page, blog pages, and dashboard pages (dashboard has its own nav)
  if (
    pathname === '/premium' ||
    pathname?.startsWith('/blog') ||
    pathname?.startsWith('/dashboard')
  ) {
    return null;
  }

  // Build tabs array - add Account tab if user is logged in and auth is enabled
  const tabs: TabItem[] = [...baseTabs];
  if (isAuthEnabled && user) {
    tabs.push({
      href: '/dashboard',
      label: 'Account',
      icon: <AccountIcon active={false} />,
      matchPaths: ['/dashboard', '/dashboard/projects', '/dashboard/settings'],
    });
  }

  const isActive = (tab: TabItem) => {
    if (tab.matchPaths) {
      return tab.matchPaths.some(path => pathname === path);
    }
    return pathname === tab.href;
  };

  return (
    <nav
      data-testid="bottom-tab-bar"
      className="fixed right-0 bottom-0 left-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm md:hidden"
    >
      {/* Safe area padding for iOS */}
      <div className="pb-safe flex items-center justify-around">
        {tabs.map(tab => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 px-2 py-3 transition-colors ${
                active ? 'text-black' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {/* Re-render icon with active state */}
              {tab.href === '/' && <HomeIcon active={active} />}
              {tab.href === '/bleep' && <BleepIcon active={active} />}
              {tab.href === '/sampler' && <SamplerIcon active={active} />}
              {tab.href === '/dashboard' && <AccountIcon active={active} />}
              <span
                className={`text-xs font-medium ${active ? 'font-semibold text-black' : 'text-gray-500'}`}
              >
                {tab.label}
              </span>
              {/* Active indicator dot */}
              {active && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-black" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
