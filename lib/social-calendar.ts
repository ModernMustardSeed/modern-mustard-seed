/**
 * THE SOCIAL CALENDAR, the pure half.
 *
 * Everything /admin/social, PATCH /api/admin/social/<id> and
 * scripts/social-calendar-import.mjs agree on lives here: the row shape, the
 * platform and status vocabularies, the Mountain Time "today", the agenda
 * grouping, the patch validator and the rule that an import never walks a
 * posted row back to planned. No imports, so the import script and
 * scripts/social-calendar-test.mts load this file straight from Node.
 */

export const PLATFORMS = [
  'facebook',
  'instagram',
  'instagram-sarah',
  'tiktok',
  'youtube',
  'pinterest',
  'linkedin-sarah',
  'linkedin-mms',
  'x',
  'x-sarah',
] as const;
export type Platform = (typeof PLATFORMS)[number];

export const STATUSES = ['posted', 'scheduled', 'planned', 'unscheduled', 'failed'] as const;
export type Status = (typeof STATUSES)[number];

export type SocialPost = {
  id: string;
  date: string | null;
  time_mt: string | null;
  platform: Platform;
  account: string | null;
  series: string | null;
  title: string | null;
  kind: string | null;
  status: Status;
  ref: string | null;
  caption: string | null;
  cover_url: string | null;
  source: string | null;
  /** Read back on the platform itself, not just accepted by a scheduler. */
  verified?: boolean | null;
  /** Why the row needs attention, shown under it on the desk. */
  note?: string | null;
  updated_at?: string | null;
};

/** Chip label and colors per platform. Text color is chosen for contrast on the fill. */
export const PLATFORM_META: Record<Platform, { label: string; bg: string; fg: string }> = {
  facebook: { label: 'Facebook', bg: '#1f4fd1', fg: '#ffffff' },
  instagram: { label: 'Instagram', bg: '#c13584', fg: '#ffffff' },
  'instagram-sarah': { label: 'Instagram, Sarah', bg: '#f3c6dd', fg: '#141210' },
  tiktok: { label: 'TikTok', bg: '#141210', fg: '#ffffff' },
  youtube: { label: 'YouTube', bg: '#d61f1f', fg: '#ffffff' },
  pinterest: { label: 'Pinterest', bg: '#e98b73', fg: '#141210' },
  'linkedin-sarah': { label: 'LinkedIn, Sarah', bg: '#cfe0f3', fg: '#141210' },
  'linkedin-mms': { label: 'LinkedIn, MMS', bg: '#0f4c47', fg: '#ffffff' },
  x: { label: 'X', bg: '#4a4339', fg: '#ffffff' },
  'x-sarah': { label: 'X, Sarah', bg: '#e8ecd0', fg: '#141210' },
};

export const STATUS_META: Record<Status, { label: string; bg: string; fg: string }> = {
  posted: { label: 'Posted', bg: '#0f4c47', fg: '#ffffff' },
  scheduled: { label: 'Scheduled', bg: '#f5b700', fg: '#141210' },
  planned: { label: 'Planned', bg: '#fcfaf3', fg: '#141210' },
  unscheduled: { label: 'Unscheduled', bg: '#e8ecd0', fg: '#141210' },
  failed: { label: 'Failed', bg: '#b42318', fg: '#ffffff' },
};

export function isPlatform(v: unknown): v is Platform {
  return typeof v === 'string' && (PLATFORMS as readonly string[]).includes(v);
}

export function isStatus(v: unknown): v is Status {
  return typeof v === 'string' && (STATUSES as readonly string[]).includes(v);
}

/** True when a ref is a link to the live post rather than a platform id or a note. */
export function isUrl(ref: string | null | undefined): boolean {
  if (!ref) return false;
  try {
    const u = new URL(ref);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** YYYY-MM-DD for a moment, in America/Denver. */
export function mtDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Add whole days to a YYYY-MM-DD date (calendar math, no time zone drift). */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** "Sunday, October 11" for a YYYY-MM-DD date. */
export function longDate(iso: string): { weekday: string; month: string; day: number; year: number } {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return {
    weekday: t.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
    month: t.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }),
    day: d,
    year: y,
  };
}

