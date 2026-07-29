import Link from 'next/link';
import { Suspense } from 'react';
import { buildMetadata, SITE } from '@/lib/seo';
import { MUSTARD_TREE, treeStages, treeStaff, treeOrgans, treeFaq } from '@/data/mustard-tree';
import GerminationTree from '@/components/mustard-tree/GerminationTree';
import StaffWall from '@/components/mustard-tree/StaffWall';
import WaitlistForm from '@/components/mustard-tree/WaitlistForm';

export const metadata = buildMetadata({
  title: MUSTARD_TREE.metaTitle,
  description: MUSTARD_TREE.metaDescription,
  path: '/mustard-tree',
});

function GoldSeal({ className = '' }: { className?: string }) {
  const ticks = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    return (
      <line
        key={i}
        x1={60 + Math.cos(a) * 44}
        y1={60 + Math.sin(a) * 44}
        x2={60 + Math.cos(a) * 51}
        y2={60 + Math.sin(a) * 51}
        stroke="#161616"
        strokeWidth={2.5}
      />
    );
  });
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className={className}>
      <circle cx="60" cy="60" r="55" fill="#F5B700" stroke="#161616" strokeWidth="4" />
      <circle cx="60" cy="60" r="41" fill="none" stroke="#161616" strokeWidth="2.5" />
      {ticks}
      <ellipse cx="60" cy="63" rx="10" ry="14" fill="#161616" />
      <path d="M60,49 Q66,38 60,28" fill="none" stroke="#161616" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function MustardTreePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'The Mustard Tree by Modern Mustard Seed',
        serviceType: 'AI business generation and operation: plan, brand, store, site, books, and marketing grown from one prompt, run by an AI agent office',
        description: MUSTARD_TREE.metaDescription,
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        areaServed: 'United States (waitlist)',
        url: `${SITE.url}/mustard-tree`,
      },
      {
        '@type': 'FAQPage',
        mainEntity: treeFaq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };

  return (
    <div id="top" className="bg-[#FBF6EA] text-[#161616]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ─── HERO: THE GERMINATION ─── */}
      <section className="relative halftone-bg border-b-2 border-[#161616] overflow-hidden">
        <div className="relative max-w-5xl mx-auto px-5 pt-16 md:pt-24 pb-12 md:pb-16 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold">
            [ {MUSTARD_TREE.eyebrow} ]
          </p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.98] mt-4">
            {MUSTARD_TREE.headline[0]}
            <br />
            {MUSTARD_TREE.headline[1]}
          </h1>
          <p className="font-body text-base md:text-lg text-[#161616]/70 max-w-2xl mx-auto mt-5 leading-relaxed">
            {MUSTARD_TREE.promise}
          </p>

          <GerminationTree className="max-w-3xl mx-auto mt-6 md:mt-8" />

          <p className="font-mono text-sm md:text-base mt-2">
            <span className="text-[#C4160B] font-bold tracking-[0.08em]">PLANTED 11:58 PM</span>{' '}
            <span aria-hidden="true">▸</span> &ldquo;{MUSTARD_TREE.seedExample}&rdquo;
          </p>
          <p className="font-mono text-[11px] md:text-xs uppercase tracking-[0.22em] text-[#161616]/70 mt-4">
            Seed <span className="text-[#8f6600]">→</span> Sprout <span className="text-[#8f6600]">→</span> Sapling{' '}
            <span className="text-[#8f6600]">→</span>{' '}
            <span className="bg-[#161616] text-[#F5B700] px-2 py-1 tracking-[0.22em]">Company</span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <a
              href="#grove"
              className="bg-[#F5B700] text-[#161616] font-bold text-base rounded-full px-8 py-4 border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#161616] transition"
            >
              Claim Your Planting Number
            </a>
            <a href="#how" className="font-bold text-[#1E50C8] underline underline-offset-4">
              or see how it grows
            </a>
          </div>
        </div>
      </section>

      {/* ─── HOW IT GROWS ─── */}
      <section id="how" className="max-w-6xl mx-auto px-5 py-14 md:py-20 scroll-mt-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold text-center">
          [ How It Grows ]
        </p>
        <h2 className="font-display text-3xl md:text-5xl font-black text-center tracking-tight mt-3">
          From one sentence to a running company.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 mt-10">
          {treeStages.map((s, i) => (
            <div key={s.tag} className="bg-white border-2 border-[#161616] shadow-[5px_5px_0_0_#161616] p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] font-bold">
                <span className="text-[#8f6600]">{String(i + 1).padStart(2, '0')}</span>{' '}
                <span className="bg-[#F5B700] border border-[#161616] px-2 py-0.5 ml-1">{s.tag}</span>
              </p>
              <h3 className="font-display text-xl font-black tracking-tight mt-4">{s.title}</h3>
              <p className="font-body text-sm text-[#161616]/70 leading-relaxed mt-2">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── THE STAFF + THE BRANCHES ─── */}
      <section className="border-y-2 border-[#161616] bg-white">
        <div className="max-w-6xl mx-auto px-5 py-14 md:py-20 grid lg:grid-cols-[1fr_1fr] gap-12 lg:gap-16 items-start">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold">
              [ The Office In The Branches ]
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-black tracking-tight mt-3">
              Six agents on staff before sunrise.
            </h2>
            <p className="font-body text-base text-[#161616]/70 mt-4 leading-relaxed max-w-lg">
              Not a chatbot with a to-do list. A coordinated office that plans, designs, builds, sells, and keeps the
              books, reporting to you like a staff, because it is one.
            </p>
            <div className="mt-8">
              <StaffWall />
            </div>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold">
              [ What Grows On The Branches ]
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-black tracking-tight mt-3">
              Everything a business needs to be real.
            </h2>
            <div className="flex flex-col gap-4 mt-8">
              {treeOrgans.map((o) => (
                <div
                  key={o.name}
                  className={`border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] px-5 py-4 flex items-baseline gap-4 ${o.gold ? 'bg-[#F5B700]' : 'bg-[#FBF6EA]'}`}
                >
                  <span className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] whitespace-nowrap">
                    {o.name}
                  </span>
                  <span className="font-body text-sm text-[#161616]/80 leading-snug">{o.body}</span>
                </div>
              ))}
            </div>
            <p className="font-body text-sm text-[#161616]/70 mt-6 leading-relaxed">
              Already running a business? Point The Mustard Tree at it and the office moves in: takeover mode learns
              what you sell, rebuilds what is weak, and takes the busywork.
            </p>
          </div>
        </div>
      </section>

      {/* ─── THE FOUNDING GROVE (waitlist) ─── */}
      <section id="grove" className="relative halftone-bg scroll-mt-24">
        <div className="max-w-3xl mx-auto px-5 py-14 md:py-20">
          <div className="relative bg-white border-4 border-[#161616] outline outline-[3px] outline-[#161616] outline-offset-[7px] shadow-[9px_9px_0_0_#F5B700] px-6 md:px-12 py-10 md:py-12">
            <GoldSeal className="absolute -top-8 -left-6 w-24 h-24 md:w-28 md:h-28 rotate-[-12deg] drop-shadow-[3px_3px_0_rgba(22,22,22,0.9)]" />
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#C4160B] font-bold text-center">
              [ The Founding Grove ]
            </p>
            <h2 className="font-display text-3xl md:text-5xl font-black text-center tracking-tight mt-3">
              {MUSTARD_TREE.grove.headline}
            </h2>
            <p className="font-body text-base text-[#161616]/70 text-center max-w-lg mx-auto mt-4 mb-8">
              {MUSTARD_TREE.grove.sub}
            </p>
            <Suspense fallback={<div className="min-h-[280px]" aria-hidden="true" />}>
              <WaitlistForm />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="max-w-3xl mx-auto px-5 pb-14 md:pb-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold text-center">
          [ Questions, Answered Straight ]
        </p>
        <div className="mt-8 flex flex-col gap-6">
          {treeFaq.map((f) => (
            <div key={f.q} className="border-b-2 border-[#161616]/15 pb-6">
              <h3 className="font-display text-lg md:text-xl font-black tracking-tight">{f.q}</h3>
              <p className="font-body text-sm md:text-base text-[#161616]/70 leading-relaxed mt-2">{f.a}</p>
            </div>
          ))}
        </div>
        <p className="font-body text-sm text-[#161616]/70 text-center mt-10">
          The Mustard Tree is a{' '}
          <Link href="/" className="font-bold text-[#1E50C8] underline underline-offset-4">
            Modern Mustard Seed
          </Link>{' '}
          product, from the studio behind{' '}
          <Link href="/demos" className="font-bold text-[#1E50C8] underline underline-offset-4">
            The Talking Website
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
