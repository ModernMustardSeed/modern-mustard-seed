import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { addDays, mountainDate } from '@/lib/posting/time';
import { buildScoreboard } from '@/lib/routines';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The Mustard Office scoreboard, public. office.modernmustardseed.com reads it:
 * the latest eval sweep's pass rate per agent, fourteen days of routine runs,
 * and the keep rate on Sarah's verdicts. Counts and statuses only. Report text
 * and judge notes never leave the database, because a report can name a lead.
 */
const ALLOWED_ORIGINS = new Set(['https://office.modernmustardseed.com']);

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://office.modernmustardseed.com',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    Vary: 'Origin',
  };
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: { ...cors(req), 'Access-Control-Max-Age': '86400' } });
}

export async function GET(req: Request) {
  const headers = { ...cors(req), 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' };
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'no database' }, { status: 500, headers });

  const now = new Date();
  const since = addDays(mountainDate(now), -13);
  const [runs, verdicts, latest] = await Promise.all([
    sb.from('routine_runs').select('routine, run_date, status').gte('run_date', since).limit(1000),
    sb.from('routine_verdicts').select('routine, run_date, verdict').limit(5000),
    sb.from('agent_evals').select('run_id').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (runs.error || verdicts.error || latest.error) {
    return NextResponse.json({ error: 'scoreboard unavailable' }, { status: 500, headers: { ...headers, 'Cache-Control': 'no-store' } });
  }

  let evals: { run_id: string; agent: string; case_id: string; passed: boolean; created_at: string }[] = [];
  if (latest.data?.run_id) {
    const sweep = await sb.from('agent_evals').select('run_id, agent, case_id, passed, created_at').eq('run_id', latest.data.run_id).limit(2000);
    if (sweep.error) return NextResponse.json({ error: 'scoreboard unavailable' }, { status: 500, headers: { ...headers, 'Cache-Control': 'no-store' } });
    evals = sweep.data ?? [];
  }

  const board = buildScoreboard({ now, runs: runs.data ?? [], verdicts: verdicts.data ?? [], evals });
  return NextResponse.json(board, { headers });
}
