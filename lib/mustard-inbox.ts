/**
 * MR. MUSTARD'S INBOX. The follow-ups he works on his own, between calls.
 *
 * Sarah, 2026-10-07: "there should also be an agent inbox so the agents can do
 * things on their own as well."
 *
 * THE LOOP
 *   1. A call ends. handleEndOfCallReport queues ONE extraction job on the
 *      subscription queue (`llm_jobs`, label `mustard-inbox <callId>`): read the
 *      transcript, list what he promised and what the caller asked for.
 *   2. Every half hour /api/cron/mustard-inbox collects finished extractions
 *      into `mustard_inbox` rows and works whatever is due.
 *   3. Sarah sees every row on /admin/calls, approves or dismisses the ones
 *      waiting on her, and can drop in her own ("call Dana Thursday").
 *
 * WHAT HE DOES WITHOUT ASKING, AND WHY ONLY THAT
 *   send_link  A page from the send_email catalog, to an address the caller
 *              confirmed. The same path as the live tool, so nothing new is
 *              said under Sarah's name.
 *   callback   Only when the CALLER asked to be called back. Weekdays, 10 to 4
 *              Mountain (noon to six on the East Coast, nine to three on the
 *              West), at most DAILY_CALLBACKS a day and once per number per day,
 *              from the Twilio callback line so the Vapi number's ten-a-day
 *              outbound cap is never touched.
 *   Everything else waits for her: a callback nobody asked for, any free-text
 *   email (new words under her name), anything a follow-up call itself
 *   produced (so he cannot chain himself into calling somebody all week).
 *
 * ⚠️ Nothing here sets a lead's `contacted` status. That is a human mark.
 */
import { getSupabase } from '@/lib/supabase';
import { llmEnqueue } from '@/lib/llm';
import { assistantId as mustardAssistantId } from '@/lib/demo-agent';
import { RESOURCE_CATALOG, sendResourceEmail } from '@/lib/mustard-send';
import { placeInstantCallback, toE164 } from '@/lib/instant-callback';
import { noDashes, noDashesTitle } from '@/lib/no-dashes';

export type InboxKind = 'callback' | 'send_link' | 'email_note';
export type InboxStatus = 'proposed' | 'queued' | 'running' | 'done' | 'failed' | 'dismissed';

