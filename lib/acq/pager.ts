/**
 * THE PAGER.
 *
 * Every automatic thing in this loop can fail, and until now the only place a
 * failure showed up was `needs_human` on a row in the admin. That is a message
 * left in a room nobody is standing in. A build that dies at 2am after Mr.
 * Mustard promised it out loud on a call sat there until Sarah happened to open
 * the Follow Up list.
 *
 * So: when the machine cannot finish something it promised, it says so on her
 * phone.
 *
 * ── WHAT IT SENDS ────────────────────────────────────────────────────────────
 * A text, because that is the thing that gets looked at, and an email, because
 * 300 characters of SMS cannot carry a stack trace and the paper trail matters
 * the next morning. The text is the alarm; the email is the detail.
 *
 * ── WHAT IT WILL NOT DO ──────────────────────────────────────────────────────
 * It will not page twice for the same lead and the same reason inside the
 * dedupe window. A build worker that retries four times must not produce four
 * texts, and a sweep that runs every fifteen minutes must not re-page a stall
 * it already reported. The window is per kind, because "your build failed" and
 * "somebody is waiting on you" are different urgencies.
 *
 * It never throws. Every caller is already handling a failure, and a pager that
 * can turn a failed build into a crashed worker is worse than no pager.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { sendSms, smsConfigured } from '@/lib/sms';
import { sendViaResend } from '@/lib/send-email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { recordEvent } from '@/lib/acq/events';

/** Why she is being woken up. Each carries its own dedupe window. */
export type PageKind =
  | 'build_failed'
  | 'build_stalled'
  | 'build_at_capacity'
  | 'ask_needs_human'
  | 'inbox_down';

/**
 * How long the same lead and the same reason stays quiet after one page.
 *
 * A failed build is worth exactly one text: the second one tells her nothing
 * she does not know and trains her to ignore the first. Capacity is longer
 * still, because it is a condition rather than an event and it resolves itself
 * at midnight.
 */
const QUIET_HOURS: Record<PageKind, number> = {
  build_failed: 6,
  build_stalled: 6,
  build_at_capacity: 12,
  ask_needs_human: 4,
  inbox_down: 3,
};

/** The event type the dedupe reads. Written on every page that actually goes. */
export const PAGE_EVENT = 'paged';

export type PageInput = {
  db?: SupabaseClient | null;
  kind: PageKind;
  /** The prospect this is about, when there is one. */
  lead?: { id: string; business_name?: string | null; email?: string | null; phone?: string | null } | null;
  campaignId?: string | null;
  /** One line for the lock screen. Say the business and the action, nothing else. */
  sms: string;
  /** Subject for the email that carries the detail. */
  subject: string;
  /** Plain text body for the email. Stack traces and ids belong here. */
  body: string;
  /** Skip the dedupe. Only for a human pressing "tell me again". */
  force?: boolean;
};

export type PageResult = {
  texted: boolean;
  emailed: boolean;
  /** Set when nothing was sent, and why. */
  skipped: string | null;
};

/**
 * Where the text goes.
 *
 * ACQ_ALERT_SMS_TO is the knob; the fallback is the cell already configured as
 * Mr. Mustard's transfer destination, because that is demonstrably the number
 * Sarah answers. Kept as a fallback rather than required so a missing env var
 * degrades to "the text still arrives" instead of "the pager is silently off",
 * which is the failure mode this whole module exists to prevent.
 */
export function alertNumber(): string | null {
  const raw = process.env.ACQ_ALERT_SMS_TO;
  const clean = raw && !/^\[SENSITIVE\]$/i.test(raw) ? raw.trim() : '';
  return clean || '+14062506076';
}

/** True when this exact page already went out inside its quiet window. */
async function recentlyPaged(db: SupabaseClient, kind: PageKind, leadId: string | null): Promise<boolean> {
  const since = new Date(Date.now() - QUIET_HOURS[kind] * 3600_000).toISOString();
  let q = db
    .from('acq_events')
    .select('id', { count: 'exact', head: true })
    .eq('type', PAGE_EVENT)
    .eq('detail->>kind', kind)
    .gte('occurred_at', since);
  // A page with no lead (the inbox is down) dedupes globally on its kind.
  q = leadId ? q.eq('lead_id', leadId) : q.is('lead_id', null);
  const { count, error } = await q;
  if (error) return false; // an unreadable ledger must not silence the pager
  return (count ?? 0) > 0;
}

/**
 * Wake Sarah up about one thing.
 *
 * Returns what actually happened rather than throwing, so a caller can log
 * "the build failed AND we could not tell her", which is a different and worse
 * problem than either one alone.
 */
