import Image from 'next/image';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';

/**
 * UNLINKED partner recruitment kit. Not in any nav, footer, or sitemap. It is a
 * private page a prospective partner is sent directly: it explains the Partner
 * Forge, hands over the two recruitment PDFs and the one-page agreement, shows a
 * live example suite, and routes them into the existing /partners apply flow.
 * noindex so it never competes with the public /partners page in search.
 */
export const metadata = buildMetadata({
  title: 'Partner Recruitment Kit',
  description:
    'The Partner Forge, in one place: mint a finished AI demo suite for a business you know, presented under your flag, and earn when they buy.',
  path: '/partners/kit',
  noindex: true,
});

const SHOWCASE = 'https://modernmustardseed.com/demo/hub/6cda89d9-1803-4247-9d00-e58d8938f6a6';

const STEPS = [
  {
    n: '1',
    accent: '#1E50C8',
    t: 'Type in a business you know',
    d: 'Their name, a phone number, and their website or Facebook page. The forge builds only from their real, public information, so you never invent a thing.',
  },
  {
    n: '2',
    accent: '#F5B700',
    t: 'A finished suite appears, under your flag',
    d: 'An AI receptionist that answers as their business, a website designed from scratch, and a command center demo. The hub reads "Presented by you, with Modern Mustard Seed," with your code stamped into every checkout.',
  },
  {
    n: '3',
    accent: '#E0301E',
    t: 'Forward three lines',
    d: 'We email you the link and a short, honest hand-off. They see it real, not as a pitch. If they buy, the commission lands on your ledger automatically. You never touch billing.',
  },
];

const EARN = [
  { rate: '50%', accent: '#1E50C8', label: 'On every product', detail: 'Every playbook and bundle, paid the moment they buy.' },
  { rate: '25%', accent: '#F5B700', label: 'Recurring, monthly', detail: 'A quarter of each AI receptionist invoice, for a full year.' },
  { rate: '10-20%', accent: '#E0301E', label: 'On custom builds', detail: '10% of the project, up to 20% once you are a Producer.' },
];

