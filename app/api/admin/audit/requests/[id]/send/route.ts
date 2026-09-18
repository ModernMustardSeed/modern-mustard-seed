import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { sendRequestedAudit, type AuditRequest } from '@/lib/audit-requests';
import type { PresenceAuditReport } from '@/lib/presence-audit';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

/**
 * Send the finished audit again: a failed first try, or a person who wrote
 * back saying it never arrived. Never re-grades and never re-files. What they
 * get is the report already on their page.
 */
export async function POST(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: request } = await guard.supabase.from('audit_requests').select('*').eq('id', id).single();
  if (!request) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  if (!request.presence_audit_id) return NextResponse.json({ error: 'Run the audit first. There is nothing to send yet.' }, { status: 400 });

  const { data: audit } = await guard.supabase.from('presence_audits').select('report').eq('id', request.presence_audit_id).single();
  if (!audit?.report) return NextResponse.json({ error: 'The finished report could not be found.' }, { status: 404 });

  const res = await sendRequestedAudit(guard.supabase, request as AuditRequest, audit.report as PresenceAuditReport);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });

  const { data: fresh } = await guard.supabase.from('audit_requests').select('*').eq('id', id).single();
  return NextResponse.json({ ok: true, request: fresh });
}
