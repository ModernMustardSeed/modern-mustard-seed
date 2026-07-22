// lib/build-log.ts
// Live commit history across every Modern Mustard Seed venture, for the /admin/build-log page.
// Fetches from the GitHub API server-side, so the page is always current with no manual publish.
//
// Auth: the public repo (modern-mustard-seed) needs no token. The private repos
// (cross-covenant, wild-hope-hq, penco-command, forge) light up only when a
// GITHUB_TOKEN (or GH_TOKEN) with org read access is set in the environment.
// Without a token the page still renders the public MMS history (the bulk of the work).

import { getSupabase } from "@/lib/supabase";

const OWNER = "ModernMustardSeed";

export const BUILD_LOG_REPOS: { name: string; repo: string }[] = [
  { name: "MMS", repo: "modern-mustard-seed" },
  { name: "CXC", repo: "cross-covenant" },
  { name: "Wild Hope", repo: "wild-hope-hq" },
  { name: "Penco", repo: "penco-command" },
  { name: "FORGE", repo: "forge" },
];

// The record begins here (converted to Pacific below).
const SINCE_ISO = "2026-07-15T00:00:00Z";
const SINCE_DAY = "2026-07-15";

export type Category =
  | "new" | "fix" | "perf" | "polish" | "docs" | "access" | "revert" | "note";

export interface LogEntry {
  project: string;
  date: string;      // YYYY-MM-DD (America/Los_Angeles)
  time: string;      // HH:MM (America/Los_Angeles)
  datetime: string;  // "YYYY-MM-DD HH:MM"
  cat: Category;
  catLabel: string;
  scope: string;
  title: string;
}

export interface BuildLogData {
  entries: LogEntry[];
  byDate: Record<string, LogEntry[]>;
  projectTotals: [string, number][];   // sorted desc
  catTotals: [Category, number][];      // sorted desc
  minDate: string | null;
  maxDate: string | null;
  activeDays: number;
  featureCount: number;
  tokenPresent: boolean;
  reposLoaded: string[];                // display names that returned data
  reposFailed: string[];                // display names that errored (e.g. private, no token)
  generatedAt: string;                  // ISO
}

const CAT_MAP: Record<string, { key: Category; label: string }> = {
  feat: { key: "new", label: "New" },
  fix: { key: "fix", label: "Fix" },
  perf: { key: "perf", label: "Perf" },
  refactor: { key: "polish", label: "Polish" },
  chore: { key: "polish", label: "Polish" },
  tune: { key: "polish", label: "Polish" },
  style: { key: "polish", label: "Polish" },
  docs: { key: "docs", label: "Docs" },
  a11y: { key: "access", label: "Access" },
  revert: { key: "revert", label: "Revert" },
};
const NOTE = { key: "note" as Category, label: "Note" };

function laDateTime(isoUtc: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(isoUtc));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value])) as Record<string, string>;
  const hour = p.hour === "24" ? "00" : p.hour;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${hour}:${p.minute}` };
}

function parseSubject(subject: string): { cat: Category; label: string; scope: string; title: string } {
  const m = subject.match(/^([a-z0-9]+)(?:\(([^)]*)\))?!?:\s*(.*)$/i);
  if (!m) return { cat: NOTE.key, label: NOTE.label, scope: "", title: subject };
  const mapped = CAT_MAP[m[1].toLowerCase()] || NOTE;
  return { cat: mapped.key, label: mapped.label, scope: m[2] || "", title: m[3] || subject };
}

type GhCommit = { commit?: { author?: { date?: string }; message?: string } };

async function fetchRepo(repo: string, headers: Record<string, string>): Promise<GhCommit[]> {
  const out: GhCommit[] = [];
  // Cap at 5 pages (500 commits) per repo per period — plenty for this record.
  for (let page = 1; page <= 5; page++) {
    const url =
      `https://api.github.com/repos/${OWNER}/${repo}/commits` +
      `?since=${SINCE_ISO}&per_page=100&page=${page}`;
    const res = await fetch(url, { headers, next: { revalidate: 3600 } });
    if (!res.ok) {
      // 404/401 on a private repo without a valid token → treat as "no data".
      if (page === 1) throw new Error(`${repo}: HTTP ${res.status}`);
      break;
    }
    const batch = (await res.json()) as GhCommit[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

export async function getBuildLogData(): Promise<BuildLogData> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "mms-build-log",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const entries: LogEntry[] = [];
  const reposLoaded: string[] = [];
  const reposFailed: string[] = [];

  const results = await Promise.allSettled(
    BUILD_LOG_REPOS.map(async ({ name, repo }) => {
      const commits = await fetchRepo(repo, headers);
      return { name, commits };
    })
  );

  results.forEach((r, i) => {
    const name = BUILD_LOG_REPOS[i].name;
    if (r.status !== "fulfilled") { reposFailed.push(name); return; }
    reposLoaded.push(name);
    for (const c of r.value.commits) {
      const iso = c.commit?.author?.date;
      const subject = (c.commit?.message || "").split("\n")[0].trim();
      if (!iso || !subject) continue;
      if (/^Merge (branch|pull request|remote)/i.test(subject)) continue;
      const { date, time } = laDateTime(iso);
      if (date < SINCE_DAY) continue;
      const parsed = parseSubject(subject);
      entries.push({
        project: name, date, time, datetime: `${date} ${time}`,
        cat: parsed.cat, catLabel: parsed.label, scope: parsed.scope, title: parsed.title,
      });
    }
  });

  entries.sort((a, b) => (a.datetime < b.datetime ? 1 : a.datetime > b.datetime ? -1 : 0));

  const byDate: Record<string, LogEntry[]> = {};
  const projMap = new Map<string, number>();
  const catMap = new Map<Category, number>();
  for (const e of entries) {
    (byDate[e.date] ||= []).push(e);
    projMap.set(e.project, (projMap.get(e.project) || 0) + 1);
    catMap.set(e.cat, (catMap.get(e.cat) || 0) + 1);
  }
  for (const list of Object.values(byDate)) list.sort((a, b) => b.time.localeCompare(a.time));

  const dates = Object.keys(byDate).sort();

  return {
    entries,
    byDate,
    projectTotals: [...projMap.entries()].sort((a, b) => b[1] - a[1]),
    catTotals: [...catMap.entries()].sort((a, b) => b[1] - a[1]),
    minDate: dates[0] || null,
    maxDate: dates[dates.length - 1] || null,
    activeDays: dates.length,
    featureCount: entries.filter((e) => e.cat === "new").length,
    tokenPresent: Boolean(token),
    reposLoaded,
    reposFailed,
    generatedAt: new Date().toISOString(),
  };
}

