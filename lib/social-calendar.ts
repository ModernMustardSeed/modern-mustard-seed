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
