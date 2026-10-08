import type { SupabaseClient } from '@supabase/supabase-js';
import { sendViaResend, type TrackedResult } from '@/lib/send-email';
import { activeSuppressions, normEmail } from '@/lib/email-log';
import { BOOTCAMP } from '@/data/bootcamp';
import { outreachEmail, type OutreachStep, type OutreachTarget } from './outreach-copy';

/**
 * THE HOST OUTREACH ENGINE.
 *
 * The list in bootcamp_outreach is every audience owner we would like to host
 * a room. This file walks that list three letters deep, one email per person
 * per run, from Sarah's own address. The weekday cron and the desk's "Send
 * now" button both land in sendOne, so there is one send path and one set of
 * rules, and the desk can never do something the cron would refuse.
 *
 * The rules, in the order they bite:
 *
 *  1. The switch. app_state 'bootcamp:outreach' is { armed, dailyCap,
 *     startedAt }. Not armed means the cron returns and sends nothing. Sarah
 *     flips it on the desk when the host page is live and she is ready to
 *     answer replies the same day, which is what the letters promise.
 *  2. The ceiling. Root-domain mail is one-to-one (lib/send-email.ts). Twelve
 *     a day is the most that address sends to strangers, and HARD_CEILING caps
 *     a run at twelve whatever the stored cap says. Today's sends are counted
 *     from bootcamp_events so the desk and the cron share one allowance.
 *  3. The person already answered. An inbound row in `emails` from their
 *     address flips them to replied and nothing more is sent. A reply is a
 *     conversation, and conversations are Sarah's.
 *  4. The address is suppressed (bounced, complained or opted out). The row
 *     is marked bounced and never retried here.
 *
 * Rows whose contact path is a form, a booking page or a DM get status
 * 'hand' on the first pass: the desk shows them with the message to paste,
 * and this file never touches them again.
 *
 * Every database read and write goes through OutreachDb so the tests can run
 * the whole engine against an in-memory copy.
 */

export const STATE_KEY = 'bootcamp:outreach';
export const DEFAULT_DAILY_CAP = 12;
/**
 * Twelve, and not a knob. Root domain one-to-one rule: sarah@ is the address
 * Sarah reads and replies from, and its reputation already paid once for cold
 * volume (spam placement 2026-09-08). A stored cap above this is clamped.
 */
export const HARD_CEILING = 12;
/** Days between letters: four after the first, nine after the second. */
export const STEP_GAP_DAYS: Record<1 | 2, number> = { 1: 4, 2: 9 };
export const LAST_STEP = 3;
export const FROM = 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>';
export const REPLY_TO = 'sarah@modernmustardseed.com';

const DAY = 86_400_000;

export type OutreachStatus = 'queued' | 'hand' | 'sent' | 'replied' | 'hosting' | 'declined' | 'bounced' | 'done' | 'skipped';
export type ContactType = 'email' | 'form' | 'booking' | 'dm';

export const OUTREACH_STATUSES: OutreachStatus[] = ['queued', 'hand', 'sent', 'replied', 'hosting', 'declined', 'bounced', 'done', 'skipped'];