export async function pageSarah(input: PageInput): Promise<PageResult> {
  const out: PageResult = { texted: false, emailed: false, skipped: null };
  const db = input.db ?? getSupabase();
  if (!db) {
    out.skipped = 'No database, so the page could not be deduped or recorded.';
    return out;
  }

  try {
    const leadId = input.lead?.id ?? null;
    if (!input.force && (await recentlyPaged(db, input.kind, leadId))) {
      out.skipped = `Already paged about ${input.kind} for this lead inside ${QUIET_HOURS[input.kind]}h.`;
      return out;
    }

    const to = alertNumber();
    if (to && smsConfigured()) {
      const res = await sendSms(to, input.sms);
      out.texted = res.ok;
      if (!res.ok) console.error(`[pager] text failed: ${res.error}`);
    } else if (!smsConfigured()) {
      console.error('[pager] SMS is not configured, so only the email went.');
    }

    const mail = await sendViaResend({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: OWNER_NOTIFY_TO,
      subject: input.subject,
      text: input.body,
      html: `<pre style="font:14px/1.6 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap">${escapeHtml(input.body)}</pre>`,
      mailbox: 'sarah@modernmustardseed.com',
    });
    out.emailed = mail.ok;
    if (!mail.ok) console.error(`[pager] email failed: ${mail.error}`);

    // Record only when something actually reached her. Writing the event on a
    // total failure would start the quiet window on a page she never saw, and
    // the next attempt would dedupe against a message that does not exist.
    if (out.texted || out.emailed) {
      await recordEvent(db, {
        leadId,
        campaignId: input.campaignId ?? null,
        type: PAGE_EVENT,
        label: input.sms,
        detail: { kind: input.kind, texted: out.texted, emailed: out.emailed, to: out.texted ? to : null },
      });
    } else {
      out.skipped = 'Neither the text nor the email could be sent.';
    }
  } catch (err) {
    out.skipped = err instanceof Error ? err.message : 'The pager threw.';
    console.error('[pager]', out.skipped);
  }

  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}

/* ─────────────────────────── the standard pages ─────────────────────────── */

const ADMIN = 'https://modernmustardseed.com/admin/acquisition/prospects';

/** A build we promised somebody did not happen. */
export async function pageBuildFailed(args: {
  db?: SupabaseClient | null;
  lead: { id: string; business_name?: string | null; email?: string | null };
  campaignId?: string | null;
  error: string;
  /** How they asked: on the phone, by replying, from the board. */
  requestedVia: string;
}): Promise<PageResult> {
  const who = args.lead.business_name ?? 'A prospect';
  return pageSarah({
    db: args.db,
    kind: 'build_failed',
    lead: args.lead,
    campaignId: args.campaignId,
    sms: `Build FAILED for ${who}. They asked ${args.requestedVia} and are waiting. Push it through: ${ADMIN}/${args.lead.id}`,
    subject: `Build failed: ${who}`,
    body: [
      `${who} asked for a build ${args.requestedVia} and it failed.`,
      ``,
      `They are expecting it. Nothing has been sent to them.`,
      ``,
      `Error:`,
      args.error,
      ``,
      `Lead:  ${args.lead.id}`,
      `Email: ${args.lead.email ?? '(none on file)'}`,
      `Card:  ${ADMIN}/${args.lead.id}`,
      ``,
      `Rebuild from the card, or from the build board.`,
    ].join('\n'),
  });
}

/** Somebody asked and the floor is full. Not an error, but they are waiting. */
export async function pageBuildAtCapacity(args: {
  db?: SupabaseClient | null;
  lead: { id: string; business_name?: string | null; email?: string | null };
  campaignId?: string | null;
  detail: string;
}): Promise<PageResult> {
  const who = args.lead.business_name ?? 'A prospect';
  return pageSarah({
    db: args.db,
    kind: 'build_at_capacity',
    lead: args.lead,
    campaignId: args.campaignId,
    sms: `${who} asked for a build and the floor is at its daily cap. They are waiting. ${ADMIN}/${args.lead.id}`,
    subject: `Build at capacity: ${who}`,
    body: [
      `${who} asked for a build and the day's cap is already claimed.`,
      ``,
      args.detail,
      ``,
      `The cap is SUITE_CAPS in lib/acq/suite.ts. Raise it, or build this one by`,
      `hand from the board, or leave it and the queue takes it tomorrow.`,
      ``,
      `Lead:  ${args.lead.id}`,
      `Email: ${args.lead.email ?? '(none on file)'}`,
      `Card:  ${ADMIN}/${args.lead.id}`,
    ].join('\n'),
  });
}

/** A reply that looks like an ask but is not clear enough to spend an hour on. */
export async function pageAskNeedsHuman(args: {
  db?: SupabaseClient | null;
  lead: { id: string; business_name?: string | null; email?: string | null };
  campaignId?: string | null;
  quote: string;
}): Promise<PageResult> {
  const who = args.lead.business_name ?? 'A prospect';
  return pageSarah({
    db: args.db,
    kind: 'ask_needs_human',
    lead: args.lead,
    campaignId: args.campaignId,
    sms: `${who} replied and may be asking for a build. Not clear enough to fire it. "${args.quote.slice(0, 90)}" ${ADMIN}/${args.lead.id}`,
    subject: `Reply needs you: ${who}`,
    body: [
      `${who} replied to us. It reads like it might be a build request, but not`,
      `clearly enough to spend an hour of the build floor on a guess.`,
      ``,
      `What they wrote:`,
      args.quote,
      ``,
      `Lead:  ${args.lead.id}`,
      `Email: ${args.lead.email ?? '(none on file)'}`,
      `Card:  ${ADMIN}/${args.lead.id}`,
      ``,
      `If it is a yes, press build on the card and it goes out when it is done.`,
    ].join('\n'),
  });
}
