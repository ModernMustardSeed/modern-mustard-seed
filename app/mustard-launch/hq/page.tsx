import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getClientSession } from '@/lib/client-auth';
import { getLaunchTier, type Blueprint } from '@/lib/mustard-launch';
import { getSupabase } from '@/lib/supabase';
import { getLatestLaunchRun, getLaunchProgress } from '@/lib/mustard-launch-store';
import { buildMetadata } from '@/lib/seo';
import LaunchDeck from '@/components/mustard-launch/LaunchDeck';

export const metadata = buildMetadata({ title: 'Launch Deck', path: '/mustard-launch/hq', noindex: true });
export const dynamic = 'force-dynamic';

export default async function LaunchDeckPage() {
  const session = await getClientSession();
  if (!session) redirect('/portal/login?next=/mustard-launch/hq');

  const tier = await getLaunchTier(session.email);

  if (tier === 'none') {
    return (
      <div className="min-h-screen bg-[#FBF6EA] halftone-bg flex items-center justify-center px-6">
        <div className="pop-card p-10 max-w-md text-center">
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#E0301E] uppercase">[ Access check ]</p>
          <h1 className="font-display italic font-extrabold text-3xl text-[#161616] mt-3">Not cleared for launch yet</h1>
          <p className="font-sans text-sm text-[#161616]/70 mt-3">
            You are signed in as {session.email}, but Mustard Launch is not switched on for this email yet.
          </p>
          <Link
            href="/mustard-launch#ladder"
            className="inline-block mt-6 font-sans font-bold bg-[#F5B700] text-[#161616] border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] px-6 py-3 hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#161616] transition-all"
          >
            Get your Launch Kit
          </Link>
        </div>
      </div>
    );
  }

  const supabase = getSupabase();
  let savedIdea: string | null = null;
  let savedOneLiner: string | null = null;
  let savedBlueprint: Blueprint | null = null;
  let done: Record<string, boolean> = {};
  let launchDate: string | null = null;
  let hasKit = false;
  if (supabase) {
    const [run, prog] = await Promise.all([getLatestLaunchRun(supabase, session.email), getLaunchProgress(supabase, session.email)]);
    savedIdea = run?.idea ?? null;
    savedOneLiner = run?.blueprint?.oneLiner ?? null;
    savedBlueprint = run?.blueprint ?? null;
    done = prog.progress?.done ?? {};
    launchDate = prog.progress?.launchDate ?? null;
    hasKit = Boolean(prog.progress?.kit);
  }

  return (
    <LaunchDeck
      tier={tier}
      email={session.email}
      savedIdea={savedIdea}
      savedOneLiner={savedOneLiner}
      savedBlueprint={savedBlueprint}
      initialDone={done}
      initialLaunchDate={launchDate}
      hasKit={hasKit}
    />
  );
}
