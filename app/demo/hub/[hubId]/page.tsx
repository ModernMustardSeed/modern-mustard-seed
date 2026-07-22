import { getSupabase } from '@/lib/supabase';
import { buildMetadata } from '@/lib/seo';
import DemoHub from '@/components/demo/DemoHub';
import { detectTrade } from '@/data/demo-os-trades';
import { recordDemoEvent } from '@/lib/demo-events';
import type { Niche } from '@/lib/outbound';
import { SARAH_WELCOME_READY } from '@/lib/email';

export const metadata = buildMetadata({ title: 'Your Demo Suite', noindex: true });
export const dynamic = 'force-dynamic';

/**
 * The DEMO SUITE HUB: one shareable, adorable front door per lead. Mr.
 * Mustard says hi (video), the three forged demos open from here, and the
 * Recovery Calculator shows what missed calls cost them. Renders live from
 * the lead row (keyed by its own unguessable hub id), so demos forged later
 * appear on their own.
 */
export default async function DemoHubPage({ params }: { params: Promise<{ hubId: string }> }) {
  const { hubId } = await params;
  const sb = getSupabase();

  const fallback = (
    <div className="min-h-screen bg-[#FBF6EA] flex items-center justify-center px-6">
      <div className="max-w-md text-center bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-8">
        <h1 className="font-display text-3xl font-bold text-[#161616]">This suite has moved on</h1>
        <p className="font-body text-[#161616]/70 mt-3">
          We could not find that demo suite. Want one built around your business? That is exactly what we do.
        </p>
        <a
          href="https://modernmustardseed.com"
          className="inline-block mt-5 bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-xl px-6 py-3 font-sans font-bold uppercase tracking-[0.1em] text-sm shadow-[3px_3px_0_0_#161616]"
        >
          Modern Mustard Seed
        </a>
      </div>
    </div>
  );

  if (!sb || !/^[0-9a-f-]{36}$/i.test(hubId)) return fallback;

  const { data: lead } = await sb
    .from('outbound_leads')
    .select('id, business_name, contact_name, niche, notes, website, city, state, demo_url, site_demo_url, site_demo_status, os_demo_url, os_demo_status, affiliate_id, origin, last_seen_at')
    .eq('hub_demo_id', hubId)
    .maybeSingle();
  if (!lead) return fallback;

  // "Presented by {Partner} with Modern Mustard Seed": the minting partner's
  // first name, only while their affiliate row is still approved.
  let presenter: string | null = null;
  if (lead.affiliate_id && lead.origin === 'partner') {
    const { data: aff } = await sb
      .from('affiliates')
      .select('name, status')
      .eq('id', lead.affiliate_id)
      .maybeSingle();
    // Full name, not a first-word split: partner identities can be company
    // names ("Make Our City Pretty" must never render as "Make").
    if (aff?.status === 'approved' && aff.name) presenter = (aff.name as string).trim().slice(0, 60);
  }

  // Telemetry, fail-soft by construction (recordDemoEvent never throws).
  // Throttled on the same presence stamp the beat maintains, so a reload loop
  // on this public URL cannot insert unbounded rows (ship-gate finding).
  const seenRecently = lead.last_seen_at && Date.now() - new Date(lead.last_seen_at).getTime() < 60_000;
  if (!seenRecently) {
    await recordDemoEvent(sb, {
      event: 'hub_viewed',
      leadId: lead.id,
      hubId,
      origin: lead.origin,
      affiliateId: lead.affiliate_id,
    });
    // Bump the fast counter the cockpit reads (atomic; throttled by the same stamp,
    // so a reload loop cannot inflate it). Fire-and-forget: telemetry never blocks.
    try { await sb.rpc('bump_hub_view', { p_lead_id: lead.id }); } catch { /* never block the hub */ }
  }

  // Sarah's personal video for THIS lead, if she attached one from the cockpit
  // (stored at founder/<leadId>.webm in the private booth bucket). Signed fresh
  // each render; when absent, the hub falls back to the generic welcome film.
  let personalVideoUrl: string | null = null;
  {
    const { data: pv } = await sb.storage.from('booth').createSignedUrl(`founder/${lead.id}.webm`, 60 * 60 * 3);
    personalVideoUrl = pv?.signedUrl ?? null;
  }

  const niche = (lead.niche ?? 'other') as Niche;
  const trade = detectTrade([lead.business_name, lead.notes ?? '', lead.website ?? ''].join(' '), niche);

  // Pick the welcome film that matches what is forged: the trifecta when the
  // suite is (mostly) complete, otherwise the single-demo cut. The website
  // film mentions the phone-answering, so it also covers voice+site pairs.
  const hasSite = lead.site_demo_status === 'ready' || lead.site_demo_status === 'queued' || lead.site_demo_status === 'building';
  const hasOs = lead.os_demo_status === 'ready';
  const film = SARAH_WELCOME_READY
    ? 'demo-welcome-sarah'
    : hasSite && hasOs
      ? 'demo-welcome'
      : hasSite
        ? 'demo-welcome-site'
        : hasOs
          ? 'demo-welcome-os'
          : 'demo-welcome-voice';

  return (
    <DemoHub
      hubId={hubId}
      business={lead.business_name}
      ownerFirst={lead.contact_name?.trim().split(/\s+/)[0] ?? null}
      niche={niche}
      trade={trade}
      city={lead.city}
      film={film}
      personalVideoUrl={personalVideoUrl}
      voiceUrl={lead.demo_url}
      siteUrl={lead.site_demo_status === 'ready' ? lead.site_demo_url : null}
      sitePending={lead.site_demo_status === 'queued' || lead.site_demo_status === 'building' ? lead.site_demo_url : null}
      osUrl={lead.os_demo_status === 'ready' ? lead.os_demo_url : null}
      presenter={presenter}
    />
  );
}
