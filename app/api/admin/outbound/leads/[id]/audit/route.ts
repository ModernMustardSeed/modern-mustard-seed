import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { runWebsiteAudit } from '@/lib/website-audit';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Params = Promise<{ id: string }>;

/**
 * Run the real website audit for an outbound lead and cache the results on the
 * row, so the cockpit can lead every call with their actual findings.
 */
export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  let bodyUrl: string | null = null;
  try {
    const body = (await req.json()) as { url?: string };
    bodyUrl = typeof body.url === 'string' ? body.url.trim() : null;
  } catch {
    /* empty body is fine */
  }
  const targetUrl = bodyUrl || lead.website;
  if (!targetUrl) return NextResponse.json({ error: 'No website on file. Run "Find site & email" first or add one.' }, { status: 400 });

  const result = await runWebsiteAudit(targetUrl);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const { data: updated, error: updErr } = await guard.supabase
    .from('outbound_leads')
    .update({
      website: targetUrl,
      audit_url: result.url,
      audit_score: Math.round(result.report.overall_score),
      audit_json: result.report,
      audit_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (updErr) return NextResponse.json({ ok: true, url: result.url, report: result.report, warning: updErr.message });

  return NextResponse.json({ ok: true, url: result.url, report: result.report, lead: updated });
}
