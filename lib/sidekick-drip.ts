/**
 * THE SIDEKICK DRIP: follow-up for people who forged a Sidekick at /sidekick
 * and did not buy.
 *
 * WHY THIS EXISTS (2026-07-20): /sidekick forgers received NOTHING. The forge
 * wrote a row to `leads` with source 'sidekick-forge' and emailed Sarah, and
 * that was the end of it. The demo-station drip only covers `outbound_leads`
 * where source = 'demo-station', and the mustard-sequence cron only covers
 * sources 'mustard-seed-chat' and 'tracker'. A stranger could hear their own
 * phone answered by an AI trained on their business, the single best moment in
 * the product, and never hear from us again. The 28 trade pages and four of the
 * /for/* pillar pages now point at /sidekick, so this was the leak that mattered.
 *
 * Design notes:
 *  - Rides the outbound-cadence cron. Vercel Hobby cron slots are 12/12 FULL,
 *    so a new schedule is not available. Same call the demo-station drip makes.
 *  - State lives in `app_state` (KV), NOT in tagged note strings. The
 *    mustard-sequence cron marks `[d2-sent]` inside `leads.notes`, which means
 *    any lead whose notes ever contain that substring is skipped forever and
 *    there is no per-touch timestamp. This module stores {step, at} and only
 *    advances after a CONFIRMED send.
 *  - Sends through sendViaResend, so the Resend suppression gate and the Sent
 *    store apply automatically. An unsubscribed address is a hard stop, not a
 *    phantom success.
 *  - Every touch carries a one-click unsubscribe.
 *  - Exits the moment the lead replies, buys, or is moved by a human.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendViaResend } from '@/lib/send-email';
import { clientEmail, escape } from '@/lib/email';
import { SITE } from '@/lib/seo';
import { sidekickTiers, sidekickUsd } from '@/data/sidekick';

const CAP_PER_RUN = 12;
const KEY = (id: string) => `skdrip:${id}`;
const WINDOW_DAYS = 45;

/**
 * A sequence may only START for a genuinely fresh forge. Without this, the
 * first run of this module would have opened touch 1 ("your Sidekick is still
 * standing by") on leads 11 and 13 days old, which reads as a robot that lost
 * track of time. Stale forgers are a human's job, not a drip's: they surface in
 * staleUnstarted() instead. Once a sequence is underway the cadence gaps in
 * due() govern it, so cron lag can never restart anything.
 */
const START_MAX_AGE_HRS = 96;

type DripState = { step: number; at: string };

type SidekickLead = {
  id: string;
  email: string | null;
  name: string | null;
  business_name: string | null;
  company: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
};

/** Statuses that mean a human (or the buyer) already moved this lead. */
const TERMINAL = new Set(['replied', 'booked', 'won', 'lost', 'archived']);

/**
 * Pull the run id the forge wrote as `run=<uuid>`. Strict UUID shape, so a
 * malformed or missing token simply yields no deep link rather than a broken
 * URL. Leads forged before 2026-07-20 have no token; they still get the drip,
 * just pointed at /sidekick instead of their specific run.
 */
export function runIdFromNotes(notes: string | null): string | null {
  const m = /run=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(notes ?? '');
  return m ? m[1] : null;
}

/** Hours since signup (step 0) or since the previous touch. Mirrors the
 *  demo-station rhythm, which is already tuned: about day 1, day 3, day 7. */
function due(step: number, ageHrs: number, sinceLastHrs: number): boolean {
  // Touch 1 has BOTH a floor and a ceiling: old enough to not be pushy, young
  // enough that "your demo is still warm" is actually true.
  if (step === 0) return ageHrs >= 20 && ageHrs <= START_MAX_AGE_HRS;
  if (step === 1) return ageHrs >= 66 && sinceLastHrs >= 40;
  if (step === 2) return ageHrs >= 160 && sinceLastHrs >= 48;
  return false;
}

function firstNameOf(lead: SidekickLead): string | null {
  const n = lead.name?.trim().split(/\s+/)[0];
  return n && n.length > 1 ? n : null;
}

function bizOf(lead: SidekickLead): string {
  return lead.business_name?.trim() || lead.company?.trim() || 'your business';
}

