type EventParams = Record<string, string | number | boolean>;

export function trackEvent(eventName: string, params?: EventParams): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}

// Debounced tracker for slider controls - fires on release
export function createDebouncedTracker(
  eventName: string,
  delay = 500
): (params?: EventParams) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (params?: EventParams) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => trackEvent(eventName, params), delay);
  };
}

/**
 * Track waitlist signup event in GA4
 */
export function trackWaitlistSignup(): void {
  trackEvent('waitlist_signup', {
    event_category: 'conversion',
    event_label: 'pro_waitlist',
  });
}

/**
 * Fire Google Ads conversion event
 * Conversion ID: AW-8611321497 (from account 861-132-1497)
 *
 * Note: Since GA4 (bleep-that-sht) is linked to Google Ads, the waitlist_signup
 * event will also appear in Google Ads and can be imported as a conversion there.
 */
export function trackGoogleAdsConversion(): void {
  if (typeof window !== 'undefined' && window.gtag) {
    // Track as GA4 event - this flows to linked Google Ads account automatically
    window.gtag('event', 'generate_lead', {
      currency: 'USD',
      value: 1.0,
    });
  }
}
