import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { forgeLeadVoiceDemo, buildSiteBrief, ensureDemoHub } from '@/lib/outbound-demo';
import type { OutboundLead } from '@/lib/outbound';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/**
 * Queue the lead's demo WEBSITE at the forge. The heavy lifting happens on
 * Sarah's machine: scripts/demo-site-worker.mjs claims the row and runs Claude
 * Code headless on the Max plan (flat subscription cost, never the metered
 * API) to design and build a complete single-file site for the business. The
 * finished page ships at /demo/site/<id> with the lead's forged AI
 * voice agent overlaid as a live call widget, so one link shows them both.
 *
 * This route also forges the VOICE demo first when it is missing, so one
 * click always yields the pair. Idempotent: queued/building/ready runs are
 * returned as-is; a failed run re-queues fresh.
 */
export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  // Sarah's tier picker on the Forge board. 2 = the Wildmere AWARD SITE world,
  // 3 = the JOURNEY site (the Flathead homepage template, 2026-08-07). Tier 1
  // is unwired until Sarah reworks it. Absent means the worker rolls roulette
  // (2 or 3) per build. talkingWebsite makes the talking layer the star of the
  // demo (the tier directives read the flag out of the brief). Both ride as
  // leading lines of the brief (the worker parses them), so no schema change
  // is required; migration 073 adds a real column for whenever migrations run.
  const body = (await req.json().catch(() => ({}))) as { designTier?: unknown; talkingWebsite?: unknown };
  const designTier = body.designTier === 2 || body.designTier === 3 ? body.designTier : null;
  const talkingWebsite = body.talkingWebsite === true;

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  const l = lead as OutboundLead;

  if (l.site_demo_status === 'queued' || l.site_demo_status === 'building') {
    return NextResponse.json({ ok: true, lead: await ensureDemoHub(guard.supabase, l), already: true });
  }
  if (l.site_demo_status === 'ready' && l.site_demo_url) {
    return NextResponse.json({ ok: true, lead: await ensureDemoHub(guard.supabase, l), existing: true });
  }

  // The pair, without hesitation: make sure the voice demo exists first. A
  // Vapi hiccup should not block the website build, so a failure here only
  // means the widget has nothing to resurrect yet (it degrades gracefully).
  let current = l;
  let voiceDemoUrl: string | null = l.demo_url;
  const voice = await forgeLeadVoiceDemo(guard.supabase, l);
  if (voice.ok) {
    current = voice.lead;
    voiceDemoUrl = voice.demoUrl;
  }

  const { data: row, error: insErr } = await guard.supabase
    .from('outbound_demo_sites')
    .insert({
      lead_id: current.id,
      business_name: current.business_name,
      brief:
        (designTier ? `DESIGN TIER: ${designTier}\n` : '') +
        (talkingWebsite ? 'TALKING WEBSITE: yes\n' : '') +
        (designTier || talkingWebsite ? '\n' : '') +
        buildSiteBrief(current, voiceDemoUrl),
      status: 'queued',
    })
    .select('id')
    .single();
  if (insErr || !row) {
    return NextResponse.json({ error: insErr?.message ?? 'Could not queue the website build.' }, { status: 500 });
  }

  const siteUrl = `${SITE.url}/demo/site/${row.id}`;
  const { data: updated, error: updErr } = await guard.supabase
    .from('outbound_leads')
    .update({ site_demo_id: row.id, site_demo_url: siteUrl, site_demo_status: 'queued' })
    .eq('id', current.id)
    .select()
    .single();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await guard.supabase.from('messages').insert({
    outbound_lead_id: current.id,
    direction: 'outbound',
    channel: 'note',
    from_addr: 'cockpit',
    to_addr: current.business_name,
    subject: 'Website demo queued',
    snippet: `The forge is building their demo website. It goes live at ${siteUrl}`,
    read: true,
    occurred_at: new Date().toISOString(),
  });

  // No command center rides along any more (Sarah, 2026-08-22). It is sold on
  // its own and built by hand; the Forge OS button is the only way one appears.
  const withHub = await ensureDemoHub(guard.supabase, updated as OutboundLead);
  return NextResponse.json({ ok: true, lead: withHub });
}