export function sidekickDripEmail(
  lead: SidekickLead,
  step: number,
): { subject: string; html: string; snippet: string } {
  const first = firstNameOf(lead);
  const hi = first ? `Hi ${first},` : 'Hi there,';
  const biz = escape(bizOf(lead));
  const runId = runIdFromNotes(lead.notes);
  const demoUrl = runId ? `${SITE.url}/sidekick/demo/${runId}` : `${SITE.url}/sidekick`;
  const monthly = sidekickUsd(sidekickTiers[0].monthlyCents);
  const setup = sidekickUsd(sidekickTiers[0].setupCents);

  const cta = { label: 'Hear your Sidekick again', url: demoUrl };
  const secondary = { label: 'Book 10 minutes with Sarah', url: `${SITE.url}/book` };

  if (step === 0) {
    // Never assert "yesterday" from a timer. If the cron ran late, or a lead
    // sat a couple of days, the sentence has to stay true.
    const ageHrs = (Date.now() - new Date(lead.created_at).getTime()) / 3600000;
    const when = ageHrs < 40 ? 'Yesterday you' : 'A few days ago you';
    return {
      subject: `${bizOf(lead)}, your Sidekick is still standing by`,
      snippet: 'Sidekick drip 1 of 3: come back and hear it again.',
      html: clientEmail({
        preheader: 'The receptionist you trained is still live, answering to your name.',
        greeting: hi,
        body:
          `<p>${when} trained a receptionist for ${biz} and heard it answer. It is still live, still knows your services, and still picks up on the second ring.</p>` +
          `<p>If someone else in the business should hear it before you decide, that link is worth more than anything I could write here. Send it to them and let them try to stump it. That is usually the conversation that settles it.</p>`,
        cta,
        secondary,
        trackId: lead.id,
        signature: 'Sarah',
      }),
    };
  }

  if (step === 1) {
    return {
      subject: 'The call you did not answer this week',
      snippet: 'Sidekick drip 2 of 3: the cost of the missed call.',
      html: clientEmail({
        preheader: 'What a missed call actually costs, and what the Sidekick costs.',
        greeting: hi,
        body:
          `<p>The caller who gets voicemail usually does not leave one. They dial the next name on the list, and you never find out that the phone rang at all. That is the part that stings: the loss is invisible.</p>` +
          `<p>The Sidekick you trained for ${biz} answers every one of those, day or night, books the work, and texts you the details. Keeping it is $${setup} to set up plus $${monthly} a month, with a hard minute cap so there is never a surprise bill. Month to month, live within about a week, cancel anytime.</p>` +
          `<p>No trial, because the demo already was the trial.</p>`,
        cta,
        secondary,
        trackId: lead.id,
        signature: 'Sarah',
      }),
    };
  }

  return {
    subject: first ? `Last note from me, ${first}` : 'Last note from me',
    snippet: 'Sidekick drip 3 of 3: the honest close.',
    html: clientEmail({
      preheader: 'Your demo stays live either way. I will stop writing about it.',
      greeting: hi,
      body:
        `<p>This is my last email about it, promise. Your Sidekick stays live either way, so nothing expires and nobody is going to call you five times.</p>` +
        `<p>If the timing is wrong, ignore me with a clear conscience. If the missed calls still bother you, putting it on ${biz}'s real line takes about a week, or grab ten minutes with me and I will answer whatever is in the way.</p>`,
      cta,
      secondary,
      trackId: lead.id,
      signature: 'Sarah',
    }),
  };
}

/**
 * Forgers too old for the drip to open a sequence on, who never got a touch and
 * were never moved by a human. These are warm-ish hands that went cold in
 * silence, so they belong on a person's list rather than in a robot's.
 * Reported by the cron so they are visible instead of invisible.
 */
