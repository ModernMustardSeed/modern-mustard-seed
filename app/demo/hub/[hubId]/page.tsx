import { getSupabase } from '@/lib/supabase';
import { buildMetadata } from '@/lib/seo';
import DemoHub from '@/components/demo/DemoHub';
import { leadTrade } from '@/lib/outbound-demo';
import { recordDemoEvent } from '@/lib/demo-events';
import type { Niche } from '@/lib/outbound';

// Titled for the one-piece case as well as the suite: a caller who asked for a
// voice agent should not find a browser tab calling it a suite.
export const metadata = buildMetadata({ title: 'Your demo from Modern Mustard Seed', noindex: true });
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
    .select('id, business_name, contact_name, niche, notes, website, city, state, demo_url, demo_run_id, site_demo_url, site_demo_status, os_demo_url, os_demo_status, integration_plan_id, integration_plan_url, integration_plan_status, suite_film_status, suite_film_path, affiliate_id, origin, last_seen_at')
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
  // each render; when absent, DemoHub falls through to the suite-film waiting
  // card rather than any stand-in video.
  let personalVideoUrl: string | null = null;
  {
    const { data: pv } = await sb.storage.from('booth').createSignedUrl(`founder/${lead.id}.webm`, 60 * 60 * 3);
    personalVideoUrl = pv?.signedUrl ?? null;
  }

  // THEIR OWN suite film: a fresh recording of this lead's website, a live call
  // with this lead's voice agent, and this lead's command center, cut by
  // scripts/suite-film/build.mjs as the last step of the forge. It outranks
  // everything else, because a house film about somebody else's business is
  // exactly what this replaced (Sarah, 2026-08-01).
  let suiteFilmUrl: string | null = null;
  let suiteFilmPoster: string | null = null;
  if (lead.suite_film_status === 'ready' && lead.suite_film_path) {
    const [film, poster] = await Promise.all([
      sb.storage.from('booth').createSignedUrl(lead.suite_film_path, 60 * 60 * 3),
      sb.storage.from('booth').createSignedUrl(lead.suite_film_path.replace(/\.mp4$/, '.jpg'), 60 * 60 * 3),
    ]);
    suiteFilmUrl = film.data?.signedUrl ?? null;
    suiteFilmPoster = poster.data?.signedUrl ?? null;
  }

  // What the research noticed about THIS business, surfaced on the calculator
  // so the numbers start as theirs, not a stranger's. The GAP line in lead
  // notes is walk-in research: keep only the factual sentences (anything that
  // reads like our sales plan stays internal), and only when enough survives
  // to stand alone.
  const gapRaw = /^GAP:\s*(.+)$/m.exec((lead.notes as string) ?? '')?.[1] ?? null;
  const noticedLine = (() => {
    if (!gapRaw) return null;
    const kept = gapRaw
      .split(/(?<=[.;])\s+/)
      .filter((s) => !/voice|agent|pitch|demo|sale|textbook|lead with|walk-in|forge/i.test(s))
      .join(' ')
      .trim()
      .replace(/[;,]$/, '');
    return kept.length >= 30 ? kept : null;
  })();
  // Weekend-dark businesses start the slider closer to their reality.
  const missedPreset = /closed (both )?weekend|closed sat|closed sun|after-hours|every evening|nights and weekends/i.test((lead.notes as string) ?? '') ? 11 : null;

  // One sharp line from their finished Integration Plan, quoted on its door so
  // the suite and the plan sell each other. Fail-soft to the generic copy.
  let planQuote: string | null = null;
  if (lead.integration_plan_status === 'ready' && lead.integration_plan_id) {
    const { data: plan } = await sb.from('integration_plans').select('html').eq('id', lead.integration_plan_id).maybeSingle();
    if (plan?.html) {
      const text = (plan.html as string)
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        // Headings carry no periods, so closing a block ends the sentence too;
        // without this the quote glues a heading onto the next line.
        .replace(/<\/(p|h[1-6]|li|div|section|td|th)>/gi, '. ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\.\s*\./g, '.')
        .replace(/&[a-z#0-9]+;/gi, ' ')
        .replace(/\s+/g, ' ');
      const sentence = text
        .split(/(?<=[.!?])\s+/)
        .find((s) => /\d/.test(s) && /hour|open|closed|week|call|review|answer/i.test(s) && s.length >= 40 && s.length <= 200);
      if (sentence) planQuote = sentence.trim();
    }
  }

  const niche = (lead.niche ?? 'other') as Niche;
  // Through leadTrade, never a hand-rolled detectTrade call: this page hand-built
  // the same corpus join and so quietly skipped the business-name precedence the
  // forge uses, which is how the hub calculator can price a different trade than
  // the voice agent and command center were forged for.
  const trade = leadTrade(lead);

  return (
    <DemoHub
      hubId={hubId}
      business={lead.business_name}
      ownerFirst={lead.contact_name?.trim().split(/\s+/)[0] ?? null}
      niche={niche}
      trade={trade}
      personalVideoUrl={personalVideoUrl}
      suiteFilmUrl={suiteFilmUrl}
      suiteFilmPoster={suiteFilmPoster}
      // Sarah, 2026-08-01 and again 2026-08-11 (on the Black Knight cut still
      // showing the Wills Electric reel): the hub must NEVER play stock/house
      // footage in this slot, full stop, not even under an honest caption. So
      // this is the raw status, not a collapsed boolean: DemoHub shows THEIR
      // film when it exists, otherwise an honest waiting state, and only
      // promises an ETA while a cut is actually in flight (queued/filming).
      // failed/null gets the same waiting card with no ETA, never the reel.
      suiteFilmStatus={lead.suite_film_status ?? null}
      voiceUrl={lead.demo_url}
      siteUrl={lead.site_demo_status === 'ready' ? lead.site_demo_url : null}
      sitePending={lead.site_demo_status === 'queued' || lead.site_demo_status === 'building' ? lead.site_demo_url : null}
      osUrl={lead.os_demo_status === 'ready' ? lead.os_demo_url : null}
      integrationPlanUrl={lead.integration_plan_status === 'ready' ? lead.integration_plan_url : null}
      planQuote={planQuote}
      demoRunId={lead.demo_run_id}
      noticedLine={noticedLine}
      missedPreset={missedPreset}
      presenter={presenter}
    />
  );
}
