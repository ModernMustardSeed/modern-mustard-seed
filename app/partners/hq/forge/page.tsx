import { redirect } from 'next/navigation';
import { getClientSession } from '@/lib/client-auth';
import { getAffiliateByEmail } from '@/lib/affiliate';
import { buildMetadata } from '@/lib/seo';
import ForgeMintForm from '@/components/forge/ForgeMintForm';
import Link from 'next/link';

export const metadata = buildMetadata({ title: 'Forge Under Your Flag', noindex: true });
export const dynamic = 'force-dynamic';

/**
 * The partner mint surface: an approved partner with forge access queues a
 * full demo suite for a business they personally know. The suite arrives
 * with "Presented by {Partner}" on the hub and their ref stamped into every
 * checkout, so the commission fires without them touching anything else.
 */
export default async function PartnerForgePage() {
  const session = await getClientSession();
  if (!session) redirect('/portal/login');

  const affiliate = await getAffiliateByEmail(session.email);
  const isPartner = affiliate && affiliate.status === 'approved' && affiliate.code;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <header className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-3xl mx-auto px-6 pt-10 pb-10">
          <Link href="/partners/hq" className="text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#161616]/60 hover:text-[#161616]">
            ← Partner HQ
          </Link>
          <span className="block text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mt-4">Forge under your flag</span>
          <h1 className="font-display text-4xl md:text-5xl font-bold mt-3 leading-tight">
            Know a business that needs this? Forge theirs.
          </h1>
          <p className="font-body text-[#3A3733] mt-4 max-w-xl">
            Two minutes of your knowledge becomes their full demo suite: an AI receptionist answering as their business, a website designed from scratch, and a command center demo. It arrives presented by you, and if they buy, the commission lands on your ledger automatically.
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {!isPartner ? (
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-8 text-center">
            <h2 className="font-display text-2xl font-bold">This forge belongs to partners</h2>
            <p className="font-body text-[#3A3733] mt-3">
              {affiliate?.status === 'pending'
                ? 'Your partner application is in review. You will get an email the moment it clears.'
                : 'Apply to the partner program first; it takes one minute.'}
            </p>
            <Link
              href="/partners"
              className="inline-block mt-5 px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
            >
              About the partner program
            </Link>
          </div>
        ) : (
          <ForgeMintForm endpoint="/api/partners/forge" variant="partner" />
        )}

        <p className="font-body text-xs text-[#161616]/50 mt-8">
          The fine print lives on one page:{' '}
          <a href="/downloads/mms-partner-forge-agreement.pdf" target="_blank" rel="noopener noreferrer" className="text-[#1E50C8] underline underline-offset-2">
            Partner Demo Agreement (PDF)
          </a>
          . Demos carry the Modern Mustard Seed mark, businesses can ask us to take theirs down anytime, and commissions follow the posted schedule.
        </p>
      </main>
    </div>
  );
}
