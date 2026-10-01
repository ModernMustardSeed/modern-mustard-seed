import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { listSettings } from '@/lib/posting/settings';
import { planClient } from '@/lib/posting/planner';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * THE EVENING PLAN. 7:35 PM Mountain, every day. For every posting client,
 * make sure the next three days each have a post and the writing is queued,
 * so the words are waiting long before the morning hour. Idempotent; hitting
 * it twice plans nothing twice.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && !/^\[SENSITIVE\]$/i.test(secret)) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'no database' }, { status: 500 });

  const clients = await listSettings(sb);
  const report: Record<string, unknown> = {};
  for (const s of clients) {
    if (!s.active) continue;
    try {
      report[s.client_email] = await planClient(sb, s);
    } catch (err) {
      report[s.client_email] = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  return NextResponse.json({ ok: true, clients: clients.length, report });
}