export type InboxRow = {
  id: string;
  kind: InboxKind;
  status: InboxStatus;
  source: 'call' | 'sarah';
  due_at: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  business: string | null;
  instruction: string;
  links: string[];
  subject: string | null;
  note: string | null;
  from_call_id: string | null;
  result_call_id: string | null;
  result: string | null;
  attempts: number;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InboxSettings = { autoCallbacks: boolean; autoLinks: boolean; dailyCallbacks: number };

const SETTINGS_KEY = 'mustard_inbox_settings';
const DEFAULT_SETTINGS: InboxSettings = { autoCallbacks: true, autoLinks: true, dailyCallbacks: 6 };
const LABEL_PREFIX = 'mustard-inbox ';
const TZ = 'America/Denver';
/** The calling window, Mountain, weekdays. */
const WINDOW_START_H = 10;
const WINDOW_END_H = 16;
const MAX_ATTEMPTS = 3;
/** Shorter than this and there was no conversation to follow up on. */
const MIN_TRANSCRIPT_CHARS = 200;

const KINDS = new Set<InboxKind>(['callback', 'send_link', 'email_note']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ───────────────────────── settings ───────────────────────── */

export async function getInboxSettings(): Promise<InboxSettings> {
  const sb = getSupabase();
  if (!sb) return DEFAULT_SETTINGS;
  const { data } = await sb.from('app_state').select('value').eq('key', SETTINGS_KEY).maybeSingle();
  return { ...DEFAULT_SETTINGS, ...((data?.value as Partial<InboxSettings> | null) ?? {}) };
}

export async function saveInboxSettings(patch: Partial<InboxSettings>): Promise<InboxSettings> {
  const next = { ...(await getInboxSettings()) };
  if (typeof patch.autoCallbacks === 'boolean') next.autoCallbacks = patch.autoCallbacks;
  if (typeof patch.autoLinks === 'boolean') next.autoLinks = patch.autoLinks;
  if (typeof patch.dailyCallbacks === 'number' && Number.isFinite(patch.dailyCallbacks)) {
    next.dailyCallbacks = Math.max(0, Math.min(20, Math.round(patch.dailyCallbacks)));
  }
  const sb = getSupabase();
  if (sb) await sb.from('app_state').upsert({ key: SETTINGS_KEY, value: next, updated_at: new Date().toISOString() });
  return next;
}

/* ───────────────────────── time ───────────────────────── */

function mountainParts(d: Date): { weekday: number; hour: number; minute: number; ymd: string } {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => f.find((x) => x.type === t)?.value ?? '';
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return {
    weekday,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    ymd: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

function inWindow(d: Date): boolean {
  const m = mountainParts(d);
  return m.weekday >= 1 && m.weekday <= 5 && m.hour >= WINDOW_START_H && m.hour < WINDOW_END_H;
}

/** The first moment at or after `d` that is inside the calling window. Walks in 15 minute steps. */
export function nextWindowOpen(d: Date): Date {
  let t = new Date(d.getTime());
  for (let i = 0; i < 4 * 24 * 8 && !inWindow(t); i++) t = new Date(t.getTime() + 15 * 60 * 1000);
  return t;
}

function startOfMountainDay(d: Date): Date {
  const m = mountainParts(d);
  const back = (m.hour * 60 + m.minute) * 60 * 1000 + d.getUTCSeconds() * 1000 + d.getUTCMilliseconds();
  return new Date(d.getTime() - back);
}

function nowLine(): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date());
}

/* ───────────────────────── 1. queue the extraction ───────────────────────── */

const EXTRACT_SCHEMA = {
  type: 'object',
  required: ['followUps'],
  properties: {
    followUps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['kind', 'instruction', 'callerAsked'],
        properties: {
          // Plain strings, never enums: an enum inside array items has emptied
          // whole argument objects on this stack before. Validated in code.
          kind: { type: 'string', description: 'callback, send_link or email_note' },
          dueIso: { type: ['string', 'null'], description: 'ISO 8601 with offset, or null for as soon as possible' },
          name: { type: ['string', 'null'] },
          phone: { type: ['string', 'null'] },
          email: { type: ['string', 'null'] },
          business: { type: ['string', 'null'] },
          instruction: { type: 'string' },
          links: { type: 'array', items: { type: 'string' } },
          subject: { type: ['string', 'null'] },
          note: { type: ['string', 'null'] },
          callerAsked: { type: 'boolean' },
        },
      },
    },
  },
};

const EXTRACT_SYSTEM = `You read the transcript of a phone call that Mr. Mustard, the AI voice agent for Modern Mustard Seed (an AI product studio run by Sarah Scarano), just finished. You list the follow-ups he owes, so he can do them himself after the call. You output JSON only.

A follow-up is something that has NOT happened yet and SHOULD happen after the call:
- callback: he should phone them again. Only when the caller asked to be called back, agreed to a specific callback ("call me Thursday after two"), or the call dropped in the middle of something real (mid-booking, mid-build, mid-email). Not because a sale would be nice.
- send_link: he promised to email a page and the transcript and tool log show it was NOT sent. links are keys from this exact list and nothing else: ${Object.keys(RESOURCE_CATALOG)
  .filter((k) => !RESOURCE_CATALOG[k].admin && k !== 'sidekick')
  .join(', ')}. Requires an email address the caller confirmed on the call.
- email_note: a short written follow-up he promised that is not just a link (a recap, an answer he said he would send). subject and note are the email, two to four plain sentences in a warm, direct studio voice, signed by nobody. Never a price, never a discount, never a promise of anything Sarah did not offer. Never a long dash of any kind.

Rules:
- Nothing at all for robocalls, recordings, spam, wrong numbers, a caller who said no and meant it, or Sarah testing her own line: any call from her cell, +14062506076, is a test. An empty list is the most common right answer.
- Never list something already done on the call: a link the tool log shows was sent, a booking that was made, a build that was fired, a message that reach_sarah already passed to Sarah.
- callerAsked is true only when the CALLER asked for this exact thing in their own words.
- dueIso: the time the caller asked for, converted using the current time given below (Mountain Time, America/Denver). Null when they gave no time.
- phone: their best number from the call, else the number they called from. email: exactly as finally confirmed, after any correction; never a half-heard one.
- instruction: one or two sentences, written TO Mr. Mustard, saying what to do and why, with whatever context makes the follow-up land ("They asked you to call back after their 2pm job to finish setting up the voice agent build. They run Big Sky Roofing; the build stopped because they had to go.").`;

