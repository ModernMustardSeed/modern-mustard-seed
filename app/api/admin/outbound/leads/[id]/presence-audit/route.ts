import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { runPresenceAudit } from '@/lib/presence-audit';

export const runtime = 'nodejs';
// The website pillar can wait on the audit worker, which takes 50 to 90s. This
// has to sit above that wait or the platform kills the request and the rep gets
// nothing at all, which is worse than a slow answer.
export const maxDuration = 120;

type Params = Promise<{ id: string }>;

/**
 * Run this lead's PRESENCE AUDIT: website, Google Business Profile, reviews.
 *
 * `force` re-grades the website even when the cached grade is fresh. Without it
 * a site nobody has touched in a week is not re-read, because burning a model
 * call to print the same number is how a free deliverable stops being free.
 */
export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as { force?: boolean };

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const res = await runPresenceAudit(guard.supabase, lead as Record<string, unknown>, {
    force: Boolean(body.force),
    // Leave headroom under maxDuration so a slow worker returns an honest
    // partial audit rather than a killed request.
    waitMs: 95_000,
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });

  await guard.supabase.from('messages').insert({
    outbound_lead_id: id,
    direction: 'outbound',
    channel: 'note',
    from_addr: 'cockpit',
    to_addr: (lead as { business_name: string }).business_name,
    subject: `Presence Audit: ${res.score}/100`,
    snippet: `Website, Google profile and reviews graded. Report at ${res.auditUrl}`,
    read: true,
    occurred_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, auditId: res.auditId, auditUrl: res.auditUrl, score: res.score });
}
