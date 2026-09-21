import type { SupabaseClient } from '@supabase/supabase-js';
import type { CcAccount } from '@/lib/cc-access';

/**
 * TRAFFIC: who came to the website, what they read, and where they came from.
 *
 * Counted from the site's own visit beacon, the one row per page opened that
 * the site has written since it went up. No third-party script, no cookie and
 * no banner: a visitor is a hashed address that changes every day, so a person
 * is counted once a day and cannot be followed from one day to the next.
 *
 * Two rules keep the numbers honest. A source that fails to read returns null
 * and the screen prints "Not read", never a zero. And anything that names
 * itself a robot, or runs with no screen, is left out before counting, because
 * a builder does not want to be told a crawler was a customer.
 */

export type TrafficDay = { day: string; count: number };
export type TrafficRow = { label: string; count: number; share: number };

export type Traffic = {
  days: number;
  since: string;
  visits: number;
  views: number;
  pagesPerVisit: number;
  previous: { visits: number; views: number } | null;
  byDay: TrafficDay[];
  pages: TrafficRow[];
  places: TrafficRow[];
  sources: TrafficRow[];
  devices: TrafficRow[];
  hours: Array<{ hour: number; count: number }>;
  leads: number | null;
  scans: number | null;
};

type Visit = { path: string | null; referrer: string | null; region: string | null; city: string | null; country: string | null; ua: string | null; ip_hash: string | null; created_at: string };

const ROBOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|curl|wget|python|scrapy|facebookexternalhit|whatsapp/i;
const TZ = 'America/Denver';

const dayOf = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
const hourOf = (iso: string) => Number(new Date(iso).toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false })) % 24;

function device(ua: string | null): string {
  const u = ua ?? '';
  if (/ipad|tablet/i.test(u)) return 'Tablet';
  if (/iphone|android.+mobile|mobile/i.test(u)) return 'Phone';
  return 'Computer';
}

/** A referrer reduced to the name an owner would recognise. */
function source(referrer: string | null, ownHosts: string[]): string {
  if (!referrer) return 'Typed in, or a saved link';
  let host = '';
  try {
    host = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return 'Typed in, or a saved link';
  }
  if (!host || ownHosts.includes(host)) return 'Typed in, or a saved link';
  if (/google\./.test(host)) return 'Google';
  if (/bing\.|duckduckgo\.|yahoo\.|brave\./.test(host)) return 'Other search engines';
  if (/facebook\.|fb\.|instagram\.|linkedin\.|lnkd\.|t\.co$|twitter\.|x\.com$|pinterest\./.test(host)) return 'Social media';
  if (/houzz\./.test(host)) return 'Houzz';
  if (/chatgpt\.|openai\.|perplexity\.|claude\.|copilot\.|gemini\./.test(host)) return 'AI assistants';
  if (/mail\.|outlook\.|gmail\./.test(host)) return 'Email';
  return host;
}

function place(v: Visit): string {
  if (v.city && v.region) return `${v.city}, ${v.region}`;
  if (v.region) return v.country === 'US' || !v.country ? v.region : `${v.region}, ${v.country}`;
  return 'Not known';
}

/** A path as a person reads it. */
function pageName(path: string, titles: Map<string, string>): string {
  const p = path.replace(/\/$/, '') || '/';
  if (p === '/') return 'Home page';
  const project = /^\/projects\/([^/]+)$/.exec(p);
  if (project && titles.has(project[1])) return titles.get(project[1]) as string;
  const town = /^\/custom-homes-(.+)-([a-z]{2})$/.exec(p);
  if (town) return `Custom homes in ${town[1].split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')}`;
  const last = p.split('/').filter(Boolean).pop() as string;
  return last.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function top(counts: Map<string, number>, total: number, limit: number): TrafficRow[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count, share: total ? Math.round((count / total) * 100) : 0 }));
}

const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

