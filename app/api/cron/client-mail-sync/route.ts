import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { CLIENT_PROJECTS } from '@/lib/client-leads';
import { collectSorted, syncMailbox } from '@/lib/mail-desk';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

/**
 * TWICE AN HOUR, 7 AND 37 PAST. Every client with a connected mailbox: read
 * what is new, queue the sorting, and pull finished sorts onto their rows so
 * the portal shows a reply waiting when they open it.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && !/^\[SENSITIVE\]$/i.test(secret)) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'no database' }, { status: 500 });
  const report: Record<string, string> = {};
  for (const p of Object.values(CLIENT_PROJECTS)) {
    const r = await syncMailbox(sb, p);
    const sorted = await collectSorted(sb, p.clientEmail);
    report[p.key] = r.ok ? `${r.fetched} new, ${r.queued} queued, ${sorted} sorted` : r.error === 'not connected' ? 'no mailbox' : `failed: ${r.error}`;
  }
  return NextResponse.json({ ok: true, report });
}
