import { getSupabase } from '@/lib/supabase';
import { getRun } from '@/lib/sidekick-store';
import { forgeCall } from '@/lib/sidekick';
import { buildMetadata } from '@/lib/seo';
import DemoCallExperience from '@/components/sidekick/DemoCallExperience';

export const metadata = buildMetadata({ title: 'Your AI Receptionist Demo', noindex: true });
export const dynamic = 'force-dynamic';

/**
 * The shareable forged demo: the cockpit forges a run for a lead, this page
 * resurrects it so the prospect can talk to "their" receptionist before the
 * meeting. Unlisted (unguessable run id, noindex); each call is capped
 * platform-side at 4 minutes.
 */
export default async function SidekickDemoPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const sb = getSupabase();
  const run = sb ? await getRun(sb, runId) : null;

  if (!run) {
    return (
      <div className="min-h-screen bg-[#FBF6EA] flex items-center justify-center px-6">
        <div className="max-w-md text-center bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-8">
          <h1 className="font-display text-3xl font-bold text-[#161616]">This demo has moved on</h1>
          <p className="font-body text-[#161616]/70 mt-3">
            We could not find that receptionist demo. Want one built for your business in about 60 seconds?
          </p>
          <a
            href="/sidekick"
            className="inline-block mt-5 bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-xl px-6 py-3 font-sans font-bold uppercase tracking-[0.1em] text-sm shadow-[3px_3px_0_0_#161616]"
          >
            Forge mine now
          </a>
        </div>
      </div>
    );
  }

  const forged = await forgeCall(run, runId, 'web');

  return (
    <DemoCallExperience
      business={run.business}
      city={run.city}
      call={forged.ok ? forged.call : null}
      forgeError={forged.ok ? null : forged.error || 'The demo line is warming up. Try again in a minute.'}
    />
  );
}
