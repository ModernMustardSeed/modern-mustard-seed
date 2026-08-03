import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = Promise<{ siteId: string }>;

/**
 * WHERE IS MY WEBSITE, HONESTLY.
 *
 * The waiting screen was a spinner and a promise. A build takes 30 to 40 minutes,
 * measured, and on a busy floor a lead can be fourth in line, so the page told a
 * buyer "within the hour" every twenty seconds for two hours with no way to know
 * whether anything was happening at all. People close the tab.
 *
 * Everything here is a REAL signal. There is no invented progress bar and no
 * fake stage narration: a made-up "designing your hero" would be worse than the
 * spinner, because it is a lie the customer can eventually catch. What we can
 * honestly say is whether the build has started, how many are ahead of it, how
 * long it has been going, and whether the machine that builds it is alive.
 *
 * Public on purpose: the site id is already the unguessable public URL, and this
 * returns strictly less than the page it serves.
 */
export async function GET(_req: Request, { params }: { params: Params }) {
  const { siteId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(siteId)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  const { data: site } = await sb
    .from('outbound_demo_sites')
    .select('id, status, created_at, claimed_at, built_at')
    .eq('id', siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (site.status === 'ready') return NextResponse.json({ state: 'ready' });
  if (site.status === 'failed') return NextResponse.json({ state: 'failed' });

  // How many are genuinely ahead: older, still waiting. A build already claimed
  // by the worker is not "ahead", it IS the one in progress.
  const { count: ahead } = await sb
    .from('outbound_demo_sites')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'queued')
    .lt('created_at', site.created_at);

  const { data: health } = await sb.from('app_state').select('value, updated_at').eq('key', 'forge_worker_health').maybeSingle();
  const value = (health?.value ?? {}) as { state?: string; current?: { id?: string } | null };
  const heartbeatAgeS = health?.updated_at ? Math.round((Date.now() - new Date(health.updated_at).getTime()) / 1000) : null;

  const building = site.status === 'building' || value.current?.id === site.id;
  const startedAt = site.claimed_at ?? site.created_at;
  const elapsedMin = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000));

  return NextResponse.json({
    state: building ? 'building' : 'queued',
    // Position is 1-based and only meaningful while waiting.
    ahead: building ? 0 : (ahead ?? 0),
    elapsedMin,
    // A build measured at 30-40 minutes. Said as a range, because a single
    // number becomes a promise the moment a customer reads it.
    typicalMin: 40,
    // If the heartbeat is stale the machine is down, and pretending otherwise is
    // how a buyer waits all night. The page decides what to say; this just
    // reports the truth.
    workerAlive: heartbeatAgeS !== null && heartbeatAgeS < 300,
    workerState: value.state ?? null,
  });
}
