/**
 * THE OFFICE, MEASURED: the pure half.
 *
 * Everything the routine heartbeat, the eval intake, the keep-or-toss links, the
 * watchdog and the public scoreboard agree on lives here, free of Next and
 * Supabase, so scripts/routines-test.mts can pin it without a server.
 *
 * One shared secret, ROUTINES_SECRET, does two jobs: it is the Bearer token the
 * laptop runner and the eval runner post with, and it is the HMAC key that signs
 * the keep and toss links in the morning brief. Both checks are constant time.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { ROUTINES, WATCH_FROM, type Routine, type RoutineDay } from '@/data/routines';
import { addDays, mountainDate, mountainToUtc } from '@/lib/posting/time';

export const RUN_STATUSES = ['running', 'ok', 'missing_report', 'timeout', 'error', 'skipped'] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];
export type Verdict = 'keep' | 'toss';

const NAME_RE = /^[a-z0-9-]{2,40}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_NAMES: RoutineDay[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The secret, or null when it is unset, a pulled `[SENSITIVE]` placeholder, or too short to trust. */
export function routinesSecret(raw = process.env.ROUTINES_SECRET): string | null {
  const s = (raw ?? '').replace(/^﻿/, '').trim();
  if (!s || /^\[SENSITIVE\]$/i.test(s) || s.length < 32) return null;
  return s;
}

/** Constant-time string compare. Hashing first makes unequal lengths take the same path. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb) && a.length === b.length;
}

export function bearerOk(header: string | null, secret: string): boolean {
  const m = /^Bearer\s+(.+)$/i.exec((header ?? '').trim());
  return !!m && safeEqual(m[1].trim(), secret);
}

/** Hex HMAC-SHA256 over `routine|date|verdict`. */
export function verdictSig(secret: string, routine: string, date: string, verdict: string): string {
  return createHmac('sha256', secret).update(`${routine}|${date}|${verdict}`).digest('hex');
}

export function verdictSigOk(secret: string, routine: string, date: string, verdict: string, sig: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(sig)) return false;
  return safeEqual(verdictSig(secret, routine, date, verdict), sig.toLowerCase());
}

/** The keep or toss link the morning brief prints for one routine's report. */
export function verdictUrl(secret: string, routine: string, date: string, verdict: Verdict, base = 'https://modernmustardseed.com'): string {
  const q = new URLSearchParams({ r: routine, d: date, v: verdict, s: verdictSig(secret, routine, date, verdict) });
  return `${base}/api/routines/verdict?${q.toString()}`;
}

export type VerdictInput = { routine: string; date: string; verdict: Verdict; sig: string; note: string | null };

export function parseVerdict(get: (k: string) => string | null): VerdictInput | null {
  const routine = (get('r') ?? '').trim();
  const date = (get('d') ?? '').trim();
  const verdict = (get('v') ?? '').trim();
  const sig = (get('s') ?? '').trim();
  const noteRaw = (get('note') ?? '').trim();
  if (!NAME_RE.test(routine) || !validDate(date) || (verdict !== 'keep' && verdict !== 'toss') || !sig) return null;
  return { routine, date, verdict, sig, note: noteRaw ? noteRaw.slice(0, 1000) : null };
}

function validDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function validIso(s: unknown): s is string {
  return typeof s === 'string' && s.length <= 40 && !Number.isNaN(Date.parse(s));
}

export type HeartbeatRow = {
  routine: string;
  agent: string;
  run_date: string;
  status: RunStatus;
  started_at?: string;
  finished_at?: string;
  summary?: string;
  report_chars?: number;
};

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseHeartbeat(body: unknown): Parsed<HeartbeatRow> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'body must be a JSON object' };
  const b = body as Record<string, unknown>;
  const routine = typeof b.routine === 'string' ? b.routine.trim() : '';
  const agent = typeof b.agent === 'string' ? b.agent.trim() : '';
  const runDate = typeof b.run_date === 'string' ? b.run_date.trim() : '';
  const status = b.status;
  if (!NAME_RE.test(routine)) return { ok: false, error: 'routine must be 2 to 40 lowercase letters, digits or hyphens' };
  if (!NAME_RE.test(agent)) return { ok: false, error: 'agent must be 2 to 40 lowercase letters, digits or hyphens' };
  if (!validDate(runDate)) return { ok: false, error: 'run_date must be YYYY-MM-DD' };
  if (typeof status !== 'string' || !(RUN_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: `status must be one of ${RUN_STATUSES.join(', ')}` };
  }
  const row: HeartbeatRow = { routine, agent, run_date: runDate, status: status as RunStatus };
  if (b.started_at != null) {
    if (!validIso(b.started_at)) return { ok: false, error: 'started_at must be an ISO timestamp' };
    row.started_at = b.started_at;
  }
  if (b.finished_at != null) {
    if (!validIso(b.finished_at)) return { ok: false, error: 'finished_at must be an ISO timestamp' };
    row.finished_at = b.finished_at;
  }
  if (b.summary != null) {
    if (typeof b.summary !== 'string') return { ok: false, error: 'summary must be a string' };
    row.summary = b.summary.slice(0, 600);
  }
  if (b.report_chars != null) {
    if (typeof b.report_chars !== 'number' || !Number.isInteger(b.report_chars) || b.report_chars < 0) {
      return { ok: false, error: 'report_chars must be a non-negative integer' };
    }
    row.report_chars = b.report_chars;
  }
  return { ok: true, value: row };
}

