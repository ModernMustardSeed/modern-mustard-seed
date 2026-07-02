import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

const ACTIVE = ['queued', 'scouting', 'fielding', 'forging', 'courting'];

/** GET /api/admin/gleaner - the command deck overview. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const [runsRes, verticalsRes, demosRes, prospectsRes, wonRes, draftsRes] = await Promise.all([
    supabase.from('gleaner_runs').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('gleaner_verticals').select('*').order('score', { ascending: false, nullsFirst: false }),
    supabase.from('gleaner_demos').select('*').order('created_at', { ascending: false }).limit(12),
    supabase.from('harvest_prospects').select('id,name,status,composite,revenue_leak_estimate,vertical,microsite_url,website').order('updated_at', { ascending: false }).limit(400),
    supabase.from('harvest_prospects').select('revenue_leak_estimate').eq('status', 'won'),
    supabase.from('outreach_messages').select('id', { count: 'exact', head: true }).eq('kind', 'harvest').eq('status', 'draft'),
  ]);

  const runs = runsRes.data || [];
  const activeRun = runs.find((r) => ACTIVE.includes(r.status)) || null;

  let events: unknown[] = [];
  if (activeRun) {
    const { data } = await supabase
      .from('gleaner_events').select('*')
      .eq('run_id', activeRun.id)
      .order('id', { ascending: false })
      .limit(120);
    events = (data || []).reverse();
  }

  const prospects = prospectsRes.data || [];
  const pipeline: Record<string, number> = {};
  for (const p of prospects) pipeline[p.status] = (pipeline[p.status] || 0) + 1;

  const recoveredAnnual = (wonRes.data || []).reduce((s, r) => s + (r.revenue_leak_estimate || 0), 0) * 12;
  const leakOnGround = prospects
    .filter((p) => ['scored', 'qualified', 'drafted', 'queued', 'sent', 'replied'].includes(p.status))
    .reduce((s, p) => s + (p.revenue_leak_estimate || 0), 0);
  const demos = demosRes.data || [];

  return NextResponse.json({
    runs,
    activeRun,
    events,
    verticals: verticalsRes.data || [],
    demos,
    pipeline,
    board: {
      scored: prospects.filter((p) => ['scored', 'qualified'].includes(p.status)).slice(0, 8),
      courting: prospects.filter((p) => ['drafted', 'queued', 'sent', 'replied', 'booked'].includes(p.status)).slice(0, 8),
      won: prospects.filter((p) => p.status === 'won').slice(0, 8),
    },
    metrics: {
      recoveredAnnual,
      leakOnGround,
      liveDemos: demos.filter((d) => d.demo_url).length,
      draftsWaiting: draftsRes.count ?? 0,
      qualified: pipeline['qualified'] || 0,
    },
  });
}

/** POST /api/admin/gleaner - THE LEVER. Queues a run for the gleaner worker. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const verticalSlug = String(body.verticalSlug || '').trim() || 'auto';
  const geo = String(body.geo || '').trim();
  const maxDemos = Math.min(Math.max(Number(body.maxDemos) || 1, 0), 3);
  const maxProspects = Math.min(Math.max(Number(body.maxProspects) || 25, 5), 50);

  const { data: existing } = await supabase
    .from('gleaner_runs').select('id,status').in('status', ACTIVE).limit(1).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'A run is already in motion. One harvest at a time.' }, { status: 409 });
  }

  const { data: run, error } = await supabase
    .from('gleaner_runs')
    .insert({ vertical_slug: verticalSlug, geo, status: 'queued', config: { maxDemos, maxProspects }, stats: {} })
    .select('*').single();
  if (error || !run) return NextResponse.json({ error: error?.message || 'insert failed' }, { status: 500 });

  await supabase.from('gleaner_events').insert({
    run_id: run.id,
    level: 'info',
    source: 'system',
    message: `Lever pulled: ${verticalSlug === 'auto' ? 'auto-scout the best vertical' : verticalSlug}${geo ? ` in ${geo}` : ''}, up to ${maxDemos} demo(s). Waiting for the gleaner worker to claim it.`,
  });

  return NextResponse.json({ run });
}
