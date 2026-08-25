import type { SupabaseClient } from '@supabase/supabase-js';
import { clientEmail, escape } from '@/lib/email';
import { sendViaResend } from '@/lib/send-email';
import { OUTBOUND_FROM, OUTBOUND_REPLY_TO, complianceFooter, unsubscribeUrlFor } from '@/lib/outbound-email';
import { ensureDemoHub } from '@/lib/outbound-demo';
import { recordSend } from '@/lib/acq/governor';
import { possessive } from '@/lib/business-name';
import type { OutboundLead } from '@/lib/outbound';

/**
 * THE OUTBOUND DRIP (2026-08-25). One sequence per outbound lead, five emails
 * over about three weeks, started from the contact card by sending the first
 * one, advanced by the outbound-cadence cron on business-day gaps, and stopped
 * by anything that means the conversation moved: a reply, an unsubscribe, a
 * bounce, DNC, won, lost.
 *
 * Every email is rendered from the lead as it stands at send time, so a demo
 * that finishes building between step 1 and step 2 shows up in step 2. The
 * cockpit previews the exact bytes that will ship, dated.
 *
 * This is the OUTBOUND drip. The acquisition engine has its own campaign,
 * governor and eligibility for cold cohorts; this one is for the leads Sarah
 * is working by hand. Sends are still recorded into acq_sends so the rolling
 * 24-hour ceiling counts them (a send that table cannot see is a send the
 * ceiling cannot see).
 */

export const DRIP_GAPS = [3, 4, 5, 5];
export const DRIP_LENGTH = DRIP_GAPS.length + 1;
const DRIP_CAP_PER_RUN = 25;
const BOOK = 'https://modernmustardseed.com/book';

export type OutboundDrip = {
  id: string;
  lead_id: string;
  status: 'active' | 'paused' | 'done' | 'stopped';
  step: number;
  gaps: number[];
  next_at: string | null;
  started_at: string;
  started_by: string | null;
  last_sent_at: string | null;
  stopped_reason: string | null;
  sent: { step: number; at: string; messageId: string | null; subject: string }[];
  last_error: string | null;
};

export type DripEmail = { step: number; subject: string; preheader: string; html: string; summary: string };

/* ───────────────────────── business days ───────────────────────── */

export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let left = Math.max(0, days);
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) left--;
  }
  return d;
}

/** The cadence cron runs at 18:05 UTC on weekdays; land the next send in its window. */
function atCadenceHour(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(18, 0, 0, 0);
  return out;
}

/* ───────────────────────── the five emails ───────────────────────── */

function firstName(lead: OutboundLead): string | null {
  const f = lead.contact_name?.trim().split(/\s+/)[0];
  return f && f.length > 1 ? f : null;
}

function greeting(lead: OutboundLead): string {
  const f = firstName(lead);
  return f ? `Hi ${escape(f)},` : 'Hi there,';
}

/**
 * Render one step from the lead as it stands right now. Pure: no I/O, so the
 * cockpit can preview all five and the cron can render the one that is due.
 */
