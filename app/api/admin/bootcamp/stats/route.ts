import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { BOOTCAMP } from '@/data/bootcamp';
import { countsByTier, listHosts, type RegistrationTier } from '@/lib/bootcamp/store';
import { outreachSummary } from '@/lib/bootcamp/outreach';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The numbers on the Desk tab: seats and revenue by tier, hosts by status,
 * outreach by status with today's sends against the cap, registrations in
 * the last 24 hours, and the next dated moment on the calendar.
 */
export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  try {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const [counts, hosts, outreach, recent, paid] = await Promise.all([
      countsByTier(sb, BOOTCAMP.launch),
      listHosts(sb),
      outreachSummary(sb),
      sb.from('bootcamp_registrations').select('id', { count: 'exact', head: true }).eq('launch', BOOTCAMP.launch).gte('created_at', since),
      sb.from('bootcamp_registrations').select('tier, amount_cents').eq('launch', BOOTCAMP.launch).gt('amount_cents', 0).limit(20000),
    ]);
    if (recent.error) throw new Error(recent.error.message);
    if (paid.error) throw new Error(paid.error.message);

    const revenueCents: Record<RegistrationTier, number> = { masterclass: 0, ga: 0, vip: 0, platinum: 0, operator: 0 };
    for (const r of (paid.data ?? []) as { tier: RegistrationTier; amount_cents: number }[]) {
      if (revenueCents[r.tier] !== undefined) revenueCents[r.tier] += Number(r.amount_cents) || 0;
    }

    const hostCounts = { applied: 0, approved: 0, live: 0, paused: 0, declined: 0 };
    for (const h of hosts) {
      if (h.status in hostCounts) hostCounts[h.status] += 1;
    }

    const now = Date.now();
    const moments = (Object.entries(BOOTCAMP.dates) as [string, string][])
      .map(([key, at]) => ({ key, at }))
      .filter((m) => new Date(m.at).getTime() > now)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return NextResponse.json({
      ok: true,
      launch: BOOTCAMP.launch,
      counts,
      revenueCents,
      hosts: hostCounts,
      outreach,
      last24h: recent.count ?? 0,
      next: moments[0] ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not load the numbers.' }, { status: 500 });
  }
}
