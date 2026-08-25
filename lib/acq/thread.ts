/**
 * THE MAIL THREAD FOR ONE CONTACT.
 *
 * "Something was sent at 8:20 and I have no idea what it said" is the failure
 * this closes. Every screen that shows a contact can now show the mail: what
 * left, the exact bytes of it, what the provider did with it, whether they
 * opened it, and what is queued to go next and on what day.
 *
 * Nothing new has to be written for this to work on mail that already went out.
 * `lib/send-email.ts` has always stored the rendered HTML of every send in the
 * `emails` Sent store, and `acq_sends` has always carried the campaign facts
 * (step, variant, delivery status). They were simply never joined and never
 * shown. This module joins them:
 *
 *   acq_sends            campaign facts + provider delivery status
 *   emails               the body, keyed by provider_message_id
 *   acq_events           opens and clicks, attributed to a step
 *   acq_queue            work already scheduled
 *   the sequence gaps    the emails that have no queue row yet
 *
 * The projected part matters as much as the history. A drip that has sent one
 * of five emails has four more coming, none of which exists as a row anywhere
 * until the day it is due, and Sarah still has to be able to read them today.
 * Those are rendered from the live templates against this exact prospect, so a
 * projection is the same bytes the send would produce.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { buildCampaignEmail } from '@/lib/acq/campaign';
import { getCampaign, getVariants, pickVariant } from '@/lib/acq/settings';
import { sequenceGaps, sequenceLength } from '@/lib/acq/eligibility';
import { stripTrackingPixels } from '@/lib/email';
import { isInternalAddress } from '@/lib/owner';
import type { AcqProspect } from '@/lib/acq/types';

/** One button or text link in a message, with where it really goes. */
export type EmailLink = { label: string; url: string };

/** One email that actually left, or one reply that actually came back. */
export type ThreadMessage = {
  id: string;
  direction: 'outbound' | 'inbound';
  /** campaign | demo | followup | checkout | transactional | reply */
  kind: string;
  step: number | null;
  variant: string | null;
  subject: string;
  from: string;
  to: string;
  occurredAt: string;
  /** queued | sent | accepted | delivered | bounced | complaint | unsubscribed | refused */
  status: string;
  statusDetail: string | null;
  deliveredAt: string | null;
  bouncedAt: string | null;
  /** Safe to render: the open pixel is gone and the links cannot be followed. */
  html: string | null;
  text: string | null;
  links: EmailLink[];
  /** Opens and clicks attributed to this step. Machine hits counted apart. */
  opens: number;
  clicks: number;
  machineHits: number;
  /** True when the send is on the record but the body was never stored. */
  bodyMissing: boolean;
};

/** One email that has not gone out yet, with the bytes it will carry. */
export type ScheduledMessage = {
  id: string;
  kind: string;
  step: number | null;
  variant: string | null;
  subject: string | null;
  html: string | null;
  links: EmailLink[];
  /** When it is expected to leave. Null when it depends on an event, not a clock. */
  dueAt: string | null;
  /** queued: a real acq_queue row. projected: the sequence says it is coming. */
  source: 'queued' | 'projected';
  status: string;
  note: string;
};

/** A send the governor stopped before it left. Never an email they received. */
export type ThreadRefusal = { id: string; at: string; reason: string; kind: string };

export type ThreadSequence = {
  length: number;
  stage: number;
  gaps: number[];
  /** Why the drip will send nothing more, or null when it is still running. */
  stoppedReason: string | null;
};

export type EmailThread = {
  email: string | null;
  leadId: string | null;
  businessName: string | null;
  contactName: string | null;
  messages: ThreadMessage[];
  scheduled: ScheduledMessage[];
  /** Attempts the outbound governor refused, so "nothing went out" has a why. */
  refusals: ThreadRefusal[];
  sequence: ThreadSequence | null;
  /** Sends we hold with nothing to render. Zero on healthy data. */
  missingBodies: number;
};

const ANCHOR_RE = /<a\b([^>]*?)href\s*=\s*(?:"([^"]*)"|'([^']*)')([^>]*)>([\s\S]*?)<\/a>/gi;

const ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rarr: '→', larr: '←', mdash: '-', ndash: '-', hellip: '...',
};

/** "/mustard?source=..." reads as "the /mustard page". */
function pathLabel(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === '/' ? u.hostname.replace(/^www\./, '') : `the ${u.pathname} page`;
  } catch {
    return url;
  }
}

/** Anchor text is HTML. A label reading "Book a call &rarr;" helps nobody. */
function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m);
}

/**
 * MAKING A SENT EMAIL SAFE TO LOOK AT.
 *
 * Reading our own mail must never be indistinguishable from the prospect
 * reading it. Two things in a rendered campaign email lie to the funnel if a
 * browser touches them:
 *
 *   the open pixel   an <img> at /api/track/open?p=<leadId>. Rendering it
 *                    counts an open and stamps email_opened_at, so opening the
 *                    thread would report that the prospect read the email.
 *                    lib/email.ts strips it and says this is mandatory.
 *   the buttons      every CTA is a tracked redirect through /api/acq/click,
 *                    which records a click and flips the lead to `engaged`. An
 *                    iframe with sandbox="" blocks scripts but still follows a
 *                    link, so one stray click inside a preview would build
 *                    engagement on a prospect nobody has heard from.
 *
 * So the pixel comes out and every anchor loses its href, keeping its text and
 * its styling. The real destinations are handed back separately and listed
 * under the preview, where Sarah can read them and copy one deliberately.
 */
