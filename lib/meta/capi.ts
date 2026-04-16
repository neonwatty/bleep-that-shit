import { createHash } from 'crypto';

// Meta Conversions API wrapper for bleepthat.sh (Pixel 2027401758169466).
// Spec: https://developers.facebook.com/docs/marketing-api/conversions-api
// PII normalization: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function hashEmail(email?: string): string | undefined {
  if (!email) return undefined;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return undefined;
  return sha256Hex(normalized);
}

export function hashPhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digitsOnly = phone.replace(/\D/g, '');
  if (!digitsOnly) return undefined;
  return sha256Hex(digitsOnly);
}

export function hashName(name?: string): string | undefined {
  if (!name) return undefined;
  const normalized = name.trim().toLowerCase();
  if (!normalized) return undefined;
  return sha256Hex(normalized);
}

export interface MetaUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  ip?: string;
  userAgent?: string;
}

export interface MetaCustomData {
  currency?: string;
  value?: number;
  contentName?: string;
  contentCategory?: string;
  [key: string]: unknown;
}

export interface SendMetaEventInput {
  eventName: string;
  eventTime?: number;
  userData: MetaUserData;
  customData?: MetaCustomData;
  eventId?: string;
  eventSourceUrl?: string;
}

export interface SendMetaEventResult {
  ok: boolean;
  error?: string;
}

const META_GRAPH_API_VERSION = 'v21.0';

export async function sendMetaEvent(input: SendMetaEventInput): Promise<SendMetaEventResult> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) {
    return { ok: false, error: 'Missing NEXT_PUBLIC_META_PIXEL_ID' };
  }

  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) {
    return { ok: false, error: 'Missing META_CAPI_ACCESS_TOKEN' };
  }

  const userData: Record<string, unknown> = {};
  const em = hashEmail(input.userData.email);
  if (em) userData.em = [em];
  const ph = hashPhone(input.userData.phone);
  if (ph) userData.ph = [ph];
  const fn = hashName(input.userData.firstName);
  if (fn) userData.fn = [fn];
  const ln = hashName(input.userData.lastName);
  if (ln) userData.ln = [ln];
  if (input.userData.ip) userData.client_ip_address = input.userData.ip;
  if (input.userData.userAgent) userData.client_user_agent = input.userData.userAgent;

  const event: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
    action_source: 'website',
    user_data: userData,
  };
  if (input.eventId) event.event_id = input.eventId;
  if (input.eventSourceUrl) event.event_source_url = input.eventSourceUrl;
  if (input.customData) event.custom_data = input.customData;

  const payload: Record<string, unknown> = { data: [event] };
  const testEventCode = process.env.META_TEST_EVENT_CODE;
  if (testEventCode) payload.test_event_code = testEventCode;

  const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => `status ${response.status}`);
      return { ok: false, error: `Meta API ${response.status}: ${text}` };
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}
