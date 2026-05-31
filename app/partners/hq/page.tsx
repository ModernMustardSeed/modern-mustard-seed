import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildMetadata, SITE } from '@/lib/seo';
import { getClientSession } from '@/lib/client-auth';
import { getAffiliateByEmail } from '@/lib/affiliate';
import { getSupabase } from '@/lib/supabase';
import AffiliateLinks from '@/components/partners/AffiliateLinks';

export const metadata = buildMetadata({ title: 'Partner Dashboard', path: '/partners/hq', noindex: true });
export const dynamic = 'force-dynamic';

const money = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default async function PartnerHQ() {
  const session = await getClientSession();
  if (!session) redirect('/portal/login');

  const affiliate = await getAffiliateByEmail(session.email);

  if (!affiliate || affiliate.status !== 'approved' || !affiliate.code) {
    return (
      <div className="min-h-screen bg-[#080c16] text-white flex items-center justify-center px-6">
        <div className="glass-card p-10 max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold text-cream-50 mb-3">Partner dashboard</h1>
          <p className="text-white/55 font-body text-sm mb-6">
            {affiliate?.status === 'pending'
              ? 'Your application is in. Sarah reviews every one personally and you will get a warm welcome the moment you are approved.'
              : `You are signed in as ${session.email}, but this account is not a partner yet.`}
          </p>
          <Link href="/partners" className="inline-block px-7 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-cream-50 bg-brass rounded-full">Apply to partner</Link>
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
    { label: 'The Terminal ($497)', url: `${SITE.url}/the-terminal?ref=${code}` },
    { label: 'Idea to Spec ($497)', url: `${SITE.url}/idea-to-spec?ref=${code}` },
    { label: 'The Playbook Store', url: `${SITE.url}/store?ref=${code}` },
    { label: 'Done-for-you builds', url: `${SITE.url}/build-queue?ref=${code}` },
  ];

  const firstName = affiliate.name?.split(' ')[0] || 'partner';

  return (
    <div className="min-h-screen bg-[#080c16] text-white">
      <header className="border-b border-white/[0.06] sticky top-0 z-30 bg-[#080c16]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-medium block">Modern Mustard Seed</span>
            <h1 className="font-sans text-xl font-semibold text-white tracking-tight mt-1">Partner Dashboard</h1>
          </div>
          <span className="font-mono text-mustard-300 text-sm">{code}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="font-display text-3xl font-semibold text-cream-50 mb-1">Welcome, {firstName}.</h2>
        <p className="text-white/55 font-body mb-8">Share what you believe in. We are rooting for you.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Clicks', value: String(clicks) },
            { label: 'Sales', value: String(earn.sales) },
            { label: 'Payable now', value: money(earn.payable) },
            { label: 'Earned all time', value: money(earn.pending + earn.payable + earn.paid) },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4">
              <div className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono">{s.label}</div>
              <div className="font-sans text-2xl font-semibold text-white mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-4">Your links</span>
            <AffiliateLinks links={links} />
            <p className="text-white/35 font-body text-xs mt-4">Add <span className="font-mono text-mustard-300">?ref={code}</span> to any page to track it. Last touch within 60 days wins.</p>
          </div>

          <div className="space-y-6">
            <div className="glass-card p-6">
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-3">Earnings</span>
              <div className="space-y-2.5">
                <Row label="Pending (within refund window)" value={money(earn.pending)} />
                <Row label="Payable (ready to pay out)" value={money(earn.payable)} accent />
                <Row label="Paid" value={money(earn.paid)} />
              </div>
            </div>
            <div className="glass-card p-6">
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-3">Free access</span>
              <p className="text-white/55 font-body text-sm mb-4">You have free access to every product, so you can learn them and speak to them honestly.</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/the-terminal/hq" className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-cream-100 border border-cream-100/25 rounded-full hover:border-cream-100/50">The Terminal HQ</Link>
                <Link href="/idea-to-spec/hq" className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-cream-100 border border-cream-100/25 rounded-full hover:border-cream-100/50">Idea to Spec HQ</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 mt-6">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-3">How you get paid</span>
          <p className="text-white/55 font-body text-sm leading-relaxed">
            You earn 50 percent on every product sale and 10 percent of any build you send our way. A commission becomes payable once the refund window passes. Payouts run on a schedule. One honest rule for everyone. Please always tell your audience you earn a commission. It keeps this trustworthy, which is the whole point.
          </p>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/55 font-body text-sm">{label}</span>
      <span className={`font-mono text-sm font-semibold ${accent ? 'text-emerald-300' : 'text-white/80'}`}>{value}</span>
    </div>
  );
}
