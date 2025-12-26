/**
 * Formspree Integration for Waitlist Signups
 */

import { getUtmParamsForSubmission } from './utm';

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mvzoglvl';

export interface WaitlistSubmissionData {
  email: string;
  source: string;
  timestamp: string;
  page_url: string;
  [key: string]: string; // UTM params
}

export interface WaitlistSubmissionResult {
  success: boolean;
  error?: string;
}

/**
 * Submit email to waitlist via Formspree
 */
export async function submitWaitlistEmail(email: string): Promise<WaitlistSubmissionResult> {
  const utmParams = getUtmParamsForSubmission();

  const data: WaitlistSubmissionData = {
    email,
    source: 'bleep_pro_waitlist',
    timestamp: new Date().toISOString(),
    page_url: typeof window !== 'undefined' ? window.location.href : '',
    ...utmParams,
  };

  try {
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Failed to submit (${response.status})`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