type CallFacts = {
  callId: string;
  transcript: string;
  callerNumber: string | null;
  callerName: string | null;
  toolLog: string[];
  followUpCall: boolean;
};

/**
 * Called from the end-of-call webhook. Studio calls on his own assistant only:
 * demos role-play somebody else's business and acquisition calls have their
 * own follow-up machinery. Never throws.
 */
export async function queueInboxExtraction(message: Record<string, unknown>): Promise<void> {
  try {
    const call = (message.call ?? {}) as Record<string, unknown>;
    const callId = typeof call.id === 'string' ? call.id : null;
    if (!callId) return;
    const assistant = (call.assistantId as string | undefined) ?? null;
    if (assistant !== mustardAssistantId()) return;
    const meta = ((call.metadata as Record<string, unknown>) ||
      ((call.assistantOverrides as Record<string, unknown>)?.metadata as Record<string, unknown>) ||
      {}) as Record<string, unknown>;
    if (meta.kind === 'demo-agent' || meta.acq || meta.desk) return;

    const artifact = (message.artifact ?? call.artifact ?? {}) as Record<string, unknown>;
    const transcript = String(message.transcript ?? artifact.transcript ?? '');
    if (transcript.length < MIN_TRANSCRIPT_CHARS) return;

    const customer = (call.customer ?? {}) as Record<string, unknown>;
    const msgs = (Array.isArray(message.messages) ? message.messages : Array.isArray(artifact.messages) ? artifact.messages : []) as Record<string, unknown>[];
    const toolLog: string[] = [];
    for (const m of msgs) {
      const calls = (m.toolCalls ?? m.tool_calls) as { function?: { name?: string; arguments?: unknown } }[] | undefined;
      if (Array.isArray(calls)) {
        for (const c of calls) toolLog.push(`CALLED ${c.function?.name}: ${JSON.stringify(c.function?.arguments ?? '').slice(0, 400)}`);
      }
      if (m.role === 'tool_call_result') toolLog.push(`RESULT ${String(m.name ?? '')}: ${String(m.result ?? '').slice(0, 300)}`);
    }

    const facts: CallFacts = {
      callId,
      transcript: transcript.slice(0, 24_000),
      callerNumber: typeof customer.number === 'string' ? customer.number : null,
      callerName: typeof customer.name === 'string' ? customer.name : null,
      toolLog,
      followUpCall: meta.mode === 'inbox-follow-up',
    };

    await llmEnqueue({
      label: `${LABEL_PREFIX}${callId}`,
      model: 'sonnet',
      system: EXTRACT_SYSTEM,
      schema: EXTRACT_SCHEMA,
      source: { table: 'voice_calls', id: callId },
      user: [
        `Current time: ${nowLine()}, Mountain Time.`,
        `Caller ID on this call: ${facts.callerNumber ?? 'none (web call)'}${facts.callerName ? `, name ${facts.callerName}` : ''}.`,
        facts.followUpCall ? 'This call was itself a follow-up he placed from his inbox.' : '',
        '',
        'TOOL LOG (what he actually did on the call):',
        toolLog.length ? toolLog.join('\n') : '(no tools used)',
        '',
        'TRANSCRIPT:',
        facts.transcript,
      ]
        .filter((l) => l !== '')
        .join('\n'),
    });
  } catch (err) {
    console.error('mustard-inbox: could not queue extraction', err);
  }
}

/* ───────────────────────── 2. collect into rows ───────────────────────── */

type Extracted = {
  kind?: string;
  dueIso?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  business?: string | null;
  instruction?: string;
  links?: string[];
  subject?: string | null;
  note?: string | null;
  callerAsked?: boolean;
};

