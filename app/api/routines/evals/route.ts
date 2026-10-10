import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { bearerOk, parseEvals, routinesSecret } from '@/lib/routines';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One eval sweep's results, posted by ~/.claude/evals/run.mjs. Rows are keyed on
 * (run_id, agent, case_id), so re-posting a sweep replaces it rather than
 * doubling it. At most 500 results per call.
 */
export async function POST(req: Request) {
  const secret = routinesSecret();
  if (!secret) return NextResponse.json({ error: 'not configured' }, { status: 503 });
  if (!bearerOk(req.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'body must be JSON' }, { status: 400 });
  }
  const parsed = parseEvals(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'no database' }, { status: 500 });
  const { error } = await sb.from('agent_evals').upsert(parsed.value, { onConflict: 'run_id,agent,case_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, stored: parsed.value.length });
}
