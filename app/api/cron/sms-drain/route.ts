import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { smsSendable } from '@/lib/sms';
import { drainBatch } from '@/lib/sms-campaigns';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Drains every actively-sending campaign a batch at a time. Pinged on a schedule
 * by GitHub Actions (.github/workflows/sms-drain.yml). Quiet hours are enforced
 * per recipient inside drainBatch, so it is safe to run this often; out-of-window
 * leads simply stay queued until they are in-window. Optional Bearer CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!smsSendable()) return NextResponse.json({ ok: false, note: 'A2P 10DLC registration still pending, holding the queue' });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, note: 'Database not configured' });

  const { data: campaigns } = await sb.from('sms_campaigns').select('*').eq('status', 'sending').limit(10);
  const results = [];
  for (const c of campaigns || []) {
    const r = await drainBatch(sb, c, Math.min(c.throttle_per_min || 30, 40));
    results.push({ id: c.id, name: c.name, ...r });
  }
  return NextResponse.json({ ok: true, drained: results });
}
