import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

const ACTIVE = ['queued', 'scouting', 'fielding', 'forging', 'courting'];

/** GET /api/admin/gleaner/runs/[id]?after=<eventId> - live feed cursor. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const { id } = await params;
  const after = Number(req.nextUrl.searchParams.get('after') || 0);

  const [{ data: run }, { data: events }, { data: demos }] = await Promise.all([
    supabase.from('gleaner_runs').select('*').eq('id', id).maybeSingle(),
    supabase.from('gleaner_events').select('*').eq('run_id', id).gt('id', after).order('id', { ascending: true }).limit(200),
    supabase.from('gleaner_demos').select('*').eq('run_id', id).order('created_at', { ascending: true }),
  ]);
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ run, events: events || [], demos: demos || [] });
}

/** PATCH /api/admin/gleaner/runs/[id] { action: 'cancel' } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.action !== 'cancel') return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  const { data: run } = await supabase.from('gleaner_runs').select('id,status').eq('id', id).maybeSingle();
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!ACTIVE.includes(run.status)) return NextResponse.json({ error: `Run is ${run.status}; nothing to cancel.` }, { status: 400 });

  await supabase.from('gleaner_runs').update({ status: 'canceled', stage_detail: 'canceled by Sarah', finished_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id);
  await supabase.from('gleaner_events').insert({ run_id: id, level: 'warn', source: 'system', message: 'Cancel requested. The worker will stop at the next stage boundary.' });
  return NextResponse.json({ ok: true });
}
