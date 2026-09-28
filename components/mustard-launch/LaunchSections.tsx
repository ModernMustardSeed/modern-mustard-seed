/**
 * MUSTARD LAUNCH landing sections (server components). The interactive hero is
 * LaunchConsole; the tier buttons are LaunchBuyButton (client). Everything sits
 * on the locked MMS pop-art cabin: cream canvas, ink borders, sticker shadows,
 * mustard as the GO color.
 */

import Link from 'next/link';
import { LAUNCH, LAUNCH_PHASES, launchTiers, launchFaq } from '@/data/mustard-launch';
import LaunchBuyButton from './LaunchBuyButton';

function Eyebrow({ children, color = '#ff6f59' }: { children: React.ReactNode; color?: string }) {
  return (
    <p className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color }}>
      {children}
    </p>
  );
}

export function HowItWorks() {
  const steps = [
    { n: '01', t: 'Type your idea', d: 'One line about what you are starting. Mr. Mustard reads it and tailors everything to your exact business.' },
    { n: '02', t: 'Get your Blueprint free', d: 'A real 6-phase launch plan on the spot, with your signature first move and a branded PDF to keep.' },
    { n: '03', t: 'Build it and launch', d: 'Generate your whole Launch Kit, then let the coach walk you mission by mission all the way to open.' },
  ];
  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
      <Eyebrow>How it works</Eyebrow>
      <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-[#0b3b44] mt-2 max-w-2xl">From idea to open, in three moves.</h2>
      <div className="grid md:grid-cols-3 gap-5 mt-10">
        {steps.map((s) => (
          <div key={s.n} className="pop-card p-6">
            <span className="font-mono font-bold text-[#0a7c78] text-sm tracking-[0.15em]">{s.n}</span>
            <h3 className="font-display font-bold text-2xl text-[#0b3b44] mt-2">{s.t}</h3>
            <p className="font-sans text-[#0b3b44]/70 mt-2 text-[15px]">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PhaseRail() {
  return (
    <section className="bg-[#0b3b44] halftone-bg py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <Eyebrow color="#f5b700">The launch sequence</Eyebrow>
        <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-[#fbf5ea] mt-2 max-w-3xl">
          Six phases. A countdown to open. Nothing skipped.
        </h2>
        <p className="font-sans text-[#fbf5ea]/70 mt-3 max-w-2xl">
          Every launch runs the same sequence, tuned to your business. Mr. Mustard arms them one by one and clears you for ignition.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {LAUNCH_PHASES.map((p) => (
            <div key={p.id} className="rounded-xl border-2 border-[#f5b700]/30 bg-white/[0.03] p-5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-[#f5b700] text-[#0b3b44] border-2 border-[#0b3b44] rounded px-2 py-0.5">{p.code}</span>
                <span className="font-mono text-[10px] tracking-[0.14em] text-[#f5b700] uppercase font-bold">{p.system}</span>
              </div>
              <h3 className="font-display font-bold text-xl text-[#fbf5ea] mt-3">{p.title}</h3>
              <p className="font-sans text-[#fbf5ea]/65 mt-1.5 text-sm">{p.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LadderSection() {
  return (
    <section id="ladder" className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24 scroll-mt-20">
      <Eyebrow>The money ladder</Eyebrow>
      <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-[#0b3b44] mt-2">Start free. Go as far as you want.</h2>
      <p className="font-sans text-[#0b3b44]/70 mt-3 max-w-2xl">
        The Blueprint proves it. The Kit builds it. The Room launches it with you. Every tier is capped and honest, no trials, no surprises.
      </p>

      <div className="grid lg:grid-cols-3 gap-5 mt-10 items-start">
        {launchTiers.map((tier) => {
          const featured = tier.featured;
          return (
            <div
              key={tier.slug}
              className={`rounded-2xl border-2 border-[#0b3b44] p-6 sm:p-7 flex flex-col ${
                featured ? 'bg-[#0b3b44] text-[#fbf5ea] shadow-[6px_6px_0_0_#f5b700] lg:-translate-y-3' : 'bg-white text-[#0b3b44] shadow-[6px_6px_0_0_#0b3b44]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-mono text-[10px] font-bold tracking-[0.14em] uppercase ${featured ? 'text-[#ffc933]' : 'text-[#0a7c78]'}`}>
                  {tier.chip}
                </span>
                {featured && <span className="font-mono text-[10px] font-bold tracking-[0.12em] uppercase text-[#0b3b44] bg-[#f5b700] border border-[#0b3b44] rounded px-2 py-0.5">Most popular</span>}
              </div>
              <h3 className="font-display font-extrabold text-2xl mt-3">{tier.name}</h3>
              <div className="font-display font-extrabold text-4xl mt-2">
                {tier.priceUsd === 0 ? 'Free' : `$${tier.priceUsd}`}
                {tier.cadence === 'monthly' && <span className="font-sans text-base font-normal opacity-70">/mo</span>}
                {tier.cadence === 'once' && <span className="font-sans text-sm font-normal opacity-70"> once</span>}
              </div>
              <p className={`font-sans text-sm mt-2 ${featured ? 'text-[#fbf5ea]/80' : 'text-[#0b3b44]/70'}`}>{tier.pitch}</p>
              <ul className="mt-4 space-y-2 flex-1">
                {tier.includes.map((inc, i) => (
                  <li key={i} className="flex gap-2 text-[14px]">
                    <span className="text-[#f5b700] shrink-0">✦</span>
                    <span className={featured ? 'text-[#fbf5ea]/85' : 'text-[#0b3b44]/80'}>{inc}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {tier.slug === 'launch-blueprint' ? (
                  <Link
                    href="#console"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#0b3b44] bg-white text-[#0b3b44] px-6 py-3 font-sans font-bold shadow-[4px_4px_0_0_#0b3b44] transition-transform hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b3b44]"
                  >
                    {tier.cta}
                  </Link>
                ) : (
                  <LaunchBuyButton slug={tier.slug} label={tier.cta} variant={featured ? 'primary' : 'ghost'} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="font-sans text-center text-[#0b3b44]/60 text-sm mt-8 max-w-xl mx-auto">{LAUNCH.guarantee}</p>
    </section>
  );
}

export function ProofSection() {
  return (
    <section className="max-w-5xl mx-auto px-5 sm:px-8 py-16">
      <div className="pop-card-cream p-8 sm:p-12 text-center">
        <Eyebrow color="#0a7c78">Built on a battle-tested launch</Eyebrow>
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#0b3b44] mt-3 max-w-3xl mx-auto">
          The same launch playbook Modern Mustard Seed uses to open real businesses.
        </h2>
        <p className="font-sans text-[#0b3b44]/70 mt-4 max-w-2xl mx-auto">
          Mustard Launch is built on our New Business Launch Checklist, refined across trades, food and retail, wellness, creative, and software. Mr. Mustard just makes it personal, and does the heavy lifting with you.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <Link href="/launch-checklist" className="font-mono text-sm font-bold text-[#0a7c78] underline underline-offset-4">
            See the free checklist →
          </Link>
          <Link href="/work-with-us" className="font-mono text-sm font-bold text-[#0a7c78] underline underline-offset-4">
            Rather have us build it? →
          </Link>
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
      <Eyebrow>Questions</Eyebrow>
      <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#0b3b44] mt-2">Before you ignite.</h2>
      <div className="mt-8 space-y-3">
        {launchFaq.map((f, i) => (
          <details key={i} className="pop-card p-5 group">
            <summary className="font-display font-bold text-lg text-[#0b3b44] cursor-pointer list-none flex items-center justify-between">
              {f.q}
              <span className="font-mono text-[#f5b700] text-xl group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="font-sans text-[#0b3b44]/75 mt-3 text-[15px]">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="bg-[#0b3b44] halftone-bg py-20">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
        <p className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase text-[#f5b700]">{LAUNCH.wordmark}</p>
        <h2 className="font-display font-extrabold text-4xl sm:text-6xl text-[#fbf5ea] mt-3">Launch for real.</h2>
        <p className="font-serif italic text-xl text-[#fbf5ea]/80 mt-2">Not someday. This week.</p>
        <div className="mt-8 flex justify-center">
          <Link
            href="#console"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#0b3b44] bg-[#f5b700] px-7 py-4 font-sans font-bold text-[#0b3b44] shadow-[5px_5px_0_0_#000] transition-transform hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_#000]"
          >
            ▲ Ignite my launch
          </Link>
        </div>
      </div>
    </section>
  );
}
