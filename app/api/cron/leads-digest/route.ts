import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { CLIENT_PROJECTS, sendLeadsDigest, type DigestLead } from '@/lib/client-leads';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * MONDAY, 7:35 AM MOUNTAIN. For every client with a site that posts leads:
 * last week by door, by priority, by page, and everyone still waiting on a
 * call. Sarah is in copy. A client with no leads last week and nobody
 * waiting gets nothing, because an empty digest is noise.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && !/^\[SENSITIVE\]$/i.test(secret)) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'no database' }, { status: 500 });

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const report: Record<string, string> = {};
  for (const p of Object.values(CLIENT_PROJECTS)) {
    const cols = 'id, name, phone, email, town, land, page, source, sources, priority, handled_at, created_at';
    const [{ data: week }, { data: open }] = await Promise.all([
      sb.from('client_leads').select(cols).eq('client_email', p.clientEmail).gte('created_at', weekAgo).order('created_at', { ascending: false }),
      sb.from('client_leads').select(cols).eq('client_email', p.clientEmail).is('handled_at', null).order('priority', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }).limit(50),
    ]);
    const w = (week ?? []) as DigestLead[];
    const o = (open ?? []) as DigestLead[];
    if (!w.length && !o.length) {
      report[p.key] = 'nothing to say';
      continue;
    }
    const sent = await sendLeadsDigest(p, w, o);
    report[p.key] = sent ? `sent: ${w.length} last week, ${o.length} waiting` : 'send failed';
  }
  return NextResponse.json({ ok: true, report });
}
