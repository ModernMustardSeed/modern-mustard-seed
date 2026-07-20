/**
 * SMS engine (Twilio). Sends one-off texts and drains cold-text campaigns with
 * compliance built in: STOP opt-out suppression, TCPA quiet-hours enforcement in
 * the recipient's local time, do-not-text honoring, and optional Twilio Lookup to
 * skip landlines. Everything is gated behind credentials, so with Twilio unset
 * nothing sends and callers get a friendly reason (never a throw).
 *
 * Prefer a Messaging Service SID (TWILIO_MESSAGING_SERVICE_SID) over a bare from
 * number: it carries the A2P 10DLC registration and auto-handles STOP/HELP at the
 * carrier. A from number (TWILIO_SMS_FROM) is supported as a fallback.
 */
import twilio, { type Twilio } from 'twilio';
import { getSupabase } from '@/lib/supabase';

let cached: Twilio | null = null;

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    (process.env.TWILIO_AUTH_TOKEN || (process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET)) &&
    (process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_SMS_FROM)
  );
}

/**
 * Credentials being present is NOT the same as carriers accepting our traffic.
 * Until the A2P 10DLC campaign is APPROVED, every send is accepted by Twilio and
 * then bounced by the carrier with error 30034, which looks like a broken
 * product to a visitor. So anything customer-facing gates on this instead:
 * SMS_A2P_READY is set to 'true' only once the campaign is actually approved.
 *
 * Keeping the two checks separate means the admin can build and queue campaigns
 * today while the public site keeps its working tap-to-text fallback.
 */
export function smsSendable(): boolean {
  return smsConfigured() && process.env.SMS_A2P_READY === 'true';
}

/**
 * Twilio client. Prefers an API key pair (SK.../secret) over the account auth
 * token: an API key can be revoked and re-minted on its own, so a leaked or
 * rotated key never forces an account-wide token rotation that would take every
 * other integration down with it. Falls back to the account token when no key
 * is set, which keeps older environments working untouched.
 */
function client(): Twilio | null {
  if (cached) return cached;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  if (!sid) return null;
  const keySid = process.env.TWILIO_API_KEY_SID;
  const keySecret = process.env.TWILIO_API_KEY_SECRET;
  if (keySid && keySecret) {
    cached = twilio(keySid, keySecret, { accountSid: sid });
    return cached;
  }
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return null;
  cached = twilio(sid, token);
  return cached;
}

/** Public base URL for status/inbound webhooks. */
function baseUrl(): string {
  return (
    process.env.PUBLIC_BASE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    'https://modernmustardseed.com'
  );
}

// ── Phone normalization (US default) ─────────────────────────────

/** To E.164, assuming US when no country code. Returns null if not a plausible number. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (hasPlus) return digits.length >= 10 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length > 11) return `+${digits}`;
  return null;
}

export function areaCode(e164: string): string | null {
  const m = /^\+1(\d{3})/.exec(e164);
  return m ? m[1] : null;
}

// ── Quiet hours (TCPA: no texts before 8a / after 9p local) ──────
// Best-effort recipient timezone by area code, covering the markets we work plus
// major metros. Unknown codes default to Central. We enforce a conservative
// 9a-8p window. Approximate, documented, and can be tightened per campaign.
const AC_TZ: Record<string, string> = {
  // Mountain (our home base + AZ)
  '406': 'America/Denver', '303': 'America/Denver', '720': 'America/Denver', '970': 'America/Denver',
  '385': 'America/Denver', '801': 'America/Denver', '208': 'America/Denver', '505': 'America/Denver',
  '575': 'America/Denver', '307': 'America/Denver', '602': 'America/Phoenix', '480': 'America/Phoenix',
  '520': 'America/Phoenix', '623': 'America/Phoenix', '928': 'America/Phoenix',
  // Pacific
  '206': 'America/Los_Angeles', '253': 'America/Los_Angeles', '360': 'America/Los_Angeles', '425': 'America/Los_Angeles',
  '503': 'America/Los_Angeles', '971': 'America/Los_Angeles', '213': 'America/Los_Angeles', '310': 'America/Los_Angeles',
  '323': 'America/Los_Angeles', '408': 'America/Los_Angeles', '415': 'America/Los_Angeles', '510': 'America/Los_Angeles',
  '619': 'America/Los_Angeles', '650': 'America/Los_Angeles', '702': 'America/Los_Angeles', '775': 'America/Los_Angeles',
  '916': 'America/Los_Angeles', '925': 'America/Los_Angeles', '949': 'America/Los_Angeles', '858': 'America/Los_Angeles',
  // Central (TX, OK, most of the middle)
  '512': 'America/Chicago', '737': 'America/Chicago', '210': 'America/Chicago', '214': 'America/Chicago',
  '469': 'America/Chicago', '972': 'America/Chicago', '713': 'America/Chicago', '281': 'America/Chicago',
  '832': 'America/Chicago', '817': 'America/Chicago', '682': 'America/Chicago', '409': 'America/Chicago',
  '405': 'America/Chicago', '918': 'America/Chicago', '539': 'America/Chicago', '580': 'America/Chicago',
  '312': 'America/Chicago', '773': 'America/Chicago', '847': 'America/Chicago', '612': 'America/Chicago',
  '615': 'America/Chicago', '901': 'America/Chicago', '504': 'America/Chicago', '314': 'America/Chicago',
  // Eastern (FL + the east)
  '305': 'America/New_York', '786': 'America/New_York', '813': 'America/New_York', '727': 'America/New_York',
  '407': 'America/New_York', '321': 'America/New_York', '904': 'America/New_York', '561': 'America/New_York',
  '954': 'America/New_York', '212': 'America/New_York', '646': 'America/New_York', '718': 'America/New_York',
  '917': 'America/New_York', '202': 'America/New_York', '404': 'America/New_York', '470': 'America/New_York',
  '617': 'America/New_York', '215': 'America/New_York', '412': 'America/New_York', '216': 'America/New_York',
};

export function timezoneForPhone(e164: string): string {
  const ac = areaCode(e164);
  return (ac && AC_TZ[ac]) || 'America/Chicago';
}

/** The recipient's current local hour (0-23), best-effort by area code. */
export function localHourForPhone(e164: string, now: Date = new Date()): number {
  const tz = timezoneForPhone(e164);
  try {
    const h = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz }).format(now);
    return Number(h) % 24;
  } catch {
    return now.getHours();
  }
}

