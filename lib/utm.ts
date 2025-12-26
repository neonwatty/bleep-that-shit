/**
 * UTM Parameter Capture Utility
 * Captures and persists UTM parameters from URL for attribution tracking
 */

export interface UtmParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null; // Google Ads click ID
}

const UTM_STORAGE_KEY = 'bleep_utm_params';

/**
 * Capture UTM parameters from current URL and store in sessionStorage
 * Should be called on initial page load
 */
export function captureUtmParams(): void {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const utmParams: UtmParams = {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
    gclid: params.get('gclid'),
  };

  // Only store if at least one param exists
  if (Object.values(utmParams).some(v => v !== null)) {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmParams));
  }
}

/**
 * Retrieve stored UTM parameters from sessionStorage
 */
export function getUtmParams(): UtmParams {
  if (typeof window === 'undefined') {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
      gclid: null,
    };
  }

  const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
  if (!stored) {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
      gclid: null,
    };
  }

  try {
    return JSON.parse(stored) as UtmParams;
  } catch {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
      gclid: null,
    };
  }
}

/**
 * Get UTM params as a flat object with only non-null values
 * Useful for including in form submissions
 */
export function getUtmParamsForSubmission(): Record<string, string> {
  const params = getUtmParams();
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value !== null) {
      result[key] = value;
    }
  }

  return result;
}