/** Minutes past midnight for "10:30", "9:05", "4:15 PM". Unknown times sort last. */
export function timeKey(t: string | null | undefined): number {
  if (!t) return 24 * 60 + 1;
  const m = /^\s*(\d{1,2}):(\d{2})\s*(am|pm)?\s*$/i.exec(t);
  if (!m) return 24 * 60;
  let h = Number(m[1]) % 24;
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return h * 60 + Number(m[2]);
}

function byTime(a: SocialPost, b: SocialPost): number {
  return (
    timeKey(a.time_mt) - timeKey(b.time_mt) ||
    PLATFORMS.indexOf(a.platform) - PLATFORMS.indexOf(b.platform) ||
    a.id.localeCompare(b.id)
  );
}

export type Day = { date: string; posts: SocialPost[] };

export type Agenda = {
  today: Day;
  upcoming: Day[];
  past: Day[];
  backlog: SocialPost[];
  counts: { today: number; week: number; backlog: number; postedToday: number };
};

/** A row nobody has slotted: marked unscheduled (a missed or refused post), or with no date. */
export function inBacklog(r: SocialPost): boolean {
  return !r.date || r.status === 'unscheduled';
}

/**
 * Group rows into the agenda: today pinned, every later day in order, the last
 * seven days newest first, and the backlog. Day sections hold only what is
 * actually slotted to go out; an unscheduled row (a missed post) sits in the
 * backlog with its intended date instead, oldest first. "This week" is today
 * plus the next six days.
 */
export function buildAgenda(rows: SocialPost[], today: string): Agenda {
  const weekEnd = addDays(today, 6);
  const pastStart = addDays(today, -7);
  const days = new Map<string, SocialPost[]>();
  const backlog: SocialPost[] = [];
  for (const r of rows) {
    if (inBacklog(r) || !r.date) {
      backlog.push(r);
      continue;
    }
    const list = days.get(r.date);
    if (list) list.push(r);
    else days.set(r.date, [r]);
  }
  for (const list of days.values()) list.sort(byTime);
  backlog.sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || byTime(a, b));

  const dates = [...days.keys()].sort();
  const upcoming = dates.filter((d) => d > today).map((d) => ({ date: d, posts: days.get(d)! }));
  const past = dates
    .filter((d) => d < today && d >= pastStart)
    .reverse()
    .map((d) => ({ date: d, posts: days.get(d)! }));
  const todayPosts = days.get(today) ?? [];

  const week = rows.filter((r) => !inBacklog(r) && r.date! >= today && r.date! <= weekEnd).length;

  return {
    today: { date: today, posts: todayPosts },
    upcoming,
    past,
    backlog,
    counts: {
      today: todayPosts.length,
      week,
      backlog: backlog.length,
      postedToday: todayPosts.filter((p) => p.status === 'posted').length,
    },
  };
}

export type Filters = { platform?: string; series?: string; status?: string };

export function applyFilters(rows: SocialPost[], f: Filters): SocialPost[] {
  return rows.filter(
    (r) =>
      (!f.platform || r.platform === f.platform) &&
      (!f.series || (r.series ?? '') === f.series) &&
      (!f.status || r.status === f.status),
  );
}

export type Patch = { status?: Status; ref?: string | null };

/**
 * Validate a PATCH body. Only status and ref move. A ref is trimmed, capped at
 * 2000 characters, and an empty string clears it.
 */
export function parsePatch(body: unknown): { ok: true; patch: Patch } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'Body must be a JSON object.' };
  const b = body as Record<string, unknown>;
  const extra = Object.keys(b).filter((k) => k !== 'status' && k !== 'ref');
  if (extra.length) return { ok: false, error: `Only status and ref can change. Unknown: ${extra.join(', ')}.` };
  const patch: Patch = {};
  if ('status' in b) {
    if (!isStatus(b.status)) return { ok: false, error: `status must be one of ${STATUSES.join(', ')}.` };
    patch.status = b.status;
  }
  if ('ref' in b) {
    if (b.ref === null) patch.ref = null;
    else if (typeof b.ref === 'string') {
      const t = b.ref.trim();
      if (t.length > 2000) return { ok: false, error: 'ref is longer than 2000 characters.' };
      patch.ref = t === '' ? null : t;
    } else return { ok: false, error: 'ref must be a string or null.' };
  }
  if (!('status' in patch) && !('ref' in patch)) return { ok: false, error: 'Send status, ref, or both.' };
  return { ok: true, patch };
}