/* ============================ PUBLIC SNAPSHOT ============================ */
// A sanitized, aggregate-only snapshot for the public /build-log page.
// Stores NO commit messages, only counts and totals, so nothing sensitive can
// leak. Persisted in the app_state k/v table under one key; the public page is
// visible only while `published` is true.

const SNAPSHOT_KEY = "build_log:snapshot";

export interface SnapshotDay { total: number; byProject: [string, number][]; }
export interface BuildLogSnapshot {
  publishedAt: string;
  minDate: string | null;
  maxDate: string | null;
  totals: { commits: number; features: number; ventures: number; activeDays: number };
  projectTotals: [string, number][];
  catTotals: [Category, number][];
  dayCounts: Record<string, SnapshotDay>;
}
export interface StoredSnapshot { published: boolean; snapshot: BuildLogSnapshot | null; }

export function buildSnapshot(data: BuildLogData): BuildLogSnapshot {
  const dayCounts: Record<string, SnapshotDay> = {};
  for (const [date, list] of Object.entries(data.byDate)) {
    const m = new Map<string, number>();
    for (const e of list) m.set(e.project, (m.get(e.project) || 0) + 1);
    dayCounts[date] = { total: list.length, byProject: [...m.entries()].sort((a, b) => b[1] - a[1]) };
  }
  return {
    publishedAt: new Date().toISOString(),
    minDate: data.minDate,
    maxDate: data.maxDate,
    totals: {
      commits: data.entries.length,
      features: data.featureCount,
      ventures: data.projectTotals.length,
      activeDays: data.activeDays,
    },
    projectTotals: data.projectTotals,
    catTotals: data.catTotals,
    dayCounts,
  };
}

export async function readSnapshot(): Promise<StoredSnapshot> {
  const sb = getSupabase();
  if (!sb) return { published: false, snapshot: null };
  const { data } = await sb.from("app_state").select("value").eq("key", SNAPSHOT_KEY).maybeSingle();
  const v = data?.value as StoredSnapshot | undefined;
  return v && typeof v === "object"
    ? { published: !!v.published, snapshot: v.snapshot ?? null }
    : { published: false, snapshot: null };
}

export async function publishSnapshot(): Promise<StoredSnapshot> {
  const sb = getSupabase();
  if (!sb) throw new Error("Snapshot storage is not configured.");
  const live = await getBuildLogData();
  const value: StoredSnapshot = { published: true, snapshot: buildSnapshot(live) };
  const { error } = await sb.from("app_state").upsert({ key: SNAPSHOT_KEY, value });
  if (error) throw new Error(error.message);
  return value;
}

export async function setSnapshotPublished(published: boolean): Promise<StoredSnapshot> {
  const sb = getSupabase();
  if (!sb) throw new Error("Snapshot storage is not configured.");
  const cur = await readSnapshot();
  const value: StoredSnapshot = { published, snapshot: cur.snapshot };
  const { error } = await sb.from("app_state").upsert({ key: SNAPSHOT_KEY, value });
  if (error) throw new Error(error.message);
  return value;
}
