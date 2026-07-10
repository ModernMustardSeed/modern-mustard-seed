import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { buildMetadata, SITE } from '@/lib/seo';
import { getClientSession } from '@/lib/client-auth';
import { getAffiliateByEmail } from '@/lib/affiliate';
import { getSupabase } from '@/lib/supabase';
import { products } from '@/data/products';
import AffiliateLinks from '@/components/partners/AffiliateLinks';
import MarketingKit from '@/components/partners/MarketingKit';
import HelpGuide from '@/components/HelpGuide';
import { PARTNER_HELP } from '@/lib/help-content';

export const metadata = buildMetadata({ title: 'Partner Dashboard', path: '/partners/hq', noindex: true });
export const dynamic = 'force-dynamic';

const money = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default async function PartnerHQ() {
  const session = await getClientSession();
  if (!session) redirect('/portal/login');

  const affiliate = await getAffiliateByEmail(session.email);

  if (!affiliate || affiliate.status !== 'approved' || !affiliate.code) {
    return (
      <div className="min-h-screen bg-[#FBF6EA] halftone-bg text-[#161616] flex items-center justify-center px-6">
        <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-10 max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold text-[#161616] mb-3">Partner dashboard</h1>
          <p className="text-[#3A3733] font-body text-sm mb-6">
            {affiliate?.status === 'pending'
              ? 'Your application is in. Sarah reviews every one personally and you will get a warm welcome the moment you are approved.'
              : `You are signed in as ${session.email}, but this account is not a partner yet.`}
          </p>
          <Link href="/partners" className="inline-block px-7 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all">Apply to partner</Link>
        </div>
      </div>
    );
  }

  const code = affiliate.code;
  // Numbers.
  const supabase = getSupabase();
  let clicks = 0;
  const earn = { pending: 0, payable: 0, paid: 0, sales: 0 };
  if (supabase) {
    const [{ count }, { data: commissions }] = await Promise.all([
      supabase.from('affiliate_clicks').select('id', { count: 'exact', head: true }).eq('code', code),
      supabase.from('commissions').select('amount_cents, status').eq('affiliate_code', code),
    ]);
    clicks = count ?? 0;
    for (const c of commissions ?? []) {
      if (c.status !== 'clawed_back') earn.sales += 1;
      const cents = Number(c.amount_cents) || 0;
      if (c.status === 'pending') earn.pending += cents;
      else if (c.status === 'payable') earn.payable += cents;
      else if (c.status === 'paid') earn.paid += cents;
    }
  }

  const links = [
    { label: 'The Playbook Store (50% on every sale)', url: `${SITE.url}/store?ref=${code}` },
    { label: 'Hire an AI receptionist (recurring)', url: `${SITE.url}/sidekick?ref=${code}` },
    { label: 'Book a build with Sarah', url: `${SITE.url}/book?ref=${code}` },
    { label: 'Done-for-you builds', url: `${SITE.url}/build-queue?ref=${code}` },
  ];

  const firstName = affiliate.name?.split(' ')[0] || 'partner';

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <header className="border-b-2 border-[#161616] sticky top-0 z-30 bg-[#FBF6EA]/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/brand/mascot.png" alt="" width={885} height={1180} className="h-9 w-auto" priority />
            <div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block">Modern Mustard Seed</span>
              <h1 className="font-sans text-xl font-bold text-[#161616] tracking-tight mt-1">Partner Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HelpGuide guide={PARTNER_HELP} nudge={{ storageKey: 'mms_partner_tour_v1', text: 'New here? See how your dashboard works.' }} />
            <span className="font-mono text-[#E0301E] text-sm">{code}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="font-display text-3xl font-semibold text-[#161616] mb-1">Welcome, {firstName}.</h2>
        <p className="text-[#3A3733] font-body mb-6">Share the playbooks, earn half on every sale, and keep earning every month a business you refer stays on. We are rooting for you.</p>

        {/* The playbook is the main event */}
        <Link href="/partners/playbook" className="block group mb-8">
          <div className="bg-[#161616] rounded-2xl shadow-[6px_6px_0_0_#F5B700] p-6 md:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all group-hover:shadow-[8px_8px_0_0_#F5B700] group-hover:-translate-y-0.5">
            <div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#F5B700] font-mono font-bold block mb-2">Start here</span>
              <h3 className="font-display text-2xl font-semibold text-[#FBF6EA]">The Outreach Playbook</h3>
              <p className="text-[#FBF6EA]/65 font-body text-sm mt-1 max-w-md">Where to find buyers, exactly what to say, a full phone script, and a social strategy. Every script pre-filled with your booking link.</p>
            </div>
            <span className="inline-block self-start sm:self-center px-6 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#F5B700] rounded-full whitespace-nowrap">Open the playbook →</span>
          </div>
        </Link>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Clicks', value: String(clicks) },
            { label: 'Sales', value: String(earn.sales) },
            { label: 'Payable now', value: money(earn.payable) },
            { label: 'Earned all time', value: money(earn.pending + earn.payable + earn.paid) },
          ].map((s) => (
            <div key={s.label} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-4">
              <div className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono">{s.label}</div>
              <div className="font-sans text-2xl font-semibold text-[#161616] mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-4">Your links</span>
            <AffiliateLinks links={links} />
            <p className="text-[#161616]/60 font-body text-xs mt-4">Add <span className="font-mono text-[#E0301E]">?ref={code}</span> to any page to track it. Last touch within 60 days wins.</p>
            <div className="mt-6">
              <MarketingKit code={code} firstName={firstName} siteUrl={SITE.url} primaryUrl={`${SITE.url}/book?ref=${code}`} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-3">Earnings</span>
              <div className="space-y-2.5">
                <Row label="Pending (within refund window)" value={money(earn.pending)} />
                <Row label="Payable (ready to pay out)" value={money(earn.payable)} accent />
                <Row label="Paid" value={money(earn.paid)} />
              </div>
            </div>
            <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-3">Free access to everything</span>
              <p className="text-[#3A3733] font-body text-sm mb-4">Every product is yours, free, so you can learn them and speak to them honestly.</p>
              <div className="mb-4">
                <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono block mb-2">Programs (live tools)</span>
                <div className="flex flex-wrap gap-2">
                  <Link href="/the-terminal/hq" className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all">The Terminal HQ</Link>
                  <Link href="/idea-to-spec/hq" className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all">Idea to Spec HQ</Link>
                </div>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono block mb-2">Playbooks (download)</span>
                <div className="space-y-1">
                  {products.map((p) => (
                    <a key={p.slug} href={`/api/programs/download/${p.slug}`} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#161616]/[0.04] border border-transparent hover:border-[#161616]/15 transition-colors group">
                      <span className="text-[#161616]/80 font-body text-sm group-hover:text-[#161616]">{p.name}</span>
                      <span className="text-[9px] uppercase tracking-[0.2em] text-[#1E50C8] font-mono">PDF ↓</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6 mt-6">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-3">How you get paid</span>
          <div className="space-y-2.5 mb-4">
            <Row label="Every product and bundle you sell" value="50%" accent />
            <Row label="Referred AI receptionist, every month it stays on" value="25% (up to 12 mo)" accent />
            <Row label="Builds and services you send our way" value="10%" />
            <Row label="Builds once you are closing regularly (Producer)" value="up to 20%" />
          </div>
          <p className="text-[#3A3733] font-body text-sm leading-relaxed">
            Products are the easiest place to start: share a playbook, earn half the moment someone buys. The receptionist keeps paying you every month the business stays subscribed. Builds are the biggest single checks, and once you are closing them we move you to Producer rates. A commission becomes payable once the refund window passes, then it goes out on the next payout run. Founding partners keep their original terms. Please always tell people you earn a commission. It keeps this trustworthy, which is the whole point.
          </p>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#3A3733] font-body text-sm min-w-0 pr-3">{label}</span>
      <span className={`font-mono text-sm font-semibold shrink-0 whitespace-nowrap ${accent ? 'text-emerald-700' : 'text-[#161616]/80'}`}>{value}</span>
    </div>
  );
}
