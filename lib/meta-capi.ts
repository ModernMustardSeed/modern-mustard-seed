import { createHash } from 'node:crypto';

/**
 * Meta Conversions API (server-side). Sends conversion events straight to
 * Meta from the server, so conversions survive ad blockers, iOS, and
 * cookie loss, and so server-only conversions (phone/voice bookings) get
 * attributed at all.
 *
 * Env (set in Vercel; the token is secret, do NOT prefix NEXT_PUBLIC):
 *   META_PIXEL_ID                  (same id as NEXT_PUBLIC_META_PIXEL_ID)
 *   META_CONVERSIONS_API_TOKEN     (Events Manager -> Settings -> Conversions API token)
 *   META_TEST_EVENT_CODE           (optional; set while QA-ing in Events Manager -> Test events)
 *
 * Dedup: when the browser Pixel also fires the same event, pass the SAME
 * `eventId` here and to `fbq('track', name, data, { eventID })`. Meta dedupes
 * by event_name + event_id.
 *
 * No-ops (returns immediately) unless both PIXEL_ID and TOKEN are set, so it
 * is safe to ship before the ad account exists.
 */

const PIXEL_ID = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
const TOKEN = process.env.META_CONVERSIONS_API_TOKEN || '';
const TEST_CODE = process.env.META_TEST_EVENT_CODE || '';
const API_VERSION = 'v21.0';

export const metaCapiEnabled = Boolean(PIXEL_ID && TOKEN);

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

/** Meta wants email lowercased + trimmed, phone as digits only, then SHA-256. */
function hashEmail(email?: string | null): string | undefined {
  const e = (email || '').trim().toLowerCase();
  return e ? sha256(e) : undefined;
}
function hashPhone(phone?: string | null): string | undefined {
  const p = (phone || '').replace(/[^0-9]/g, '');
  return p ? sha256(p) : undefined;
}

export type MetaEventName = 'Lead' | 'Schedule' | 'Purchase' | 'CompleteRegistration' | 'Contact';

export type MetaServerEvent = {
  eventName: MetaEventName;
  eventId: string;
  email?: string | null;
  phone?: string | null;
  /** Browser cookies for ad-click matching (best attribution). */
  fbp?: string | null;
  fbc?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  eventSourceUrl?: string | null;
  value?: number;
  currency?: string;
  /** Free-form, e.g. { lead_source: 'voice-agents' }. */
  customData?: Record<string, unknown>;
};

/** Pull IP, UA, and the fb cookies off an incoming request (best match quality). */
export function metaContextFromRequest(req: Request): {
  clientIp: string | null;
  userAgent: string | null;
  fbp: string | null;
  fbc: string | null;
} {
  const h = req.headers;
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    h.get('x-vercel-forwarded-for') ||
    null;
  const cookie = h.get('cookie') || '';
  const read = (name: string) => {
    const m = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : null;
  };
  return { clientIp: ip, userAgent: h.get('user-agent'), fbp: read('_fbp'), fbc: read('_fbc') };
}

/** Send one event to the Meta Conversions API. Never throws. */
export async function sendMetaEvent(ev: MetaServerEvent): Promise<{ ok: boolean; error?: string }> {
  if (!metaCapiEnabled) return { ok: false, error: 'disabled' };
  try {
    const userData: Record<string, unknown> = {};
    const em = hashEmail(ev.email);
    const ph = hashPhone(ev.phone);
    if (em) userData.em = [em];
    if (ph) userData.ph = [ph];
    if (ev.fbp) userData.fbp = ev.fbp;
    if (ev.fbc) userData.fbc = ev.fbc;
    if (ev.clientIp) userData.client_ip_address = ev.clientIp;
    if (ev.userAgent) userData.client_user_agent = ev.userAgent;

    const customData: Record<string, unknown> = { ...(ev.customData || {}) };
    if (typeof ev.value === 'number') {
      customData.value = ev.value;
      customData.currency = ev.currency || 'USD';
    }

    const body: Record<string, unknown> = {
      data: [
        {
          event_name: ev.eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: ev.eventId,
          action_source: 'website',
          ...(ev.eventSourceUrl ? { event_source_url: ev.eventSourceUrl } : {}),
          user_data: userData,
          ...(Object.keys(customData).length ? { custom_data: customData } : {}),
        },
      ],
      ...(TEST_CODE ? { test_event_code: TEST_CODE } : {}),
    };

    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${TOKEN}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`meta CAPI ${ev.eventName} FAILED`, res.status, text.slice(0, 300));
      return { ok: false, error: `${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('meta CAPI threw', err);
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

/**
 * Convenience for server endpoints that receive a fetch Request: pulls IP/UA/
 * cookies off the request, merges any client-passed eventId/fbp/fbc, and sends.
 */
export async function trackServerConversion(
  req: Request,
  opts: {
    eventName: MetaEventName;
    email?: string | null;
    phone?: string | null;
    eventId?: string | null;
    fbp?: string | null;
    fbc?: string | null;
    value?: number;
    currency?: string;
    eventSourceUrl?: string | null;
    customData?: Record<string, unknown>;
  }
): Promise<void> {
  if (!metaCapiEnabled) return;
  const ctx = metaContextFromRequest(req);
  await sendMetaEvent({
    eventName: opts.eventName,
    // Prefer the client-supplied id (for Pixel dedup); otherwise mint one.
    eventId: opts.eventId || `srv-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    email: opts.email,
    phone: opts.phone,
    fbp: opts.fbp ?? ctx.fbp,
    fbc: opts.fbc ?? ctx.fbc,
    clientIp: ctx.clientIp,
    userAgent: ctx.userAgent,
    eventSourceUrl: opts.eventSourceUrl ?? req.headers.get('referer'),
    value: opts.value,
    currency: opts.currency,
    customData: opts.customData,
  });
}