export async function staleUnstarted(
  sb: SupabaseClient,
): Promise<{ count: number; leads: { id: string; business: string; email: string; ageDays: number }[] }> {
  const now = Date.now();
  const { data } = await sb
    .from('leads')
    .select('id, email, name, business_name, company, status, notes, created_at')
    .eq('source', 'sidekick-forge')
    .not('email', 'is', null)
    .lt('created_at', new Date(now - START_MAX_AGE_HRS * 3600000).toISOString())
    .gte('created_at', new Date(now - WINDOW_DAYS * 86400000).toISOString())
    .limit(200);

  const rows = (data ?? []) as SidekickLead[];
  const fresh = rows.filter((r) => !TERMINAL.has((r.status ?? '').toLowerCase()));
  if (!fresh.length) return { count: 0, leads: [] };

  const { data: stateRows } = await sb
    .from('app_state')
    .select('key')
    .in('key', fresh.map((r) => KEY(r.id)));
  const started = new Set((stateRows ?? []).map((r) => r.key as string));

  const leads = fresh
    .filter((r) => !started.has(KEY(r.id)))
    .map((r) => ({
      id: r.id,
      business: bizOf(r),
      email: r.email!,
      ageDays: Math.round((now - new Date(r.created_at).getTime()) / 86400000),
    }));

  return { count: leads.length, leads };
}

/**
 * One drip pass. Fail-quiet per lead: a send failure leaves the state row
 * untouched so the same touch is retried next run rather than skipped.
 */
export async function sidekickDrip(
  sb: SupabaseClient,
  opts: { onlyLeadId?: string; dryRun?: boolean } = {},
): Promise<{ sent: number; skipped: number; due: number; dryRun?: true }> {
  const now = Date.now();

  const { data: rows, error } = await sb
    .from('leads')
    .select('id, email, name, business_name, company, status, notes, created_at')
    .eq('source', 'sidekick-forge')
    .not('email', 'is', null)
    .gte('created_at', new Date(now - WINDOW_DAYS * 86400000).toISOString())
    .limit(200);

  if (error) {
    console.error('sidekick drip query failed:', error.message);
    return { sent: 0, skipped: 0, due: 0 };
  }

  const pool = (opts.onlyLeadId ? (rows ?? []).filter((r) => r.id === opts.onlyLeadId) : (rows ?? [])) as SidekickLead[];
  if (!pool.length) return { sent: 0, skipped: 0, due: 0 };

  const ids = pool.map((l) => l.id);
  const { data: stateRows } = await sb.from('app_state').select('key, value').in('key', ids.map(KEY));
  const states = new Map<string, DripState>((stateRows ?? []).map((r) => [r.key as string, r.value as DripState]));

  let sent = 0;
  let skipped = 0;
  let dueCount = 0;

  for (const lead of pool) {
    if (sent >= CAP_PER_RUN) break;
    if (!lead.email) {
      skipped++;
      continue;
    }
    // A human moved it, or they replied. The drip's job is done.
    if (TERMINAL.has((lead.status ?? '').toLowerCase())) {
      skipped++;
      continue;
    }

    const state = states.get(KEY(lead.id)) ?? { step: 0, at: lead.created_at };
    if (state.step >= 3) continue;

    const ageHrs = (now - new Date(lead.created_at).getTime()) / 3600000;
    const sinceLastHrs = (now - new Date(state.at).getTime()) / 3600000;
    if (!due(state.step, ageHrs, sinceLastHrs)) continue;

    dueCount++;
    if (opts.dryRun) continue;

    const mail = sidekickDripEmail(lead, state.step);
    const unsub = `${SITE.url}/api/outreach/unsubscribe?c=${encodeURIComponent(lead.email)}`;
    const html =
      mail.html +
      `<div style="text-align:center;font-size:12px;color:#8a857a;padding:18px 0"><a href="${unsub}" style="color:#8a857a">Unsubscribe</a> and I will never email you again.</div>`;

    const result = await sendViaResend({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: lead.email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: mail.subject,
      html,
      mailbox: 'sarah@modernmustardseed.com',
      // Bulk mail: emits List-Unsubscribe + one-click POST (RFC 8058).
      unsubscribeUrl: unsub,
    });

    if (!result.ok) {
      // Suppressed or failed. Do NOT advance state: an unsubscribed address
      // simply never advances, and a transient failure retries next run.
      console.error(`sidekick drip send failed for ${lead.id}: ${result.error}`);
      skipped++;
      continue;
    }

    sent++;
    await sb.from('app_state').upsert({
      key: KEY(lead.id),
      value: { step: state.step + 1, at: new Date().toISOString() } satisfies DripState,
    });
  }

  return { sent, skipped, due: dueCount, ...(opts.dryRun ? { dryRun: true as const } : {}) };
}