/** Row ids are slugs: letters, digits, dot, underscore, colon and dash, up to 200. */
export function isRowId(id: string): boolean {
  return /^[A-Za-z0-9._:-]{1,200}$/.test(id);
}

/**
 * An import never undoes a post that already went out. When the database says
 * posted and the incoming row says anything else, the database status and ref
 * stand; every other field takes the incoming value.
 */
export function mergeImported<T extends { status: string; ref?: string | null }>(
  incoming: T,
  existing: { status: string; ref: string | null } | undefined,
): T {
  if (existing && existing.status === 'posted' && incoming.status !== 'posted') {
    return { ...incoming, status: 'posted', ref: existing.ref ?? incoming.ref ?? null };
  }
  return incoming;
}

/**
 * The calendar file is the whole truth: a row in the table whose id is gone
 * from the file gets deleted on import. Returns those ids, sorted. An empty
 * file prunes nothing, so a truncated export can never wipe the calendar.
 */
export function idsToPrune(tableIds: Iterable<string>, fileIds: Iterable<string>): string[] {
  const keep = new Set(fileIds);
  if (keep.size === 0) return [];
  return [...new Set(tableIds)].filter((id) => !keep.has(id)).sort();
}

/* ------------------------------------------------------------------------ */
/* COVERAGE: is every required platform covered every day?                  */
/* ------------------------------------------------------------------------ */

/**
 * The seven platforms Sarah requires every single day (2026-10-10), in the
 * order the grid reads them. LinkedIn counts the MMS company page.
 */
export const REQUIRED_PLATFORMS = ['youtube', 'tiktok', 'instagram', 'facebook', 'x', 'linkedin-mms', 'pinterest'] as const satisfies readonly Platform[];
/** Shown on the grid as bonus columns, never counted toward the daily target. */
export const BONUS_PLATFORMS = ['linkedin-sarah', 'instagram-sarah'] as const satisfies readonly Platform[];
export const COVERAGE_PLATFORMS: readonly Platform[] = [...REQUIRED_PLATFORMS, ...BONUS_PLATFORMS];

export function isRequired(p: Platform): boolean {
  return (REQUIRED_PLATFORMS as readonly Platform[]).includes(p);
}

/**
 * green: queued on the platform itself (scheduled there, or already posted).
 * amber: the content exists but nobody has queued it on the platform yet.
 * red:   nothing is going out (no row, or only a missed or failed row).
 */
export type CellState = 'green' | 'amber' | 'red';

export const CELL_META: Record<CellState, { label: string; bg: string; fg: string; ring: string }> = {
  green: { label: 'Queued on the platform', bg: '#cfe8d6', fg: '#0b3d2a', ring: '#1d7a46' },
  amber: { label: 'Planned, not queued', bg: '#fde7a6', fg: '#4a3300', ring: '#c98a00' },
  red: { label: 'Empty', bg: '#fbd3cd', fg: '#6b1209', ring: '#b42318' },
};

const STATE_RANK: Record<CellState, number> = { green: 2, amber: 1, red: 0 };

/** The state one row earns on its own. */
export function rowState(r: Pick<SocialPost, 'status'>): CellState {
  if (r.status === 'scheduled' || r.status === 'posted') return 'green';
  if (r.status === 'planned') return 'amber';
  return 'red';
}

/** A cell is as good as its best row. No rows is red. */
export function cellState(posts: Pick<SocialPost, 'status'>[]): CellState {
  let best: CellState = 'red';
  for (const p of posts) {
    const s = rowState(p);
    if (STATE_RANK[s] > STATE_RANK[best]) best = s;
  }
  return best;
}

export type Cell = { date: string; platform: Platform; state: CellState; posts: SocialPost[] };
export type CoverageDay = { date: string; cells: Record<string, Cell> };

/** Every date from start, n days long. */
export function dateRange(start: string, n: number): string[] {
  return Array.from({ length: Math.max(0, n) }, (_, i) => addDays(start, i));
}

/**
 * One row per day, one cell per platform. Rows with no date are left out
 * (they live in the backlog). Each cell's posts sort best state first, then
 * by time, so the thumbnail and the click open the post that counts.
 */