export function dripEmail(lead: OutboundLead, step: number): DripEmail {
  const biz = escape(lead.business_name);
  const siteReady = lead.site_demo_status === 'ready' && Boolean(lead.site_demo_url);
  const voiceReady = Boolean(lead.demo_url);
  const hub = lead.hub_demo_url ?? null;
  const primaryUrl = hub ?? (siteReady ? lead.site_demo_url! : voiceReady ? lead.demo_url! : BOOK);
  const primaryLabel = hub ? 'Open your demo suite' : siteReady ? 'See your new website' : voiceReady ? 'Talk to your voice agent' : 'Book 10 minutes';
  const rating = lead.rating != null ? Number(lead.rating) : null;
  const reviews = lead.review_count != null ? Number(lead.review_count) : null;
  const city = lead.city ? escape(lead.city) : null;
  const p = (s: string) => `<p>${s}</p>`;

  if (step === 1) {
    const built = siteReady && voiceReady
      ? `We built ${biz} a working website, and it answers its own phone. Not a mockup. Click through it, then call the number on it and hear it pick up as your business.`
      : siteReady
        ? `We built ${biz} a working website. Not a mockup: click through it, every page, on your phone and your laptop.`
        : voiceReady
          ? `We built ${biz} a voice agent that answers as your business, right now, in your browser. Pretend you are a customer and try to stump it.`
          : `I help local businesses like ${biz} stop losing the calls they miss. I build a website that answers its own phone in two rings, books the job, and texts you the details.`;
    return {
      step: 1,
      subject: siteReady ? `I built ${lead.business_name} a website you can click through` : voiceReady ? `${possessive(lead.business_name)} phone, answered in two rings` : `A working demo for ${lead.business_name}`,
      preheader: siteReady ? 'Every page, already answering to your name.' : 'The real thing, not a pitch.',
      html: clientEmail({
        greeting: greeting(lead),
        body:
          p(built) +
          p(`Why build it before you asked? Because showing beats telling. If you like it, it goes live under your name in a week, at one set price you see in writing first. If you do not, you lost nothing but a look.`),
        cta: { label: primaryLabel, url: primaryUrl },
        secondary: { label: 'Book 10 minutes with Sarah', url: BOOK },
        trackId: lead.id,
      }),
      summary: `Drip 1 of ${DRIP_LENGTH}: the demo.`,
    };
  }

  if (step === 2) {
    const proof = rating != null
      ? `You have ${rating} stars${reviews ? ` across ${reviews} reviews` : ''}. People already like the work. The calls you miss while doing it are the leak.`
      : `The work is not the problem. The calls you miss while doing it are.`;
    return {
      step: 2,
      subject: `What a missed call costs ${lead.business_name}`,
      preheader: 'Two missed calls a week is the whole price.',
      html: clientEmail({
        greeting: greeting(lead),
        body:
          p(proof) +
          p(`Here is the math I run with every owner${city ? ` in ${city}` : ''}: take your average job, count the calls that went to voicemail this week, and assume half of them called the next name on the list. That number, every week, is what the demo I sent you is built to stop.`) +
          p(hub ? `The suite page has a calculator that does this with your own numbers. Thirty seconds.` : `Reply with your average job and I will run it for you in one line.`),
        cta: hub ? { label: 'Run your own numbers', url: hub } : { label: 'Book 10 minutes', url: BOOK },
        secondary: hub ? { label: 'Book 10 minutes with Sarah', url: BOOK } : undefined,
        trackId: lead.id,
      }),
      summary: `Drip 2 of ${DRIP_LENGTH}: the missed-call math.`,
    };
  }

  if (step === 3) {
    return {
      step: 3,
      subject: `What the first week looks like for ${lead.business_name}`,
      preheader: 'Live under your name, booking onto your calendar.',
      html: clientEmail({
        greeting: greeting(lead),
        body:
          p(`The week it goes live: your website is on your own domain, the phone on it is answered in two rings, every call is booked straight onto your calendar, and you get a text with the details before the caller hangs up.`) +
          p(`Nothing changes about how you work. You still do the jobs. You just stop finding out about the ones you lost.`) +
          p(siteReady ? `The site you looked at is the site that goes live. Tell me what to change on it and it changes. That is included.` : `If you want to see it before anything else, say the word and I will build ${biz} the full working version to click through.`),
        cta: { label: primaryLabel, url: primaryUrl },
        secondary: { label: 'Book 10 minutes with Sarah', url: BOOK },
        trackId: lead.id,
      }),
      summary: `Drip 3 of ${DRIP_LENGTH}: the first week live.`,
    };
  }

  if (step === 4) {
    return {
      step: 4,
      subject: `One price, in writing, before we start`,
      preheader: 'You own it. You can run it without us.',
      html: clientEmail({
        greeting: greeting(lead),
        body:
          p(`How this works, so there is no mystery: one set price for the whole thing, in writing, before anything starts. Changes to what we built are included, always. When it is done you own the site, the domain and the phone line, and you can operate every bit of it without us.`) +
          p(`No retainer to keep it alive, no dependency on me. I build assets that belong to the business that paid for them.`) +
          p(`If ${biz} wants it, ten minutes on a call is enough to set the date.`),
        cta: { label: 'Book 10 minutes with Sarah', url: BOOK },
        secondary: siteReady || voiceReady ? { label: primaryLabel, url: primaryUrl } : undefined,
        trackId: lead.id,
      }),
      summary: `Drip 4 of ${DRIP_LENGTH}: the offer.`,
    };
  }

  return {
    step: 5,
    subject: `Closing ${possessive(lead.business_name)} file`,
    preheader: 'Last one from me.',
    html: clientEmail({
      greeting: greeting(lead),
      body:
        p(`This is the last email I will send. Not because the idea got worse, but because you are busy and I would rather not be noise.`) +
        p(`If the timing changes, reply to this and I pick it right back up${siteReady ? `. The website we built ${biz} stays up for you to look at` : ''}.`) +
        p(`Either way, thank you for reading this far.`),
      cta: { label: 'Book 10 minutes with Sarah', url: BOOK },
      secondary: siteReady || voiceReady ? { label: primaryLabel, url: primaryUrl } : undefined,
      trackId: lead.id,
    }),
    summary: `Drip 5 of ${DRIP_LENGTH}: the close.`,
  };
}

