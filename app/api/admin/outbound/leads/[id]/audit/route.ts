import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { auditPreferringWorker } from '@/lib/audit-queue';

export const runtime = 'nodejs';
// The model call alone measures 36-43s on real prospect sites, so 60 left no
// room for a slow site to load and the request died as a 504 the rep read as a
// broken button. The engine caps its own fetch phase; this is the outer wall.
export const maxDuration = 120;

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

  // Free local worker first, metered API whenever it is not answering. The rep
  // sees the same thing either way. See lib/audit-queue.ts.
  const outcome = await auditPreferringWorker(guard.supabase, {
    url: targetUrl,
    sourceTable: 'outbound_leads',
    sourceId: id,
  });

  if (outcome.kind === 'error') return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  if (outcome.kind === 'queued') {
    return NextResponse.json(
      { ok: true, queued: true, jobId: outcome.jobId, error: 'Audit is still running. It will appear on this lead in a minute.' },
      { status: 202 },
    );
  }

  const { data: updated, error: updErr } = await guard.supabase
    .from('outbound_leads')
    .update({
      website: targetUrl,
      audit_url: outcome.url,
      audit_score: Math.round(outcome.report.overall_score),
      audit_json: outcome.report,
      audit_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (updErr) return NextResponse.json({ ok: true, url: outcome.url, report: outcome.report, warning: updErr.message });

  return NextResponse.json({ ok: true, url: outcome.url, report: outcome.report, lead: updated, via: outcome.via });
}
