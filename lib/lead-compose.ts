import type { SupabaseClient } from '@supabase/supabase-js';
import { clientEmail, escape } from '@/lib/email';
import { sendViaResend } from '@/lib/send-email';
import { complianceFooter, unsubscribeUrlFor, OUTBOUND_FROM, OUTBOUND_REPLY_TO } from '@/lib/outbound-email';
import { recordEvent } from '@/lib/acq/events';
import { llmText } from '@/lib/llm';
import { OFFER } from '@/lib/acq/types';
import { DEMO_PRODUCTS } from '@/lib/demo-order';

/**
 * WRITE ONE PERSON ONE EMAIL, RIGHT NOW.
 *
 * Before this file the only way to mail a lead was to start a sequence at them.
 * Somebody talks to Mr. Mustard, says the thing that decides the sale ("I only
 * get twenty calls a month"), and the answer to that sentence is a specific
 * email that no drip contains. That email had nowhere to be written.
 *
 * So: one composer, one send path, three lead tables.
 *
 *   lead      outbound_leads   the acquisition prospects and the cockpit
 *   prospect  rep_prospects    the rep tracker (cold calls and walk-ins)
 *   inbound   leads            people who came to us through the website
 *
 * The suggestion is not a template. It reads the LAST thing that actually
 * happened to this contact (the call transcript, what they wrote back, what we
 * sent, what they opened) and writes to that. Sarah steers it with one line of
 * instruction, and any price or term she puts in that line is used verbatim.
 * The model is forbidden from inventing money.
 *
 * The send is deliberately NOT a campaign send. It skips the outbound governor,
 * writes no acq_sends row and starts no sequence, because the governor exists
 * to pace cold volume onto a warming domain and this is one human answering one
 * conversation. It does NOT skip the suppression gate: an opt-out is honored
 * here exactly as it is everywhere else.
 */

export const LEAD_SOURCES = ['lead', 'prospect', 'inbound'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export function isLeadSource(v: unknown): v is LeadSource {
  return typeof v === 'string' && (LEAD_SOURCES as readonly string[]).includes(v);
}

const TABLE: Record<LeadSource, string> = {
  lead: 'outbound_leads',
  prospect: 'rep_prospects',
  inbound: 'leads',
};

/** The `messages` column each table threads on. */
const MESSAGE_FK: Record<LeadSource, string> = {
  lead: 'outbound_lead_id',
  prospect: 'prospect_id',
  inbound: 'lead_id',
};

export type Interaction = {
  /** ISO. */
  at: string;
  /** "Mr. Mustard called them", "They wrote back", "We sent them an email". */
  what: string;
  /** The substance: a transcript, a reply body, a subject line. */
  detail: string;
};

export type ComposeSubject = {
  source: LeadSource;
  id: string;
  to: string | null;
  businessName: string;
  contactName: string | null;
  firstName: string | null;
  /** One line each, only what we actually know. A blank beats a guess. */
  facts: string[];
  /** Newest first. */
  interactions: Interaction[];
  /** The one interaction this email should answer, in plain English. */
  basis: string;
  /** Links that are real and live, offered to the writer as material. */
  links: { label: string; url: string }[];
  /** Set when we must not send: no address, or they opted out. */
  blocked: string | null;
};

/* --------------------------------- reading -------------------------------- */

const str = (row: Record<string, unknown>, key: string): string | null => {
  const v = row[key];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
};
const num = (row: Record<string, unknown>, key: string): number | null => {
  const v = row[key];
  return typeof v === 'number' ? v : null;
};

function firstNameOf(contact: string | null): string | null {
  if (!contact) return null;
  const first = contact.trim().split(/\s+/)[0];
  return first && first.length > 1 ? first : null;
}

function when(iso: string | null | undefined): string {
  if (!iso) return 'undated';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Denver',
  });
}

