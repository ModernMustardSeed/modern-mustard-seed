import type { SupabaseClient } from '@supabase/supabase-js';
import { getSession, isSessionKey, type SessionKey } from '@/lib/bootcamp/sessions';
import { tradeRooms, type TradeRoom } from '@/data/bootcamp';
import { getRegistrationById, normEmail, recordEvent, type RegistrationRow } from '@/lib/bootcamp/store';

/**
 * THE STAGE: what is on screen in the room, set from the desk.
 *
 * One app_state row, 'bootcamp:stage', holds a link set per session (the live
 * link, the replay, the transcript) and the offer switch Sarah flips at the
 * pitch beat of the masterclass. `rev` climbs on every write, so the room can
 * poll a tiny cached endpoint and refresh itself only when something changed.
 *
 * Everything people do in the room lands in bootcamp_events, the same
 * append-only log the desk already reads: room:here (attendance, once per
 * person per session), room:question and room:answered, and worksheet (the
 * Idea Director answers, one row per person, updated as they type). No
 * migration: the tables from 157 carry all of it.
 */

export const STAGE_KEY = 'bootcamp:stage';

export type TradeSlug = TradeRoom['slug'];
export const TRADE_SLUGS: TradeSlug[] = tradeRooms.map((r) => r.slug);

export type StageEntry = {
  liveUrl?: string;
  replayUrl?: string;
  transcriptUrl?: string;
  /** Day 2 only: a live link per trade room, each run by its room host. */
  rooms?: Partial<Record<TradeSlug, string>>;
  updatedAt?: string;
};

function cleanRooms(v: unknown): StageEntry['rooms'] {
  const src = (v ?? {}) as Record<string, unknown>;
  const out: Partial<Record<TradeSlug, string>> = {};
  for (const slug of TRADE_SLUGS) {
    const u = cleanUrl(src[slug]);
    if (u) out[slug] = u;
  }
  return Object.keys(out).length ? out : undefined;
}

export type StageState = {
  sessions: Partial<Record<SessionKey, StageEntry>>;
  offer: { open: boolean; at: string | null };
  rev: number;
  updatedAt: string | null;
};

export const EMPTY_STAGE: StageState = { sessions: {}, offer: { open: false, at: null }, rev: 0, updatedAt: null };

function need(sb: SupabaseClient | null): SupabaseClient {
  if (!sb) throw new Error('Database not configured');
  return sb;
}

