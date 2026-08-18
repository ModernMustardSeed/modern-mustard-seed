/**
 * REQUEST A MUSTARD DEMO CALL.
 *
 * The single server-side operation behind every entry point. A browser never
 * touches Vapi; it posts here, and this validates, records consent, resolves or
 * creates the CRM record, checks the abuse limits, and only then asks the
 * existing telephony path to dial.
 *
 * THE ORDER IS THE DESIGN:
 *
 *   validate → dedupe → CONSENT → CRM → limits → dial
 *
 * Consent is written before anything can dial, so a crash between the two
 * leaves a person who consented and was not called (recoverable, and the queue
 * retries it) rather than a person who was called without a record (not
 * recoverable, and indefensible).
 *
 * ⚠️ /mustard is a doorway, not a robocall gun. The limits below exist because
 * a form that dials any number a stranger types is one bored teenager away from
 * being an attack tool aimed at somebody else's phone.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { recordConsent, toE164, CURRENT_CONSENT, consentVersion } from '@/lib/acq/consent';
import { placeDemoCall } from '@/lib/acq/call';
import { getAcqSettings, gate, getCampaign } from '@/lib/acq/settings';
import { recordEvent } from '@/lib/acq/events';
import { enqueue, cancelPendingFor } from '@/lib/acq/queue';
import { keysFor, phoneDigits } from '@/lib/acq/dedupe';
import { activeSuppressions } from '@/lib/email-log';
import type { AcqProspect, Trade } from '@/lib/acq/types';
import { getSurface, type Attribution, type MustardSurface } from '@/lib/mustard/surface';
import { markLinkUsed, resolveLink } from '@/lib/mustard/links';

export type DemoCallInput = {
  surfaceSlug?: string;
  phone: string;
  businessName?: string | null;
  contactName?: string | null;
  consent: boolean;
  consentVersionId?: string;
  typedName?: string | null;
  token?: string | null;
  attribution: Attribution;
  ip: string | null;
  userAgent: string | null;
  sessionId?: string | null;
  /** Sent by the browser so a double-click cannot become two calls. */
  idempotencyKey?: string | null;
};

export type DemoCallResult =
  | { ok: true; requestId: string; leadId: string; status: 'calling' | 'queued'; phone: string; message: string }
  | { ok: false; code: DemoCallError; error: string; retryAfterSeconds?: number };

export type DemoCallError =
  | 'bad-phone'
  | 'no-consent'
  | 'suppressed'
  | 'cooldown'
  | 'rate-limited'
  | 'surface-off'
  | 'not-configured'
  | 'server';

/* ───────────────────────────── abuse defense ────────────────────────────── */

type LimitVerdict = { ok: true } | { ok: false; code: 'cooldown' | 'rate-limited'; error: string; retryAfterSeconds: number };

/**
 * Adaptive rather than always burdensome. A first-time visitor sees nothing. A
 * number that was just called waits out a cooldown. An address firing numbers
 * at us is stopped at the hour and again at the day.
 *
 * The request row is written BEFORE these checks run, so every query here
 * excludes it by id. Without that exclusion the row this attempt just inserted
 * matched its own cooldown window, and /mustard refused every caller it ever
 * saw with "he called that number a moment ago".
 */
