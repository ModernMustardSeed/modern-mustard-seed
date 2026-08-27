import { NextResponse } from 'next/server';
import { requireOutboundAdmin, parseBody } from '@/lib/outbound-server';
import { oppImportSchema } from '@/lib/opps';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Bulk import. Idempotent on the listing URL: a row that already exists is
 * left alone (status, notes and contact survive a re-import), a new one is
 * inserted. Returns how many of each.
 */
export async function POST(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const parsed = await parseBody(req, oppImportSchema);
  if ('error' in parsed) return parsed.error;

  const urls = parsed.data.opps.map((o) => o.url);
  const { data: existing } = await guard.supabase.from('opps').select('url').in('url', urls);
  const have = new Set((existing ?? []).map((r) => r.url));
  const fresh = parsed.data.opps.filter((o) => !have.has(o.url));

  if (fresh.length === 0) return NextResponse.json({ ok: true, inserted: 0, skipped: urls.length });

  const now = new Date().toISOString();
  const { error } = await guard.supabase.from('opps').insert(fresh.map((o) => ({ ...o, last_action_at: now })));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, inserted: fresh.length, skipped: urls.length - fresh.length });
}
