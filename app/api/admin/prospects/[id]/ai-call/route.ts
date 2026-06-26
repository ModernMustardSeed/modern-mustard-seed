import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { placeOutboundCall, type OutboundProspect } from '@/lib/outbound-call';

export const runtime = 'nodejs';

/**
 * Have Mr. Mustard (the AI) place an outbound sales call to this prospect.
 * Admin-gated. Compliance guardrails (AI disclosure, do-not-call, calling
 * window) live in placeOutboundCall. On a placed call we mark the prospect
 * "contacted"; the real outcome (booked / not) flows back through the voice
 * webhook + caller memory like any other call.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const { data: row, error } = await supabase.from('rep_prospects').select('*').eq('id', id).maybeSingle();
  if (error || !row) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });

  const prospect: OutboundProspect = {
    id: row.id,
    business: row.business,
    city: row.city ?? null,
    phone: row.phone ?? null,
    notes: row.notes ?? null,
    website: row.website ?? null,
    do_not_call: row.do_not_call ?? false,
  };

  const result = await placeOutboundCall(prospect);

  if (result.ok) {
    // Reflect the attempt in the tracker (outcome updates later via the call).
    await supabase
      .from('rep_prospects')
      .update({ status: 'contacted', updated_at: new Date().toISOString() })
      .eq('id', id);
    return NextResponse.json({ ok: true, callId: result.callId, to: result.to });
  }

  if (result.needsSetup) return NextResponse.json(result, { status: 400 });
  if (result.skipped) return NextResponse.json(result, { status: 200 });
  return NextResponse.json(result, { status: 500 });
}