async function checkLimits(
  db: SupabaseClient,
  surface: MustardSurface,
  phoneE164: string,
  ip: string | null,
  /** The row this attempt just wrote. It must never be counted against itself. */
  requestId: string,
): Promise<LimitVerdict> {
  const now = Date.now();
  const dayAgo = new Date(now - 86400_000).toISOString();
  const hourAgo = new Date(now - 3600_000).toISOString();

  // One live call per number. Two Mr. Mustards on one line is worse than none.
  const { data: live } = await db
    .from('mustard_requests')
    .select('id,created_at,status')
    .eq('phone_e164', phoneE164)
    .neq('id', requestId)
    .in('status', ['calling', 'connected'])
    .gte('created_at', new Date(now - 30 * 60_000).toISOString())
    .limit(1);
  if ((live ?? []).length) {
    return { ok: false, code: 'cooldown', error: 'He is already calling that number. Check your phone.', retryAfterSeconds: 120 };
  }

  const { data: recent } = await db
    .from('mustard_requests')
    .select('created_at')
    .eq('phone_e164', phoneE164)
    .neq('id', requestId)
    .neq('status', 'refused')
    .gte('created_at', new Date(now - surface.cooldown_minutes * 60_000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1);
  if ((recent ?? []).length) {
    const since = now - new Date((recent as { created_at: string }[])[0].created_at).getTime();
    const wait = Math.max(30, Math.ceil((surface.cooldown_minutes * 60_000 - since) / 1000));
    return {
      ok: false,
      code: 'cooldown',
      error: `He called that number a moment ago. Give him ${Math.ceil(wait / 60)} minute${Math.ceil(wait / 60) === 1 ? '' : 's'} and try again.`,
      retryAfterSeconds: wait,
    };
  }

  const { count: perPhoneDay } = await db
    .from('mustard_requests')
    .select('id', { count: 'exact', head: true })
    .eq('phone_e164', phoneE164)
    .neq('id', requestId)
    .neq('status', 'refused')
    .gte('created_at', dayAgo);
  if ((perPhoneDay ?? 0) >= surface.max_per_phone_per_day) {
    return { ok: false, code: 'rate-limited', error: 'That number has had its demos for today. Email sarah@modernmustardseed.com and she will sort it out.', retryAfterSeconds: 3600 };
  }

  if (ip) {
    const { count: perIpHour } = await db
      .from('mustard_requests')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .neq('id', requestId)
      .neq('status', 'refused')
      .gte('created_at', hourAgo);
    if ((perIpHour ?? 0) >= surface.max_per_ip_per_hour) {
      return { ok: false, code: 'rate-limited', error: 'Too many requests from this connection in the last hour.', retryAfterSeconds: 900 };
    }
    const { count: perIpDay } = await db
      .from('mustard_requests')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .neq('id', requestId)
      .neq('status', 'refused')
      .gte('created_at', dayAgo);
    if ((perIpDay ?? 0) >= surface.max_per_ip_per_day) {
      return { ok: false, code: 'rate-limited', error: 'Too many requests from this connection today.', retryAfterSeconds: 3600 };
    }
  }

  return { ok: true };
}

/* ─────────────────────────── the operation ──────────────────────────────── */

export async function requestMustardDemoCall(input: DemoCallInput): Promise<DemoCallResult> {
  const db = getSupabase();
  if (!db) return { ok: false, code: 'server', error: 'We cannot take that right now. Try again in a minute.' };

  const surface = await getSurface(input.surfaceSlug, db);
  if (!surface.active) return { ok: false, code: 'surface-off', error: 'Demo calls are paused right now.' };

  /* ── validate ── */

  const phoneE164 = toE164(input.phone);
  if (!phoneE164) {
    return { ok: false, code: 'bad-phone', error: 'That does not look like a US phone number. Enter 10 digits.' };
  }
  if (!input.consent) {
    return { ok: false, code: 'no-consent', error: 'Please check the box so Mr. Mustard is allowed to call you.' };
  }
  const version = consentVersion(input.consentVersionId ?? surface.consent_version) ?? CURRENT_CONSENT;

  /* ── idempotency: a double-clicked button is one call ── */

  const idempotencyKey = input.idempotencyKey?.slice(0, 120) || null;
  if (idempotencyKey) {
    const { data: prior } = await db
      .from('mustard_requests')
      .select('id,lead_id,status,phone_e164')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (prior) {
      return {
        ok: true,
        requestId: prior.id as string,
        leadId: (prior.lead_id as string) ?? '',
        status: prior.status === 'calling' || prior.status === 'connected' ? 'calling' : 'queued',
        phone: (prior.phone_e164 as string) ?? phoneE164,
        message: 'Already on it. Check your phone.',
      };
    }
  }

  /* ── the magic link, when there is one ── */

  let linkLeadId: string | null = null;
  let linkId: string | null = null;
  let source = input.attribution.source;
  if (input.token) {
    const link = await resolveLink(db, input.token);
    if (link.ok) {
      linkLeadId = link.prefill.leadId;
      linkId = link.prefill.linkId;
      source = link.prefill.source || source;
      await markLinkUsed(db, link.prefill.linkId);
    }
    // An expired or unknown token is NOT an error here. They still typed a
    // number and still consented, so they still get their call; they simply
    // arrive as a fresh prospect instead of a known one.
  }

  /* ── the request row, written before anything else can happen ── */

  const { data: reqRow, error: reqErr } = await db
    .from('mustard_requests')
    .insert({
      surface_id: surface.id || null,
      lead_id: linkLeadId,
      link_id: linkId,
      source,
      utm_source: input.attribution.utm_source,
      utm_medium: input.attribution.utm_medium,
      utm_campaign: input.attribution.utm_campaign,
      utm_content: input.attribution.utm_content,
      utm_term: input.attribution.utm_term,
      referrer: input.attribution.referrer,
      landing_url: input.attribution.landing_url,
      phone_e164: phoneE164,
      phone_as_typed: String(input.phone).slice(0, 40),
      business_name: input.businessName?.slice(0, 200) ?? null,
      contact_name: input.contactName?.slice(0, 200) ?? null,
      status: 'started',
      ip: input.ip?.slice(0, 64) ?? null,
      user_agent: input.userAgent?.slice(0, 500) ?? null,
      session_id: input.sessionId?.slice(0, 80) ?? null,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single();
  if (reqErr || !reqRow) {
    // A unique violation here means the same idempotency key landed twice in
    // the same instant. That is a success, not a failure.
    if (reqErr?.code === '23505') {
      return { ok: true, requestId: '', leadId: '', status: 'queued', phone: phoneE164, message: 'Already on it. Check your phone.' };
    }
    return { ok: false, code: 'server', error: 'We could not save that. Try again.' };
  }
  const requestId = reqRow.id as string;

  const refuse = async (code: DemoCallError, error: string, retryAfterSeconds?: number): Promise<DemoCallResult> => {
    await db.from('mustard_requests').update({ status: 'refused', refused_reason: error.slice(0, 300) }).eq('id', requestId);
    return { ok: false, code, error, ...(retryAfterSeconds ? { retryAfterSeconds } : {}) };
  };

  /* ── the abuse limits ── */

  const limits = await checkLimits(db, surface, phoneE164, input.ip, requestId);
  if (!limits.ok) return refuse(limits.code, limits.error, limits.retryAfterSeconds);

  /* ── resolve or create the prospect ── */

  const lead = await resolveLead(db, {
    leadId: linkLeadId,
    phoneE164,
    phoneTyped: input.phone,
    businessName: input.businessName ?? null,
    contactName: input.contactName ?? null,
    source,
    attribution: input.attribution,
  });
  if (!lead) return refuse('server', 'We could not save that. Try again.');

  // Somebody who asked to be left alone does not get called because they found
  // a link. This is checked here even though the address may be blank, because
  // a known prospect carries one.
  if (lead.unsubscribed_at || lead.status === 'dnc' || lead.dnc_checked) {
    return refuse('suppressed', 'That number is on our do-not-contact list, and it stays there. Email sarah@modernmustardseed.com if that is wrong.');
  }
  if (lead.email) {
    try {
      const supp = await activeSuppressions([lead.email]);
      if (supp.size > 0) {
        return refuse('suppressed', 'That contact asked us to stop, and we honour it. Email sarah@modernmustardseed.com if that is wrong.');
      }
    } catch {
      // An unreadable suppression list is not a reason to refuse a call the
      // person just explicitly asked for by phone. The email gate elsewhere
      // still fails closed; this one does not.
    }
  }

  /* ── consent, before anything dials ── */

  const campaign = await getCampaign();
  const consent = await recordConsent(db, {
    leadId: lead.id,
    campaignId: campaign?.id ?? null,
    phoneAsTyped: input.phone,
    businessName: input.businessName ?? lead.business_name,
    contactName: input.contactName ?? lead.contact_name,
    website: lead.website,
    checkboxChecked: true,
    typedName: input.typedName ?? input.contactName ?? null,
    versionId: version.id,
    ip: input.ip,
    userAgent: input.userAgent,
    sourceCampaign: source,
    sourceVariant: input.attribution.utm_content,
    referer: input.attribution.referrer,
  });
  if (!consent.ok) return refuse('no-consent', consent.error);

  const now = new Date().toISOString();
  await db
    .from('mustard_requests')
    .update({ lead_id: lead.id, consent_id: consent.id, status: 'consented', consented_at: now })
    .eq('id', requestId);
  await db
    .from('outbound_leads')
    .update({
      consent_status: 'granted',
      consent_at: now,
      consent_id: consent.id,
      call_stage: 'requested',
      acq_stage: 'consented',
      reservoir_state: 'consented',
      last_touch_source: source,
    })
    .eq('id', lead.id);

  await recordEvent(db, {
    leadId: lead.id,
    campaignId: campaign?.id ?? null,
    type: 'consent_captured',
    label: `Mr. Mustard demo requested from ${source}`,
    detail: { source, requestId, utm: input.attribution },
  });

  // They asked to be called. Nothing cold should chase them any more.
  await cancelPendingFor(db, lead.id, ['email'], 'They asked for the call, so the cold sequence stops.');

  /* ── dial ── */

  const settings = await getAcqSettings();
  const callsAllowed = gate(settings, 'calls');
  if (!callsAllowed.allowed) {
    await enqueue(db, {
      kind: 'call',
      leadId: lead.id,
      campaignId: campaign?.id ?? null,
      step: 1,
      payload: { phone: phoneE164, consentId: consent.id, mustardRequestId: requestId },
    });
    await db.from('mustard_requests').update({ status: 'calling', called_at: now, outcome: 'queued' }).eq('id', requestId);
    return {
      ok: true,
      requestId,
      leadId: lead.id,
      status: 'queued',
      phone: phoneE164,
      message: 'You are on the list. Mr. Mustard will ring you shortly.',
    };
  }

  const placed = await placeDemoCall({
    lead,
    phoneE164,
    consentId: consent.id,
    consentAt: now,
    campaignId: campaign?.id ?? null,
    attempt: (lead.call_attempts ?? 0) + 1,
  });

  if (!placed.ok) {
    // The consent stands and the person is waiting, so this becomes queued work
    // rather than a dead end. Never silently fail on somebody who just asked.
    await enqueue(db, {
      kind: 'call',
      leadId: lead.id,
      campaignId: campaign?.id ?? null,
      step: 1,
      runAfter: new Date(Date.now() + 60_000),
      payload: { phone: phoneE164, consentId: consent.id, mustardRequestId: requestId },
    });
    await db
      .from('mustard_requests')
      .update({ status: placed.reason === 'duplicate' ? 'calling' : 'failed', error: `${placed.reason}: ${placed.detail ?? ''}`.slice(0, 300), called_at: now })
      .eq('id', requestId);

    return placed.reason === 'duplicate'
      ? { ok: true, requestId, leadId: lead.id, status: 'calling', phone: phoneE164, message: 'He is already calling that number. Check your phone.' }
      : {
          ok: true,
          requestId,
          leadId: lead.id,
          status: 'queued',
          phone: phoneE164,
          message: 'He hit a snag getting on the line. It is queued and he will ring you in a minute.',
        };
  }

  await db
    .from('mustard_requests')
    .update({ status: 'calling', called_at: now, call_id: placed.acqCallId, vapi_call_id: placed.vapiCallId })
    .eq('id', requestId);

  return { ok: true, requestId, leadId: lead.id, status: 'calling', phone: phoneE164, message: 'Mr. Mustard is calling you.' };
}

/* ──────────────────────── resolve or create the prospect ────────────────── */

async function resolveLead(
  db: SupabaseClient,
  args: {
    leadId: string | null;
    phoneE164: string;
    phoneTyped: string;
    businessName: string | null;
    contactName: string | null;
    source: string;
    attribution: Attribution;
  },
): Promise<AcqProspect | null> {
  const digits = phoneDigits(args.phoneE164);

  // A magic link names the prospect outright.
  if (args.leadId) {
    const { data } = await db.from('outbound_leads').select('*').eq('id', args.leadId).maybeSingle();
    if (data) return data as AcqProspect;
  }

  // Otherwise the phone number is the identity. This is what stops /mustard
  // from producing a fresh duplicate every time somebody tries it twice.
  if (digits) {
    const { data: byKey } = await db.from('outbound_leads').select('*').eq('phone_digits', digits).limit(1);
    if ((byKey ?? []).length) return (byKey as AcqProspect[])[0];
    // Older rows predate phone_digits, so fall back to a suffix match on the
    // raw column rather than creating a duplicate of somebody we already know.
    const { data: byRaw } = await db.from('outbound_leads').select('*').ilike('phone', `%${digits.slice(-7)}%`).limit(5);
    const match = (byRaw ?? []).find((r) => phoneDigits((r as { phone: string }).phone) === digits);
    if (match) return match as AcqProspect;
  }

  const keys = keysFor({ business_name: args.businessName ?? `Caller ${digits.slice(-4)}`, phone: args.phoneTyped });
  const stamp = new Date().toISOString();
  const { data: created } = await db
    .from('outbound_leads')
    .insert({
      business_name: (args.businessName || `Mr. Mustard caller ${digits.slice(-4)}`).slice(0, 200),
      contact_name: args.contactName?.slice(0, 200) ?? null,
      phone: args.phoneTyped.slice(0, 40),
      niche: 'other',
      trade: guessTrade(args.businessName ?? ''),
      status: 'callback',
      source: `mustard:${args.source}`,
      acq_stage: 'consented',
      reservoir_state: 'consented',
      imported_at: stamp,
      first_touch_source: args.source,
      first_touch_at: stamp,
      last_touch_source: args.source,
      utm_source: args.attribution.utm_source,
      utm_medium: args.attribution.utm_medium,
      utm_campaign: args.attribution.utm_campaign,
      utm_content: args.attribution.utm_content,
      utm_term: args.attribution.utm_term,
      notes: `Walked up to /mustard from ${args.source} and asked for the call themselves.`,
      ...keys,
    })
    .select('*')
    .single();

  return (created as AcqProspect) ?? null;
}

function guessTrade(name: string): Trade {
  const n = name.toLowerCase();
  if (/roof|shingle|gutter/.test(n)) return 'roofing';
  if (/plumb|drain|sewer|rooter|septic/.test(n)) return 'plumbing';
  if (/hvac|heat|cool|air|furnace|climate/.test(n)) return 'hvac';
  return 'other';
}

/* ──────────────────────────── status polling ────────────────────────────── */

export type DemoCallStatus = {
  status: string;
  outcome: string | null;
  durationSec: number | null;
  leadId: string | null;
  demoUrl: string | null;
  checkoutReady: boolean;
};

/** What the "he is calling you" screen asks for while it waits. */
export async function demoCallStatus(requestId: string): Promise<DemoCallStatus | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data } = await db
    .from('mustard_requests')
    .select('status,outcome,call_id,lead_id')
    .eq('id', requestId)
    .maybeSingle();
  if (!data) return null;

  let durationSec: number | null = null;
  if (data.call_id) {
    const { data: call } = await db.from('acq_calls').select('status,duration_sec').eq('id', data.call_id as string).maybeSingle();
    if (call) {
      durationSec = (call.duration_sec as number) ?? null;
      if (call.status === 'completed' && data.status !== 'completed') {
        await db
          .from('mustard_requests')
          .update({ status: 'completed', completed_at: new Date().toISOString(), outcome: 'completed' })
          .eq('id', requestId);
        data.status = 'completed';
      }
    }
  }

  let demoUrl: string | null = null;
  if (data.lead_id) {
    const { data: lead } = await db.from('outbound_leads').select('hub_demo_url,demo_url,demo_status').eq('id', data.lead_id as string).maybeSingle();
    demoUrl = ((lead?.hub_demo_url ?? lead?.demo_url) as string) ?? null;
  }

  return {
    status: data.status as string,
    outcome: (data.outcome as string) ?? null,
    durationSec,
    leadId: (data.lead_id as string) ?? null,
    demoUrl,
    checkoutReady: Boolean(demoUrl),
  };
}
