/**
 * TWO-WAY TEXTING: the half that was never built.
 *
 * Outbound texting was retired on 2026-08-01 after A2P 10DLC vetting stalled,
 * and tap-to-text replaced it (lib/tap-text.ts). That fixed sending. It did not
 * fix receiving, and lib/tap-text.ts says so in its own header: "replies land in
 * that human's phone rather than threading back into the cockpit."
 *
 * This module is the receiving half. Everything below works on a number we own,
 * and it works TODAY, before any A2P paperwork clears. That is not a loophole,
 * it is how the rule is written:
 *
 *   A2P 10DLC governs APPLICATION-TO-PERSON messages, which means outbound.
 *   Inbound messages to a number you own are not registered, not throttled and
 *   not filtered. A number bought this afternoon can receive this afternoon.
 *
 * So the order of operations is the opposite of what it looks like. This is not
 * blocked on the campaign; the campaign is blocked on this. Carriers require
 * working STOP and HELP handling as a condition of approving a campaign, and
 * that handling has to live at an inbound webhook. Building it is the thing that
 * unblocks sending, not the thing that waits on it.
 *
 * ── ONE FUNCTION OWNS THE OPT-OUT GATE ───────────────────────────────────────
 * `isOptedOut` is checked by the webhook AND by lib/sms.ts before any send. Two
 * copies of a do-not-text rule is how a stopped number gets texted anyway, so
 * there is one, and it fails CLOSED: if the database cannot be reached we report
 * opted out and refuse the send. A text we did not send is recoverable. A text
 * to someone who said stop is a carrier complaint.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { toE164 } from '@/lib/tap-text';
import { recordEvent } from '@/lib/acq/events';

export { toE164 };

/**
 * The last ten digits, which is the join key against the generated
 * `phone_digits` columns (migration 113). Leads store "(406) 555-1234" and
 * Twilio sends "+14065551234"; ten digits is the spelling they agree on.
 */