/** A stored link must be https and short; anything else is dropped rather than shown in a frame. */
export function cleanUrl(v: unknown): string | undefined {
  const s = String(v ?? '').trim();
  if (!s) return undefined;
  if (s.length > 500) return undefined;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

function normalize(raw: unknown): StageState {
  const v = (raw ?? {}) as Partial<StageState>;
  const sessions: StageState['sessions'] = {};
  for (const [k, e] of Object.entries(v.sessions ?? {})) {
    if (!isSessionKey(k) || !e) continue;
    const entry: StageEntry = {
      liveUrl: cleanUrl(e.liveUrl),
      replayUrl: cleanUrl(e.replayUrl),
      transcriptUrl: cleanUrl(e.transcriptUrl),
      rooms: cleanRooms(e.rooms),
      updatedAt: typeof e.updatedAt === 'string' ? e.updatedAt : undefined,
    };
    sessions[k] = entry;
  }
  return {
    sessions,
    offer: { open: Boolean(v.offer?.open), at: typeof v.offer?.at === 'string' ? v.offer.at : null },
    rev: Number.isFinite(v.rev) ? Number(v.rev) : 0,
    updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : null,
  };
}

export async function getStage(sb: SupabaseClient | null): Promise<StageState> {
  const db = need(sb);
  const { data, error } = await db.from('app_state').select('value').eq('key', STAGE_KEY).maybeSingle();
  if (error) throw new Error(`stage read failed: ${error.message}`);
  return normalize(data?.value ?? EMPTY_STAGE);
}

export type StagePatch = {
  session?: {
    key: SessionKey;
    liveUrl?: string | null;
    replayUrl?: string | null;
    transcriptUrl?: string | null;
    rooms?: Partial<Record<TradeSlug, string | null>> | null;
  };
  offerOpen?: boolean;
};

/** Read, apply, write, bump rev. A link set to '' or null is cleared. */
export async function patchStage(sb: SupabaseClient | null, patch: StagePatch): Promise<StageState> {
  const db = need(sb);
  const cur = await getStage(db);
  const now = new Date().toISOString();
  const next: StageState = { ...cur, sessions: { ...cur.sessions }, offer: { ...cur.offer } };

  if (patch.session) {
    const { key } = patch.session;
    const prev = next.sessions[key] ?? {};
    const pick = (field: 'liveUrl' | 'replayUrl' | 'transcriptUrl') =>
      patch.session && field in patch.session ? cleanUrl(patch.session[field]) : prev[field];
    const rooms = patch.session && 'rooms' in patch.session ? cleanRooms(patch.session.rooms) : prev.rooms;
    next.sessions[key] = { liveUrl: pick('liveUrl'), replayUrl: pick('replayUrl'), transcriptUrl: pick('transcriptUrl'), rooms, updatedAt: now };
  }
  if (typeof patch.offerOpen === 'boolean' && patch.offerOpen !== cur.offer.open) {
    next.offer = { open: patch.offerOpen, at: now };
  }
  next.rev = cur.rev + 1;
  next.updatedAt = now;

  const { error } = await db.from('app_state').upsert({ key: STAGE_KEY, value: next, updated_at: now }, { onConflict: 'key' });
  if (error) throw new Error(`stage write failed: ${error.message}`);
  return next;
}

/** True when the drip may send a replay letter for this session: the replay is actually up. */
export function replayReady(stage: StageState, key: SessionKey): boolean {
  return Boolean(stage.sessions[key]?.replayUrl);
}

/* -------------------------------------------------------------------------- */
/* Attendance                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Mark a person present in a live session, once. A bootcamp day also lands
 * in attended_days, which is what the Day 1 guarantee is checked against.
 * Returns false when they were already marked.
 */
export async function markHere(sb: SupabaseClient | null, reg: RegistrationRow, key: SessionKey): Promise<boolean> {
  const db = need(sb);
  const { count, error } = await db
    .from('bootcamp_events')
    .select('id', { count: 'exact', head: true })
    .eq('kind', 'room:here')
    .eq('registration_id', reg.id)
    .contains('detail', { session: key });
  if (error) throw new Error(`attendance read failed: ${error.message}`);
  if ((count ?? 0) > 0) return false;

  await recordEvent(db, 'room:here', { email: reg.email, registrationId: reg.id, hostSlug: reg.host_slug, detail: { session: key, tier: reg.tier } });

  const dayN = getSession(key)?.dayN;
  if (dayN) {
    const fresh = await getRegistrationById(db, reg.id);
    const days = Array.from(new Set([...(fresh?.attended_days ?? []), dayN])).sort();
    const { error: upd } = await db.from('bootcamp_registrations').update({ attended_days: days, updated_at: new Date().toISOString() }).eq('id', reg.id);
    if (upd) throw new Error(`attended_days update failed: ${upd.message}`);
  }
  return true;
}

/** Present count per session, for the desk. */
export async function attendanceCounts(sb: SupabaseClient | null): Promise<Record<string, number>> {
  const db = need(sb);
  const out: Record<string, number> = {};
  const page = 1000;
  for (let from = 0; from < 50_000; from += page) {
    const { data, error } = await db.from('bootcamp_events').select('detail').eq('kind', 'room:here').range(from, from + page - 1);
    if (error) throw new Error(`attendance count failed: ${error.message}`);
    const rows = (data ?? []) as { detail: { session?: string } }[];
    for (const r of rows) {
      const k = r.detail?.session;
      if (k) out[k] = (out[k] ?? 0) + 1;
    }
    if (rows.length < page) break;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Questions                                                                   */
/* -------------------------------------------------------------------------- */

export const QUESTIONS_PER_SESSION = 5;
export const QUESTION_MAX = 600;

export type Question = {
  id: number;
  session: string;
  text: string;
  name: string | null;
  business: string | null;
  trade: string | null;
  tier: string | null;
  email: string | null;
  answered: boolean;
  at: string;
};

/** Ask a question into a session. Five per person per session, so the queue stays readable. */
export async function askQuestion(sb: SupabaseClient | null, reg: RegistrationRow, key: SessionKey, text: string): Promise<'ok' | 'limit'> {
  const db = need(sb);
  const { count, error } = await db
    .from('bootcamp_events')
    .select('id', { count: 'exact', head: true })
    .eq('kind', 'room:question')
    .eq('registration_id', reg.id)
    .contains('detail', { session: key });
  if (error) throw new Error(`question count failed: ${error.message}`);
  if ((count ?? 0) >= QUESTIONS_PER_SESSION) return 'limit';
  await recordEvent(db, 'room:question', {
    email: reg.email,
    registrationId: reg.id,
    hostSlug: reg.host_slug,
    detail: { session: key, text: text.slice(0, QUESTION_MAX), name: reg.name, business: reg.business, trade: reg.trade, tier: reg.tier },
  });
  return 'ok';
}

export async function listQuestions(sb: SupabaseClient | null, key: SessionKey, limit = 300): Promise<Question[]> {
  const db = need(sb);
  const [asked, answered] = await Promise.all([
    db.from('bootcamp_events').select('id, email, detail, created_at').eq('kind', 'room:question').contains('detail', { session: key }).order('created_at', { ascending: true }).limit(limit),
    db.from('bootcamp_events').select('detail').eq('kind', 'room:answered').contains('detail', { session: key }).limit(5000),
  ]);
  if (asked.error) throw new Error(`questions read failed: ${asked.error.message}`);
  if (answered.error) throw new Error(`answers read failed: ${answered.error.message}`);
  const done = new Set(((answered.data ?? []) as { detail: { questionId?: number } }[]).map((r) => Number(r.detail?.questionId)));
  type Row = { id: number; email: string | null; detail: Record<string, unknown>; created_at: string };
  return ((asked.data ?? []) as Row[]).map((r) => ({
    id: r.id,
    session: key,
    text: String(r.detail.text ?? ''),
    name: (r.detail.name as string | null) ?? null,
    business: (r.detail.business as string | null) ?? null,
    trade: (r.detail.trade as string | null) ?? null,
    tier: (r.detail.tier as string | null) ?? null,
    email: r.email ? normEmail(r.email) : null,
    answered: done.has(r.id),
    at: r.created_at,
  }));
}

export async function markAnswered(sb: SupabaseClient | null, key: SessionKey, questionId: number): Promise<void> {
  await recordEvent(need(sb), 'room:answered', { detail: { session: key, questionId } });
}

/* -------------------------------------------------------------------------- */
/* The Idea Director worksheet                                                 */
/* -------------------------------------------------------------------------- */

export type WorksheetAnswers = Record<string, string>;

async function worksheetRow(db: SupabaseClient, regId: string): Promise<{ id: number; detail: Record<string, unknown>; created_at: string } | null> {
  const { data, error } = await db
    .from('bootcamp_events')
    .select('id, detail, created_at')
    .eq('kind', 'worksheet')
    .eq('registration_id', regId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`worksheet read failed: ${error.message}`);
  return (data as { id: number; detail: Record<string, unknown>; created_at: string } | null) ?? null;
}

export async function loadWorksheet(sb: SupabaseClient | null, regId: string): Promise<{ answers: WorksheetAnswers; at: string } | null> {
  const row = await worksheetRow(need(sb), regId);
  if (!row) return null;
  const answers = ((row.detail as { answers?: WorksheetAnswers })?.answers ?? {}) as WorksheetAnswers;
  return { answers, at: (row.detail.savedAt as string | undefined) ?? row.created_at };
}

/**
 * The worksheet is the one event updated in place: the room autosaves as
 * people type, and one row per person beats a thousand drafts in the log.
 */
export async function saveWorksheet(sb: SupabaseClient | null, reg: RegistrationRow, answers: WorksheetAnswers): Promise<void> {
  const db = need(sb);
  const savedAt = new Date().toISOString();
  const existing = await worksheetRow(db, reg.id);
  if (!existing) {
    await recordEvent(db, 'worksheet', { email: reg.email, registrationId: reg.id, hostSlug: reg.host_slug, detail: { answers, savedAt } });
    return;
  }
  const { error } = await db.from('bootcamp_events').update({ detail: { answers, savedAt } }).eq('id', existing.id);
  if (error) throw new Error(`worksheet save failed: ${error.message}`);
}

/** Every saved worksheet with its person, for the desk: Sarah reads these before Day 2 and picks the front row. */
export async function listWorksheets(sb: SupabaseClient | null, limit = 2000): Promise<{ registrationId: string; email: string | null; answers: WorksheetAnswers; savedAt: string }[]> {
  const db = need(sb);
  const { data, error } = await db
    .from('bootcamp_events')
    .select('registration_id, email, detail, created_at')
    .eq('kind', 'worksheet')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`worksheets read failed: ${error.message}`);
  type Row = { registration_id: string | null; email: string | null; detail: { answers?: WorksheetAnswers; savedAt?: string }; created_at: string };
  return ((data ?? []) as Row[])
    .filter((r) => r.registration_id)
    .map((r) => ({ registrationId: r.registration_id as string, email: r.email, answers: r.detail?.answers ?? {}, savedAt: r.detail?.savedAt ?? r.created_at }));
}

/** How many people have saved a worksheet, for the desk. */
export async function worksheetCount(sb: SupabaseClient | null): Promise<number> {
  const db = need(sb);
  const { data, error } = await db.from('bootcamp_events').select('registration_id').eq('kind', 'worksheet').limit(20000);
  if (error) throw new Error(`worksheet count failed: ${error.message}`);
  return new Set(((data ?? []) as { registration_id: string | null }[]).map((r) => r.registration_id).filter(Boolean)).size;
}
