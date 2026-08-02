// lib/build-log.ts
// Commit history across every Modern Mustard Seed venture, for the /admin/build-log page.
//
// The record is read from git with the git CLI (~/worklog/gen-build-log.mjs) and
// pushed into app_state, the same k/v table the public snapshot uses. That is
// the whole reason this page needs no GitHub token: private repos are read
// locally where Sarah is already authenticated, not fetched from the API here.
//
// It lives in Supabase and NOT in this repo on purpose. modern-mustard-seed is
// public, so a committed dataset would publish every commit subject from 15
// private repos, client work included.
//
// Refresh:  cd ~/worklog && node gen-build-log.mjs   (no redeploy needed)
//
// `publicLabel` is what the login-free /build-log snapshot shows instead of the
// real name, so client engagements stay unnamed in public.

import { getSupabase } from "@/lib/supabase";

const RECORD_KEY = "build_log:record";

export const BUILD_LOG_REPOS: { name: string; publicLabel?: string }[] = [
  { name: "MMS" },
  { name: "CXC" },
  { name: "CXC Studio" },
  { name: "The Cove" },
  { name: "Wildmere" },
  { name: "Westridge" },
  { name: "Wild Hope" },
  { name: "Prayerhouse" },
  { name: "Wild Daisy" },
  { name: "FORGE" },
  { name: "Site Forge" },
  { name: "Forge Site" },
  { name: "Power Pack" },
  { name: "Build Log" },
  { name: "Penco", publicLabel: "Client Builds" },
  { name: "Bare Earth", publicLabel: "Client Builds" },
  { name: "D&D Landscaping", publicLabel: "Client Builds" },
];

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
  reposLoaded: string[];                // display names present in the record
  reposFailed: string[];                // roster names the generator could not read
  generatedAt: string;                  // ISO, when the CLI last read git
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

function parseSubject(subject: string): { cat: Category; label: string; scope: string; title: string } {
  const m = subject.match(/^([a-z0-9]+)(?:\(([^)]*)\))?!?:\s*(.*)$/i);
  if (!m) return { cat: NOTE.key, label: NOTE.label, scope: "", title: subject };
  const mapped = CAT_MAP[m[1].toLowerCase()] || NOTE;
  return { cat: mapped.key, label: mapped.label, scope: m[2] || "", title: m[3] || subject };
}

interface RecordFile {
  generatedAt: string;
  since: string;
  sources: Record<string, string>;   // display name -> "git" | "gh" | "none"
  entries: { project: string; datetime: string; subject: string }[];
}

const EMPTY_RECORD: RecordFile = { generatedAt: "", since: "", sources: {}, entries: [] };

async function readRecord(): Promise<RecordFile> {
  const sb = getSupabase();
  if (!sb) return EMPTY_RECORD;
  const { data } = await sb.from("app_state").select("value").eq("key", RECORD_KEY).maybeSingle();
  const v = data?.value as RecordFile | undefined;
  return v && Array.isArray(v.entries) ? { ...EMPTY_RECORD, ...v } : EMPTY_RECORD;
}

export async function getBuildLogData(): Promise<BuildLogData> {
  const record = await readRecord();

  const entries: LogEntry[] = record.entries.map(({ project, datetime, subject }) => {
    const [date, time] = datetime.split(" ");
    const parsed = parseSubject(subject);
    return {
      project, date, time, datetime,
      cat: parsed.cat, catLabel: parsed.label, scope: parsed.scope, title: parsed.title,
    };
  });

  const seen = new Set(entries.map((e) => e.project));
  const reposLoaded = BUILD_LOG_REPOS.filter((r) => seen.has(r.name)).map((r) => r.name);
  const reposFailed = BUILD_LOG_REPOS
    .filter((r) => !seen.has(r.name) && record.sources[r.name] !== "git" && record.sources[r.name] !== "gh")
    .map((r) => r.name);

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
    reposLoaded,
    reposFailed,
    generatedAt: record.generatedAt,
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

// Client engagements are folded into one unnamed bucket before anything leaves
// the login wall, so the public page never says who we build for.
const PUBLIC_LABEL = new Map(
  BUILD_LOG_REPOS.filter((r) => r.publicLabel).map((r) => [r.name, r.publicLabel as string])
);
const publicName = (project: string) => PUBLIC_LABEL.get(project) || project;

export function buildSnapshot(data: BuildLogData): BuildLogSnapshot {
  const dayCounts: Record<string, SnapshotDay> = {};
  for (const [date, list] of Object.entries(data.byDate)) {
    const m = new Map<string, number>();
    for (const e of list) {
      const p = publicName(e.project);
      m.set(p, (m.get(p) || 0) + 1);
    }
    dayCounts[date] = { total: list.length, byProject: [...m.entries()].sort((a, b) => b[1] - a[1]) };
  }

  const projMap = new Map<string, number>();
  for (const [project, n] of data.projectTotals) {
    const p = publicName(project);
    projMap.set(p, (projMap.get(p) || 0) + n);
  }
  const projectTotals = [...projMap.entries()].sort((a, b) => b[1] - a[1]);

  return {
    publishedAt: new Date().toISOString(),
    minDate: data.minDate,
    maxDate: data.maxDate,
    totals: {
      commits: data.entries.length,
      features: data.featureCount,
      ventures: projectTotals.length,
      activeDays: data.activeDays,
    },
    projectTotals,
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
