import { NextResponse } from 'next/server';
import { requireOutboundAdmin, outboundRepScope, fetchAllRows } from '@/lib/outbound-server';
import type { CallOutcome, ForgeCounts, ForgeRow, ForgeSiteRun, ForgeStage, SiteDemoStatus } from '@/lib/outbound';

export const runtime = 'nodejs';

/**
 * The FORGE BOARD: every lead that has work already invested in it.
 *
 * A forged suite is money already spent. The cockpit could show you a demo the
 * moment you forged it and then lose it forever in a floor of thousands, which
 * is exactly how a built-out lead goes uncalled. This endpoint answers the two
 * questions that costs you: what is building RIGHT NOW, and which finished
 * suites has nobody reached out about yet.
 */

// One literal string on purpose: a computed/joined list widens to `string` and
// supabase-js loses row typing entirely (every row becomes GenericStringError).
const LEAD_COLS =
  'id, business_name, contact_name, phone, email, niche, city, state, status, source, origin, owner_rep_id, dnc_checked, audit_score, demo_url, demo_run_id, site_demo_id, site_demo_url, site_demo_status, os_demo_id, os_demo_url, hub_demo_id, hub_demo_url, hub_view_count, email_open_count, last_email_at, last_open_at, next_action_at, created_at, updated_at';

/** Anything forged for the lead: receptionist, website, command center, or the suite hub. */
const FORGED_FILTER = 'demo_run_id.not.is.null,site_demo_id.not.is.null,os_demo_id.not.is.null,hub_demo_id.not.is.null';

type LeadRow = Omit<ForgeRow, 'forged_at' | 'asset_count' | 'calls' | 'last_call_at' | 'last_outcome' | 'stage' | 'site'> & {
  demo_run_id: string | null;
  site_demo_id: string | null;
  os_demo_id: string | null;
  hub_demo_id: string | null;
  updated_at: string;
};

type SiteRow = ForgeSiteRun & { lead_id: string; business_name: string };
type CallRow = { lead_id: string; called_at: string; outcome: CallOutcome };
type OsRow = { lead_id: string; created_at: string };

/**
 * PostgREST `.in()` goes in the URL, so a thousand ids would blow the request
 * line, and a single chunk that returns more than max_rows would truncate
 * silently. Forty leads per chunk keeps both well inside the limits even for a
 * lead with a long call history.
 */