function cleanText(v: unknown, max: number): string | null {
  const s = typeof v === 'string' ? noDashes(v.trim()) : '';
  return s ? s.slice(0, max) : null;
}

/** Turn finished extraction jobs into inbox rows. Idempotent: a call that already has rows is skipped. */
export async function collectExtractions(): Promise<{ jobs: number; rows: number }> {
  const sb = getSupabase();
  if (!sb) return { jobs: 0, rows: 0 };
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: jobs } = await sb
    .from('llm_jobs')
    .select('id, label, result_json, source_id, created_at')
    .like('label', `${LABEL_PREFIX}%`)
    .eq('status', 'done')
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(100);
  if (!jobs?.length) return { jobs: 0, rows: 0 };

  const callIds = jobs.map((j) => String(j.source_id ?? String(j.label).slice(LABEL_PREFIX.length)));
  const { data: existing } = await sb.from('mustard_inbox').select('from_call_id').in('from_call_id', callIds);
  const seen = new Set((existing ?? []).map((r) => r.from_call_id as string));
  const { data: done } = await sb
    .from('app_state')
    .select('key')
    .in('key', callIds.map((id) => `mustard-inbox-read:${id}`));
  for (const r of done ?? []) seen.add(String(r.key).split(':').pop() as string);

  const settings = await getInboxSettings();
  const { data: callRows } = await sb.from('voice_calls').select('vapi_call_id, metadata').in('vapi_call_id', callIds);
  const followUpCalls = new Set(
    (callRows ?? [])
      .filter((c) => (c.metadata as Record<string, unknown> | null)?.mode === 'inbox-follow-up')
      .map((c) => c.vapi_call_id as string),
  );

  let rows = 0;
  for (let i = 0; i < jobs.length; i++) {
    const callId = callIds[i];
    if (seen.has(callId)) continue;
    seen.add(callId);
    const list = ((jobs[i].result_json as { followUps?: Extracted[] } | null)?.followUps ?? []).slice(0, 5);
    const inserts = list
      .map((x) => shapeExtracted(x, callId, settings, followUpCalls.has(callId)))
      .filter((r): r is NonNullable<ReturnType<typeof shapeExtracted>> => r !== null);
    if (inserts.length) {
      const { error } = await sb.from('mustard_inbox').insert(inserts);
      if (error) {
        console.error('mustard-inbox: insert failed', error.message);
        continue;
      }
      rows += inserts.length;
    } else {
      // Nothing owed. Remember that this call was read, so it is not read again.
      await sb.from('app_state').upsert({
        key: `mustard-inbox-read:${callId}`,
        value: { at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      });
    }
  }
  return { jobs: jobs.length, rows };
}

function shapeExtracted(x: Extracted, callId: string, s: InboxSettings, fromFollowUp: boolean) {
  const kind = String(x.kind ?? '').trim() as InboxKind;
  if (!KINDS.has(kind)) return null;
  const instruction = cleanText(x.instruction, 800);
  if (!instruction) return null;
  const phone = x.phone ? toE164(String(x.phone)) : null;
  const email = x.email && EMAIL_RE.test(String(x.email).trim()) ? String(x.email).trim().toLowerCase() : null;
  const links = (Array.isArray(x.links) ? x.links : [])
    .map((k) => String(k).trim().toLowerCase())
    .filter((k) => RESOURCE_CATALOG[k] && !RESOURCE_CATALOG[k].admin);

  if (kind === 'callback' && !phone) return null;
  if (kind === 'send_link' && (!email || !links.length)) return null;
  if (kind === 'email_note' && (!email || !cleanText(x.note, 1200))) return null;

  const asked = x.callerAsked === true;
  const auto =
    !fromFollowUp &&
    ((kind === 'send_link' && s.autoLinks) || (kind === 'callback' && asked && s.autoCallbacks));

  const due = x.dueIso && !Number.isNaN(Date.parse(x.dueIso)) ? new Date(x.dueIso) : new Date();
  return {
    kind,
    status: auto ? 'queued' : 'proposed',
    source: 'call' as const,
    due_at: (due.getTime() < Date.now() ? new Date() : due).toISOString(),
    name: cleanText(x.name, 120),
    phone,
    email,
    business: cleanText(x.business, 160),
    instruction,
    links,
    subject: kind === 'email_note' ? noDashesTitle(cleanText(x.subject, 140) ?? 'Following up from our call') : null,
    note: kind === 'email_note' ? cleanText(x.note, 1200) : null,
    from_call_id: callId,
  };
}