export async function buildTraffic(sb: SupabaseClient, account: CcAccount, days: number): Promise<Traffic | null> {
  const span = days === 30 ? 30 : days === 90 ? 90 : 7;
  const now = Date.now();
  const start = new Date(now - span * 86400000).toISOString();
  const prevStart = new Date(now - span * 2 * 86400000).toISOString();

  const read = await sb
    .from('prep_visits')
    .select('path, referrer, region, city, country, ua, ip_hash, created_at')
    .eq('project', account.project.key)
    .eq('surface', 'site')
    .gte('created_at', prevStart)
    .order('created_at', { ascending: false })
    .limit(20000);
  if (read.error || !read.data) return null;

  const people = (read.data as Visit[]).filter((v) => !ROBOT.test(v.ua ?? '') && v.ip_hash);
  const current = people.filter((v) => v.created_at >= start);
  const before = people.filter((v) => v.created_at < start);

  const ownHosts = [account.project.siteUrl, account.project.publicUrl, ...account.project.origins]
    .map((u) => {
      try {
        return new URL(u).hostname.replace(/^www\./, '').toLowerCase();
      } catch {
        return '';
      }
    })
    .filter(Boolean);
  const titles = new Map(account.project.projects.map((p) => [p.slug, p.title]));

  // A visit is one person on one day. The hash already changes daily, so the
  // hash alone is the key.
  const visitKeys = new Set(current.map((v) => v.ip_hash as string));
  const prevKeys = new Set(before.map((v) => v.ip_hash as string));

  const byDayMap = new Map<string, Set<string>>();
  const pages = new Map<string, number>();
  const hours = new Map<number, number>();
  // Place, source and device are properties of the visit, not of each page
  // opened, so each is taken once, from the first page of the visit.
  const firstOf = new Map<string, Visit>();
  for (const v of [...current].reverse()) {
    const d = dayOf(v.created_at);
    if (!byDayMap.has(d)) byDayMap.set(d, new Set());
    (byDayMap.get(d) as Set<string>).add(v.ip_hash as string);
    bump(pages, pageName(v.path ?? '/', titles));
    hours.set(hourOf(v.created_at), (hours.get(hourOf(v.created_at)) ?? 0) + 1);
    if (!firstOf.has(v.ip_hash as string)) firstOf.set(v.ip_hash as string, v);
  }
  const places = new Map<string, number>();
  const sources = new Map<string, number>();
  const devices = new Map<string, number>();
  for (const v of firstOf.values()) {
    bump(places, place(v));
    bump(sources, source(v.referrer, ownHosts));
    bump(devices, device(v.ua));
  }

  const byDay: TrafficDay[] = [];
  const shown = Math.min(span, 30);
  for (let i = shown - 1; i >= 0; i--) {
    const d = dayOf(new Date(now - i * 86400000).toISOString());
    byDay.push({ day: d, count: byDayMap.get(d)?.size ?? 0 });
  }

  const [leads, scans] = await Promise.all([
    sb.from('client_leads').select('id', { count: 'exact', head: true }).eq('project', account.project.key).gte('created_at', start),
    sb.from('client_visits').select('id', { count: 'exact', head: true }).eq('client_email', account.clientEmail).gte('created_at', start),
  ]);

  const visits = visitKeys.size;
  return {
    days: span,
    since: start,
    visits,
    views: current.length,
    pagesPerVisit: visits ? Math.round((current.length / visits) * 10) / 10 : 0,
    previous: before.length || prevKeys.size ? { visits: prevKeys.size, views: before.length } : null,
    byDay,
    pages: top(pages, current.length, 10),
    places: top(places, visits, 8),
    sources: top(sources, visits, 8),
    devices: top(devices, visits, 3),
    hours: Array.from({ length: 24 }, (_, hour) => ({ hour, count: hours.get(hour) ?? 0 })),
    leads: leads.error ? null : leads.count ?? 0,
    scans: scans.error ? null : scans.count ?? 0,
  };
}
