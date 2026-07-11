import { getSupabase } from '@/lib/supabase';
import { buildMetadata } from '@/lib/seo';
import DemoHub from '@/components/demo/DemoHub';
import type { Niche } from '@/lib/outbound';

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
    .select('business_name, contact_name, niche, city, state, demo_url, site_demo_url, site_demo_status, os_demo_url, os_demo_status')
    .eq('hub_demo_id', hubId)
    .maybeSingle();
  if (!lead) return fallback;

  return (
    <DemoHub
      business={lead.business_name}
      ownerFirst={lead.contact_name?.trim().split(/\s+/)[0] ?? null}
      niche={(lead.niche ?? 'other') as Niche}
      city={lead.city}
      voiceUrl={lead.demo_url}
      siteUrl={lead.site_demo_status === 'ready' ? lead.site_demo_url : null}
      sitePending={lead.site_demo_status === 'queued' || lead.site_demo_status === 'building' ? lead.site_demo_url : null}
      osUrl={lead.os_demo_status === 'ready' ? lead.os_demo_url : null}
    />
  );
}