/* ───────────────────────── stop conditions ───────────────────────── */

/** Why this lead must not get another drip email, or null when they may. */
export function dripStopReason(lead: OutboundLead, replied: boolean): string | null {
  if (!lead.email) return 'No email on file.';
  if (lead.unsubscribed_at) return 'They unsubscribed.';
  if (lead.bounced) return 'Their address bounced.';
  if (lead.status === 'dnc' || lead.dnc_checked) return 'On the do-not-contact list.';
  if (lead.status === 'won') return 'They became a client.';
  if (lead.status === 'lost') return 'Marked lost.';
  if (replied || lead.reply_at) return 'They replied. This is a conversation now.';
  return null;
}

async function hasReplied(sb: SupabaseClient, leadId: string, since: string): Promise<boolean> {
  const { count } = await sb
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('outbound_lead_id', leadId)
    .eq('direction', 'inbound')
    .gte('occurred_at', since);
  return (count ?? 0) > 0;
}

/* ───────────────────────── state ───────────────────────── */

export async function getDrip(sb: SupabaseClient, leadId: string): Promise<OutboundDrip | null> {
  const { data } = await sb.from('outbound_drips').select('*').eq('lead_id', leadId).maybeSingle();
  return (data as OutboundDrip | null) ?? null;
}

export type DripPlanStep = {
  step: number;
  subject: string;
  preheader: string;
  summary: string;
  html: string;
  /** sent | next | scheduled | skipped */
  state: 'sent' | 'next' | 'scheduled' | 'skipped';
  at: string | null;
  messageId: string | null;
};

/**
 * The whole sequence, dated, for the cockpit: what went, what is next and
 * when, what is still to come. Projected off the gaps when nothing is queued.
 */
export function planDrip(lead: OutboundLead, drip: OutboundDrip | null, now = new Date()): DripPlanStep[] {
  const gaps = drip?.gaps?.length ? drip.gaps : DRIP_GAPS;
  const length = gaps.length + 1;
  const sent = new Map((drip?.sent ?? []).map((s) => [s.step, s]));
  const stopped = drip ? drip.status === 'stopped' || drip.status === 'done' : false;
  const out: DripPlanStep[] = [];
  let cursor: Date | null = null;
  for (let step = 1; step <= length; step++) {
    const e = dripEmail(lead, step);
    const s = sent.get(step);
    if (s) {
      out.push({ ...e, state: 'sent', at: s.at, messageId: s.messageId });
      cursor = new Date(s.at);
      continue;
    }
    if (stopped) {
      out.push({ ...e, state: 'skipped', at: null, messageId: null });
      continue;
    }
    const isNext = (drip?.step ?? 0) + 1 === step;
    let at: Date;
    if (isNext && drip?.next_at) at = new Date(drip.next_at);
    else if (isNext && !drip) at = now;
    else at = atCadenceHour(addBusinessDays(cursor ?? now, gaps[step - 2] ?? gaps[gaps.length - 1]));
    cursor = at;
    out.push({ ...e, state: isNext ? 'next' : 'scheduled', at: at.toISOString(), messageId: null });
  }
  return out;
}

