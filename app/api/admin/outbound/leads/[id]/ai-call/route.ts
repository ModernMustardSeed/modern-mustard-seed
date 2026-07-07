import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { placeOutboundCall } from '@/lib/outbound-call';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/**
 * Mr. Mustard calls the lead. The end-of-call webhook logs the full transcript
 * onto this lead's thread via the outboundLeadId metadata. House rule: the AI
 * never dials a number that has not been DNC-scrubbed.
 */
export async function POST(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  if (lead.status === 'dnc') return NextResponse.json({ ok: false, skipped: 'do-not-call', error: 'This business asked not to be called.' });
  if (!lead.dnc_checked) {
    return NextResponse.json({ error: 'Check this number against the DNC registry first (toggle "DNC ok" on the lead), then Mr. Mustard can dial.' }, { status: 400 });
  }

  let domain: string | null = null;
  try {
    if (lead.website) domain = new URL(/^https?:\/\//i.test(lead.website) ? lead.website : `https://${lead.website}`).hostname.replace(/^www\./, '');
  } catch {
    /* keep null */
  }
  const audit = lead.audit_json as { headline?: string; top_three_fixes?: { title: string }[] } | null;

  const result = await placeOutboundCall({
    id: lead.id,
    business: lead.business_name,
    city: lead.city,
    phone: lead.phone,
    notes: lead.notes,
    website: lead.website,
    do_not_call: lead.status === 'dnc',
    auditScore: lead.audit_score,
    auditHeadline: audit?.headline ?? null,
    auditTopFix: audit?.top_three_fixes?.[0]?.title ?? null,
    website_domain: domain,
    metadataKey: 'outboundLeadId',
  });

  if (!result.ok) {
    if (result.needsSetup) return NextResponse.json({ error: result.error }, { status: 400 });
    if (result.skipped) return NextResponse.json({ ok: false, skipped: result.skipped, error: result.error });
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await guard.supabase.from('outbound_leads').update({ status: 'contacted' }).eq('id', id).eq('status', 'new');

  return NextResponse.json({ ok: true, callId: result.callId, to: result.to });
}
