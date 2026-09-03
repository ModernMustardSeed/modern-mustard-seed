import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildMetadata } from '@/lib/seo';
import { getClientSession } from '@/lib/client-auth';
import { getAffiliateByEmail } from '@/lib/affiliate';
import { getPartnerGuide } from '@/lib/partner-guide';
import FieldGuide from '@/components/partners/FieldGuide';

export const metadata = buildMetadata({ title: 'Your Field Guide', path: '/partners/hq/guide', noindex: true });
export const dynamic = 'force-dynamic';

/**
 * The partner's own field guide: where to go, who to talk to, what to say,
 * with the dated events for their territory. Written per partner by Sarah and
 * stored under their code (lib/partner-guide.ts), so this page is the same for
 * every partner and the content is theirs alone.
 */
export default async function PartnerGuidePage() {
  const session = await getClientSession();
  if (!session) redirect('/portal/login');
  const affiliate = await getAffiliateByEmail(session.email);
  if (!affiliate || affiliate.status !== 'approved' || !affiliate.code) redirect('/partners/hq');

  const guide = await getPartnerGuide(affiliate.code);

  return (
    <div className="min-h-screen bg-[#FBF6EA] halftone-bg text-[#161616]">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        <Link href="/partners/hq" className="inline-block mb-8 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] border-b-2 border-[#161616]">← Partner dashboard</Link>
        {guide ? (
          <FieldGuide guide={guide} />
        ) : (
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] p-8">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-2">Field guide</span>
            <h1 className="font-display text-3xl font-semibold mb-3">Yours is being written.</h1>
            <p className="font-body text-[15px] leading-relaxed max-w-xl">Sarah writes one guide per partner: your walk-in routes, the networking rooms worth your time, the dated events with a vendor floor, and the ninety-second script. It lands here the moment it is ready. Until then, the Outreach Playbook has the phone script and the social play.</p>
            <Link href="/partners/playbook" className="inline-block mt-6 px-6 py-2.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform">Open the playbook</Link>
          </div>
        )}
      </div>
    </div>
  );
}
