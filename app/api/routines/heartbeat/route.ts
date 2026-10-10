import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { bearerOk, parseHeartbeat, routinesSecret } from '@/lib/routines';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A standing routine checking in. dev/mms/routines/run.ps1 posts `running` when
 * it starts and `ok`, `missing_report` or `timeout` when it ends. One row per
 * routine per Mountain day: the second post updates the first, and a field the
 * post leaves out keeps its earlier value.
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
  const parsed = parseHeartbeat(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'no database' }, { status: 500 });
  const { error } = await sb.from('routine_runs').upsert(parsed.value, { onConflict: 'routine,run_date' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