function duration(sec: number | null): string {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

/** Trim a transcript to the part that carries the decision: the end of it. */
function tailOf(text: string, chars: number): string {
  const t = text.trim();
  return t.length <= chars ? t : `...${t.slice(-chars)}`;
}

/**
 * Everything known about one contact, shaped for a human to write from.
 *
 * Every read is bounded and every one of them is allowed to come back empty: a
 * table that does not exist in this environment must degrade to a thinner
 * dossier, never to a 500 on the compose screen.
 */
export async function loadComposeSubject(
  db: SupabaseClient,
  source: LeadSource,
  id: string,
): Promise<ComposeSubject | null> {
  const { data } = await db.from(TABLE[source]).select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;

  const to = (str(row, 'email') ?? '').toLowerCase() || null;
  const businessName =
    str(row, 'business_name') ?? str(row, 'business') ?? str(row, 'company') ?? str(row, 'name') ?? 'this contact';
  const contactName = str(row, 'contact_name') ?? (source === 'inbound' ? str(row, 'name') : null);

  const facts: string[] = [];
  const fact = (label: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') return;
    facts.push(`${label}: ${value}`);
  };

  fact('Business', businessName);
  fact('Contact', [contactName, str(row, 'contact_title')].filter(Boolean).join(', ') || null);
  fact('Where', [str(row, 'city'), str(row, 'state')].filter(Boolean).join(', ') || null);
  fact('Trade', str(row, 'trade') ?? str(row, 'industry'));
  fact('Website', str(row, 'website'));
  fact('Phone', str(row, 'phone'));
  fact(
    'Reviews',
    num(row, 'review_count')
      ? `${num(row, 'review_count')} reviews${num(row, 'rating') ? ` at ${num(row, 'rating')} stars` : ''}`
      : null,
  );
  fact('Lead score', num(row, 'lead_score') != null ? `${num(row, 'lead_score')}/100` : null);
  fact('Website audit', num(row, 'audit_score') != null ? `${num(row, 'audit_score')}/100` : null);
  fact('Stage', str(row, 'acq_stage') ?? str(row, 'status'));
  fact('They asked about', str(row, 'idea_description') ?? str(row, 'message'));
  fact('Budget range they gave', str(row, 'revenue_range'));
  fact('Timeline they gave', str(row, 'timeline'));
  fact('How they found us', str(row, 'source'));
  fact('Our notes', str(row, 'rep_notes') ?? str(row, 'notes'));
  fact('Flagged for a human', str(row, 'needs_human'));

  const audit = row.audit_json as { headline?: string; top_three_fixes?: { title: string }[] } | null;
  if (audit?.headline) facts.push(`Audit headline: ${audit.headline}`);
  if (audit?.top_three_fixes?.[0]?.title) facts.push(`Biggest fix on their site: ${audit.top_three_fixes[0].title}`);

  const links: { label: string; url: string }[] = [];
  const link = (label: string, url: string | null) => {
    if (url && /^https?:\/\//.test(url)) links.push({ label, url });
  };
  link('Their demo hub', str(row, 'hub_demo_url'));
  link('Their demo website', str(row, 'demo_url'));
  link('Their website audit', str(row, 'audit_url'));

  const interactions: Interaction[] = [];

  // Mr. Mustard, and any other AI call. The transcript is the single richest
  // thing we hold, and it is exactly what a drip can never answer.
  if (source === 'lead') {
    const { data: calls } = await db
      .from('acq_calls')
      .select('summary,transcript,intel,duration_sec,requested_at,ended_reason,status,outcome')
      .eq('lead_id', id)
      .order('requested_at', { ascending: false })
      .limit(3);
    for (const c of (calls ?? []) as Record<string, unknown>[]) {
      const secs = num(c, 'duration_sec');
      const transcript = str(c, 'transcript');
      const body = [
        str(c, 'summary'),
        c.intel ? `What he pulled out of it: ${JSON.stringify(c.intel).slice(0, 1200)}` : null,
        transcript ? `Transcript:\n${tailOf(transcript, 3500)}` : null,
      ]
        .filter(Boolean)
        .join('\n');
      if (!body) continue;
      const status = str(c, 'status');
      interactions.push({
        at: str(c, 'requested_at') ?? new Date().toISOString(),
        what: `Mr. Mustard called them${secs ? ` and they talked for ${duration(secs)}` : ''}${
          status && status !== 'completed' ? ` (${status})` : ''
        }`,
        detail: body,
      });
    }
  }

  // The thread: what we sent, what they wrote back, notes, texts.
  const { data: msgs } = await db
    .from('messages')
    .select('direction,channel,subject,body,snippet,occurred_at')
    .eq(MESSAGE_FK[source], id)
    .order('occurred_at', { ascending: false })
    .limit(14);
  for (const m of (msgs ?? []) as Record<string, unknown>[]) {
    const inbound = str(m, 'direction') === 'inbound';
    const channel = str(m, 'channel') ?? 'email';
    const text = str(m, 'body') ?? str(m, 'snippet');
    const subjectLine = str(m, 'subject');
    if (!text && !subjectLine) continue;
    interactions.push({
      at: str(m, 'occurred_at') ?? new Date().toISOString(),
      what: inbound
        ? `They wrote back${channel !== 'email' ? ` by ${channel}` : ''}`
        : channel === 'note'
          ? 'Internal note'
          : `We sent them ${channel === 'email' ? 'an email' : `a ${channel}`}`,
      detail: [subjectLine ? `Subject: ${subjectLine}` : null, (text ?? '').slice(0, 1800)].filter(Boolean).join('\n'),
    });
  }

  // Anything they wrote to us that landed in the mailbox rather than the CRM.
  if (to) {
    const { data: mail } = await db
      .from('emails')
      .select('direction,subject,snippet,body_text,occurred_at')
      .eq('from_addr', to)
      .order('occurred_at', { ascending: false })
      .limit(5);
    for (const e of (mail ?? []) as Record<string, unknown>[]) {
      const subjectLine = str(e, 'subject');
      interactions.push({
        at: str(e, 'occurred_at') ?? new Date().toISOString(),
        what: 'They emailed us',
        detail: [subjectLine ? `Subject: ${subjectLine}` : null, (str(e, 'body_text') ?? str(e, 'snippet') ?? '').slice(0, 1800)]
          .filter(Boolean)
          .join('\n'),
      });
    }
  }

  // Engagement, which is the quietest signal and sometimes the only one.
  if (source === 'lead') {
    const { data: events } = await db
      .from('acq_events')
      .select('type,label,occurred_at')
      .eq('lead_id', id)
      .in('type', ['email_opened', 'link_clicked', 'meeting_booked', 'demo_emailed', 'checkout_sent', 'consent_captured', 'reply'])
      .order('occurred_at', { ascending: false })
      .limit(10);
    for (const e of (events ?? []) as Record<string, unknown>[]) {
      interactions.push({
        at: str(e, 'occurred_at') ?? new Date().toISOString(),
        what: str(e, 'label') ?? (str(e, 'type') ?? 'event').replace(/_/g, ' '),
        detail: '',
      });
    }
  }

  interactions.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  // The basis is the most recent thing with substance in it, because "they
  // opened an email" is not something you can write a paragraph about.
  const substantive = interactions.find((i) => i.detail.length > 40) ?? interactions[0] ?? null;
  const basis = substantive ? `${substantive.what} on ${when(substantive.at)}` : 'nothing yet, this would be the first thing they hear from us';

  const optedOut = str(row, 'unsubscribed_at');
  const blocked = !to
    ? `No email address on file for ${businessName}. Add one to their card first.`
    : optedOut
      ? `${businessName} opted out on ${when(optedOut)}. That is permanent and it is honored.`
      : null;

  return {
    source,
    id,
    to,
    businessName,
    contactName,
    firstName: firstNameOf(contactName),
    facts,
    interactions: interactions.slice(0, 12),
    basis,
    links,
    blocked,
  };
}

/* -------------------------------- suggesting ------------------------------ */

/**
 * THE RULES THIS EMAIL IS WRITTEN UNDER.
 *
 * Money is the dangerous part. The model knows the standard prices because they
 * are handed to it below, and it may quote those. It may also quote anything
 * Sarah types into her instruction, verbatim, which is how a one-off offer like
 * "$197 a month for 120 minutes" gets written without waiting on a code change.
 * What it may never do is arrive at a number on its own.
 */
function systemPrompt(): string {
  const siteSetup = Math.round(DEMO_PRODUCTS.site.setupCents / 100);
  const siteMonthly = Math.round(DEMO_PRODUCTS.site.monthlyCents / 100);
  return [
    'You are Sarah Scarano, founder of Modern Mustard Seed, an AI product studio in Montana.',
    'You are writing ONE email to ONE business owner you are already in contact with. This is not a campaign and not a template.',
    '',
    'WHAT WE SELL',
    `Voice Agent: an AI front desk that answers their real phone 24/7. ${OFFER.line}. ${DEMO_PRODUCTS.voice.finePrint}`,
    `Website: ${DEMO_PRODUCTS.site.name}, $${siteSetup} setup + $${siteMonthly}/month. Unlimited edits, hosting and care included.`,
    'These are separate products with separate prices. A website never includes a voice agent.',
    'The Business Command Center is never offered, never bundled, and never mentioned unless they raise it first.',
    'The free thing is the DEMO: a real working one, no card. There is no free trial and no free month on their real line.',
    '',
    'MONEY RULES, ABSOLUTE',
    'Never invent, estimate, or round a price. Never quote an hourly rate, a day rate, a "roughly N hours" figure, or time and materials. We sell set package prices.',
    'You may use the prices listed above exactly as written, and you may use any price or term Sarah gives you in her instruction exactly as she wrote it.',
    'If a sentence needs a number nobody gave you, write the sentence without the number rather than guessing.',
    'Changes to something we built are included at no charge. Never quote a price for a change and never mention a change order.',
    '',
    'VOICE',
    'Direct, warm, founder to founder. Short paragraphs, most of them one or two sentences.',
    'No em dashes, ever. Use a comma, a colon, a period, or restructure the sentence.',
    'No preamble, no "I hope this finds you well", no hedging, no corporate throat clearing.',
    'Reference the specific thing they actually said or did. That is the entire reason this email exists.',
    'One ask, at the end, and make it easy to say yes to.',
    '',
    'FORMAT',
    'The first line is exactly "Subject: " followed by the subject line. Then one blank line. Then the body.',
    'The body is plain text with a blank line between paragraphs. No markdown.',
    'Do NOT sign it. Do not write "Sarah", "Thanks, Sarah", or any closing line. The email template draws her signature under whatever you write, so a typed sign-off lands on top of it.',
    'Keep it under 180 words unless the instruction asks for more.',
  ].join('\n');
}

function dossier(subject: ComposeSubject, instruction: string): string {
  const parts: string[] = [];
  parts.push(
    `WHO: ${subject.businessName}${subject.contactName ? `, contact ${subject.contactName}` : ''}${subject.to ? `, ${subject.to}` : ''}`,
  );
  if (subject.facts.length) parts.push(`WHAT WE KNOW\n${subject.facts.map((f) => `- ${f}`).join('\n')}`);
  if (subject.links.length) {
    parts.push(
      `LINKS THAT ARE REAL AND LIVE (use one only if it belongs in this email)\n${subject.links
        .map((l) => `- ${l.label}: ${l.url}`)
        .join('\n')}`,
    );
  }
  if (subject.interactions.length) {
    parts.push(
      `WHAT HAS ACTUALLY HAPPENED, NEWEST FIRST\n` +
        `Anything marked "Internal note" is our own shop talk about building their demo. Use it to know what exists, ` +
        `never quote it, and never describe our build process to them.\n${subject.interactions
        .map((i) => `[${when(i.at)}] ${i.what}\n${i.detail || '(no detail recorded)'}`)
        .join('\n\n')}`,
    );
  } else {
    parts.push('WHAT HAS ACTUALLY HAPPENED: nothing yet. This is the first thing they will hear from us.');
  }
  parts.push(
    instruction.trim()
      ? `SARAH'S INSTRUCTION FOR THIS EMAIL (follow it exactly, and use any price or term in it verbatim)\n${instruction.trim()}`
      : 'SARAH GAVE NO INSTRUCTION. Write the natural next email: answer the most recent thing above, and move it one step forward.',
  );
  parts.push('Write the email now.');
  return parts.join('\n\n');
}

export type Suggestion = { subject: string; body: string; basis: string };

export async function suggestEmail(subject: ComposeSubject, instruction: string): Promise<Suggestion> {
  const raw = await llmText({
    label: 'lead-email-compose',
    model: 'sonnet',
    system: systemPrompt(),
    user: dossier(subject, instruction),
    timeoutMs: 100_000,
  });

  const text = raw.trim();
  const m = /^[ \t]*subject:[ \t]*(.+)$/im.exec(text);
  const line = m?.[1]?.trim() ?? '';
  const body = m ? text.slice(text.indexOf(m[0]) + m[0].length).trim() : text;
  return {
    // An em dash can still arrive from the model. It never survives to a draft.
    subject: deDash(line || `Following up, ${subject.businessName}`).slice(0, 200),
    body: deDash(body),
    basis: subject.basis,
  };
}

/** The house rule, enforced rather than requested. */
export function deDash(s: string): string {
  return s.replace(/\s*[—–]\s*/g, ', ').replace(/,\s*,/g, ',');
}

/* --------------------------------- sending -------------------------------- */

export type SendResult =
  | { ok: true; to: string; subject: string; messageId: string }
  | { ok: false; status: number; error: string };

/** Plain text into the email shell's html, paragraph by paragraph. */
function bodyHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((par) => `<p style="margin:0 0 16px">${escape(par.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * Send the email Sarah wrote, log it where every other send is logged, and
 * touch nothing else. No sequence started, no queue row, and the only stage
 * move is off 'new', which is true by definition once a person has mailed them.
 */
export async function sendComposedEmail(
  db: SupabaseClient,
  subject: ComposeSubject,
  args: { subject: string; body: string; sentBy: string },
): Promise<SendResult> {
  if (subject.blocked) return { ok: false, status: 400, error: subject.blocked };
  const to = subject.to;
  if (!to) return { ok: false, status: 400, error: 'No email address on file for this contact.' };
  const line = deDash(args.subject.trim()).slice(0, 200);
  const body = deDash(args.body.trim());
  if (!body) return { ok: false, status: 400, error: 'Write the email first.' };
  if (!line) return { ok: false, status: 400, error: 'Give it a subject line.' };
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, status: 500, error: 'Email is not configured (RESEND_API_KEY missing).' };
  }

  // The cold tables owe CAN-SPAM a visible opt-out. Somebody who filled in our
  // own form asked us to write to them, so that footer would read as a lie on
  // their screen. The RFC 8058 header ships on every one of them regardless.
  const footer = subject.source === 'inbound' ? '' : complianceFooter(to);
  const html =
    clientEmail({ body: bodyHtml(body), trackId: subject.source === 'lead' ? subject.id : undefined }) + footer;

  const sent = await sendViaResend({
    from: OUTBOUND_FROM,
    to,
    replyTo: OUTBOUND_REPLY_TO,
    subject: line,
    html,
    // The html carries Sarah's drawn signature. The plain-text alternative has
    // no images, so it signs itself or it arrives from nobody.
    text: `${body}\n\nSarah\nModern Mustard Seed\n(406) 312-1223`,
    mailbox: OUTBOUND_REPLY_TO,
    unsubscribeUrl: unsubscribeUrlFor(to),
    // recordSentEmail writes the `messages` row for these two itself. The
    // acquisition table threads on outbound_lead_id, which that helper does not
    // know about, so its row is written by hand below.
    prospectId: subject.source === 'prospect' ? subject.id : undefined,
    leadId: subject.source === 'inbound' ? subject.id : undefined,
  });
  if (!sent.ok) return { ok: false, status: 502, error: sent.error };

  const now = new Date().toISOString();
  const snippet = body.replace(/\s+/g, ' ').slice(0, 500);

  if (subject.source === 'lead') {
    await db.from('messages').insert({
      outbound_lead_id: subject.id,
      direction: 'outbound',
      channel: 'email',
      status: 'sent',
      external_id: sent.id,
      from_addr: OUTBOUND_REPLY_TO,
      to_addr: to,
      subject: line,
      snippet,
      body: body.slice(0, 20_000),
      read: true,
      occurred_at: now,
    });
    const { data: lead } = await db.from('outbound_leads').select('status').eq('id', subject.id).maybeSingle();
    const patch: Record<string, unknown> = { last_email_at: now };
    if ((lead as { status?: string } | null)?.status === 'new') patch.status = 'contacted';
    await db.from('outbound_leads').update(patch).eq('id', subject.id);
    await recordEvent(db, {
      leadId: subject.id,
      type: 'email_sent',
      label: `${args.sentBy} wrote them one by hand: "${line}"`,
      detail: { oneOff: true, subject: line, to, messageId: sent.id },
    });
  } else if (subject.source === 'prospect') {
    await db.from('rep_prospects').update({ last_email_at: now, updated_at: now }).eq('id', subject.id);
  }

  return { ok: true, to, subject: line, messageId: sent.id };
}