/* ───────────────────────── 3. work what is due ───────────────────────── */

async function claim(id: string): Promise<InboxRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from('mustard_inbox')
    .update({ status: 'running', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle();
  return (data as InboxRow | null) ?? null;
}

async function finish(row: InboxRow, patch: Partial<InboxRow>): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb
    .from('mustard_inbox')
    .update({ attempts: row.attempts + 1, ...patch, updated_at: new Date().toISOString() })
    .eq('id', row.id);
}

async function callbacksPlacedToday(): Promise<{ count: number; numbers: Set<string> }> {
  const sb = getSupabase();
  if (!sb) return { count: 0, numbers: new Set() };
  const { data } = await sb
    .from('mustard_inbox')
    .select('phone')
    .eq('kind', 'callback')
    .in('status', ['done', 'running'])
    .gte('updated_at', startOfMountainDay(new Date()).toISOString());
  return { count: data?.length ?? 0, numbers: new Set((data ?? []).map((r) => r.phone as string)) };
}

function greetingFor(row: InboxRow): string {
  const first = (row.name ?? '').trim().split(/\s+/)[0] ?? '';
  const hi = `Hi${first ? ` ${first}` : ''}, this is Mr. Mustard from Modern Mustard Seed.`;
  return row.source === 'sarah'
    ? `${hi} Sarah asked me to give you a call. Is now an okay time?`
    : `${hi} Calling you back like I said I would. Is now still a good time?`;
}

function briefingFor(row: InboxRow): string {
  const known = [
    row.name ? `Name: ${row.name}.` : null,
    row.business ? `Business: ${row.business}.` : null,
    row.email ? `Email on file: ${row.email}.` : null,
  ]
    .filter(Boolean)
    .join(' ');
  return `# THIS CALL: a follow-up from your inbox
You placed this call yourself, from your inbox. ${row.source === 'sarah' ? 'Sarah put it there.' : 'It came out of an earlier call with them.'}
What to do: ${row.instruction}
${known}
Open on why you are calling, in one sentence, then hand them the floor. If it is a bad time, ask when is better, say you will call then, and let them go warmly. Never make them repeat what they already told you on the earlier call.`;
}

async function work(row: InboxRow, s: InboxSettings, today: { count: number; numbers: Set<string> }): Promise<string> {
  if (row.kind === 'callback') {
    const now = new Date();
    if (!inWindow(now)) {
      await finish(row, { status: 'queued', due_at: nextWindowOpen(now).toISOString(), attempts: row.attempts - 1 });
      return 'deferred: outside the calling window';
    }
    if (today.count >= s.dailyCallbacks || (row.phone && today.numbers.has(row.phone))) {
      const tomorrow = nextWindowOpen(new Date(startOfMountainDay(now).getTime() + 24 * 60 * 60 * 1000));
      await finish(row, { status: 'queued', due_at: tomorrow.toISOString(), attempts: row.attempts - 1 });
      return 'deferred: daily limit';
    }
    const r = await placeInstantCallback({
      phone: row.phone ?? '',
      name: row.name,
      email: row.email,
      need: row.instruction,
      source: 'mustard-inbox',
      intent: 'follow-up',
      followUp: { inboxId: row.id, greeting: greetingFor(row), briefing: briefingFor(row) },
    });
    if (r.ok) {
      today.count++;
      if (row.phone) today.numbers.add(row.phone);
      await finish(row, { status: 'done', result_call_id: r.callId, result: 'Called. The outcome lands here when the call ends.' });
      return 'called';
    }
    const retry = r.reason === 'vapi-error' && row.attempts + 1 < MAX_ATTEMPTS;
    await finish(row, {
      status: retry ? 'queued' : 'failed',
      due_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      result: `Could not place the call: ${r.reason}${r.detail ? ` (${r.detail.slice(0, 160)})` : ''}`,
    });
    return `call failed: ${r.reason}`;
  }

  // send_link and email_note go out exactly the way send_email does on a call.
  const raw = await sendResourceEmail(
    {
      email: row.email ?? '',
      links: row.links,
      subject: row.kind === 'email_note' ? row.subject ?? undefined : 'The link I promised you',
      note:
        row.kind === 'email_note'
          ? row.note ?? undefined
          : `Here is what I said I would send you${row.business ? ` for ${row.business}` : ''}.`,
    },
    { deskKind: null, authedEmail: null },
  );
  let parsed: { ok?: boolean; sentTo?: string; error?: string } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    /* treated as a failure below */
  }
  if (parsed.ok) {
    await finish(row, { status: 'done', result: `Sent to ${parsed.sentTo}.` });
    return 'sent';
  }
  await finish(row, { status: 'failed', result: parsed.error ?? 'The send did not go through.' });
  return 'send failed';
}

