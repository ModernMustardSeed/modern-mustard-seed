import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { buildSiteBrief } from '@/lib/outbound-demo';
import type { OutboundLead } from '@/lib/outbound';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/**
 * THE SIMPLE REBUILD. One button, no prompt: "build this one again."
 *
 * Three things separate it from everything else that touches a demo site:
 *
 *  1. It is NOT the reforge-from-prompt. That one is an EDIT: it preserves the design
 *     and changes only the sentence you typed. This one throws the design away and
 *     rebuilds from scratch on whatever the current design law says, which is the
 *     whole point when the law has moved forward.
 *  2. It re-queues the SAME ROW instead of minting a new one, so the demo URL a
 *     prospect may already be holding keeps working. The old html stays on the row
 *     while the rebuild runs, and /demo/site/[siteId] keeps serving it, so nobody
 *     ever lands on a drafting table for a site that was already finished.
 *  3. It keeps the photography. reuse_photos makes the worker harvest every inlined
 *     photograph out of the current html onto disk first, and the design law treats
 *     those as approved. A dry fal wallet cannot degrade a rebuild any more.
 *
 * worker_only keeps it off the metered API failsafe entirely. This is housekeeping on
 * a site that is already live, so it waits for the Max-plan worker however long that
 * takes and costs nothing.
 */
export async function POST(_req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  const l = lead as OutboundLead;

  if (!l.site_demo_id) {
    return NextResponse.json(
      { error: 'There is no website to rebuild yet. Forge one first.' },
      { status: 400 },
    );
  }

  const { data: site } = await guard.supabase
    .from('outbound_demo_sites')
    .select('id, status, html, kind')
    .eq('id', l.site_demo_id)
    .maybeSingle();

  if (!site) return NextResponse.json({ error: 'That website row is gone. Forge a new one.' }, { status: 404 });
  if (site.status === 'queued' || site.status === 'building') {
    return NextResponse.json({ ok: true, already: true, message: 'That rebuild is already in the queue.' });
  }
  if (!site.html) {
    return NextResponse.json(
      { error: 'That site has never finished a build, so there is nothing to rebuild. Retry the forge instead.' },
      { status: 400 },
    );
  }

  // A prompt-reforge leaves the row as kind 'edit'. A rebuild is never an edit, so put
  // the row back on the directive it belongs on: a paid client's site stays 'rebuild',
  // everything else is a demo build.
  const kind = site.kind === 'rebuild' ? 'rebuild' : 'demo';

  const { error: qErr } = await guard.supabase
    .from('outbound_demo_sites')
    .update({
      status: 'queued',
      kind,
      // Facts move. Rebuild the brief from what we know about them right now rather
      // than replaying whatever the row was first queued with.
      brief: buildSiteBrief(l, l.demo_url ?? null),
      reuse_photos: true,
      worker_only: true,
      worker: null,
      claimed_at: null,
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', site.id);
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  await guard.supabase
    .from('outbound_leads')
    .update({ site_demo_status: 'queued' })
    .eq('id', l.id);

  await guard.supabase.from('messages').insert({
    outbound_lead_id: l.id,
    direction: 'outbound',
    channel: 'note',
    from_addr: 'cockpit',
    to_addr: l.business_name,
    subject: 'Website rebuild queued',
    snippet:
      'Rebuilding their website from scratch on the current design law, keeping the photographs it already has. Same link. Their finished site keeps serving until the new one lands.',
    read: true,
    occurred_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, siteId: site.id });
}