export type OutreachRow = {
  id: string;
  name: string;
  brand: string | null;
  email: string | null;
  contact_path: string | null;
  contact_type: ContactType;
  platforms: string | null;
  audience: string | null;
  audience_source: string | null;
  sells: string | null;
  evidence: string | null;
  hook: string | null;
  vertical: string;
  fit: number;
  tier: string;
  source_urls: string[];
  status: OutreachStatus;
  step: number;
  next_at: string | null;
  last_sent_at: string | null;
  replied_at: string | null;
  host_slug: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OutreachState = { armed: boolean; dailyCap: number; startedAt: string | null };

export type OutreachEvent = {
  kind: string;
  outreach_id: string;
  email?: string | null;
  detail?: Record<string, unknown>;
};

/** Every read and write the engine makes. The Supabase one is below; the test has its own. */
export interface OutreachDb {
  getState(): Promise<Partial<OutreachState> | null>;
  setState(state: OutreachState): Promise<void>;
  /** Sends logged since `sinceIso`: bootcamp_events with kind like 'outreach:%'. */
  countSentSince(sinceIso: string): Promise<number>;
  /** Email rows that are due: queued or sent, step under three, next_at null or past. */
  listDue(nowIso: string, limit: number): Promise<OutreachRow[]>;
  /** Form, booking and DM rows still sitting at queued. */
  listUnhanded(): Promise<OutreachRow[]>;
  getRow(id: string): Promise<OutreachRow | null>;
  update(id: string, patch: Partial<OutreachRow>): Promise<void>;
  hasInbound(email: string): Promise<boolean>;
  /** Addresses on either suppression list. Throws when the lists cannot be read. */
  suppressed(emails: string[]): Promise<Set<string>>;
  recordEvent(ev: OutreachEvent): Promise<void>;
  listAll(): Promise<Pick<OutreachRow, 'status' | 'vertical' | 'step'>[]>;
}

export type Sender = (msg: { from: string; to: string; replyTo: string; subject: string; text: string }) => Promise<TrackedResult>;

export type RunOptions = {
  dryRun?: boolean;
  now?: Date;
  /** Fewer than the ceiling, for a cautious first morning. Never raises it. */
  limit?: number;
  db?: OutreachDb;
  send?: Sender;
};

export type RunItem = {
  id: string;
  name: string;
  email: string | null;
  step: number;
  action: 'sent' | 'would-send' | 'replied' | 'bounced' | 'failed' | 'hand' | 'skipped';
  subject?: string;
  note?: string;
};

export type RunReport = {
  armed: boolean;
  dryRun: boolean;
  dailyCap: number;
  todaySent: number;
  room: number;
  sent: number;
  handed: number;
  replied: number;
  bounced: number;
  failed: number;
  items: RunItem[];
};

/* -------------------------------------------------------------------------- */
/* Small pure helpers, exported so the tests can pin them                      */
/* -------------------------------------------------------------------------- */

export function normalizeState(raw: Partial<OutreachState> | null | undefined): OutreachState {
  const cap = Number(raw?.dailyCap);
  return {
    armed: raw?.armed === true,
    dailyCap: Number.isFinite(cap) && cap > 0 ? Math.min(HARD_CEILING, Math.round(cap)) : DEFAULT_DAILY_CAP,
    startedAt: typeof raw?.startedAt === 'string' ? raw.startedAt : null,
  };
}

/**
 * Midnight in Mountain Time, as an instant. The cap is a per-day allowance in
 * Sarah's day, not a rolling window: the cron fires at 8:38 AM Mountain and a
 * "Send now" at five that afternoon belongs to the same day.
 */
export function mountainDayStart(now: Date): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BOOTCAMP.timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const sinceMidnight = (get('hour') * 3600 + get('minute') * 60 + get('second')) * 1000 + now.getMilliseconds();
  return new Date(now.getTime() - sinceMidnight);
}

/** When the next letter is due after `step` just went out, or null after the last. */
export function nextAtAfter(step: number, now: Date): string | null {
  if (step >= LAST_STEP) return null;
  const gap = STEP_GAP_DAYS[step as 1 | 2];
  return gap ? new Date(now.getTime() + gap * DAY).toISOString() : null;
}

export function appendNote(notes: string | null | undefined, line: string, now: Date): string {
  const stamp = now.toISOString().slice(0, 10);
  return `${notes ? `${notes}\n` : ''}${stamp} ${line}`.slice(-4000);
}

const asTarget = (r: OutreachRow): OutreachTarget => ({
  name: r.name,
  brand: r.brand,
  email: r.email,
  hook: r.hook,
  vertical: r.vertical,
  fit: r.fit,
  tier: r.tier,
});

/* -------------------------------------------------------------------------- */
/* The Supabase adapter                                                        */
/* -------------------------------------------------------------------------- */

