import { NextResponse } from 'next/server';
import { requireAcqAdmin } from '@/lib/acq/server';

export const runtime = 'nodejs';

/** Every Mr. Mustard acquisition call, newest first, with the prospect attached. */
export async function GET(req: Request) {
  const g = await requireAcqAdmin();
  if ('error' in g) return g.error;
  const { db } = g;

  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? '';
  const limit = Math.min(200, Math.max(10, Number(url.searchParams.get('limit') ?? 60)));

  let q = db.from('acq_calls').select('*').order('requested_at', { ascending: false }).limit(limit);
  if (status) q = q.eq('status', status);
  const { data: calls, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = [...new Set(((calls ?? []) as { lead_id: string | null }[]).map((c) => c.lead_id).filter(Boolean))] as string[];
  const { data: leads } = ids.length
    ? await db.from('outbound_leads').select('id,business_name,contact_name,city,state,trade,lead_score,demo_status,checkout_sent_at,client_status,needs_human').in('id', ids)
    : { data: [] };

  const byId = new Map(((leads ?? []) as { id: string }[]).map((l) => [l.id, l]));
  type CallRow = Record<string, unknown> & { status?: string; duration_sec?: number | null; lead: unknown };
  const rows: CallRow[] = ((calls ?? []) as Record<string, unknown>[]).map((c) => ({
    ...c,
    lead: c.lead_id ? (byId.get(c.lead_id as string) ?? null) : null,
  }));

  const completed = rows.filter((r) => r.status === 'completed');
  const totalSec = completed.reduce((s, r) => s + Number(r.duration_sec ?? 0), 0);

  return NextResponse.json({
    calls: rows,
    summary: {
      total: rows.length,
      completed: completed.length,
      averageSeconds: completed.length ? Math.round(totalSec / completed.length) : 0,
      failed: rows.filter((r) => r.status === 'failed' || r.status === 'no_answer').length,
    },
  });
}
