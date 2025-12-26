'use client';

import { useState, FormEvent, useEffect } from 'react';
import { submitWaitlistEmail } from '@/lib/formspree';
import { trackWaitlistSignup, trackGoogleAdsConversion } from '@/lib/analytics';
import { captureUtmParams } from '@/lib/utm';

type FormState = 'idle' | 'loading' | 'success' | 'error';

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Capture UTM params on mount
  useEffect(() => {
    captureUtmParams();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setFormState('error');
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setFormState('loading');
    setErrorMessage('');

    const result = await submitWaitlistEmail(email);

    if (result.success) {
      setFormState('success');
      // Track conversions
      trackWaitlistSignup();
      trackGoogleAdsConversion();
    } else {
      setFormState('error');
      setErrorMessage(result.error || 'Something went wrong. Please try again.');
    }
  };

  if (formState === 'success') {
    return (
      <section id="waitlist" data-testid="waitlist-section" className="editorial-section mb-16">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 text-5xl">&#10003;</div>
          <h2
            className="font-inter mb-4 text-2xl font-extrabold text-black sm:text-3xl"
            style={{ lineHeight: 1.1 }}
          >
            You&apos;re on the list!
          </h2>
          <p className="max-w-xl text-base text-gray-800 sm:text-lg">
            Thanks for joining the waitlist. We&apos;ll notify you when Bleep Pro launches with
            support for longer videos and more features.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="waitlist" data-testid="waitlist-section" className="editorial-section mb-16">
      <div className="flex flex-col items-center text-center">
        <h2
          className="font-inter mb-4 text-2xl font-extrabold text-black uppercase sm:text-3xl md:text-4xl"
          style={{ lineHeight: 1.1 }}
        >
          Need to process longer videos?
        </h2>
        <p className="mb-6 max-w-xl text-base text-gray-800 sm:text-lg md:text-xl">
          Join the waitlist for Bleep Pro with support for:
        </p>
        <ul className="mb-6 text-left text-base text-gray-700 sm:text-lg">
          <li className="mb-2 flex items-center gap-2">
            <span className="text-green-600">&#10003;</span>
            Videos up to 60+ minutes
          </li>
          <li className="mb-2 flex items-center gap-2">
            <span className="text-green-600">&#10003;</span>
            Save your projects
          </li>
          <li className="mb-2 flex items-center gap-2">
            <span className="text-green-600">&#10003;</span>
            Batch processing
          </li>
        </ul>

        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
              disabled={formState === 'loading'}
              required
              aria-label="Email address"
              data-testid="waitlist-email-input"
            />
            <button
              type="submit"
              disabled={formState === 'loading'}
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-base font-semibold text-white transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:text-lg"
              data-testid="waitlist-submit-button"
            >
              {formState === 'loading' ? 'Joining...' : 'Join Waitlist'}
            </button>
          </div>
          {formState === 'error' && errorMessage && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          )}
        </form>

        <p className="mt-4 text-sm text-gray-500">
          We&apos;ll only email you about Bleep Pro. No spam.
        </p>
      </div>
    </section>
  );
}