/** True if it is a safe texting hour (9a-8p) in the recipient's local time. */
export function withinQuietHours(e164: string, now: Date = new Date()): boolean {
  const h = localHourForPhone(e164, now);
  return h >= 9 && h < 20;
}

// ── Opt-out (STOP) suppression ───────────────────────────────────

const STOP_WORDS = new Set(['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit', 'optout', 'opt-out', 'remove']);
export function isStopKeyword(body: string): boolean {
  const w = (body || '').trim().toLowerCase().replace(/[^a-z-]/g, '');
  return STOP_WORDS.has(w);
}

export async function isOptedOut(e164: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data } = await sb.from('sms_opt_outs').select('phone').eq('phone', e164).maybeSingle();
  return Boolean(data);
}

export async function addOptOut(e164: string, reason: string, source: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('sms_opt_outs').upsert(
    { phone: e164, reason, source, created_at: new Date().toISOString() },
    { onConflict: 'phone', ignoreDuplicates: true }
  ).then(() => {}, () => {});
}

// ── Line-type lookup (skip landlines that can't receive SMS) ─────

export async function lineType(e164: string): Promise<'mobile' | 'landline' | 'voip' | 'unknown'> {
  const c = client();
  if (!c) return 'unknown';
  try {
    const res = await c.lookups.v2.phoneNumbers(e164).fetch({ fields: 'line_type_intelligence' });
    const t = (res.lineTypeIntelligence?.type || '').toLowerCase();
    if (t.includes('mobile')) return 'mobile';
    if (t.includes('landline') || t.includes('fixed')) return 'landline';
    if (t.includes('voip') || t.includes('nonFixedVoip'.toLowerCase())) return 'voip';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

// ── Send ─────────────────────────────────────────────────────────

export type SmsSendResult = { ok: boolean; sid?: string; status?: string; error?: string };

/** Low-level send. Does NOT screen (caller must gate on opt-out/quiet hours). */
export async function sendSms(to: string, body: string, opts: { statusCallback?: boolean } = {}): Promise<SmsSendResult> {
  const c = client();
  if (!c) return { ok: false, error: 'Twilio not configured' };
  const e164 = normalizePhone(to);
  if (!e164) return { ok: false, error: 'Invalid phone number' };
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const from = process.env.TWILIO_SMS_FROM;
  if (!messagingServiceSid && !from) return { ok: false, error: 'No Twilio sender configured' };
  try {
    const msg = await c.messages.create({
      to: e164,
      body,
      ...(messagingServiceSid ? { messagingServiceSid } : { from }),
      ...(opts.statusCallback === false ? {} : { statusCallback: `${baseUrl()}/api/sms/status` }),
    });
    return { ok: true, sid: msg.sid, status: msg.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