export type EvalCheck = { name: string; passed: boolean; detail?: string };
export type EvalRow = {
  run_id: string;
  agent: string;
  case_id: string;
  passed: boolean;
  score: number;
  checks: EvalCheck[];
  judge_notes: string | null;
  duration_ms: number | null;
};

export const MAX_EVAL_RESULTS = 500;

export function parseEvals(body: unknown): Parsed<EvalRow[]> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'body must be a JSON object' };
  const b = body as Record<string, unknown>;
  const runId = typeof b.run_id === 'string' ? b.run_id.trim() : '';
  if (!/^[A-Za-z0-9:._-]{4,64}$/.test(runId)) return { ok: false, error: 'run_id must be 4 to 64 of A-Z a-z 0-9 : . _ -' };
  if (!Array.isArray(b.results) || !b.results.length) return { ok: false, error: 'results must be a non-empty array' };
  if (b.results.length > MAX_EVAL_RESULTS) return { ok: false, error: `at most ${MAX_EVAL_RESULTS} results per call` };
  const rows: EvalRow[] = [];
  for (let i = 0; i < b.results.length; i++) {
    const r = b.results[i] as Record<string, unknown> | null;
    const at = `results[${i}]`;
    if (!r || typeof r !== 'object') return { ok: false, error: `${at} must be an object` };
    const agent = typeof r.agent === 'string' ? r.agent.trim() : '';
    const caseId = typeof r.case_id === 'string' ? r.case_id.trim() : '';
    if (!NAME_RE.test(agent)) return { ok: false, error: `${at}.agent is not a valid agent name` };
    if (!/^[A-Za-z0-9._-]{1,80}$/.test(caseId)) return { ok: false, error: `${at}.case_id must be 1 to 80 of A-Z a-z 0-9 . _ -` };
    if (typeof r.passed !== 'boolean') return { ok: false, error: `${at}.passed must be a boolean` };
    if (typeof r.score !== 'number' || !Number.isFinite(r.score) || r.score < 0 || r.score > 1) {
      return { ok: false, error: `${at}.score must be a number from 0 to 1` };
    }
    const checksIn = r.checks ?? [];
    if (!Array.isArray(checksIn)) return { ok: false, error: `${at}.checks must be an array` };
    const checks: EvalCheck[] = [];
    for (const c of checksIn.slice(0, 50)) {
      const cc = c as Record<string, unknown> | null;
      if (!cc || typeof cc.name !== 'string' || typeof cc.passed !== 'boolean') {
        return { ok: false, error: `${at}.checks entries need a string name and a boolean passed` };
      }
      checks.push({ name: cc.name.slice(0, 120), passed: cc.passed, ...(typeof cc.detail === 'string' ? { detail: cc.detail.slice(0, 500) } : {}) });
    }
    const notes = typeof r.judge_notes === 'string' ? r.judge_notes.slice(0, 4000) : null;
    const dur = typeof r.duration_ms === 'number' && Number.isInteger(r.duration_ms) && r.duration_ms >= 0 ? r.duration_ms : null;
    rows.push({ run_id: runId, agent, case_id: caseId, passed: r.passed, score: r.score, checks, judge_notes: notes, duration_ms: dur });
  }
  return { ok: true, value: rows };
}

/** Day of week of a Mountain calendar date. */
export function dayOf(date: string): RoutineDay {
  const [y, m, d] = date.split('-').map(Number);
  return DAY_NAMES[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()];
}

export type ExpectedRun = { routine: string; agent: string; run_date: string; due_at: string };

/**
 * Every run that should have finished by `now`: all of yesterday's, plus today's
 * whose start time plus timeout has already passed. A run still inside its
 * window is not overdue.
 */
