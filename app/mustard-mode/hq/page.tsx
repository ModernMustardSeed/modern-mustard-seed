import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getClientSession } from '@/lib/client-auth';
import { getMustardTier } from '@/lib/mustard-mode';
import { getSupabase } from '@/lib/supabase';
import { buildMetadata } from '@/lib/seo';
import CoachApp from '@/components/mustard-mode/CoachApp';

export const metadata = buildMetadata({ title: 'MUSTARD MODE HQ', path: '/mustard-mode/hq', noindex: true });
export const dynamic = 'force-dynamic';

export default async function MustardModeHQ() {
  const session = await getClientSession();
  if (!session) redirect('/portal/login?next=/mustard-mode/hq');

  const tier = await getMustardTier(session.email);

  if (tier === 'none') {
    return (
      <div className="min-h-screen bg-[#FBF6EA] halftone-bg flex items-center justify-center px-6">
        <div className="pop-card rounded-none p-10 max-w-md text-center">
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#E0301E] uppercase">[ Access check ]</p>
          <h1 className="font-display italic font-extrabold text-3xl text-[#161616] mt-3">No credits on this account yet</h1>
          <p className="font-sans text-sm text-[#161616]/70 mt-3">
            You are signed in as {session.email}, but MUSTARD MODE is not switched on for this email yet.
          </p>
          <Link
            href="/mustard-mode#levels"
            className="inline-block mt-6 font-sans font-bold bg-[#F5B700] text-[#161616] border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] px-6 py-3 hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#161616] transition-all"
          >
            Choose your level
          </Link>
        </div>
      </div>
    );
  }

  // Preload the saved free-play run for coaching continuity.
  let savedRun: string | null = null;
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('mustard_runs')
        .select('ambition')
        .eq('email', session.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      savedRun = (data?.ambition as string | null) ?? null;
    } catch {
      /* optional */
    }
  }

  return <CoachApp tier={tier} email={session.email} savedRun={savedRun} />;
}
