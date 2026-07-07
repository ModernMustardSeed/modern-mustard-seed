import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Daily: pilots count their own receipts. Any running pilot with a
 * vapi_assistant_id gets calls_caught pulled straight from Vapi's call log,
 * so conversion day opens with "here are the N timestamped calls it caught"
 * instead of a hand-typed number. Read-only against Vapi; never lowers a
 * manually entered count.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) return NextResponse.json({ skipped: 'VAPI_API_KEY not set' });

  const { data: pilots, error } = await sb
    .from('outbound_pilots')
    .select('id, vapi_assistant_id, calls_caught, started_at')
    .eq('status', 'running')
    .not('vapi_assistant_id', 'is', null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { id: string; calls: number }[] = [];
  for (const p of pilots ?? []) {
    try {
      const url = new URL('https://api.vapi.ai/call');
      url.searchParams.set('assistantId', String(p.vapi_assistant_id).trim());
      url.searchParams.set('createdAtGt', p.started_at);
      url.searchParams.set('limit', '100');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!res.ok) continue;
      const calls = (await res.json()) as unknown[];
      const caught = Array.isArray(calls) ? calls.length : 0;
      if (caught > Number(p.calls_caught ?? 0)) {
        await sb.from('outbound_pilots').update({ calls_caught: caught }).eq('id', p.id);
      }
      results.push({ id: p.id, calls: caught });
    } catch {
      /* one pilot failing must not stop the rest */
    }
  }

  return NextResponse.json({ ok: true, pilots: results.length, results });
}