export function expectedRuns(now: Date, routines: Routine[] = ROUTINES, watchFrom = WATCH_FROM): ExpectedRun[] {
  const today = mountainDate(now);
  const out: ExpectedRun[] = [];
  for (const date of [addDays(today, -1), today]) {
    if (date < watchFrom) continue;
    const day = dayOf(date);
    for (const r of routines) {
      if (!r.days.includes(day)) continue;
      const [hh, mm] = r.time.split(':').map(Number);
      const due = new Date(mountainToUtc(date, hh, mm).getTime() + r.minutes * 60_000);
      if (due.getTime() <= now.getTime()) out.push({ routine: r.name, agent: r.agent, run_date: date, due_at: due.toISOString() });
    }
  }
  return out;
}

export type RunRow = { routine: string; run_date: string; status: string };

/** Expected runs with no `ok` row behind them. */
export function missingRuns(expected: ExpectedRun[], runs: RunRow[]): (ExpectedRun & { status: string | null })[] {
  const seen = new Map(runs.map((r) => [`${r.routine}|${r.run_date}`, r.status]));
  return expected
    .map((e) => ({ ...e, status: seen.get(`${e.routine}|${e.run_date}`) ?? null }))
    .filter((e) => e.status !== 'ok');
}

export type VerdictRow = { routine: string; run_date: string; verdict: string };
export type EvalScoreRow = { run_id: string; agent: string; case_id: string; passed: boolean; created_at: string };

export type Scoreboard = {
  generated_at: string;
  evals: {
    run_id: string;
    ran_at: string;
    agents_tested: number;
    cases: number;
    passed: number;
    pass_rate: number;
    by_agent: { agent: string; cases: number; passed: number; pass_rate: number }[];
  } | null;
  routines: {
    routine: string;
    agent: string;
    last_run_date: string | null;
    last_status: string | null;
    days: { date: string; status: string | null }[];
    keep: number;
    toss: number;
  }[];
  totals: { runs_14d: number; ok_14d: number; keep_rate: number | null };
};

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * The public scoreboard. Counts and statuses only: no report summary and no
 * judge notes, because a report can name a lead.
 */
export function buildScoreboard(input: {
  now: Date;
  runs: RunRow[];
  verdicts: VerdictRow[];
  evals: EvalScoreRow[];
  routines?: Routine[];
}): Scoreboard {
  const routines = input.routines ?? ROUTINES;
  const today = mountainDate(input.now);
  const dates = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const window = new Set(dates);

  const byKey = new Map(input.runs.map((r) => [`${r.routine}|${r.run_date}`, r.status]));
  const rows = routines.map((r) => {
    const mine = input.runs.filter((x) => x.routine === r.name).sort((a, b) => (a.run_date < b.run_date ? 1 : -1));
    const v = input.verdicts.filter((x) => x.routine === r.name);
    return {
      routine: r.name,
      agent: r.agent,
      last_run_date: mine[0]?.run_date ?? null,
      last_status: mine[0]?.status ?? null,
      days: dates.map((date) => ({ date, status: byKey.get(`${r.name}|${date}`) ?? null })),
      keep: v.filter((x) => x.verdict === 'keep').length,
      toss: v.filter((x) => x.verdict === 'toss').length,
    };
  });

  const known = new Set(routines.map((r) => r.name));
  const inWindow = input.runs.filter((r) => window.has(r.run_date) && known.has(r.routine));
  const keep = rows.reduce((n, r) => n + r.keep, 0);
  const toss = rows.reduce((n, r) => n + r.toss, 0);

  let evals: Scoreboard['evals'] = null;
  if (input.evals.length) {
    const latest = [...input.evals].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
    const sweep = input.evals.filter((e) => e.run_id === latest.run_id);
    const agents = new Map<string, { cases: number; passed: number }>();
    for (const e of sweep) {
      const a = agents.get(e.agent) ?? { cases: 0, passed: 0 };
      a.cases += 1;
      if (e.passed) a.passed += 1;
      agents.set(e.agent, a);
    }
    const passed = sweep.filter((e) => e.passed).length;
    const ranAt = sweep.reduce((m, e) => (e.created_at > m ? e.created_at : m), sweep[0].created_at);
    evals = {
      run_id: latest.run_id,
      ran_at: ranAt,
      agents_tested: agents.size,
      cases: sweep.length,
      passed,
      pass_rate: round(passed / sweep.length),
      by_agent: [...agents.entries()]
        .map(([agent, a]) => ({ agent, cases: a.cases, passed: a.passed, pass_rate: round(a.passed / a.cases) }))
        .sort((a, b) => a.agent.localeCompare(b.agent)),
    };
  }

  return {
    generated_at: input.now.toISOString(),
    evals,
    routines: rows,
    totals: {
      runs_14d: inWindow.length,
      ok_14d: inWindow.filter((r) => r.status === 'ok').length,
      keep_rate: keep + toss ? round(keep / (keep + toss)) : null,
    },
  };
}