/** Work every queued row that is due. Returns one line per row, for the cron log. */
export async function runDueInbox(opts: { id?: string } = {}): Promise<string[]> {
  const sb = getSupabase();
  if (!sb) return ['no database'];
  let q = sb
    .from('mustard_inbox')
    .select('id')
    .eq('status', 'queued')
    .lte('due_at', new Date().toISOString())
    .order('due_at', { ascending: true })
    .limit(20);
  if (opts.id) q = sb.from('mustard_inbox').select('id').eq('id', opts.id).eq('status', 'queued');
  const { data } = await q;
  if (!data?.length) return [];

  const settings = await getInboxSettings();
  const today = await callbacksPlacedToday();
  const out: string[] = [];
  for (const { id } of data) {
    const row = await claim(id as string);
    if (!row) continue;
    try {
      out.push(`${row.kind} ${row.id}: ${await work(row, settings, today)}`);
    } catch (err) {
      console.error('mustard-inbox: work threw', err);
      await finish(row, { status: 'failed', result: 'Crashed while working this. See the function log.' });
      out.push(`${row.kind} ${row.id}: crashed`);
    }
  }
  return out;
}

/* ───────────────────────── 4. the follow-up call's own outcome ───────────────────────── */

/** When a call he placed from the inbox ends, its summary goes back onto the row. */
export async function noteFollowUpOutcome(message: Record<string, unknown>): Promise<void> {
  const call = (message.call ?? {}) as Record<string, unknown>;
  const meta = ((call.metadata as Record<string, unknown>) ||
    ((call.assistantOverrides as Record<string, unknown>)?.metadata as Record<string, unknown>) ||
    {}) as Record<string, unknown>;
  if (meta.mode !== 'inbox-follow-up' || typeof meta.inboxId !== 'string') return;
  const sb = getSupabase();
  if (!sb) return;
  const analysis = (message.analysis ?? call.analysis ?? {}) as Record<string, unknown>;
  const summary = String(message.summary ?? analysis.summary ?? '').trim();
  const ended = String(message.endedReason ?? call.endedReason ?? '');
  const reached = !/no-answer|did-not-answer|voicemail|busy|failed/i.test(ended);
  const { data: row } = await sb.from('mustard_inbox').select('attempts').eq('id', meta.inboxId).maybeSingle();
  const attempts = (row?.attempts as number | undefined) ?? MAX_ATTEMPTS;
  // Nobody picked up: try again in the next window, a couple of hours on, until the attempts run out.
  const retry = !reached && attempts < MAX_ATTEMPTS;
  await sb
    .from('mustard_inbox')
    .update({
      ...(retry ? { status: 'queued', due_at: nextWindowOpen(new Date(Date.now() + 2 * 60 * 60 * 1000)).toISOString() } : {}),
      result: reached
        ? summary.slice(0, 1200) || 'Call completed.'
        : `Did not reach them (${ended}).${retry ? ' Trying again later.' : ' Out of attempts.'}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', meta.inboxId);
}
