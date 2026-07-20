import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOutboundAdmin, parseBody, outboundRepScope, fetchAllRows } from '@/lib/outbound-server';

export const runtime = 'nodejs';

/**
 * Mint a call batch: a finite, ordered stack of one rep's leads.
 *
 * The dashboard's heat queue answers "who is hottest across the whole floor
 * right now" and is capped at 40. That is the right tool for Sarah working the
 * top of the floor, and the wrong one for a rep who has been handed 400 leads
 * and needs to grind through them without losing their place. This returns a
 * frozen, ordered id list the cockpit steps through.
 *
 * Order is "who most obviously needs us, soonest":
 *   1. callbacks that are due   — a promise we made, always first
 *   2. never-touched new leads  — the point of a fresh assignment
 *   3. contacted, retry due     — cadence, not fresh ground
 * and inside each group, the businesses with no real website lead, because that
 * is the strongest opening we have.
 */

const BATCH_STATUSES = ['new', 'contacted', 'callback'] as const;

const batchInputSchema = z.object({
  rep_id: z.string().uuid(),
  size: z.number().int().min(5).max(200).default(25),
});

type Row = {
  id: string;
  status: string;
  website: string | null;
  next_action_at: string | null;
  created_at: string;
  dnc_checked: boolean;
};

/**
 * How many workable leads each rep is holding, so the batch picker can say
 * "Anthony · 400 ready" instead of making the rep guess.
 */
export async function GET() {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const { scopeRepId, reps } = await outboundRepScope(guard.supabase);
  const { data, error } = await fetchAllRows(() =>
    guard.supabase
      .from('outbound_leads')
      .select('id, status, owner_rep_id, next_action_at, created_at, website, dnc_checked')
      .in('status', BATCH_STATUSES)
      .order('id', { ascending: true }),
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  const rows = (data ?? []) as (Row & { owner_rep_id: string | null })[];
  const counts: Record<string, number> = {};
  for (const l of rows) {
    if (!l.owner_rep_id) continue;
    if (scopeRepId && l.owner_rep_id !== scopeRepId) continue;
    const due = l.next_action_at ? new Date(l.next_action_at).getTime() <= now + 60 * 60000 : false;
    const workable = l.status === 'new' || (l.status === 'callback' && due) || (l.status === 'contacted' && due);
    if (workable) counts[l.owner_rep_id] = (counts[l.owner_rep_id] ?? 0) + 1;
  }

  return NextResponse.json({
    reps: reps.map((r) => ({ id: r.id, name: r.name, ready: counts[r.id] ?? 0 })),
  });
}

export async function POST(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, batchInputSchema);
  if ('error' in parsed) return parsed.error;
  const { rep_id, size } = parsed.data;

  // A 'caller' rep can only ever batch their own leads, whatever they post.
  const { scopeRepId, reps } = await outboundRepScope(guard.supabase);
  const repId = scopeRepId ?? rep_id;
  const rep = reps.find((r) => r.id === repId);
  if (!rep) return NextResponse.json({ error: 'Rep not found' }, { status: 404 });

  const { data, error } = await fetchAllRows(() =>
    guard.supabase
      .from('outbound_leads')
      .select('id, status, website, next_action_at, created_at, dnc_checked')
      .eq('owner_rep_id', repId)
      .in('status', BATCH_STATUSES)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true }),
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  const dueSoon = (t: string | null) => (t ? new Date(t).getTime() <= now + 60 * 60000 : false);
  // A website that is really a Facebook page means there is no real site to
  // compete with — the sourcer already flags these, and they open best.
  const noRealSite = (w: string | null) =>
    !w?.trim() || /facebook\.com|instagram\.com|business\.site|linktr\.ee|yelp\.com/i.test(w);

  const groupOf = (l: Row): number => {
    if (l.status === 'callback') return dueSoon(l.next_action_at) ? 0 : 9; // not-yet-due callbacks sit out
    if (l.status === 'new') return 1;
    return dueSoon(l.next_action_at) ? 2 : 9; // contacted: only when the retry is actually due
  };

  const ordered = ((data ?? []) as Row[])
    .map((l) => ({ l, g: groupOf(l) }))
    .filter((x) => x.g < 9)
    .sort((a, b) => {
      if (a.g !== b.g) return a.g - b.g;
      const sa = noRealSite(a.l.website) ? 0 : 1;
      const sb = noRealSite(b.l.website) ? 0 : 1;
      if (sa !== sb) return sa - sb;
      return a.l.created_at.localeCompare(b.l.created_at);
    })
    .map((x) => x.l);

  const batch = ordered.slice(0, size);

  return NextResponse.json({
    leadIds: batch.map((l) => l.id),
    rep: { id: rep.id, name: rep.name },
    remaining: ordered.length,
    unscrubbed: batch.filter((l) => !l.dnc_checked).length,
  });
}
