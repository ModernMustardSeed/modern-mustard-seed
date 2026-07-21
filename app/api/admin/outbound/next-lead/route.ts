import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';

export const runtime = 'nodejs';

/**
 * The genuinely-next lead for free-roam calling (NOT batch mode).
 *
 * The dashboard heat queue answers "who is hottest right now" and is the right
 * tool for the dashboard, but it made the cockpit's "Next lead" button loop: it
 * always pointed at the hottest lead that wasn't the current one, so working
 * A -> next -> B -> next bounced straight back to A. That forces a rep to keep
 * re-facing the hot leads instead of moving forward through the list.
 *
 * This walks the lead space in the SAME stable order the Leads table shows by
 * default (created_at desc, id asc as tiebreak), and returns the one lead
 * immediately after the current lead. Forward only, deterministic, no heat, no
 * loop. Batch mode is untouched and keeps its frozen-stack cursor.
 *
 * "Workable" = still callable (new / contacted / callback). Won, lost, dnc,
 * pilot_live, and demo_booked are skipped so "next" never lands on a dead lead.
 */
const WORKABLE = ['new', 'contacted', 'callback'] as const;

export async function GET(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const after = new URL(req.url).searchParams.get('after');
  if (!after) return NextResponse.json({ error: 'after (lead id) required' }, { status: 400 });

  const { data: cur, error: curErr } = await guard.supabase
    .from('outbound_leads')
    .select('id, created_at')
    .eq('id', after)
    .maybeSingle();
  if (curErr) return NextResponse.json({ error: curErr.message }, { status: 500 });
  if (!cur) return NextResponse.json({ next: null });

  // Canonical order is created_at DESC, id ASC (same as the overview + leads
  // table). "After" in that order means: an older lead, or the same instant with
  // a larger id. One bounded query, limit 1 — no full-floor scan.
  const olderOrTie = `created_at.lt.${cur.created_at},and(created_at.eq.${cur.created_at},id.gt.${cur.id})`;
  const { data, error } = await guard.supabase
    .from('outbound_leads')
    .select('id, business_name')
    .in('status', WORKABLE as unknown as string[])
    .neq('id', cur.id)
    .or(olderOrTie)
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ next: data ? { id: data.id, business_name: data.business_name } : null });
}