export function safeEmailHtml(html: string | null | undefined): { html: string | null; links: EmailLink[] } {
  if (!html) return { html: null, links: [] };
  const stripped = stripTrackingPixels(html);
  const links: EmailLink[] = [];
  const seen = new Set<string>();
  const out = stripped.replace(ANCHOR_RE, (_m, pre: string, dq: string, sq: string, post: string, inner: string) => {
    const url = (dq ?? sq ?? '').trim();
    const label = decodeEntities(inner.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (url && !/^(mailto:|tel:|#)/i.test(url) && !seen.has(url)) {
      seen.add(url);
      // Some anchors wrap a number or an icon (the revenue figure in the
      // calculator block is a link). "7" names nothing, so those fall back to
      // the path, which at least says which door it opens.
      const weak = label.length < 3 || /^[\d\s.,$%+-]+$/.test(label);
      links.push({ label: weak ? pathLabel(url) : label, url });
    }
    // mailto: and tel: keep working. They open a mail client or a dialler, not
    // a tracker, and being able to press "call them" from the preview is useful.
    const keepHref = /^(mailto:|tel:)/i.test(url);
    const href = keepHref ? ` href="${url.replace(/"/g, '&quot;')}"` : '';
    const dead = keepHref ? '' : ' style="cursor:default" data-preview-link="1"';
    return `<a${pre}${href}${post}${dead}>${inner}</a>`;
  });
  return { html: out, links };
}

/** Whatever the mailbox stored, cut down to a bare address for comparison. */
export function bareAddress(raw: string | null | undefined): string {
  const s = String(raw ?? '');
  const angled = s.match(/<([^>]+)>/);
  return (angled ? angled[1] : s).trim().toLowerCase();
}

function anyAddressMatches(field: string | null | undefined, target: string): boolean {
  if (!field || !target) return false;
  return String(field)
    .split(',')
    .some((part) => bareAddress(part) === target);
}

type SendRow = {
  id: string;
  lead_id: string | null;
  kind: string | null;
  step: number | null;
  variant: string | null;
  to_email: string;
  from_email: string;
  subject: string | null;
  provider_message_id: string | null;
  status: string;
  status_detail: string | null;
  refused_reason: string | null;
  sent_at: string;
  delivered_at: string | null;
  bounced_at: string | null;
};

type MailRow = {
  id: string;
  direction: string;
  folder: string;
  from_addr: string | null;
  from_name: string | null;
  to_addrs: string | null;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  snippet: string | null;
  status: string | null;
  status_detail: string | null;
  provider_message_id: string | null;
  lead_id: string | null;
  occurred_at: string;
};

type EventRow = {
  type: string;
  occurred_at: string;
  detail: Record<string, unknown> | null;
};

type QueueRow = {
  id: string;
  kind: string;
  step: number | null;
  status: string;
  run_after: string;
  error: string | null;
};

/**
 * Cold mail we sent that is not worth showing as correspondence. The open pixel
 * and the click redirect are ours; the unsubscribe confirmation is a receipt.
 * Everything else the contact received is correspondence and belongs here.
 */
const NOT_CORRESPONDENCE = /^(open|click|ping)$/i;

/**
 * Build the whole thread for one contact.
 *
 * Either handle works. A prospect is found by `leadId`; a client who has no
 * lead row at all is found by `email`, and that is the case the Client Book
 * needs, because a paying customer's mail is proposals and invoices rather than
 * campaign steps.
 */
export async function buildEmailThread(
  db: SupabaseClient,
  args: { leadId?: string | null; email?: string | null },
): Promise<EmailThread> {
  let lead: AcqProspect | null = null;
  if (args.leadId) {
    const { data } = await db.from('outbound_leads').select('*').eq('id', args.leadId).maybeSingle();
    lead = (data as AcqProspect) ?? null;
  }

  const address = bareAddress(args.email ?? lead?.email ?? null) || null;

  // The Client Book arrives holding only an address, and a buyer almost always
  // started life as a prospect. Finding that row is what puts the drip's state
  // and its remaining emails on a client's screen instead of a bare Sent list.
  if (!lead && address) {
    const { data } = await db.from('outbound_leads').select('*').eq('email', address).limit(1).maybeSingle();
    lead = (data as AcqProspect) ?? null;
  }

  const leadId = lead?.id ?? args.leadId ?? null;

  // Nothing to key on means nothing to show, and an unfiltered read of the
  // whole Sent store would be a very expensive way to render an empty panel.
  if (!leadId && !address) {
    return { email: null, leadId: null, businessName: null, contactName: null, messages: [], scheduled: [], refusals: [], sequence: null, missingBodies: 0 };
  }

  // The address is only a search key when it belongs to the contact.
  const sweep = address && !isInternalAddress(address) ? address : null;

  const [sends, mail, events, queue] = await Promise.all([
    readSends(db, leadId, sweep),
    readMail(db, leadId, sweep),
    leadId ? readEvents(db, leadId) : Promise.resolve([] as EventRow[]),
    leadId ? readQueue(db, leadId) : Promise.resolve([] as QueueRow[]),
  ]);

  const messages = mergeMessages(sends, mail, events, sweep);
  const missingBodies = messages.filter((m) => m.bodyMissing).length;

  const refusals: ThreadRefusal[] = sends
    .filter((s) => s.status === 'refused')
    .map((s) => ({ id: s.id, at: s.sent_at, reason: s.refused_reason ?? 'Refused by the outbound governor.', kind: s.kind ?? 'campaign' }))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const { scheduled, sequence } = lead ? await projectSchedule(db, lead, queue) : { scheduled: [], sequence: null };

  return {
    email: address,
    leadId,
    businessName: (lead?.business_name as string | undefined) ?? null,
    contactName: (lead?.contact_name as string | undefined) ?? null,
    messages,
    scheduled,
    refusals,
    sequence,
    missingBodies,
  };
}

/* ─────────────────────────────── the reads ──────────────────────────────── */

const SEND_COLS =
  'id,lead_id,kind,step,variant,to_email,from_email,subject,provider_message_id,status,status_detail,refused_reason,sent_at,delivered_at,bounced_at';

async function readSends(db: SupabaseClient, leadId: string | null, address: string | null): Promise<SendRow[]> {
  const out = new Map<string, SendRow>();
  const queries: PromiseLike<{ data: unknown }>[] = [];
  if (leadId) queries.push(db.from('acq_sends').select(SEND_COLS).eq('lead_id', leadId).order('sent_at', { ascending: false }).limit(200));
  if (address) queries.push(db.from('acq_sends').select(SEND_COLS).eq('to_email', address).order('sent_at', { ascending: false }).limit(200));
  for (const res of await Promise.all(queries)) {
    for (const row of ((res.data ?? []) as SendRow[])) out.set(row.id, row);
  }
  return [...out.values()];
}

const MAIL_COLS =
  'id,direction,folder,from_addr,from_name,to_addrs,subject,body_html,body_text,snippet,status,status_detail,provider_message_id,lead_id,occurred_at';

/**
 * The Sent store, plus anything they wrote back.
 *
 * Inbound mail carries no lead_id (the IMAP sync has no way to know one), so a
 * reply is found the only way it can be: by the address it came from. That is
 * also why the outbound side is read by address as well as by lead_id, since
 * transactional mail to a client is not lead-linked either.
 */
async function readMail(db: SupabaseClient, leadId: string | null, address: string | null): Promise<MailRow[]> {
  const out = new Map<string, MailRow>();
  const queries: PromiseLike<{ data: unknown }>[] = [];
  if (leadId) queries.push(db.from('emails').select(MAIL_COLS).eq('lead_id', leadId).order('occurred_at', { ascending: false }).limit(200));
  if (address) {
    queries.push(
      db.from('emails').select(MAIL_COLS).ilike('to_addrs', `%${address}%`).order('occurred_at', { ascending: false }).limit(200),
      db.from('emails').select(MAIL_COLS).eq('from_addr', address).order('occurred_at', { ascending: false }).limit(100),
    );
  }
  for (const res of await Promise.all(queries)) {
    for (const row of ((res.data ?? []) as MailRow[])) out.set(row.id, row);
  }
  // `ilike %addr%` is a substring test, so sarah@x.com would drag in
  // notsarah@x.com. Every row is re-checked against the parsed addresses.
  if (!address) return [...out.values()];
  return [...out.values()].filter(
    (r) => r.lead_id === leadId || anyAddressMatches(r.to_addrs, address) || bareAddress(r.from_addr) === address,
  );
}

async function readEvents(db: SupabaseClient, leadId: string): Promise<EventRow[]> {
  const { data } = await db
    .from('acq_events')
    .select('type,occurred_at,detail')
    .eq('lead_id', leadId)
    .in('type', ['email_opened', 'link_clicked'])
    .order('occurred_at', { ascending: false })
    .limit(400);
  return (data ?? []) as EventRow[];
}

async function readQueue(db: SupabaseClient, leadId: string): Promise<QueueRow[]> {
  const { data } = await db
    .from('acq_queue')
    .select('id,kind,step,status,run_after,error')
    .eq('lead_id', leadId)
    .in('status', ['pending', 'claimed', 'failed'])
    .order('run_after', { ascending: true })
    .limit(40);
  return (data ?? []) as QueueRow[];
}

/* ────────────────────────────── the merge ───────────────────────────────── */

/**
 * Opens and clicks per step.
 *
 * Both event writers stamp `detail.step`, so engagement lands on the email that
 * earned it rather than on the prospect in aggregate. Machine hits (mail
 * security gateways rendering the message before the recipient sees it) are
 * already labelled by lib/acq/bots.ts and are counted separately, never folded
 * into a number that reads as a person.
 */
function engagementByStep(events: EventRow[]): Map<number, { opens: number; clicks: number; machine: number }> {
  const out = new Map<number, { opens: number; clicks: number; machine: number }>();
  for (const e of events) {
    const step = Number((e.detail ?? {}).step ?? 0);
    if (!Number.isFinite(step) || step <= 0) continue;
    const bucket = out.get(step) ?? { opens: 0, clicks: 0, machine: 0 };
    if ((e.detail ?? {}).machine === true) bucket.machine++;
    else if (e.type === 'email_opened') bucket.opens++;
    else bucket.clicks++;
    out.set(step, bucket);
  }
  return out;
}

function mergeMessages(sends: SendRow[], mail: MailRow[], events: EventRow[], address: string | null): ThreadMessage[] {
  const engagement = engagementByStep(events);
  const byProviderId = new Map<string, MailRow>();
  for (const m of mail) {
    if (m.provider_message_id) byProviderId.set(m.provider_message_id, m);
  }

  const out: ThreadMessage[] = [];
  const usedMail = new Set<string>();

  // 1. Every governed marketing send, with its body pulled off the Sent store.
  for (const s of sends) {
    if (s.status === 'refused') continue;
    const body = s.provider_message_id ? byProviderId.get(s.provider_message_id) : undefined;
    if (body) usedMail.add(body.id);
    const step = s.step ?? null;
    const eng = step ? engagement.get(step) : undefined;
    const safe = safeEmailHtml(body?.body_html);
    out.push({
      id: s.id,
      direction: 'outbound',
      kind: s.kind ?? 'campaign',
      step,
      variant: s.variant,
      subject: s.subject || body?.subject || '(no subject)',
      from: s.from_email,
      to: s.to_email,
      occurredAt: s.sent_at,
      status: s.status,
      statusDetail: s.status_detail ?? body?.status_detail ?? null,
      deliveredAt: s.delivered_at,
      bouncedAt: s.bounced_at,
      html: safe.html,
      text: body?.body_text ?? null,
      links: safe.links,
      opens: eng?.opens ?? 0,
      clicks: eng?.clicks ?? 0,
      machineHits: eng?.machine ?? 0,
      bodyMissing: !body?.body_html && !body?.body_text,
    });
  }

  // 2. Everything else in the mailbox for this contact: proposals, invoices,
  //    portal notices, hand-typed replies, and anything they sent back. A client
  //    has no campaign row at all and this is their entire thread.
  for (const m of mail) {
    if (usedMail.has(m.id)) continue;
    if (NOT_CORRESPONDENCE.test(String(m.subject ?? ''))) continue;
    const inbound = m.direction === 'inbound' || (address ? bareAddress(m.from_addr) === address : false);
    const safe = safeEmailHtml(m.body_html);
    out.push({
      id: m.id,
      direction: inbound ? 'inbound' : 'outbound',
      kind: inbound ? 'reply' : 'transactional',
      step: null,
      variant: null,
      subject: m.subject || '(no subject)',
      from: m.from_name ? `${m.from_name} <${bareAddress(m.from_addr)}>` : bareAddress(m.from_addr),
      to: m.to_addrs ?? '',
      occurredAt: m.occurred_at,
      status: m.status ?? (inbound ? 'received' : 'sent'),
      statusDetail: m.status_detail ?? null,
      deliveredAt: null,
      bouncedAt: null,
      html: safe.html,
      text: m.body_text ?? m.snippet,
      links: safe.links,
      opens: 0,
      clicks: 0,
      machineHits: 0,
      bodyMissing: !m.body_html && !m.body_text && !m.snippet,
    });
  }

  out.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  return out;
}

/* ──────────────────────────── what is coming ────────────────────────────── */

/** Whole business days after `from`, landing on a weekday. */
function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  let left = Math.max(0, Math.round(days));
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/**
 * Anything that stops the drip dead, in the same words `dueForStep` decides in.
 * Kept in step with lib/acq/eligibility.ts: if that adds a reason to stop, this
 * must gain the matching sentence or the screen will promise mail that the
 * runner will never send.
 */
function stoppedReasonFor(lead: AcqProspect): string | null {
  if (lead.unsubscribed_at) return 'They opted out, so nothing else goes to this address.';
  if (!lead.acq_eligible) return `Held out of the campaign${lead.acq_ineligible_reason ? `: ${lead.acq_ineligible_reason}` : '.'}`;
  if (lead.consent_status === 'granted') return 'They gave Mr. Mustard permission to call, so the drip stops and the phone takes over.';
  if (lead.reply_at) return 'They replied, so the drip stops. This is a conversation now.';
  // A demo does not end the follow-up, it changes which one is running. Saying
  // "the sequence ended" over a screen that is about to show three queued
  // follow-ups reads as a contradiction, so this names the handover instead.
  if (['demoed', 'forged', 'demo_sent'].includes(String(lead.acq_stage))) {
    return 'The cold drip is done: they have their demo. The post-demo sequence takes over and its emails are listed above.';
  }
  if (['consented', 'called', 'meeting', 'client'].includes(String(lead.acq_stage))) {
    return `They moved to ${String(lead.acq_stage).replace(/_/g, ' ')}, which ends the sequence.`;
  }
  if (!lead.email) return 'No email address on file.';
  return null;
}

/**
 * The rest of the drip, rendered.
 *
 * Queued rows come first because they are committed work with a real run time.
 * Everything after them is a projection: the campaign's own business-day gaps
 * walked forward from the last send, with each email built from the live
 * template against this prospect. The dates move if a send slips, and the panel
 * says so rather than presenting a projection as a promise.
 */
async function projectSchedule(
  db: SupabaseClient,
  lead: AcqProspect,
  queue: QueueRow[],
): Promise<{ scheduled: ScheduledMessage[]; sequence: ThreadSequence }> {
  const campaign = await getCampaign();
  const gaps = sequenceGaps(campaign?.step_after_days);
  const total = sequenceLength(campaign?.step_after_days);
  const stage = Number(lead.email_stage ?? 0);
  const stoppedReason = stoppedReasonFor(lead);
  const sequence: ThreadSequence = { length: total, stage, gaps, stoppedReason };

  const scheduled: ScheduledMessage[] = [];
  const variants = campaign ? await getVariants(campaign.id) : [];

  /** The exact bytes step N would carry, or nothing if it has no active arm. */
  const render = (step: number) => {
    if (!campaign) return null;
    const variant = pickVariant(variants, step, lead.id);
    if (!variant) return null;
    const built = buildCampaignEmail({
      lead,
      variant,
      step,
      fromName: campaign.from_name,
      fromEmail: campaign.from_email,
      replyTo: campaign.reply_to,
    });
    if (!built) return null;
    const safe = safeEmailHtml(built.html);
    return { subject: built.subject, html: safe.html, links: safe.links, variant: variant.key };
  };

  // Committed work first: a queue row is a real job with a real run time. An
  // email job is rendered the same way a sent one is, so "what is going out on
  // Thursday" is answered by reading it rather than by trusting the step number.
  for (const j of queue) {
    const built = j.kind === 'email' && j.step ? render(j.step) : null;
    scheduled.push({
      id: j.id,
      kind: j.kind,
      step: j.step || null,
      variant: built?.variant ?? null,
      subject: built?.subject ?? null,
      html: built?.html ?? null,
      links: built?.links ?? [],
      dueAt: j.run_after,
      source: 'queued',
      status: j.status,
      note:
        j.status === 'failed'
          ? `Failed${j.error ? `: ${j.error}` : '.'} It retries until it runs out of attempts.`
          : j.status === 'claimed'
            ? 'A worker has this right now.'
            : 'Queued. It leaves inside the next send window.',
    });
  }

  if (!campaign || stoppedReason || stage >= total) {
    return { scheduled, sequence };
  }

  const queuedEmailSteps = new Set(queue.filter((j) => j.kind === 'email').map((j) => j.step ?? 0));

  // Then the rest of the drip, which exists nowhere yet. Walk the campaign's own
  // business-day gaps forward from the last send. With nothing sent yet the next
  // email is due now and each one after it is a gap further out.
  let cursor = lead.last_campaign_email_at ? new Date(lead.last_campaign_email_at) : new Date();
  for (let step = stage + 1; step <= total; step++) {
    // gaps[0] is the wait between emails 1 and 2, so the wait in front of
    // `step` is gaps[step - 2]. Step 1 has nothing in front of it.
    if (step > 1) cursor = addBusinessDays(cursor, gaps[step - 2] ?? gaps[gaps.length - 1] ?? 3);
    if (queuedEmailSteps.has(step)) continue;

    const built = render(step);
    if (!built) continue;

    scheduled.push({
      id: `projected:${step}`,
      kind: 'email',
      step,
      variant: built.variant,
      subject: built.subject,
      html: built.html,
      links: built.links,
      dueAt: (stage === 0 && step === 1 ? new Date() : cursor).toISOString(),
      source: 'projected',
      status: 'projected',
      note:
        step === stage + 1
          ? 'Next in the drip. The day moves with the send window and the daily cap.'
          : `Goes ${gaps[step - 2] ?? 3} business days after email ${step - 1} lands.`,
    });
  }

  scheduled.sort((a, b) => new Date(a.dueAt ?? 0).getTime() - new Date(b.dueAt ?? 0).getTime());
  return { scheduled, sequence };
}
