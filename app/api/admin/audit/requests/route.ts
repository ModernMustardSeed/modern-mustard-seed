import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OPEN = ['new', 'running', 'grading', 'failed'];

/**
 * The Audit Desk's queue: every Online Presence Audit somebody asked for.
 *
 * `open` is what still needs Sarah (new, running, still grading, or failed),
 * oldest first so nobody waits longest. `done` is what went out or was
 * declined, newest first, so a resend is one click away without the queue
 * filling up with finished work.
 */
export async function GET(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const view = new URL(req.url).searchParams.get('view') === 'done' ? 'done' : 'open';

  const { data, error } = await guard.supabase
    .from('audit_requests')
    .select('*')
    .in('status', view === 'done' ? ['sent', 'declined'] : OPEN)
    .order('created_at', { ascending: view === 'open' })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count } = await guard.supabase
    .from('audit_requests')
    .select('id', { count: 'exact', head: true })
    .in('status', OPEN);

  return NextResponse.json({ requests: data ?? [], open: count ?? 0 });
}
