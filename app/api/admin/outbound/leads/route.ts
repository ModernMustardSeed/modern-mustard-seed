import { NextResponse } from 'next/server';
import { requireOutboundAdmin, parseBody, outboundRepScope, fetchAllRows } from '@/lib/outbound-server';
import { leadInputSchema, LEAD_STATUSES, NICHES, phoneKey } from '@/lib/outbound';
import type { LeadStatus, Niche } from '@/lib/outbound';

export const runtime = 'nodejs';

const SORTABLE = new Set(['business_name', 'contact_name', 'city', 'niche', 'status', 'avg_job_value', 'created_at', 'next_action_at']);

export async function GET(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const niche = url.searchParams.get('niche');
  const owner = url.searchParams.get('owner');
  const dnc = url.searchParams.get('dnc'); // 'unchecked' surfaces un-scrubbed leads
  const q = url.searchParams.get('q')?.trim();
  const sortParam = url.searchParams.get('sort') ?? 'created_at';
  const sort = SORTABLE.has(sortParam) ? sortParam : 'created_at';
  const asc = url.searchParams.get('dir') === 'asc';

  // Explicit columns, no audit_json: the full report is kilobytes per row and
  // belongs to the single-lead cockpit fetch, not a 3000-row list.
  const LIST_COLUMNS =
    'id, business_name, contact_name, phone, email, website, niche, city, state, avg_job_value, est_missed_calls_week, close_rate_pct, status, source, owner_rep_id, dnc_checked, next_action_at, next_action, notes, audit_score, audit_url, audit_at, pipeline_lead_id, email_opened_at, email_open_count, last_email_at, last_open_at, demo_url, demo_run_id, site_demo_id, site_demo_url, site_demo_status, os_demo_id, os_demo_url, os_demo_status, hub_demo_id, hub_demo_url, created_at, updated_at';
  // A 'caller' rep only ever sees their own leads, whatever the owner param says.
  const { scopeRepId } = await outboundRepScope(guard.supabase);

  // Build a fresh, identically-filtered query per page. Supabase/PostgREST caps
  // every response at `max_rows` (1000 by default), so a single `.limit(3000)`
  // was silently returning only the newest 1000 rows — which, after a big import,
  // are all fresh "new" leads and push every worked/contacted lead out of view.
  // We page through in 1000-row chunks so the whole list reaches the client,
  // where the existing filters/search run. Ordered by the sort column with `id`
  // as a stable tiebreaker so range paging can't skip or duplicate a row.
  const buildQuery = () => {
    let query = guard.supabase.from('outbound_leads').select(LIST_COLUMNS);
    if (status && (LEAD_STATUSES as readonly string[]).includes(status)) query = query.eq('status', status as LeadStatus);
    if (niche && (NICHES as readonly string[]).includes(niche)) query = query.eq('niche', niche as Niche);
    if (scopeRepId) query = query.eq('owner_rep_id', scopeRepId);
    else if (owner) query = query.eq('owner_rep_id', owner);
    if (dnc === 'unchecked') query = query.eq('dnc_checked', false);
    if (q) {
      const safe = q.replace(/[%,()]/g, ' ').trim();
      if (safe) query = query.or(`business_name.ilike.%${safe}%,contact_name.ilike.%${safe}%,phone.ilike.%${safe}%,city.ilike.%${safe}%`);
    }
    return query.order(sort, { ascending: asc, nullsFirst: false }).order('id', { ascending: true });
  };

  const { data: leads, error } = await fetchAllRows(buildQuery);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads });
}

export async function POST(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  // Manual single add: email is PREFERRED, not required (Sarah's "split" rule) —
  // a human adding one lead is never blocked. The CSV import stays strict.
  const parsed = await parseBody(req, leadInputSchema);
  if ('error' in parsed) return parsed.error;

  // Dedupe on phone before inserting. Phone formats vary, so we normalize in JS
  // rather than SQL — which means checking the WHOLE table, not just the newest
  // 1000 rows PostgREST would hand back by default (older dupes must still catch).
  const key = phoneKey(parsed.data.phone);
  if (key.length >= 7) {
    const { data: existing } = await fetchAllRows<{ id: string; phone: string; business_name: string }>(
      () => guard.supabase.from('outbound_leads').select('id, phone, business_name').order('id', { ascending: true }),
    );
    const dupe = (existing ?? []).find((l) => phoneKey(l.phone) === key);
    if (dupe) {
      return NextResponse.json({ error: `That phone number is already on the list (${dupe.business_name}).`, duplicate_id: dupe.id }, { status: 409 });
    }
  }

  const { data, error } = await guard.supabase.from('outbound_leads').insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}
