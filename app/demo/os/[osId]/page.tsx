import { getSupabase } from '@/lib/supabase';
import { getRun } from '@/lib/sidekick-store';
import { forgeCall } from '@/lib/sidekick';
import { buildMetadata } from '@/lib/seo';
import type { ForgedCall } from '@/lib/sidekick';
import type { OsDemoConfig } from '@/lib/outbound-demo';
import { themeFromSiteHtml } from '@/lib/site-palette';
import OsDemoApp from '@/components/demo/OsDemoApp';

export const metadata = buildMetadata({ title: 'Your Business Command Center Demo', noindex: true });
export const dynamic = 'force-dynamic';

/**
 * The forged BUSINESS OS demo: one template command center rendered from the
 * per-lead config frozen at forge time. Unlisted (unguessable id, noindex).
 * The lead's forged receptionist rides along as the live call widget.
 */
export default async function OsDemoPage({ params }: { params: Promise<{ osId: string }> }) {
  const { osId } = await params;
  const sb = getSupabase();

  const fallback = (
    <div className="min-h-screen bg-[#FBF6EA] flex items-center justify-center px-6">
      <div className="max-w-md text-center bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-8">
        <h1 className="font-display text-3xl font-bold text-[#161616]">This demo has moved on</h1>
        <p className="font-body text-[#161616]/70 mt-3">
          We could not find that command center demo. Want one built around your business? That is exactly what we do.
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

  if (!sb || !/^[0-9a-f-]{36}$/i.test(osId)) return fallback;

  const { data: demo } = await sb.from('outbound_demo_os').select('id, lead_id, config').eq('id', osId).maybeSingle();
  if (!demo?.config) return fallback;

  // Resurrect the lead's voice demo for the widget.
  let call: ForgedCall | null = null;
  const { data: lead } = await sb.from('outbound_leads').select('demo_run_id, hub_demo_url').eq('id', demo.lead_id).maybeSingle();
  if (lead?.demo_run_id) {
    const run = await getRun(sb, lead.demo_run_id);
    if (run) {
      const forged = await forgeCall(run, lead.demo_run_id, 'web');
      if (forged.ok) call = forged.call;
    }
  }

  // Wear the same clothes as THEIR website, so the suite reads as one product.
  // The site is often still building when they first open this, so the house
  // midnight deck is the fallback and the theme simply improves on reload.
  const { data: site } = await sb
    .from('outbound_demo_sites')
    .select('html')
    .eq('lead_id', demo.lead_id)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const theme = themeFromSiteHtml(site?.html);

  const orderUrl = lead?.hub_demo_url ? `${lead.hub_demo_url}#order` : null;
  return <OsDemoApp osId={demo.id} config={demo.config as OsDemoConfig} call={call} orderUrl={orderUrl} theme={theme} />;
}
