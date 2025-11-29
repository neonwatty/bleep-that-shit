'use client';

import { trackEvent } from '@/lib/analytics';

interface Tab {
  id: string;
  label: string;
  enabled: boolean;
  icon?: string;
}

interface BleepTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: Tab[];
}

export function BleepTabs({ activeTab, onTabChange, tabs }: BleepTabsProps) {
  const handleTabChange = (tabId: string) => {
    trackEvent('tab_changed', { tab_id: tabId });
    onTabChange(tabId);
  };
  return (
    <div className="mb-0">
      {/* Tab Bar - File Folder Style */}
      <div className="flex items-end gap-1 px-2" role="tablist">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const isDisabled = !tab.enabled;

          return (
            <button
              key={tab.id}
              onClick={() => tab.enabled && handleTabChange(tab.id)}
              disabled={isDisabled}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              className={`relative px-6 py-3 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? // Active tab - raised, solid background, connected to content
                    'z-20 -mb-px scale-105 rounded-t-lg border-t-4 border-r-2 border-l-2 border-indigo-500 bg-white text-indigo-700 shadow-md'
                  : isDisabled
                    ? // Disabled tab - grayed out, flat
                      'z-0 cursor-not-allowed rounded-t-lg border-t-2 border-r border-l border-gray-300 bg-gray-100 text-gray-400 opacity-60'
                    : // Inactive but enabled - subtle, hoverable
                      'z-10 cursor-pointer rounded-t-lg border-t-2 border-r border-l border-gray-300 bg-gray-50 text-gray-600 hover:scale-102 hover:border-gray-400 hover:bg-gray-100 hover:text-gray-800'
              } ${index > 0 ? '-ml-2' : ''} `}
              style={{
                clipPath: isActive
                  ? 'polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)'
                  : 'polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)',
                paddingLeft: '1.75rem',
                paddingRight: '1.75rem',
              }}
            >
              <div className="flex items-center gap-2 whitespace-nowrap">
                {tab.icon && <span className="text-lg">{tab.icon}</span>}
                <span>{tab.label}</span>
                {isDisabled && (
                  <span className="text-xs" aria-label="Tab locked">
                    🔒
                  </span>
                )}
              </div>

              {/* Tab corner decoration for active tab */}
              {isActive && (
                <>
                  <div
                    className="absolute -bottom-px left-0 h-2 w-2 bg-white"
                    style={{ clipPath: 'polygon(0 0, 100% 100%, 0 100%)' }}
                  />
                  <div
                    className="absolute right-0 -bottom-px h-2 w-2 bg-white"
                    style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                  />
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
