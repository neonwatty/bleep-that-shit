import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WaitlistForm } from './WaitlistForm';

// Mock the modules
vi.mock('@/lib/formspree', () => ({
  submitWaitlistEmail: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  trackWaitlistSignup: vi.fn(),
  trackGoogleAdsConversion: vi.fn(),
}));

vi.mock('@/lib/utm', () => ({
  captureUtmParams: vi.fn(),
}));

import { submitWaitlistEmail } from '@/lib/formspree';
import { trackWaitlistSignup, trackGoogleAdsConversion } from '@/lib/analytics';
import { captureUtmParams } from '@/lib/utm';

describe('WaitlistForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders the form correctly', () => {
    render(<WaitlistForm />);

    expect(screen.getByText('Need to process longer videos?')).toBeInTheDocument();
    expect(screen.getByTestId('waitlist-email-input')).toBeInTheDocument();
    expect(screen.getByTestId('waitlist-submit-button')).toBeInTheDocument();
    expect(screen.getByText('Join Waitlist')).toBeInTheDocument();
  });

  it('captures UTM params on mount', () => {
    render(<WaitlistForm />);

    expect(captureUtmParams).toHaveBeenCalledTimes(1);
  });

  it('displays feature list', () => {
    render(<WaitlistForm />);

    expect(screen.getByText('Videos up to 60+ minutes')).toBeInTheDocument();
    expect(screen.getByText('Save your projects')).toBeInTheDocument();
    expect(screen.getByText('Batch processing')).toBeInTheDocument();
  });

  it('validates email format', async () => {
    render(<WaitlistForm />);

    const input = screen.getByTestId('waitlist-email-input');
    const form = input.closest('form')!;

    await userEvent.type(input, 'invalid-email');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    });
  });

  it('submits email successfully and shows success state', async () => {
    vi.mocked(submitWaitlistEmail).mockResolvedValueOnce({ success: true });

    render(<WaitlistForm />);

    const input = screen.getByTestId('waitlist-email-input');
    const form = input.closest('form')!;

    await userEvent.type(input, 'test@example.com');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("You're on the list!")).toBeInTheDocument();
    });

    expect(submitWaitlistEmail).toHaveBeenCalledWith('test@example.com');
    expect(trackWaitlistSignup).toHaveBeenCalledTimes(1);
    expect(trackGoogleAdsConversion).toHaveBeenCalledTimes(1);
  });

  it('shows error state on submission failure', async () => {
    vi.mocked(submitWaitlistEmail).mockResolvedValueOnce({
      success: false,
      error: 'Network error',
    });

    render(<WaitlistForm />);

    const input = screen.getByTestId('waitlist-email-input');
    const form = input.closest('form')!;

    await userEvent.type(input, 'test@example.com');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    expect(trackWaitlistSignup).not.toHaveBeenCalled();
    expect(trackGoogleAdsConversion).not.toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    // Create a promise that we can control
    let resolveSubmit: (value: { success: boolean }) => void;
    const submitPromise = new Promise<{ success: boolean }>(resolve => {
      resolveSubmit = resolve;
    });
    vi.mocked(submitWaitlistEmail).mockReturnValueOnce(submitPromise);

    render(<WaitlistForm />);

    const input = screen.getByTestId('waitlist-email-input');
    const form = input.closest('form')!;

    await userEvent.type(input, 'test@example.com');
    fireEvent.submit(form);

    // Check loading state
    expect(screen.getByText('Joining...')).toBeInTheDocument();

    // Resolve the submission
    resolveSubmit!({ success: true });

    await waitFor(() => {
      expect(screen.getByText("You're on the list!")).toBeInTheDocument();
    });
  });

  it('disables input and button during loading', async () => {
    let resolveSubmit: (value: { success: boolean }) => void;
    const submitPromise = new Promise<{ success: boolean }>(resolve => {
      resolveSubmit = resolve;
    });
    vi.mocked(submitWaitlistEmail).mockReturnValueOnce(submitPromise);

    render(<WaitlistForm />);

    const input = screen.getByTestId('waitlist-email-input');
    const form = input.closest('form')!;

    await userEvent.type(input, 'test@example.com');
    fireEvent.submit(form);

    // Check disabled state
    expect(input).toBeDisabled();
    expect(screen.getByTestId('waitlist-submit-button')).toBeDisabled();

    // Resolve the submission
    resolveSubmit!({ success: true });

    await waitFor(() => {
      expect(screen.getByText("You're on the list!")).toBeInTheDocument();
    });
  });
});