export function supabaseOutreachDb(sb: SupabaseClient): OutreachDb {
  const TABLE = 'bootcamp_outreach';
  return {
    async getState() {
      const { data } = await sb.from('app_state').select('value').eq('key', STATE_KEY).maybeSingle();
      return (data?.value as Partial<OutreachState> | null) ?? null;
    },
    async setState(state) {
      const { error } = await sb
        .from('app_state')
        .upsert({ key: STATE_KEY, value: state, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw new Error(error.message);
    },
    async countSentSince(sinceIso) {
      const { count, error } = await sb
        .from('bootcamp_events')
        .select('id', { count: 'exact', head: true })
        .like('kind', 'outreach:%')
        .gte('created_at', sinceIso);
      // An unreadable count fails closed: the ceiling is treated as spent.
      if (error) throw new Error(`bootcamp_events unreadable: ${error.message}`);
      return count ?? 0;
    },
    async listDue(nowIso, limit) {
      const { data, error } = await sb
        .from(TABLE)
        .select('*')
        .eq('contact_type', 'email')
        .in('status', ['queued', 'sent'])
        .lt('step', LAST_STEP)
        .or(`next_at.is.null,next_at.lte.${nowIso}`)
        .order('fit', { ascending: false })
        .order('tier', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as OutreachRow[];
    },
    async listUnhanded() {
      const { data, error } = await sb.from(TABLE).select('*').neq('contact_type', 'email').eq('status', 'queued').limit(500);
      if (error) throw new Error(error.message);
      return (data ?? []) as OutreachRow[];
    },
    async getRow(id) {
      const { data } = await sb.from(TABLE).select('*').eq('id', id).maybeSingle();
      return (data as OutreachRow | null) ?? null;
    },
    async update(id, patch) {
      const { error } = await sb.from(TABLE).update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    async hasInbound(email) {
      // The inbox sync stores from_addr lowercased (lib/zoho-inbox.ts); ilike
      // covers anything older that was not.
      const { count, error } = await sb
        .from('emails')
        .select('id', { count: 'exact', head: true })
        .eq('direction', 'inbound')
        .ilike('from_addr', normEmail(email));
      if (error) throw new Error(`emails unreadable: ${error.message}`);
      return (count ?? 0) > 0;
    },
    async suppressed(emails) {
      const map = await activeSuppressions(emails);
      return new Set(map.keys());
    },
    async recordEvent(ev) {
      await sb
        .from('bootcamp_events')
        .insert({ kind: ev.kind, outreach_id: ev.outreach_id, email: ev.email ?? null, detail: ev.detail ?? {} })
        .then(() => {}, () => {});
    },
    async listAll() {
      const { data, error } = await sb.from(TABLE).select('status, vertical, step').limit(5000);
      if (error) throw new Error(error.message);
      return (data ?? []) as Pick<OutreachRow, 'status' | 'vertical' | 'step'>[];
    },
  };
}

function dbFor(sb: SupabaseClient | null, db?: OutreachDb): OutreachDb {
  if (db) return db;
  if (!sb) throw new Error('Database not configured');
  return supabaseOutreachDb(sb);
}

/* -------------------------------------------------------------------------- */
/* The one send path                                                           */
/* -------------------------------------------------------------------------- */

type SendOneResult = { item: RunItem; counted: boolean };

/**
 * Send the next letter to one row, or explain why not. `counted` is true only
 * when a real email left (or would have, on a dry run), because only those
 * spend the day's allowance. A reply or a suppression spends nothing.
 */
async function sendOne(db: OutreachDb, row: OutreachRow, now: Date, dryRun: boolean, send: Sender): Promise<SendOneResult> {
  const base = { id: row.id, name: row.name, email: row.email, step: row.step };
  const email = normEmail(row.email || '');
  if (row.contact_type !== 'email' || !email) {
    if (!dryRun && row.status === 'queued') await db.update(row.id, { status: 'hand', next_at: null });
    return { item: { ...base, action: 'hand', note: 'No email address: paste the hand message at their contact path.' }, counted: false };
  }
  if (row.step >= LAST_STEP) {
    return { item: { ...base, action: 'skipped', note: 'All three letters have gone.' }, counted: false };
  }

  if (await db.hasInbound(email)) {
    if (!dryRun) {
      await db.update(row.id, { status: 'replied', replied_at: row.replied_at ?? now.toISOString(), next_at: null });
      await db.recordEvent({ kind: 'outreach-replied', outreach_id: row.id, email, detail: { step: row.step } });
    }
    return { item: { ...base, action: 'replied', note: 'They wrote back. This is a conversation now.' }, counted: false };
  }

  let blocked: Set<string>;
  try {
    blocked = await db.suppressed([email]);
  } catch (err) {
    // Unreadable suppression list: nobody gets mailed on a guess.
    const note = err instanceof Error ? err.message : 'Suppression list unreadable.';
    return { item: { ...base, action: 'failed', note }, counted: false };
  }
  if (blocked.has(email)) {
    if (!dryRun) {
      await db.update(row.id, {
        status: 'bounced',
        next_at: null,
        notes: appendNote(row.notes, 'suppressed: bounced, complained or opted out. Not retried.', now),
      });
      await db.recordEvent({ kind: 'outreach-bounced', outreach_id: row.id, email, detail: { step: row.step } });
    }
    return { item: { ...base, action: 'bounced', note: 'Address is suppressed.' }, counted: false };
  }

  const step = (row.step + 1) as OutreachStep;
  const letter = outreachEmail(step, asTarget(row));
  if (dryRun) return { item: { ...base, action: 'would-send', step, subject: letter.subject }, counted: true };

  const res = await send({ from: FROM, to: email, replyTo: REPLY_TO, subject: letter.subject, text: letter.text });
  if (!res.ok) {
    const suppressedNow = 'suppressed' in res && Array.isArray(res.suppressed) && res.suppressed.length > 0;
    await db.update(row.id, {
      ...(suppressedNow ? { status: 'bounced' as const, next_at: null } : {}),
      notes: appendNote(row.notes, `step ${step} failed: ${res.error}`, now),
    });
    return { item: { ...base, action: suppressedNow ? 'bounced' : 'failed', step, note: res.error }, counted: false };
  }

  await db.update(row.id, {
    step,
    status: step >= LAST_STEP ? 'done' : 'sent',
    last_sent_at: now.toISOString(),
    next_at: nextAtAfter(step, now),
  });
  await db.recordEvent({ kind: `outreach:${step}`, outreach_id: row.id, email, detail: { subject: letter.subject, resendId: res.id } });
  return { item: { ...base, action: 'sent', step, subject: letter.subject }, counted: true };
}

/* -------------------------------------------------------------------------- */
/* Public surface                                                              */
/* -------------------------------------------------------------------------- */

export async function runBootcampOutreach(sb: SupabaseClient | null, opts: RunOptions = {}): Promise<RunReport> {
  const db = dbFor(sb, opts.db);
  const now = opts.now ?? new Date();
  const dryRun = opts.dryRun === true;
  const send = opts.send ?? sendViaResend;
  const state = normalizeState(await db.getState());

  const report: RunReport = {
    armed: state.armed,
    dryRun,
    dailyCap: state.dailyCap,
    todaySent: 0,
    room: 0,
    sent: 0,
    handed: 0,
    replied: 0,
    bounced: 0,
    failed: 0,
    items: [],
  };
  if (!state.armed) return report;

  // First pass for anyone without an email: the desk shows them with the
  // message to paste, and the cron never looks at them again.
  for (const row of await db.listUnhanded()) {
    if (!dryRun) await db.update(row.id, { status: 'hand', next_at: null });
    report.handed++;
    report.items.push({ id: row.id, name: row.name, email: row.email, step: row.step, action: 'hand' });
  }

  report.todaySent = await db.countSentSince(mountainDayStart(now).toISOString());
  const limit = Number.isFinite(opts.limit) && (opts.limit as number) > 0 ? Math.floor(opts.limit as number) : HARD_CEILING;
  report.room = Math.max(0, Math.min(HARD_CEILING, limit, state.dailyCap - report.todaySent));
  if (report.room === 0) return report;

  // Fetch more than the room: replies and suppressions do not spend it.
  const due = await db.listDue(now.toISOString(), report.room * 4);
  for (const row of due) {
    if (report.sent >= report.room) break;
    let out: SendOneResult;
    try {
      out = await sendOne(db, row, now, dryRun, send);
    } catch (err) {
      out = { item: { id: row.id, name: row.name, email: row.email, step: row.step, action: 'failed', note: err instanceof Error ? err.message : String(err) }, counted: false };
    }
    report.items.push(out.item);
    if (out.counted) report.sent++;
    else if (out.item.action === 'replied') report.replied++;
    else if (out.item.action === 'bounced') report.bounced++;
    else if (out.item.action === 'failed') report.failed++;
    else if (out.item.action === 'hand') report.handed++;
  }
  return report;
}

/**
 * The desk's "Send now". Same path as the cron, so the same reply and
 * suppression checks run and the same daily allowance is spent. It ignores the
 * armed switch on purpose: Sarah pressing a button is the human in the loop
 * the switch exists to guarantee.
 */
export async function sendOutreachNow(
  sb: SupabaseClient | null,
  id: string,
  opts: Pick<RunOptions, 'now' | 'db' | 'send'> = {},
): Promise<{ ok: true; item: RunItem } | { ok: false; error: string; item?: RunItem }> {
  const db = dbFor(sb, opts.db);
  const now = opts.now ?? new Date();
  const row = await db.getRow(id);
  if (!row) return { ok: false, error: 'Not found' };
  if (row.contact_type !== 'email' || !row.email) {
    return { ok: false, error: `${row.name} has no email on file. Copy the hand message and paste it at ${row.contact_path || 'their contact path'}.` };
  }
  if (!['queued', 'sent'].includes(row.status)) return { ok: false, error: `${row.name} is marked ${row.status}. Nothing more to send.` };
  if (row.step >= LAST_STEP) return { ok: false, error: `All three letters have gone to ${row.name}.` };

  const state = normalizeState(await db.getState());
  const todaySent = await db.countSentSince(mountainDayStart(now).toISOString());
  if (todaySent >= Math.min(state.dailyCap, HARD_CEILING)) {
    return { ok: false, error: `Today's ${Math.min(state.dailyCap, HARD_CEILING)} host emails have gone. The root address sends one-to-one, twelve a day at most.` };
  }

  const { item } = await sendOne(db, row, now, false, opts.send ?? sendViaResend);
  if (item.action === 'sent') return { ok: true, item };
  return { ok: false, error: item.note || `Not sent: ${item.action}.`, item };
}

/** A human mark from the desk: replied, hosting, declined, skipped, or back to queued. */
export async function markOutreach(
  sb: SupabaseClient | null,
  id: string,
  status: OutreachStatus,
  opts: { now?: Date; db?: OutreachDb; hostSlug?: string | null } = {},
): Promise<OutreachRow | null> {
  if (!OUTREACH_STATUSES.includes(status)) throw new Error(`Unknown status: ${status}`);
  const db = dbFor(sb, opts.db);
  const now = opts.now ?? new Date();
  const row = await db.getRow(id);
  if (!row) return null;
  const patch: Partial<OutreachRow> = { status };
  if (status === 'replied' || status === 'hosting') {
    patch.replied_at = row.replied_at ?? now.toISOString();
    patch.next_at = null;
  }
  if (status === 'hosting' && opts.hostSlug !== undefined) patch.host_slug = opts.hostSlug;
  if (status === 'declined' || status === 'skipped' || status === 'done' || status === 'bounced' || status === 'hand') patch.next_at = null;
  // Requeue: due now, same step, so the next letter (not the first) goes out.
  if (status === 'queued' || status === 'sent') patch.next_at = now.toISOString();
  await db.update(id, patch);
  await db.recordEvent({ kind: `outreach-mark-${status}`, outreach_id: id, email: row.email, detail: { from: row.status, step: row.step } });
  return { ...row, ...patch, updated_at: now.toISOString() };
}

export type OutreachSummary = {
  state: OutreachState;
  todaySent: number;
  total: number;
  byStatus: Record<string, number>;
  byVertical: Record<string, number>;
  /** Replied or hosting, per vertical: the number that says which list is working. */
  repliedByVertical: Record<string, number>;
};

export async function outreachSummary(sb: SupabaseClient | null, opts: { now?: Date; db?: OutreachDb } = {}): Promise<OutreachSummary> {
  const db = dbFor(sb, opts.db);
  const now = opts.now ?? new Date();
  const [stateRaw, rows, todaySent] = await Promise.all([
    db.getState(),
    db.listAll(),
    db.countSentSince(mountainDayStart(now).toISOString()),
  ]);
  const byStatus: Record<string, number> = {};
  const byVertical: Record<string, number> = {};
  const repliedByVertical: Record<string, number> = {};
  for (const s of OUTREACH_STATUSES) byStatus[s] = 0;
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    byVertical[r.vertical] = (byVertical[r.vertical] ?? 0) + 1;
    if (r.status === 'replied' || r.status === 'hosting') repliedByVertical[r.vertical] = (repliedByVertical[r.vertical] ?? 0) + 1;
  }
  return { state: normalizeState(stateRaw), todaySent, total: rows.length, byStatus, byVertical, repliedByVertical };
}

/** The switch. Arming stamps startedAt the first time; disarming keeps it as a record. */
export async function armOutreach(
  sb: SupabaseClient | null,
  input: { armed?: boolean; dailyCap?: number },
  opts: { now?: Date; db?: OutreachDb } = {},
): Promise<OutreachState> {
  const db = dbFor(sb, opts.db);
  const now = opts.now ?? new Date();
  const current = normalizeState(await db.getState());
  const next: OutreachState = {
    armed: typeof input.armed === 'boolean' ? input.armed : current.armed,
    dailyCap: normalizeState({ dailyCap: input.dailyCap ?? current.dailyCap }).dailyCap,
    startedAt: current.startedAt,
  };
  if (next.armed && !current.armed) next.startedAt = now.toISOString();
  await db.setState(next);
  return next;
}