/* ───────────────────────── sending ───────────────────────── */

export type DripSendResult = { ok: true; drip: OutboundDrip; lead: OutboundLead; messageId: string; subject: string } | { ok: false; error: string; stopped?: boolean };

/**
 * Send one step, log it everywhere a cockpit send is logged, and schedule the
 * next one. The messages row carries the Resend id so the Sent viewer and the
 * delivery chip work on drip sends exactly as on hand sends.
 */
export async function sendDripStep(sb: SupabaseClient, leadInput: OutboundLead, drip: OutboundDrip, step: number): Promise<DripSendResult> {
  let lead = leadInput;
  const replied = await hasReplied(sb, lead.id, drip.started_at);
  const stop = dripStopReason(lead, replied);
  if (stop) {
    await sb.from('outbound_drips').update({ status: 'stopped', stopped_reason: stop, next_at: null, updated_at: new Date().toISOString() }).eq('id', drip.id);
    return { ok: false, error: stop, stopped: true };
  }
  // The suite hub fronts every demo; mint it when a demo exists so the email
  // has its one golden door.
  if (lead.demo_url || lead.site_demo_status === 'ready') {
    try { lead = await ensureDemoHub(sb, lead); } catch { /* the email falls back to the direct links */ }
  }

  const email = dripEmail(lead, step);
  const to = lead.email!;
  const sent = await sendViaResend({
    from: OUTBOUND_FROM,
    to,
    replyTo: OUTBOUND_REPLY_TO,
    subject: email.subject,
    html: email.html + complianceFooter(to),
    mailbox: OUTBOUND_REPLY_TO,
    unsubscribeUrl: unsubscribeUrlFor(to),
  });
  if (!sent.ok) {
    await sb.from('outbound_drips').update({ last_error: sent.error.slice(0, 300), updated_at: new Date().toISOString() }).eq('id', drip.id);
    return { ok: false, error: sent.error };
  }

  const nowIso = new Date().toISOString();
  await sb.from('messages').insert({
    outbound_lead_id: lead.id,
    direction: 'outbound',
    channel: 'email',
    status: 'sent',
    external_id: sent.id,
    from_addr: OUTBOUND_REPLY_TO,
    to_addr: to,
    subject: email.subject,
    snippet: email.summary,
    read: true,
    occurred_at: nowIso,
  });
  // The rolling ceiling counts off acq_sends. Best effort: a missing table must
  // never turn a delivered email into a reported failure.
  try {
    await recordSend(sb, { leadId: lead.id, campaignId: null, kind: 'followup', step, to, from: OUTBOUND_REPLY_TO, subject: email.subject, providerMessageId: sent.id });
  } catch { /* counted nowhere; the send still happened */ }

  const leadUpdate: Record<string, unknown> = { last_email_at: nowIso };
  if (lead.status === 'new') leadUpdate.status = 'contacted';
  const { data: updatedLead } = await sb.from('outbound_leads').update(leadUpdate).eq('id', lead.id).select().single();

  const gaps = drip.gaps?.length ? drip.gaps : DRIP_GAPS;
  const last = step >= gaps.length + 1;
  const nextAt = last ? null : atCadenceHour(addBusinessDays(new Date(), gaps[step - 1])).toISOString();
  const { data: updatedDrip } = await sb
    .from('outbound_drips')
    .update({
      step,
      status: last ? 'done' : 'active',
      next_at: nextAt,
      last_sent_at: nowIso,
      last_error: null,
      stopped_reason: last ? 'Sequence complete.' : null,
      sent: [...(drip.sent ?? []), { step, at: nowIso, messageId: sent.id, subject: email.subject }],
      updated_at: nowIso,
    })
    .eq('id', drip.id)
    .select('*')
    .single();

  return { ok: true, drip: (updatedDrip ?? drip) as OutboundDrip, lead: (updatedLead ?? lead) as OutboundLead, messageId: sent.id, subject: email.subject };
}