const CHUNK = 40;
function chunk<T>(rows: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

const IN_FLIGHT: SiteDemoStatus[] = ['queued', 'building'];
const LANDED = ['demo_booked', 'pilot_live', 'won'];
const CLOSED = ['lost', 'dnc'];

export async function GET(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const summaryOnly = new URL(req.url).searchParams.get('summary') === '1';

  // A part-time caller sees only their own forged leads, same scoping as the floor.
  const { reps, scopeRepId } = await outboundRepScope(guard.supabase);

  const makeLeadQuery = () => {
    let qb = guard.supabase
      .from('outbound_leads')
      .select(LEAD_COLS)
      .or(FORGED_FILTER)
      .order('updated_at', { ascending: false })
      .order('id', { ascending: true });
    if (scopeRepId) qb = qb.eq('owner_rep_id', scopeRepId);
    return qb;
  };

  const leadsRes = await fetchAllRows<LeadRow>(makeLeadQuery);
  if (leadsRes.error) return NextResponse.json({ error: leadsRes.error.message }, { status: 500 });
  const leads = leadsRes.data;
  const ids = leads.map((l) => l.id);

  // Build rows, call history, and command-center forge times for exactly these leads.
  const [siteChunks, callChunks, osChunks] = await Promise.all([
    Promise.all(
      chunk(ids).map((c) =>
        guard.supabase
          .from('outbound_demo_sites')
          .select('id, lead_id, business_name, status, kind, error, created_at, claimed_at, built_at')
          .in('lead_id', c)
          .order('created_at', { ascending: false }),
      ),
    ),
    Promise.all(
      chunk(ids).map((c) =>
        guard.supabase
          .from('outbound_call_logs')
          .select('lead_id, called_at, outcome')
          .in('lead_id', c)
          .order('called_at', { ascending: false }),
      ),
    ),
    Promise.all(
      chunk(ids).map((c) =>
        guard.supabase.from('outbound_demo_os').select('lead_id, created_at').in('lead_id', c),
      ),
    ),
  ]);

  for (const res of [...siteChunks, ...callChunks, ...osChunks]) {
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  }

  // Newest run per lead wins: that is the build the cockpit chips reflect.
  const siteByLead = new Map<string, SiteRow>();
  for (const res of siteChunks) {
    for (const row of (res.data ?? []) as SiteRow[]) {
      const seen = siteByLead.get(row.lead_id);
      if (!seen || row.created_at > seen.created_at) siteByLead.set(row.lead_id, row);
    }
  }

  const callsByLead = new Map<string, { count: number; last: CallRow }>();
  for (const res of callChunks) {
    for (const row of (res.data ?? []) as CallRow[]) {
      const seen = callsByLead.get(row.lead_id);
      if (!seen) callsByLead.set(row.lead_id, { count: 1, last: row });
      else {
        seen.count += 1;
        if (row.called_at > seen.last.called_at) seen.last = row;
      }
    }
  }

  const osByLead = new Map<string, string>();
  for (const res of osChunks) {
    for (const row of (res.data ?? []) as OsRow[]) {
      const seen = osByLead.get(row.lead_id);
      if (!seen || row.created_at > seen) osByLead.set(row.lead_id, row.created_at);
    }
  }

  const rows: ForgeRow[] = leads.map((l) => {
    const siteRow = siteByLead.get(l.id) ?? null;
    const site: ForgeSiteRun | null = siteRow
      ? {
          id: siteRow.id,
          status: siteRow.status,
          kind: siteRow.kind,
          error: siteRow.error,
          created_at: siteRow.created_at,
          claimed_at: siteRow.claimed_at,
          built_at: siteRow.built_at,
        }
      : null;
    const calls = callsByLead.get(l.id);
    const callCount = calls?.count ?? 0;
    const emailed = !!l.last_email_at;

    // The receptionist and the hub carry no forge timestamp of their own, so we
    // date the suite by whatever piece we CAN date and leave it null otherwise
    // rather than inventing a time from the lead's last touch.
    const stamps = [siteRow?.created_at, osByLead.get(l.id)].filter((s): s is string => !!s);
    const forged_at = stamps.length ? stamps.sort().at(-1)! : null;

    const assetCount = [l.demo_url, l.site_demo_status === 'ready' ? l.site_demo_url : null, l.os_demo_url].filter(Boolean).length;

    let stage: ForgeStage;
    if (site && IN_FLIGHT.includes(site.status)) stage = 'forging';
    else if (site?.status === 'failed') stage = 'failed';
    else if (CLOSED.includes(l.status)) stage = 'closed';
    else if (callCount === 0 && !emailed) stage = 'uncontacted';
    else if (LANDED.includes(l.status)) stage = 'landed';
    else stage = 'waiting';

    return {
      id: l.id,
      business_name: l.business_name,
      contact_name: l.contact_name,
      phone: l.phone,
      email: l.email,
      niche: l.niche,
      city: l.city,
      state: l.state,
      status: l.status,
      source: l.source,
      origin: l.origin,
      owner_rep_id: l.owner_rep_id,
      dnc_checked: l.dnc_checked,
      audit_score: l.audit_score,
      demo_url: l.demo_url,
      site_demo_url: l.site_demo_url,
      site_demo_status: l.site_demo_status,
      os_demo_url: l.os_demo_url,
      hub_demo_url: l.hub_demo_url,
      hub_view_count: l.hub_view_count ?? 0,
      email_open_count: l.email_open_count ?? 0,
      last_email_at: l.last_email_at,
      last_open_at: l.last_open_at,
      next_action_at: l.next_action_at,
      created_at: l.created_at,
      forged_at,
      asset_count: assetCount,
      calls: callCount,
      last_call_at: calls?.last.called_at ?? null,
      last_outcome: calls?.last.outcome ?? null,
      stage,
      site,
    };
  });

  const counts = rows.reduce<ForgeCounts>(
    (acc, r) => {
      acc[r.stage] += 1;
      acc.all += 1;
      return acc;
    },
    { forging: 0, failed: 0, uncontacted: 0, waiting: 0, landed: 0, closed: 0, all: 0 },
  );

  if (summaryOnly) return NextResponse.json({ counts });

  // Work order, not chronology: what is building, what broke, what is built and
  // unspent, then the rest. Inside a bucket, the freshest forge leads.
  const rank: Record<ForgeStage, number> = { forging: 0, failed: 1, uncontacted: 2, waiting: 3, landed: 4, closed: 5 };
  rows.sort((a, b) => {
    const r = rank[a.stage] - rank[b.stage];
    if (r !== 0) return r;
    const at = a.forged_at ?? a.created_at;
    const bt = b.forged_at ?? b.created_at;
    return bt.localeCompare(at);
  });

  return NextResponse.json({ rows, counts, reps });
}
