/**
 * THE MUSTARD FUNNEL, BY SOURCE.
 *
 * The whole reason /mustard is one page with a `?source=` rather than nine
 * pages: the funnel splits itself by channel, and a new channel can be tried by
 * inventing a URL rather than shipping code.
 *
 * Every number here is counted off `mustard_requests` rows, which are written
 * before the call is placed and updated as it moves. Nothing is inferred and
 * nothing is filled in. A source with no data reports zeroes, not estimates.
 */

import { getSupabase } from '@/lib/supabase';
import { labelSource } from '@/lib/mustard/surface';

export type SourceFunnel = {
  source: string;
  label: string;
  requests: number;
  consented: number;
  called: number;
  completed: number;
  failed: number;
  refused: number;
  forged: number;
  paid: number;
  consentRatePct: number | null;
  completionRatePct: number | null;
  forgeRatePct: number | null;
  paidRatePct: number | null;
};

export type MustardAnalytics = {
  today: { requests: number; calls: number; completed: number; forged: number; paid: number };
  allTime: { requests: number; calls: number; completed: number; forged: number; paid: number };
  bySource: SourceFunnel[];
  recent: {
    id: string;
    source: string;
    label: string;
    phone: string | null;
    business: string | null;
    status: string;
    leadId: string | null;
    createdAt: string;
  }[];
  links: { active: number; used: number; expired: number };
};

type Row = {
  id: string;
  source: string | null;
  status: string;
  phone_e164: string | null;
  business_name: string | null;
  lead_id: string | null;
  created_at: string;
};

const CONSENTED = new Set(['consented', 'calling', 'connected', 'completed', 'failed']);
const CALLED = new Set(['calling', 'connected', 'completed']);

export async function mustardAnalytics(): Promise<MustardAnalytics> {
  const db = getSupabase();
  const empty: MustardAnalytics = {
    today: { requests: 0, calls: 0, completed: 0, forged: 0, paid: 0 },
    allTime: { requests: 0, calls: 0, completed: 0, forged: 0, paid: 0 },
    bySource: [],
    recent: [],
    links: { active: 0, used: 0, expired: 0 },
  };
  if (!db) return empty;

  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('mustard_requests')
      .select('id,source,status,phone_e164,business_name,lead_id,created_at')
      .order('created_at', { ascending: false })
      .range(from, from + 999);
    if (error) break;
    const batch = (data ?? []) as Row[];
    rows.push(...batch);
    if (batch.length < 1000 || rows.length >= 20000) break;
  }

  // Forge and purchase live on the prospect, so they are joined in one read
  // rather than one per row.
  const leadIds = [...new Set(rows.map((r) => r.lead_id).filter(Boolean))] as string[];
  const forged = new Set<string>();
  const paid = new Set<string>();
  for (let i = 0; i < leadIds.length; i += 500) {
    const { data } = await db
      .from('outbound_leads')
      .select('id,demo_status,client_status')
      .in('id', leadIds.slice(i, i + 500));
    for (const l of (data ?? []) as { id: string; demo_status: string | null; client_status: string | null }[]) {
      if (l.demo_status === 'ready') forged.add(l.id);
      if (l.client_status === 'client') paid.add(l.id);
    }
  }

  const denver = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' });
  const todayStr = denver.format(new Date());
  const isToday = (iso: string) => denver.format(new Date(iso)) === todayStr;

  const tally = (list: Row[]) => ({
    requests: list.length,
    calls: list.filter((r) => CALLED.has(r.status)).length,
    completed: list.filter((r) => r.status === 'completed').length,
    forged: list.filter((r) => r.lead_id && forged.has(r.lead_id)).length,
    paid: list.filter((r) => r.lead_id && paid.has(r.lead_id)).length,
  });

  const grouped = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.source ?? 'direct';
    grouped.set(key, [...(grouped.get(key) ?? []), r]);
  }

  const bySource: SourceFunnel[] = [...grouped.entries()]
    .map(([source, list]) => {
      const requests = list.length;
      const consented = list.filter((r) => CONSENTED.has(r.status)).length;
      const called = list.filter((r) => CALLED.has(r.status)).length;
      const completed = list.filter((r) => r.status === 'completed').length;
      const f = list.filter((r) => r.lead_id && forged.has(r.lead_id)).length;
      const p = list.filter((r) => r.lead_id && paid.has(r.lead_id)).length;
      const rate = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);
      return {
        source,
        label: labelSource(source),
        requests,
        consented,
        called,
        completed,
        failed: list.filter((r) => r.status === 'failed').length,
        refused: list.filter((r) => r.status === 'refused').length,
        forged: f,
        paid: p,
        consentRatePct: rate(consented, requests),
        completionRatePct: rate(completed, called),
        forgeRatePct: rate(f, completed),
        paidRatePct: rate(p, completed),
      };
    })
    .sort((a, b) => b.paid - a.paid || b.completed - a.completed || b.requests - a.requests);

  const now = Date.now();
  const { data: links } = await db.from('mustard_links').select('expires_at,used_at,revoked_at').limit(5000);
  const linkRows = (links ?? []) as { expires_at: string; used_at: string | null; revoked_at: string | null }[];

  return {
    today: tally(rows.filter((r) => isToday(r.created_at))),
    allTime: tally(rows),
    bySource,
    recent: rows.slice(0, 40).map((r) => ({
      id: r.id,
      source: r.source ?? 'direct',
      label: labelSource(r.source),
      phone: r.phone_e164,
      business: r.business_name,
      status: r.status,
      leadId: r.lead_id,
      createdAt: r.created_at,
    })),
    links: {
      active: linkRows.filter((l) => !l.revoked_at && !l.used_at && new Date(l.expires_at).getTime() > now).length,
      used: linkRows.filter((l) => l.used_at).length,
      expired: linkRows.filter((l) => !l.used_at && new Date(l.expires_at).getTime() <= now).length,
    },
  };
}