export function lastTen(phone: string | null | undefined): string {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

/* ── Keywords ──────────────────────────────────────────────────────────────── */

export type SmsKeyword = 'stop' | 'start' | 'help' | null;

/**
 * The carrier-mandated keyword set. Twilio's Messaging Service answers these on
 * its own once a campaign is live, but it does NOT tell our database, so without
 * this we would keep queueing texts to someone the carrier has already silenced,
 * and every one would look sent and land nowhere.
 *
 * Matched on the whole trimmed body, not a substring. "Stop by the shop at 4"
 * is a normal reply from a normal customer, and treating it as an opt-out loses
 * the conversation and the lead. Punctuation is stripped so "STOP." counts.
 */
const STOP_WORDS = new Set(['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit', 'optout', 'opt out']);
const START_WORDS = new Set(['start', 'unstop', 'yes', 'resume']);
const HELP_WORDS = new Set(['help', 'info']);

export function keywordOf(body: string): SmsKeyword {
  const w = String(body || '')
    .trim()
    .toLowerCase()
    .replace(/[.!?,;:]+$/g, '')
    .replace(/\s+/g, ' ');
  if (STOP_WORDS.has(w)) return 'stop';
  if (START_WORDS.has(w)) return 'start';
  if (HELP_WORDS.has(w)) return 'help';
  return null;
}

/**
 * The reply the carrier expects to a HELP. It has to name the business and give
 * a way out, in one segment. Kept here rather than in the route so the wording
 * is quotable in an A2P campaign submission, which asks for it verbatim.
 */
export const HELP_REPLY =
  'Modern Mustard Seed: we build websites and AI phone agents. Questions: sarah@modernmustardseed.com. Reply STOP to opt out.';

export const STOP_REPLY = 'You will not get any more texts from Modern Mustard Seed. Reply START to resume.';

/* ── The do-not-text list ──────────────────────────────────────────────────── */

/**
 * Fails closed on purpose. A null client or a query error both return true.
 */
export async function isOptedOut(db: SupabaseClient | null, phoneE164: string): Promise<boolean> {
  const client = db ?? getSupabase();
  if (!client) return true;
  try {
    const { data, error } = await client
      .from('sms_opt_outs')
      .select('phone')
      .eq('phone', phoneE164)
      .is('resumed_at', null)
      .limit(1);
    if (error) return true;
    return (data ?? []).length > 0;
  } catch {
    return true;
  }
}

export async function optOut(
  db: SupabaseClient | null,
  args: { phoneE164: string; reason: string; source?: string | null; keyword?: string | null; viaNumber?: string | null; messageId?: string | null },
): Promise<void> {
  const client = db ?? getSupabase();
  if (!client) return;
  // upsert, not insert: someone who stopped, started and stopped again is one
  // row whose resumed_at gets cleared, not a duplicate key error swallowed in a
  // catch block that would leave them textable.
  await client.from('sms_opt_outs').upsert(
    {
      phone: args.phoneE164,
      reason: args.reason.slice(0, 120),
      source: (args.source ?? 'inbound').slice(0, 200),
      keyword: args.keyword?.slice(0, 40) ?? null,
      via_number: args.viaNumber ?? null,
      message_id: args.messageId ?? null,
      resumed_at: null,
    },
    { onConflict: 'phone' },
  );
}

/** A START reply. The row is stamped, never deleted: the history is the evidence. */
export async function optIn(db: SupabaseClient | null, phoneE164: string): Promise<void> {
  const client = db ?? getSupabase();
  if (!client) return;
  await client
    .from('sms_opt_outs')
    .update({ resumed_at: new Date().toISOString() })
    .eq('phone', phoneE164)
    .is('resumed_at', null);
}

/* ── Which of our numbers, and whose ───────────────────────────────────────── */

export type SmsNumber = {
  phone: string;
  label: string | null;
  owner_kind: 'mms' | 'client';
  owner_email: string | null;
  messaging_service_sid: string | null;
  inbound_ready: boolean;
  outbound_ready: boolean;
  auto_reply: string | null;
  active: boolean;
};

export async function numberFor(db: SupabaseClient | null, phoneE164: string): Promise<SmsNumber | null> {
  const client = db ?? getSupabase();
  if (!client) return null;
  const { data } = await client.from('sms_numbers').select('*').eq('phone', phoneE164).maybeSingle();
  return (data as SmsNumber | null) ?? null;
}

/* ── Whose conversation is this ────────────────────────────────────────────── */

export type ThreadOwner = {
  outboundLeadId: string | null;
  pipelineLeadId: string | null;
  prospectId: string | null;
  clientEmail: string | null;
  businessName: string | null;
  contactName: string | null;
};

const NO_OWNER: ThreadOwner = {
  outboundLeadId: null,
  pipelineLeadId: null,
  prospectId: null,
  clientEmail: null,
  businessName: null,
  contactName: null,
};

/**
 * Find the lead behind a number.
 *
 * Order matters and is not arbitrary. `outbound_leads` is the live cockpit and
 * the only table with a delivery thread already attached, so it wins. Then
 * `rep_prospects`, the older tracker. A number that matches nothing at all is
 * NOT an error and NOT dropped: it gets stored with the phone and no owner, and
 * shows up in the unmatched inbox. Somebody texting a number we published is a
 * lead by definition, whether or not we have a row for them yet, and the old
 * behaviour of dropping unrecognised inbound is precisely how a customer gets
 * ignored.
 */
export async function matchThread(db: SupabaseClient | null, phoneE164: string): Promise<ThreadOwner> {
  const client = db ?? getSupabase();
  if (!client) return NO_OWNER;
  const ten = lastTen(phoneE164);
  if (ten.length !== 10) return NO_OWNER;

  const { data: leads } = await client
    .from('outbound_leads')
    .select('id,business_name,contact_name,pipeline_lead_id,updated_at')
    .eq('phone_digits', ten)
    .order('updated_at', { ascending: false })
    .limit(1);
  const lead = (leads ?? [])[0];
  if (lead) {
    return {
      outboundLeadId: lead.id as string,
      pipelineLeadId: (lead.pipeline_lead_id as string | null) ?? null,
      prospectId: null,
      clientEmail: null,
      businessName: (lead.business_name as string | null) ?? null,
      contactName: (lead.contact_name as string | null) ?? null,
    };
  }

  const { data: pros } = await client
    .from('rep_prospects')
    .select('id,business,contact_name')
    .eq('phone_digits', ten)
    .limit(1);
  const prospect = (pros ?? [])[0];
  if (prospect) {
    return {
      ...NO_OWNER,
      prospectId: prospect.id as string,
      businessName: (prospect.business as string | null) ?? null,
      contactName: (prospect.contact_name as string | null) ?? null,
    };
  }

  return NO_OWNER;
}

/* ── Writing a message onto the thread ─────────────────────────────────────── */

export type RecordSmsArgs = {
  phoneE164: string;
  direction: 'inbound' | 'outbound';
  body: string;
  viaNumber?: string | null;
  providerSid?: string | null;
  status?: string | null;
  owner?: ThreadOwner;
  /** Outbound sent from a person's own handset, not through a provider. */
  fromHandset?: boolean;
  occurredAt?: string;
};

/**
 * One row on the thread. Returns the row id, or null if it was a duplicate the
 * unique index refused (a Twilio webhook retry), which the caller must treat as
 * success: the message is already recorded, and answering anything but 200 makes
 * Twilio retry it again.
 */
export async function recordSms(db: SupabaseClient | null, args: RecordSmsArgs): Promise<string | null> {
  const client = db ?? getSupabase();
  if (!client) return null;

  const owner = args.owner ?? (await matchThread(client, args.phoneE164));
  const inbound = args.direction === 'inbound';
  const body = args.body.slice(0, 20_000);

  const { data, error } = await client
    .from('messages')
    .insert({
      outbound_lead_id: owner.outboundLeadId,
      prospect_id: owner.prospectId,
      lead_id: owner.pipelineLeadId,
      direction: args.direction,
      channel: 'sms',
      phone: args.phoneE164,
      via_number: args.viaNumber ?? null,
      from_addr: inbound ? args.phoneE164 : args.fromHandset ? 'Sarah (phone)' : (args.viaNumber ?? 'Modern Mustard Seed'),
      to_addr: inbound ? (args.viaNumber ?? 'Modern Mustard Seed') : args.phoneE164,
      subject: null,
      snippet: body.slice(0, 500),
      body,
      provider_sid: args.providerSid ?? null,
      status: args.status ?? (inbound ? 'received' : args.fromHandset ? 'sent' : 'queued'),
      // Our own sends are read; their replies are not, and that unread flag is
      // what puts the badge on the nav.
      read: !inbound,
      occurred_at: args.occurredAt ?? new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    // 23505 is the provider_sid unique index doing its job on a webhook retry.
    if ((error as { code?: string }).code === '23505') return null;
    throw new Error(error.message);
  }

  if (inbound && owner.pipelineLeadId) {
    await recordEvent(client, {
      leadId: owner.pipelineLeadId,
      type: 'reply',
      label: `Texted back: ${body.slice(0, 120)}`,
      detail: { channel: 'sms', phone: args.phoneE164, via: args.viaNumber ?? null },
    });
  }

  return (data?.id as string) ?? null;
}

/* ── Reading a thread ──────────────────────────────────────────────────────── */

export type ThreadRow = {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string | null;
  snippet: string | null;
  status: string | null;
  provider_sid: string | null;
  via_number: string | null;
  from_addr: string | null;
  read: boolean;
  occurred_at: string;
};

/**
 * Every text to and from one handset, oldest first.
 *
 * Reading it marks their side read. That is deliberate and matches how the
 * email thread behaves: opening the conversation IS reading it, and a badge that
 * survives being looked at is a badge nobody trusts.
 */
export async function loadThread(
  db: SupabaseClient | null,
  phoneE164: string,
): Promise<{ rows: ThreadRow[]; owner: ThreadOwner; optedOut: boolean }> {
  const client = db ?? getSupabase();
  if (!client) return { rows: [], owner: NO_OWNER, optedOut: true };

  const [{ data }, owner, optedOut] = await Promise.all([
    client
      .from('messages')
      .select('id,direction,body,snippet,status,provider_sid,via_number,from_addr,read,occurred_at')
      .eq('channel', 'sms')
      .eq('phone', phoneE164)
      .order('occurred_at', { ascending: true })
      .limit(500),
    matchThread(client, phoneE164),
    isOptedOut(client, phoneE164),
  ]);

  const rows = (data ?? []) as ThreadRow[];
  if (rows.some((r) => r.direction === 'inbound' && !r.read)) {
    await client
      .from('messages')
      .update({ read: true })
      .eq('channel', 'sms')
      .eq('phone', phoneE164)
      .eq('direction', 'inbound')
      .eq('read', false);
  }

  return { rows, owner, optedOut };
}

/** How many texts are sitting unanswered, for the nav badge. */
export async function unreadSmsCount(db: SupabaseClient | null): Promise<number> {
  const client = db ?? getSupabase();
  if (!client) return 0;
  const { count } = await client
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('channel', 'sms')
    .eq('direction', 'inbound')
    .eq('read', false);
  return count ?? 0;
}
