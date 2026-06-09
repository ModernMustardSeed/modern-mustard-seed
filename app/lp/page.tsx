import Link from 'next/link';
import StaticBackground from '@/components/StaticBackground';
import { buildMetadata } from '@/lib/seo';

/**
 * Dedicated paid-traffic landing page. Single offer, single primary CTA, no
 * competing navigation choices in the body. noindex so it never competes with
 * organic pages or gets crawled as duplicate content. Point Google/Meta ad
 * destination URLs here (add UTMs in the ad platform).
 */
export const metadata = buildMetadata({
  title: 'AI That Pays for Itself in 30 Days',
  description:
    'Custom AI tools, apps, and websites for your business, shipped in 30 days. Start with a free 60-second AI audit. Built with faith, precision, and full-stack execution.',
  path: '/lp',
  noindex: true,
});

const PROOF = [
  { stat: '30 days', label: 'From kickoff to shipped, not a six-month agency slog.' },
  { stat: '60 sec', label: 'Free AI audit returns real opportunities, no call required.' },
  { stat: 'Full-stack', label: 'One operator who designs, builds, and ships. No handoffs.' },
];

const STEPS = [
  {
    n: '01',
    title: 'Run the free audit',
    body: 'Drop your website URL. In 60 seconds you get a ranked list of AI opportunities, ROI estimates, and quick wins specific to your business.',
  },
  {
    n: '02',
    title: 'Book a 30-minute call',
    body: 'No pitch. We talk through the highest-leverage build, what it costs, and whether it is worth doing. You leave with a plan either way.',
  },
  {
    n: '03',
    title: 'Ship in 30 days',
    body: 'The build gets designed, built, and launched in weeks. You own the code and the result. Then we measure what it returned.',
  },
];

export default function LandingPage() {
  return (
    <>
      <StaticBackground />

      <div className="relative pt-32 md:pt-44 pb-24">
        <div className="max-w-4xl mx-auto px-6 md:px-8">
          {/* Hero */}
          <header className="text-center mb-14">
            <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/80 font-mono font-medium mb-6 block">
              Modern Mustard Seed
            </span>
            <h1 className="font-sans text-4xl md:text-6xl font-semibold text-white tracking-tight leading-[1.08] mb-6">
              AI that pays for itself in{' '}
              <span className="text-gradient-mustard">30 days</span>
            </h1>
            <p className="text-white/70 text-base md:text-lg font-body font-light leading-relaxed max-w-2xl mx-auto mb-10">
              Custom AI tools, apps, and websites for your business. Built by one operator who
              designs, builds, and ships the whole thing. Start with a free 60-second audit and
              see exactly where AI moves your numbers.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/audit"
                className="inline-block w-full sm:w-auto px-9 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-white bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 rounded-full shadow-[0_0_30px_rgba(255,107,53,0.3)] hover:shadow-[0_0_44px_rgba(255,107,53,0.5)] hover:-translate-y-0.5 transition-all"
              >
                Run the Bottleneck Breaker
              </Link>
              <Link
                href="/book"
                className="inline-block w-full sm:w-auto px-9 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white/90 border border-white/25 rounded-full hover:border-mustard-500/50 hover:text-white transition-all"
              >
                Book a Discovery Call
              </Link>
            </div>
            <p className="text-white/40 text-xs font-mono mt-5">
              No credit card. No obligation. Wednesdays and Thursdays for calls.
            </p>
          </header>

          {/* Proof bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-20">
            {PROOF.map((p) => (
              <div key={p.stat} className="glass-card p-7 text-center">
                <div className="font-sans text-2xl md:text-3xl font-semibold text-gradient-mustard mb-2">
                  {p.stat}
                </div>
                <p className="text-white/60 text-sm font-body font-light leading-6">{p.label}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <section className="mb-20">
            <h2 className="font-sans text-2xl md:text-3xl font-semibold text-white tracking-tight text-center mb-12">
              How it works
            </h2>
            <div className="space-y-5">
              {STEPS.map((s) => (
                <div key={s.n} className="glass-card p-8 flex gap-6 items-start">
                  <span className="font-mono text-mustard-500/70 text-sm font-bold pt-1">{s.n}</span>
                  <div>
                    <h3 className="font-sans text-lg md:text-xl font-semibold text-white mb-2">
                      {s.title}
                    </h3>
                    <p className="text-white/60 text-sm md:text-base font-body font-light leading-7">
                      {s.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Final CTA */}
          <div className="glass-card p-10 md:p-14 text-center border-mustard-500/25">
            <h2 className="font-sans text-2xl md:text-4xl font-semibold text-white tracking-tight mb-5">
              See what AI can do for your business
            </h2>
            <p className="text-white/65 text-base font-body font-light leading-relaxed max-w-xl mx-auto mb-9">
              The audit is free and takes a minute. If the opportunities are real, the next step is
              a conversation. If they are not, you have lost nothing.
            </p>
            <Link
              href="/audit"
              className="inline-block px-10 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-bold text-white bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 rounded-full shadow-[0_0_30px_rgba(255,107,53,0.3)] hover:shadow-[0_0_44px_rgba(255,107,53,0.5)] hover:-translate-y-0.5 transition-all"
            >
              Start the Free Audit
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
