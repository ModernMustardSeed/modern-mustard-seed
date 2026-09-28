import { NextResponse } from 'next/server';
import { requireOutboundAdmin, parseBody } from '@/lib/outbound-server';
import { callCreateSchema, type CallAudit } from '@/lib/call-prep';

export const runtime = 'nodejs';

/** Every call on the desk, soonest first, each with its audit's score and headline. */
export async function GET() {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const { data, error } = await guard.supabase
    .from('call_prep')
    .select('*')
    .order('call_at', { ascending: true, nullsFirst: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message, calls: [] }, { status: 500 });

  const ids = [...new Set((data ?? []).map((c) => c.audit_id).filter(Boolean))] as string[];
  const audits = new Map<string, CallAudit>();
  if (ids.length) {
    const { data: rows } = await guard.supabase.from('presence_audits').select('id, score, letter, report').in('id', ids);
    for (const a of rows ?? []) {
      const report = (a.report ?? {}) as { headline?: string };
      audits.set(a.id, { id: a.id, score: a.score, letter: a.letter, headline: report.headline ?? null });
    }
  }

  return NextResponse.json({ calls: (data ?? []).map((c) => ({ ...c, audit: c.audit_id ? audits.get(c.audit_id) ?? null : null })) });
}

/** Line up a call. */
export async function POST(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const parsed = await parseBody(req, callCreateSchema);
  if ('error' in parsed) return parsed.error;

  const { data, error } = await guard.supabase.from('call_prep').insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ call: data });
}
