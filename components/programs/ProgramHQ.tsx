import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getClientSession } from '@/lib/client-auth';
import { hasEntitlement, PROGRAM_ASSETS, type ProgramSlug } from '@/lib/entitlements';
import { getProgramBySlug } from '@/data/programs';

/**
 * The gated HQ for a program. Server-checks the buyer's session and entitlement,
 * then serves the live tool (in an iframe so its browser-saved progress works)
 * and the playbook download. Non-buyers never see the materials.
 */
export default async function ProgramHQ({ slug }: { slug: ProgramSlug }) {
  const session = await getClientSession();
  if (!session) redirect(`/portal/login`);

  const entitled = await hasEntitlement(session.email, slug);
  const assets = PROGRAM_ASSETS[slug];
  const program = getProgramBySlug(slug)!;

  if (!entitled) {
    return (
      <div className="min-h-screen bg-[#080c16] text-white flex items-center justify-center px-6">
        <div className="glass-card p-10 max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold text-cream-50 mb-3">{assets.programName} HQ</h1>
          <p className="text-white/55 font-body text-sm mb-6">
            You are signed in as {session.email}, but this account does not have access to {assets.programName} yet.
          </p>
          <Link href={`/${slug}`} className="inline-block px-7 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-cream-50 bg-brass rounded-full">
            Get {assets.programName} . ${program.priceUsd}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c16] text-white">
      <header className="border-b border-white/[0.06] sticky top-0 z-30 bg-[#080c16]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-[0.4em] text-gold-light/80 font-mono font-bold block">{assets.programName} HQ</span>
            <span className="font-sans text-sm text-white/50">{assets.toolName}</span>
          </div>
          <div className="flex items-center gap-3">
            <a href={`/api/programs/download/${slug}`} className="text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-cream-50 bg-brass px-4 py-2 rounded-full hover:shadow-[0_0_20px_rgba(255,107,53,0.4)] transition-all">
              Download playbook
            </a>
            <Link href="/portal" className="text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white/40 hover:text-white/70">Portal</Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-5">
        <p className="text-white/45 font-body text-sm mb-4">
          Start in the setup checklist, then run the first step. Your progress saves in this browser. {assets.programName} stays current, so check back as it grows.
        </p>
        <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-white">
          <iframe
            src={`/api/programs/tool/${slug}`}
            title={`${assets.programName} . ${assets.toolName}`}
            className="w-full"
            style={{ height: '82vh', border: '0' }}
          />
        </div>
        <p className="text-white/35 font-body text-xs mt-4 text-center">
          Would you rather we build it for you? <Link href="/book" className="text-gold-light hover:text-gold-bright underline underline-offset-4">Book a free call.</Link>
        </p>
      </div>
    </div>
  );
}
