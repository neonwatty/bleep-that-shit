import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hashEmail, hashPhone, hashName, sendMetaEvent } from './capi';

// Meta Conversions API expects PII fields (email, phone, name) to be SHA-256 hashed
// with specific normalization rules per their customer-information-parameters spec:
// https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
//
// Unhashed values are silently accepted but produce 0% match rate, which is invisible
// unless you check the Events Manager diagnostics tab. Unit tests catch this.

describe('hashEmail', () => {
  it('matches Meta spec test vector for test@test.com', () => {
    // This exact hash was observed in Meta's own Graph API Explorer sample payload
    // during Pixel setup (2026-04-15). If this test fails, our hashing produces
    // values that Meta will not match against its user database — all match
    // rates will be zero and conversion tracking degrades silently.
    const expected = 'f660ab912ec121d1b1e928a0bb4bc61b15f5ad44d5efdc4e1c92a25e99b8e44a';
    expect(hashEmail('test@test.com')).toBe(expected);
  });

  it('normalizes case and whitespace before hashing', () => {
    const canonical = hashEmail('test@test.com');
    expect(hashEmail('TEST@TEST.COM')).toBe(canonical);
    expect(hashEmail('Test@Test.COM')).toBe(canonical);
    expect(hashEmail('  test@test.com  ')).toBe(canonical);
    expect(hashEmail('\ttest@test.com\n')).toBe(canonical);
  });

  it('returns undefined for empty/missing input', () => {
    expect(hashEmail(undefined)).toBeUndefined();
    expect(hashEmail('')).toBeUndefined();
    expect(hashEmail('   ')).toBeUndefined();
  });
});

describe('hashPhone', () => {
  it('strips non-digit characters before hashing', () => {
    const canonical = hashPhone('5551234567');
    expect(hashPhone('(555) 123-4567')).toBe(canonical);
    expect(hashPhone('555-123-4567')).toBe(canonical);
    expect(hashPhone('555.123.4567')).toBe(canonical);
    expect(hashPhone('555 123 4567')).toBe(canonical);
  });

  it('preserves country code digits (changes the hash)', () => {
    // +1 prefix produces 11-digit input "15551234567", distinct from 10-digit "5551234567"
    expect(hashPhone('+1 555-123-4567')).not.toBe(hashPhone('555-123-4567'));
    expect(hashPhone('+1 (555) 123-4567')).toBe(hashPhone('15551234567'));
  });

  it('returns undefined when no digits remain after stripping', () => {
    expect(hashPhone(undefined)).toBeUndefined();
    expect(hashPhone('')).toBeUndefined();
    expect(hashPhone('   ')).toBeUndefined();
    expect(hashPhone('---')).toBeUndefined();
    expect(hashPhone('()')).toBeUndefined();
  });
});

describe('hashName', () => {
  it('lowercases and trims before hashing', () => {
    const canonical = hashName('jeremy');
    expect(hashName('Jeremy')).toBe(canonical);
    expect(hashName('JEREMY')).toBe(canonical);
    expect(hashName('  Jeremy  ')).toBe(canonical);
    expect(hashName('\tJeremy\n')).toBe(canonical);
  });

  it('returns undefined for empty/missing input', () => {
    expect(hashName(undefined)).toBeUndefined();
    expect(hashName('')).toBeUndefined();
    expect(hashName('   ')).toBeUndefined();
  });

  it('handles names with internal whitespace (multi-word names)', () => {
    // "van der Berg" should lowercase the whole thing but keep internal spaces
    // (Meta spec does not collapse internal whitespace; only leading/trailing trimmed)
    const a = hashName('Van Der Berg');
    const b = hashName('van der berg');
    expect(a).toBe(b);
  });
});