export default function PartnerKitPage() {
  return (
    <div className="bg-[#FBF6EA] text-[#161616]">
      {/* Hero */}
      <section className="relative px-6 pt-36 pb-16 overflow-hidden halftone-bg">
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-6">
            The Partner Recruitment Kit
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.02] text-[#161616]">
            Forge under<br className="hidden sm:block" /> your flag.
          </h1>
          <p className="mt-7 text-[#3A3733] text-lg font-body font-light max-w-2xl mx-auto leading-relaxed">
            Put a finished AI demo suite, with your name on it, in the hands of a business you already know. Type in one business, a full suite appears under your flag, you forward three lines. When they buy, the commission is yours and it tracks itself.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/partners#apply"
              className="inline-block px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[4px_4px_0_0_#161616] hover:shadow-[6px_6px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              Become a partner
            </Link>
            <a
              href="#downloads"
              className="text-[12px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616]/70 hover:text-[#161616] transition-colors underline underline-offset-4 decoration-[#F5B700] decoration-2"
            >
              Get the kit
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">How it works</span>
          <h2 className="font-display text-4xl font-semibold text-[#161616]">Two minutes of your knowledge, a whole build.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] p-7 flex flex-col">
              <div
                className="w-14 h-14 grid place-items-center rounded-xl border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] mb-5 font-display text-3xl font-bold"
                style={{ background: s.accent, color: s.accent === '#F5B700' ? '#161616' : '#FBF6EA' }}
              >
                {s.n}
              </div>
              <h3 className="font-sans font-bold text-[#161616] text-lg mb-2">{s.t}</h3>
              <p className="text-[#3A3733] font-body text-sm leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you earn, quick strip */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="bg-[#161616] border-2 border-[#161616] rounded-3xl shadow-[6px_6px_0_0_#161616] p-8 md:p-10 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'radial-gradient(#F5B700 1.4px, transparent 1.4px)', backgroundSize: '14px 14px' }}
            aria-hidden
          />
          <div className="relative">
            <span className="text-[10px] uppercase tracking-[0.35em] text-[#F5B700] font-mono font-bold block mb-6 text-center">One structure, the same for everyone</span>
            <div className="grid sm:grid-cols-3 gap-6">
              {EARN.map((e) => (
                <div key={e.label} className="text-center">
                  <div className="font-display text-5xl font-bold leading-none" style={{ color: e.accent }}>{e.rate}</div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[#FBF6EA]/60 font-mono font-bold mt-2 mb-2">{e.label}</div>
                  <p className="text-[#FBF6EA]/80 font-body text-sm leading-relaxed">{e.detail}</p>
                </div>
              ))}
            </div>
            <p className="text-[#FBF6EA]/45 font-body text-[11px] mt-7 text-center leading-relaxed">
              The full math, with honest worked examples, is in the earnings one-pager below. Illustrations only, never income promises.
            </p>
          </div>
        </div>
      </section>

      {/* Downloads */}
      <section id="downloads" className="max-w-5xl mx-auto px-6 pb-16 scroll-mt-24">
        <div className="text-center mb-10">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">The kit</span>
          <h2 className="font-display text-4xl font-semibold text-[#161616]">Everything to bring a partner aboard.</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <a
            href="/downloads/mms-partner-pitch.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] hover:shadow-[7px_7px_0_0_#161616] hover:-translate-y-0.5 transition-all p-7 flex flex-col"
          >
            <span className="text-[9px] uppercase tracking-[0.25em] font-mono font-bold text-[#161616]/40 mb-3">PDF · The pitch</span>
            <h3 className="font-display text-2xl font-semibold text-[#161616] mb-2">Forge Under Your Flag</h3>
            <p className="text-[#3A3733] font-body text-sm leading-relaxed flex-1">
              The four-page partner pitch. What the Partner Forge is, how a mint works, what you earn, the honest guardrails, and how to start.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616]">
              <span className="px-4 py-2 bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] group-hover:-translate-y-0.5 transition-transform">Download pitch</span>
            </span>
          </a>

          <a
            href="/downloads/mms-partner-earnings.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] hover:shadow-[7px_7px_0_0_#161616] hover:-translate-y-0.5 transition-all p-7 flex flex-col"
          >
            <span className="text-[9px] uppercase tracking-[0.25em] font-mono font-bold text-[#161616]/40 mb-3">PDF · The math</span>
            <h3 className="font-display text-2xl font-semibold text-[#161616] mb-2">Earnings one-pager</h3>
            <p className="text-[#3A3733] font-body text-sm leading-relaxed flex-1">
              The real commission structure with honest worked examples: a product sale, a referred AI receptionist, and a custom build, at current prices.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616]">
              <span className="px-4 py-2 bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] group-hover:-translate-y-0.5 transition-transform">Download earnings</span>
            </span>
          </a>
        </div>

        {/* Supporting links */}
        <div className="grid sm:grid-cols-2 gap-5 mt-5">
          <a
            href={SHOWCASE}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#F5B700] border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-transform p-6"
          >
            <span className="text-[9px] uppercase tracking-[0.25em] font-mono font-bold text-[#161616]/60 block mb-2">See one that is live</span>
            <h3 className="font-sans font-bold text-[#161616] text-lg mb-1">A real forged suite</h3>
            <p className="text-[#161616]/75 font-body text-sm leading-relaxed">
              A full suite the forge minted start to finish. Receptionist, website, and command center, all in one hub.
            </p>
          </a>
          <a
            href="/downloads/mms-partner-forge-agreement.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-transform p-6"
          >
            <span className="text-[9px] uppercase tracking-[0.25em] font-mono font-bold text-[#161616]/40 block mb-2">The fine print</span>
            <h3 className="font-sans font-bold text-[#161616] text-lg mb-1">Partner Demo Agreement</h3>
            <p className="text-[#3A3733] font-body text-sm leading-relaxed">
              The whole deal on one page: what the forge does, the honesty rules, what you earn, and the guardrails.
            </p>
          </a>
        </div>
      </section>

      {/* Become a partner CTA */}
      <section className="px-6 py-16 halftone-bg">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border-2 border-[#161616] rounded-3xl shadow-[8px_8px_0_0_#161616] p-8 md:p-12">
            <div className="flex flex-col md:flex-row md:items-center gap-8">
              <div className="shrink-0 mx-auto md:mx-0">
                <Image src="/brand/mascot.png" alt="The Modern Mustard Seed mascot" width={885} height={1180} className="h-36 w-auto" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">Ready when you are</span>
                <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#161616] mb-3">Recommend tools you believe in. Get paid for years.</h2>
                <p className="text-[#3A3733] font-body leading-relaxed mb-6">
                  Sarah reviews every application personally. Approved partners get their link, free access to everything, and their forge lit the same day.
                </p>
                <Link
                  href="/partners#apply"
                  className="inline-block px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[4px_4px_0_0_#161616] hover:shadow-[6px_6px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                >
                  Become a partner
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
