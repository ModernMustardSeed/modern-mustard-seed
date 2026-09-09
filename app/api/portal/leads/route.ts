import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE CLIENT'S OWN LEADS. Scoped by the signed-in email, never by an id.
 * Answers "where do our leads come from" with the last thirty days by source,
 * by starting point, and by page, then every lead in full. Read only: no
 * status lives here for anyone to set.
 */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ leads: [], summary: null });

  let leads: Array<Record<string, unknown>> = [];
  try {
    const { data } = await sb
      .from('client_leads')
      .select('id, source, sources, name, phone, email, town, project_type, land, message, page, referrer_name, referrer_phone, answers, created_at')
      .eq('client_email', session.email)
      .order('created_at', { ascending: false })
      .limit(300);
    leads = (data ?? []) as Array<Record<string, unknown>>;
  } catch {
    /* an un-migrated table must not break the portal */
  }

  const since = Date.now() - 30 * 86_400_000;
  const recent = leads.filter((l) => Date.parse(String(l.created_at)) >= since);
  const tally = (pick: (l: Record<string, unknown>) => string[] | string | null) => {
    const m = new Map<string, number>();
    for (const l of recent) {
      const v = pick(l);
      const keys = Array.isArray(v) ? v : v ? [v] : [];
      for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count }));
  };
  const summary = {
    days: 30,
    total: recent.length,
    bySource: tally((l) => ((l.sources as string[]) ?? []).length ? (l.sources as string[]) : String(l.source ?? '')),
    byLand: tally((l) => (l.land as string | null) ?? 'Not said'),
    byPage: tally((l) => (l.page as string | null) ?? null).slice(0, 8),
    byTown: tally((l) => (l.town as string | null) ?? null).slice(0, 8),
  };

  return NextResponse.json({ leads, summary });
}
