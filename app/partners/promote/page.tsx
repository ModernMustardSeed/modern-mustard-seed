import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildMetadata, SITE } from '@/lib/seo';
import { getClientSession } from '@/lib/client-auth';
import { getAffiliateByEmail } from '@/lib/affiliate';
import ProductSwipeKit from '@/components/partners/ProductSwipeKit';

export const metadata = buildMetadata({ title: 'Promo Kit', path: '/partners/promote', noindex: true });
export const dynamic = 'force-dynamic';

export default async function PromoKit() {
  const session = await getClientSession();
  if (!session) redirect('/portal/login');

  const affiliate = await getAffiliateByEmail(session.email);
  if (!affiliate || affiliate.status !== 'approved' || !affiliate.code) {
    return (
      <div className="min-h-screen bg-[#FBF6EA] halftone-bg text-[#161616] flex items-center justify-center px-6">
        <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-10 max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold text-[#161616] mb-3">Promo Kit</h1>
          <p className="text-[#3A3733] font-body text-sm mb-6">
            {affiliate?.status === 'pending'
              ? 'Your application is in. The moment Sarah approves you, your promo kit unlocks with your link already baked in.'
              : `You are signed in as ${session.email}, but this account is not a partner yet.`}
          </p>
          <Link href="/partners" className="inline-block px-7 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all">Apply to partner</Link>
        </div>
      </div>
    );
  }

  const code = affiliate.code;
  const firstName = affiliate.name?.split(' ')[0] || 'partner';

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <header className="border-b-2 border-[#161616] sticky top-0 z-30 bg-[#FBF6EA]/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block">Partner Program</span>
            <h1 className="font-sans text-xl font-bold text-[#161616] tracking-tight mt-1">Your Promo Kit</h1>
          </div>
          <Link href="/partners/hq" className="shrink-0 text-[10px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616]/70 hover:text-[#161616] underline underline-offset-4 decoration-[#F5B700] decoration-2">← Dashboard</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="font-display text-3xl font-semibold text-[#161616] mb-1">Copy, reword, post, {firstName}.</h2>
        <p className="text-[#3A3733] font-body mb-8 max-w-2xl">
          Every offer below comes with ready-to-post copy in the format you need, and your own tracked link is already in it. Reword it in your voice so it sounds like you, keep the honest note that you earn a commission, and you are done.
        </p>
        <ProductSwipeKit code={code} siteUrl={SITE.url} />

        <div className="bg-[#161616] rounded-2xl shadow-[6px_6px_0_0_#F5B700] p-6 mt-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-mono font-bold block mb-2">Want the full field guide?</span>
          <p className="text-[#FBF6EA]/70 font-body text-sm mb-4">Where to find buyers, a phone script, and a daily routine, all pre-filled with your link.</p>
          <Link href="/partners/playbook" className="inline-block px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#F5B700] rounded-full">Open the Outreach Playbook →</Link>
        </div>
      </main>
    </div>
  );
}
