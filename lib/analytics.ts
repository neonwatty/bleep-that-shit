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