describe('sendMetaEvent', () => {
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env.NEXT_PUBLIC_META_PIXEL_ID = '2027401758169466';
    process.env.META_CAPI_ACCESS_TOKEN = 'test_access_token';
    delete process.env.META_TEST_EVENT_CODE;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    delete process.env.META_CAPI_ACCESS_TOKEN;
    delete process.env.META_TEST_EVENT_CODE;
    vi.clearAllMocks();
  });

  it('returns { ok: true } on 200 response', async () => {
    fetchMock.mockResolvedValue(new Response('{"events_received":1}', { status: 200 }));
    const result = await sendMetaEvent({
      eventName: 'Purchase',
      userData: { email: 'test@test.com' },
    });
    expect(result.ok).toBe(true);
  });

  it('returns { ok: false, error } when fetch rejects — never throws', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    // Graceful failure is critical: analytics errors must never break the calling
    // handler (Stripe webhook, auth callback, etc). This test proves the try/catch
    // catches network errors instead of bubbling them up.
    const result = await sendMetaEvent({
      eventName: 'Purchase',
      userData: { email: 'test@test.com' },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('network down');
  });

  it('returns { ok: false } when Meta returns non-2xx', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"error":{"message":"Invalid parameter"}}', { status: 400 })
    );
    const result = await sendMetaEvent({
      eventName: 'Purchase',
      userData: {},
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns { ok: false } when NEXT_PUBLIC_META_PIXEL_ID is missing (no network call)', async () => {
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    const result = await sendMetaEvent({
      eventName: 'Purchase',
      userData: {},
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/pixel.?id/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns { ok: false } when META_CAPI_ACCESS_TOKEN is missing (no network call)', async () => {
    delete process.env.META_CAPI_ACCESS_TOKEN;
    const result = await sendMetaEvent({
      eventName: 'Purchase',
      userData: {},
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/access.?token/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs to graph.facebook.com with pixel_id in path and access_token in query', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    await sendMetaEvent({
      eventName: 'Purchase',
      userData: {},
    });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('graph.facebook.com');
    expect(url).toContain('2027401758169466/events');
    expect(url).toContain('access_token=test_access_token');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('hashes email, phone, firstName, lastName in user_data (arrays per Meta spec)', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    await sendMetaEvent({
      eventName: 'Purchase',
      userData: {
        email: 'test@test.com',
        phone: '555-123-4567',
        firstName: 'Jeremy',
        lastName: 'Watt',
      },
    });
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.data[0].user_data.em).toEqual([hashEmail('test@test.com')]);
    expect(body.data[0].user_data.ph).toEqual([hashPhone('555-123-4567')]);
    expect(body.data[0].user_data.fn).toEqual([hashName('Jeremy')]);
    expect(body.data[0].user_data.ln).toEqual([hashName('Watt')]);
  });

  it('passes ip and userAgent through unhashed (client_ip_address / client_user_agent)', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    await sendMetaEvent({
      eventName: 'Purchase',
      userData: {
        ip: '1.2.3.4',
        userAgent: 'Mozilla/5.0',
      },
    });
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.data[0].user_data.client_ip_address).toBe('1.2.3.4');
    expect(body.data[0].user_data.client_user_agent).toBe('Mozilla/5.0');
  });

  it('includes test_event_code when META_TEST_EVENT_CODE env var is set', async () => {
    process.env.META_TEST_EVENT_CODE = 'TEST1234';
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    await sendMetaEvent({ eventName: 'Purchase', userData: {} });
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.test_event_code).toBe('TEST1234');
  });

  it('omits test_event_code when env var is unset (production behavior)', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    await sendMetaEvent({ eventName: 'Purchase', userData: {} });
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.test_event_code).toBeUndefined();
  });

  it('defaults eventTime to current unix timestamp in seconds', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    const before = Math.floor(Date.now() / 1000);
    await sendMetaEvent({ eventName: 'Purchase', userData: {} });
    const after = Math.floor(Date.now() / 1000);
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.data[0].event_time).toBeGreaterThanOrEqual(before);
    expect(body.data[0].event_time).toBeLessThanOrEqual(after);
  });

  it('includes eventId and eventSourceUrl when provided', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    await sendMetaEvent({
      eventName: 'Purchase',
      userData: {},
      eventId: 'stripe_session_abc',
      eventSourceUrl: 'https://bleepthat.sh/success',
    });
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.data[0].event_id).toBe('stripe_session_abc');
    expect(body.data[0].event_source_url).toBe('https://bleepthat.sh/success');
  });

  it('sets action_source to "website" by default', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    await sendMetaEvent({ eventName: 'Purchase', userData: {} });
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.data[0].action_source).toBe('website');
  });

  it('includes customData fields in custom_data', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    await sendMetaEvent({
      eventName: 'Purchase',
      userData: {},
      customData: { value: 9.99, currency: 'USD' },
    });
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.data[0].custom_data.value).toBe(9.99);
    expect(body.data[0].custom_data.currency).toBe('USD');
  });

  it('omits user_data fields for empty/undefined PII (no empty arrays sent)', async () => {
    // Meta rejects user_data fields with empty string values but tolerates missing
    // keys. Test that we send { user_data: {} } rather than { user_data: { em: [] } }
    // when no identifiers are provided.
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    await sendMetaEvent({ eventName: 'Purchase', userData: {} });
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.data[0].user_data.em).toBeUndefined();
    expect(body.data[0].user_data.ph).toBeUndefined();
    expect(body.data[0].user_data.fn).toBeUndefined();
    expect(body.data[0].user_data.ln).toBeUndefined();
  });
});
