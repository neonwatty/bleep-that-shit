'use client';

import { useState, useEffect } from 'react';
import { BottomSheet } from './BottomSheet';
import { PremiumBadge, PremiumLockIcon } from './PremiumBadge';

interface SelectOption {
  value: string;
  label: string;
  description?: string;
  isPremium?: boolean;
}

interface MobileSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  onPremiumClick?: (option: SelectOption) => void;
  label?: string;
  placeholder?: string;
  'data-testid'?: string;
}

export function MobileSelect({
  value,
  options,
  onChange,
  onPremiumClick,
  label,
  placeholder = 'Select an option',
  'data-testid': testId,
}: MobileSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Default to mobile (true) to prevent native select from ever rendering on mobile devices
  // This is mobile-first: show custom UI by default, only use native select after confirming desktop
  const [isMobile, setIsMobile] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  // Detect mobile on client side
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setHasChecked(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;

  const handleSelect = (option: SelectOption) => {
    if (option.isPremium && onPremiumClick) {
      onPremiumClick(option);
      setIsOpen(false);
      return;
    }
    onChange(option.value);
    setIsOpen(false);
  };

  // On mobile: Custom button that opens bottom sheet
  if (isMobile) {
    return (
      <>
        <button
          type="button"
          data-testid={testId}
          data-value={value}
          onClick={() => setIsOpen(true)}
          className="min-h-touch flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white p-3 text-left text-base focus:border-transparent focus:ring-2 focus:ring-blue-500"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>{displayValue}</span>
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title={label}>
          <div className="py-2" role="listbox" aria-label={label}>
            {options.map(option => {
              const isSelected = option.value === value;
              const isPremiumLocked = option.isPremium && onPremiumClick;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option)}
                  className={`flex w-full items-start gap-3 rounded-lg px-4 py-4 text-left transition-colors ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  {/* Selection indicator */}
                  <div
                    className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      isPremiumLocked
                        ? 'border-amber-400 bg-amber-50'
                        : isSelected
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isPremiumLocked ? (
                      <PremiumLockIcon />
                    ) : (
                      isSelected && (
                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )
                    )}
                  </div>

                  {/* Option content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-base ${
                          isPremiumLocked
                            ? 'text-gray-600'
                            : isSelected
                              ? 'font-semibold text-blue-900'
                              : 'text-gray-900'
                        }`}
                      >
                        {option.label}
                      </span>
                      {isPremiumLocked && <PremiumBadge variant="badge" size="sm" />}
                    </div>
                    {option.description && (
                      <div className="mt-0.5 text-sm text-gray-500">{option.description}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Done button */}
          <div className="sticky bottom-0 border-t border-gray-200 bg-white p-4 pb-6">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full rounded-lg bg-black py-3 font-semibold text-white transition-colors hover:bg-gray-800 active:bg-gray-900"
            >
              Done
            </button>
          </div>
        </BottomSheet>
      </>
    );
  }

  // On desktop: Native select with premium handling
  const handleDesktopChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    const selectedOpt = options.find(opt => opt.value === selectedValue);
    if (selectedOpt?.isPremium && onPremiumClick) {
      onPremiumClick(selectedOpt);
      // Reset to previous value since premium options can't be selected
      e.target.value = value;
      return;
    }
    onChange(selectedValue);
  };

  return (
    <select
      data-testid={testId}
      value={value}
      onChange={handleDesktopChange}
      className="min-h-touch w-full rounded-lg border border-gray-300 p-2 text-base focus:border-transparent focus:ring-2 focus:ring-blue-500"
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
          {option.isPremium && onPremiumClick ? ' 🔒 PRO' : ''}
        </option>
      ))}
    </select>
  );
}