/**
 * Start (or restart) the drip for a lead by sending email 1 now. A drip that
 * is already active is returned as-is; a stopped or finished one starts over
 * only when `restart` is true.
 */
export async function startDrip(sb: SupabaseClient, lead: OutboundLead, startedBy: string, restart = false): Promise<DripSendResult | { ok: false; error: string }> {
  const stop = dripStopReason(lead, false);
  if (stop) return { ok: false, error: `Cannot start: ${stop}` };
  const existing = await getDrip(sb, lead.id);
  if (existing && existing.status === 'active') return { ok: false, error: 'Their drip is already running.' };
  if (existing && existing.status === 'paused') return { ok: false, error: 'Their drip is paused. Resume it instead.' };
  if (existing && !restart) return { ok: false, error: `Their drip already ran (${existing.stopped_reason ?? 'complete'}). Restart it to run again.` };

  const nowIso = new Date().toISOString();
  const row = { lead_id: lead.id, status: 'active', step: 0, gaps: DRIP_GAPS, next_at: nowIso, started_at: nowIso, started_by: startedBy, last_sent_at: null, stopped_reason: null, sent: [], last_error: null, updated_at: nowIso };
  const { data, error } = existing
    ? await sb.from('outbound_drips').update(row).eq('id', existing.id).select('*').single()
    : await sb.from('outbound_drips').insert(row).select('*').single();
  if (error || !data) return { ok: false, error: error?.message ?? 'Could not create the drip.' };
  return sendDripStep(sb, lead, data as OutboundDrip, 1);
}

export async function setDripStatus(sb: SupabaseClient, leadId: string, status: 'paused' | 'active' | 'stopped', reason?: string): Promise<OutboundDrip | null> {
  const drip = await getDrip(sb, leadId);
  if (!drip) return null;
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === 'stopped') { patch.stopped_reason = reason ?? 'Stopped from the cockpit.'; patch.next_at = null; }
  if (status === 'active') {
    // Resume: the next step goes on the next cadence run, never instantly.
    patch.stopped_reason = null;
    patch.next_at = atCadenceHour(addBusinessDays(new Date(), 1)).toISOString();
    if (drip.step >= (drip.gaps?.length ?? DRIP_GAPS.length) + 1) return drip;
  }
  const { data } = await sb.from('outbound_drips').update(patch).eq('id', drip.id).select('*').single();
  return (data as OutboundDrip | null) ?? drip;
}

/**
 * The cron half: every active drip whose next_at has passed sends its next
 * step. Claims by nulling next_at first so two overlapping runs cannot send the
 * same step twice; a failed send puts next_at back one business day.
 */
export async function runOutboundDrips(sb: SupabaseClient): Promise<{ due: number; sent: number; stopped: number; failed: number }> {
  const nowIso = new Date().toISOString();
  const { data: due } = await sb
    .from('outbound_drips')
    .select('*')
    .eq('status', 'active')
    .lte('next_at', nowIso)
    .order('next_at', { ascending: true })
    .limit(DRIP_CAP_PER_RUN);
  const out = { due: due?.length ?? 0, sent: 0, stopped: 0, failed: 0 };
  for (const d of (due ?? []) as OutboundDrip[]) {
    const { data: claimed } = await sb.from('outbound_drips').update({ next_at: null }).eq('id', d.id).eq('status', 'active').not('next_at', 'is', null).select('id').maybeSingle();
    if (!claimed) continue;
    const { data: lead } = await sb.from('outbound_leads').select('*').eq('id', d.lead_id).maybeSingle();
    if (!lead) { await sb.from('outbound_drips').update({ status: 'stopped', stopped_reason: 'Lead is gone.' }).eq('id', d.id); out.stopped++; continue; }
    const r = await sendDripStep(sb, lead as OutboundLead, d, d.step + 1);
    if (r.ok) out.sent++;
    else if (r.stopped) out.stopped++;
    else {
      out.failed++;
      await sb.from('outbound_drips').update({ next_at: atCadenceHour(addBusinessDays(new Date(), 1)).toISOString() }).eq('id', d.id);
    }
  }
  return out;
}
