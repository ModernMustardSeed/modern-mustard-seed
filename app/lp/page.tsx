import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';

/**
 * Dedicated paid-traffic landing page. Single offer, single primary CTA, no
 * competing navigation choices in the body. noindex so it never competes with
 * organic pages or gets crawled as duplicate content. Point Google/Meta ad
 * destination URLs here (add UTMs in the ad platform).
 */
export const metadata = buildMetadata({
  title: 'Agentic Systems That Pay for Themselves',
  description:
    'Custom agentic tools, apps, and websites for your business, shipped in weeks, not months. Start with a free 60-second agentic audit. Built with faith, precision, and full-stack execution.',
  path: '/lp',
  noindex: true,
});

const PROOF = [
  { stat: '2-4 weeks', label: 'From kickoff to shipped, not a six-month agency slog.' },
  { stat: '60 sec', label: 'Free agentic audit returns real opportunities, no call required.' },
  { stat: 'Full-stack', label: 'Design, build and ship under one roof. No handoffs.' },
];

const STEPS = [
  {
    n: '01',
    title: 'Run the free audit',
    body: 'Drop your website URL. In 60 seconds you get a ranked list of agentic opportunities, ROI estimates, and quick wins specific to your business.',
  },
  {
    n: '02',
    title: 'Book a 30-minute call',
    body: 'No pitch. We talk through the highest-leverage build, what it costs, and whether it is worth doing. You leave with a plan either way.',
  },
  {
    n: '03',
    title: 'Ship in weeks',
    body: 'The build gets designed, built, and launched in weeks, not months. You own the code and the result. Then we measure what it returned.',
  },
];

export default function LandingPage() {
  return (
    <>
      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-32 md:pt-44 pb-24 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] halftone-bg opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
        <div className="relative max-w-4xl mx-auto px-6 md:px-8">
          {/* Hero */}
          <header className="text-center mb-14">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#B92417] font-mono font-bold mb-6 block">
              Modern Mustard Seed
            </span>
            <h1 className="font-display text-4xl md:text-6xl font-black text-[#161616] tracking-tight leading-[1.05] mb-6">
              Agentic systems that pay for themselves,{' '}
              <span className="italic text-[#B92417]">fast</span>
            </h1>
            <p className="text-[#3a3733] text-base md:text-lg font-body leading-relaxed max-w-2xl mx-auto mb-10">
              Custom agentic tools, apps, and websites for your business. Built by a studio that
              designs, builds, and ships the whole thing. Start with a free 60-second audit and
              see exactly where agentic systems move your numbers.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/audit"
                className="inline-block w-full sm:w-auto px-9 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all text-[#161616] bg-[#F5B700]"
              >
                Run the Bottleneck Breaker
              </Link>
              <Link
                href="/book"
                className="inline-block w-full sm:w-auto px-9 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all text-[#161616] bg-white"
              >
                Book a Discovery Call
              </Link>
            </div>
            <p className="text-[#161616]/60 text-xs font-mono mt-5">
              No credit card. No obligation. Tuesdays through Fridays for calls.
            </p>
          </header>

          {/* Proof bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-20">
            {PROOF.map((p) => (
              <div key={p.stat} className="pop-card-yellow p-7 text-center">
                <div className="font-display text-2xl md:text-3xl font-black text-[#161616] mb-2">
                  {p.stat}
                </div>
                <p className="text-[#161616]/85 text-sm font-body leading-6">{p.label}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <section className="mb-20">
            <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight text-center mb-12">
              How it works
            </h2>
            <div className="space-y-5">
              {STEPS.map((s) => (
                <div key={s.n} className="pop-card p-8 flex gap-6 items-start">
                  <span className="font-display text-2xl text-[#B92417] font-black leading-none pt-0.5">{s.n}</span>
                  <div>
                    <h3 className="font-display text-lg md:text-xl font-black text-[#161616] tracking-tight mb-2">
                      {s.title}
                    </h3>
                    <p className="text-[#3a3733] text-sm md:text-base font-body leading-7">
                      {s.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Final CTA */}
          <div className="relative p-10 md:p-14 text-center rounded-2xl border-2 border-[#161616] bg-[#161616] text-[#FBF6EA] shadow-[6px_6px_0_0_#F5B700] overflow-hidden">
            <div className="pointer-events-none absolute inset-0 halftone-ink" aria-hidden="true" />
            <div className="relative">
            <h2 className="font-display text-2xl md:text-4xl font-black text-[#FBF6EA] tracking-tight mb-5">
              See what agentic systems can do for your business
            </h2>
            <p className="text-[#FBF6EA]/80 text-base font-body leading-relaxed max-w-xl mx-auto mb-9">
              The audit is free and takes a minute. If the opportunities are real, the next step is
              a conversation. If they are not, you have lost nothing.
            </p>
            <Link
              href="/audit"
              className="inline-block px-10 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#FBF6EA] shadow-[4px_4px_0_0_#FBF6EA] hover:-translate-y-0.5 transition-all"
            >
              Start the Free Audit
            </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
