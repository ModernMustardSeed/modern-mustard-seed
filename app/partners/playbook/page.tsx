import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildMetadata, SITE } from '@/lib/seo';
import { getClientSession } from '@/lib/client-auth';
import { getAffiliateByEmail } from '@/lib/affiliate';
import OutreachPlaybook from '@/components/partners/OutreachPlaybook';

export const metadata = buildMetadata({ title: 'The Outreach Playbook', path: '/partners/playbook', noindex: true });
export const dynamic = 'force-dynamic';

export default async function PlaybookPage() {
  const session = await getClientSession();
  if (!session) redirect('/portal/login');

  const affiliate = await getAffiliateByEmail(session.email);

  if (!affiliate || affiliate.status !== 'approved' || !affiliate.code) {
    return (
      <div className="min-h-screen bg-[#FBF6EA] halftone-bg text-[#161616] flex items-center justify-center px-6">
        <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-10 max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold text-[#161616] mb-3">The Outreach Playbook</h1>
          <p className="text-[#3A3733] font-body text-sm mb-6">
            {affiliate?.status === 'pending'
              ? 'Your application is in. The moment Sarah approves you, your personalized playbook and booking link unlock right here.'
              : `You are signed in as ${session.email}, but this account is not a partner yet.`}
          </p>
          <Link href="/partners" className="inline-block px-7 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all">
            Apply to partner
          </Link>
        </div>
      </div>
    );
  }

  const code = affiliate.code;
  const siteDisplay = SITE.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const bookDisplay = `${siteDisplay}/book?ref=${code}`;
  const bookHref = `${SITE.url.replace(/\/$/, '')}/book?ref=${code}`;
  const firstName = affiliate.name?.split(' ')[0] || 'partner';

  return <OutreachPlaybook code={code} firstName={firstName} bookDisplay={bookDisplay} bookHref={bookHref} />;
}
