import { getSupabase } from '@/lib/supabase';
import { getRun } from '@/lib/sidekick-store';
import { forgeCall } from '@/lib/sidekick';
import { buildMetadata } from '@/lib/seo';
import type { ForgedCall } from '@/lib/sidekick';
import SiteDemoShell from '@/components/demo/SiteDemoShell';
import { possessive } from '@/lib/business-name';
import SiteBuildProgress from '@/components/demo/SiteBuildProgress';

export const metadata = buildMetadata({ title: 'Your New Website Demo', noindex: true });
export const dynamic = 'force-dynamic';

/**
 * The shareable forged demo WEBSITE: the cockpit queues a build, the local
 * demo-site worker (headless Claude Code on the Max plan) writes the HTML back
 * onto the row, and this page serves it full-screen with the lead's forged AI
 * voice agent overlaid as a live call widget. Unlisted (unguessable id,
 * noindex). While the forge is still working, a holding page auto-refreshes.
 */

function Card({ title, body, cta }: { title: string; body: string; cta?: boolean }) {
  return (
    <div className="min-h-screen bg-[#FBF6EA] flex items-center justify-center px-6">
      <div className="max-w-md text-center bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-8">
        <h1 className="font-display text-3xl font-bold text-[#161616]">{title}</h1>
        <p className="font-body text-[#161616]/70 mt-3">{body}</p>
        {cta && (
          <a
            href="https://modernmustardseed.com"
            className="inline-block mt-5 bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-xl px-6 py-3 font-sans font-bold uppercase tracking-[0.1em] text-sm shadow-[3px_3px_0_0_#161616]"
          >
            Modern Mustard Seed
          </a>
        )}
      </div>
    </div>
  );
}

export default async function SiteDemoPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const sb = getSupabase();
  if (!sb || !/^[0-9a-f-]{36}$/i.test(siteId)) {
    return <Card title="This demo has moved on" body="We could not find that website demo." cta />;
  }

  const { data: site } = await sb
    .from('outbound_demo_sites')
    .select('id, lead_id, business_name, status, html')
    .eq('id', siteId)
    .maybeSingle();

  if (!site) {
    return <Card title="This demo has moved on" body="We could not find that website demo. Want one built for your business? That is exactly what we do." cta />;
  }

  // A re-forge in flight must never take a lead's working demo down: if a
  // finished site already exists, keep serving it and let the new build land
  // silently. The drafting-table screen is only for a FIRST build.
  if ((site.status === 'queued' || site.status === 'building') && !site.html) {
    const { data: waitingLead } = await sb
      .from('outbound_leads')
      .select('demo_url, os_demo_url, os_demo_status')
      .eq('id', site.lead_id)
      .maybeSingle();
    return (
      <div className="min-h-screen bg-[#161616] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 mx-auto rounded-full border-4 border-[#F5B700] border-t-transparent animate-spin" />
          <h1 className="font-display text-3xl md:text-4xl font-bold text-[#FBF6EA] mt-8 leading-tight">
            {possessive(site.business_name)} new website is on the drafting table
          </h1>
          <p className="font-body text-[#FBF6EA]/60 mt-3">
            A designer is building a real, working draft from scratch, custom to the business, and then we record a
            walkthrough of the finished suite. Keep this tab open and it will appear here on its own, or close it and
            come back to this same link.
          </p>

          {/* Real state, polled. No invented stages: a fabricated progress story
              is worse than a spinner, because the customer can catch it. */}
          <SiteBuildProgress siteId={site.id} />

          {/* THE BEST USE OF THE WAIT IS THE PRODUCT. Two of their three demos are
              finished and working RIGHT NOW, and this screen used to mention one of
              them and bury the other entirely. */}
          {(waitingLead?.demo_url || waitingLead?.os_demo_url) && (
            <div className="mt-8 pt-6 border-t border-[#FBF6EA]/12">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#FBF6EA]/40">
                Ready for you right now
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-3">
                {waitingLead?.demo_url && (
                  <a
                    href={waitingLead.demo_url}
                    className="bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-xl px-5 py-3 font-sans font-bold uppercase tracking-[0.1em] text-[12px] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
                  >
                    ☎ Call your voice agent
                  </a>
                )}
                {waitingLead?.os_demo_status === 'ready' && waitingLead?.os_demo_url && (
                  <a
                    href={waitingLead.os_demo_url}
                    className="bg-transparent text-[#FBF6EA] border-2 border-[#FBF6EA]/40 rounded-xl px-5 py-3 font-sans font-bold uppercase tracking-[0.1em] text-[12px] hover:border-[#FBF6EA] transition-colors"
                  >
                    ⚙ Open your command center
                  </a>
                )}
              </div>
            </div>
          )}

          <p className="font-mono text-[11px] text-[#FBF6EA]/35 mt-8">Modern Mustard Seed · Kalispell MT</p>
        </div>
      </div>
    );
  }

  // No html at all (first build failed): the snag card. If an OLD site exists,
  // serve it no matter what state a newer build is in.
  if (!site.html) {
    return <Card title="This demo needs a re-forge" body="The build hit a snag. Ask us to forge it again and we will have it back to you within the hour." cta />;
  }

  // Resurrect the lead's voice demo for the overlay widget.
  let call: ForgedCall | null = null;
  const { data: lead } = await sb
    .from('outbound_leads')
    .select('demo_run_id, business_name, city, hub_demo_url')
    .eq('id', site.lead_id)
    .maybeSingle();
  if (lead?.demo_run_id) {
    const run = await getRun(sb, lead.demo_run_id);
    if (run) {
      const forged = await forgeCall(run, lead.demo_run_id, 'web');
      if (forged.ok) call = forged.call;
    }
  }

  const orderUrl = lead?.hub_demo_url ? `${lead.hub_demo_url}#order` : null;
  return <SiteDemoShell siteId={site.id} business={site.business_name} call={call} orderUrl={orderUrl} />;
}
