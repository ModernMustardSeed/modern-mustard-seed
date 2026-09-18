import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { cleanListing, runRequestedAudit, type AuditRequest } from '@/lib/audit-requests';

export const runtime = 'nodejs';
// The website pillar can wait on the workstation grader for close to three
// minutes. This sits above that wait so a slow grade comes back as an honest
// "still grading" rather than a request the platform killed.
export const maxDuration = 300;

type Params = Promise<{ id: string }>;

/**
 * RUN IT AND SEND IT. The one button on the Audit Desk that does the job.
 *
 * Whatever listing facts are in the body are saved first, so what Sarah typed
 * is exactly what gets graded. Then the presence engine runs, the report is
 * filed, and the requester is emailed the link. A run that has to wait on the
 * website grade says so and sends nothing; pressing Run again collects it.
 */
export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch = cleanListing(body);
  if (body.website && !patch.website) {
    return NextResponse.json({ error: 'That website does not look like a real address.' }, { status: 400 });
  }
  if (Object.keys(patch).length) {
    const { error } = await guard.supabase.from('audit_requests').update(patch).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: request, error } = await guard.supabase.from('audit_requests').select('*').eq('id', id).single();
  if (error || !request) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  if (request.status === 'running' && request.run_at && Date.now() - new Date(request.run_at).getTime() < 4 * 60 * 1000) {
    return NextResponse.json({ error: 'This one is already running. Give it a minute.' }, { status: 409 });
  }

  const outcome = await runRequestedAudit(guard.supabase, request as AuditRequest);
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status });

  const { data: fresh } = await guard.supabase.from('audit_requests').select('*').eq('id', id).single();
  return NextResponse.json({ ok: true, outcome, request: fresh });
}