export function buildCoverage(
  rows: SocialPost[],
  dates: string[],
  platforms: readonly Platform[] = COVERAGE_PLATFORMS,
): CoverageDay[] {
  const wanted = new Set(dates);
  const plats = new Set<string>(platforms);
  const bucket = new Map<string, SocialPost[]>();
  for (const r of rows) {
    if (!r.date || !wanted.has(r.date) || !plats.has(r.platform)) continue;
    const k = `${r.date}|${r.platform}`;
    const list = bucket.get(k);
    if (list) list.push(r);
    else bucket.set(k, [r]);
  }
  return dates.map((date) => {
    const cells: Record<string, Cell> = {};
    for (const platform of platforms) {
      const posts = (bucket.get(`${date}|${platform}`) ?? []).slice().sort(
        (a, b) => STATE_RANK[rowState(b)] - STATE_RANK[rowState(a)] || byTime(a, b),
      );
      cells[platform] = { date, platform, state: cellState(posts), posts };
    }
    return { date, cells };
  });
}

export type Health = { green: number; amber: number; red: number };

/** How many days a platform is green, amber and red across the given days. */
export function platformHealth(days: CoverageDay[], platform: Platform): Health {
  const h: Health = { green: 0, amber: 0, red: 0 };
  for (const d of days) {
    const c = d.cells[platform];
    h[c ? c.state : 'red'] += 1;
  }
  return h;
}

export type CoverageSummary = { days: number; target: number; queued: number; planned: number; empty: number };

/**
 * The line of truth: of the required slots (seven platforms times the days
 * from today), how many are queued on the platform, planned, and empty. A
 * slot counts once however many posts it holds.
 */
export function coverageSummary(rows: SocialPost[], today: string, days = 30): CoverageSummary {
  const grid = buildCoverage(rows, dateRange(today, days), REQUIRED_PLATFORMS);
  const s: CoverageSummary = { days, target: days * REQUIRED_PLATFORMS.length, queued: 0, planned: 0, empty: 0 };
  for (const d of grid) {
    for (const p of REQUIRED_PLATFORMS) {
      const st = d.cells[p].state;
      if (st === 'green') s.queued += 1;
      else if (st === 'amber') s.planned += 1;
      else s.empty += 1;
    }
  }
  return s;
}

/** Required platforms with nothing going out on a date: the red slots. */
export function missingOn(rows: SocialPost[], date: string): Platform[] {
  const [day] = buildCoverage(rows, [date], REQUIRED_PLATFORMS);
  return REQUIRED_PLATFORMS.filter((p) => day.cells[p].state === 'red');
}

/** The Needs action quick filter: an amber or red required slot within the next seven days. */
export function needsAction(cell: Pick<Cell, 'date' | 'platform' | 'state'>, today: string): boolean {
  return (
    cell.state !== 'green' && isRequired(cell.platform) && cell.date >= today && cell.date <= addDays(today, 6)
  );
}

/** The Backlog view: missed (unscheduled), undated, or failed rows. */
export function inBacklogView(r: SocialPost): boolean {
  return inBacklog(r) || r.status === 'failed';
}

/**
 * One card per piece of content on a day: rows that share a series and a
 * title are the same post cut for each platform. Each group keeps its rows
 * in platform order and takes the earliest time.
 */
export type PostGroup = { key: string; series: string | null; title: string | null; time: string | null; posts: SocialPost[] };

export function groupDay(posts: SocialPost[]): PostGroup[] {
  const groups = new Map<string, PostGroup>();
  for (const p of posts) {
    const key = `${p.series ?? ''}\u0000${p.title ?? p.id}`;
    const g = groups.get(key);
    if (g) g.posts.push(p);
    else groups.set(key, { key, series: p.series, title: p.title, time: null, posts: [p] });
  }
  const out = [...groups.values()];
  for (const g of out) {
    g.posts.sort((a, b) => PLATFORMS.indexOf(a.platform) - PLATFORMS.indexOf(b.platform) || byTime(a, b));
    g.time = g.posts.reduce<string | null>((t, p) => (timeKey(p.time_mt) < timeKey(t) ? p.time_mt : t), null);
  }
  return out.sort((a, b) => timeKey(a.time) - timeKey(b.time) || a.key.localeCompare(b.key));
}
