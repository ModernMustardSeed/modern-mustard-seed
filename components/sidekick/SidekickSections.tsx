/**
 * The static story around the Forge: how it works, what he handles (and
 * honestly does not), FAQ, and the cross-links. Server-rendered.
 */

import Link from 'next/link';
import Image from 'next/image';
import { SIDEKICK, sidekickBoundaries, sidekickFaq } from '@/data/sidekick';
import { DEMO_PRODUCTS, formatUsd } from '@/lib/demo-order';

export function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Tell him about your business',
      body: 'Sixty seconds of intake: what you do, what you charge, what customers ask. That is all Mr. Mustard needs to start the drills.',
    },
    {
      n: '02',
      title: 'Watch the forge run',
      body: 'Greeting drills, booking reps, one furious caller for composure. Your Sidekick graduates trained on YOUR business, not a script.',
    },
    {
      n: '03',
      title: 'Talk to him. Live.',
      body: 'He answers in the browser as your front desk, or he calls your cell so you feel exactly what your customers will feel. Then decide if he gets the job.',
    },
  ];
  return (
    <section className="py-16 md:py-24" aria-labelledby="how-heading">
      <div className="max-w-5xl mx-auto px-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold mb-3 text-center">[ How the forge works ]</p>
        <h2 id="how-heading" className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight text-center leading-[1.05]">
          Interview to hired in one visit.
        </h2>
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616]">
              <p className="font-display italic text-4xl font-black text-[#8f6600]" aria-hidden="true">{s.n}</p>
              <h3 className="font-display text-xl font-black text-[#161616] mt-3">{s.title}</h3>
              <p className="font-body text-sm text-[#161616]/70 leading-relaxed mt-2.5">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FreeCommandCenter() {
  const os = DEMO_PRODUCTS.os;
  return (
    <section className="py-16 md:py-24" aria-labelledby="freecc-heading">
      <div className="max-w-5xl mx-auto px-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold mb-3 text-center">[ Comes with a free command center ]</p>
        <h2 id="freecc-heading" className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight text-center leading-[1.05]">
          The calls he catches, on one board. Free.
        </h2>
        <p className="font-body text-[#161616]/70 text-center max-w-2xl mx-auto mt-4 leading-relaxed">
          Every call your Sidekick answers lands transcribed on your Business Command Center, with the caller already
          filed as a lead. That back office is {formatUsd(os.monthlyCents)}/mo on its own, and free with your
          receptionist. Add a website and the whole system runs on one login.
        </p>

        {/* The value, made plain */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border-2 border-[#161616] bg-[#161616] px-6 py-4 shadow-[6px_6px_0_0_#F5B700]">
            <span className="font-display italic font-black text-lg text-[#FBF6EA]">Business Command Center</span>
            <span className="font-mono font-bold text-[15px] text-[#FBF6EA]/45 line-through">{formatUsd(os.monthlyCents)}/mo</span>
            <span className="font-mono font-bold text-[12px] uppercase tracking-[0.12em] text-[#161616] bg-[#F5B700] rounded-full px-3 py-1">Free with your Sidekick</span>
          </div>
        </div>

        {/* Trio cross-links: complete the flagship set. */}
        <div className="grid sm:grid-cols-2 gap-5 mt-10">
          <Link
            href="/command-center"
            className="group flex flex-col rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616] hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#F5B700] transition-all"
          >
            <span className="text-2xl leading-none" aria-hidden="true">⚙</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold text-[#C4160B] mt-2.5">Your free back office</span>
            <h3 className="font-display italic font-black text-xl text-[#161616] mt-1">The Command Center</h3>
            <p className="font-body text-[13px] text-[#161616]/70 mt-2 leading-relaxed flex-1">Every call transcribed, your customers, reviews, and money, on one board wired to your Sidekick.</p>
            <span className="font-sans font-bold text-[11px] uppercase tracking-[0.14em] text-[#161616] mt-4 inline-flex items-center gap-1.5">See it <span className="group-hover:translate-x-1 transition-transform" aria-hidden="true">→</span></span>
          </Link>
          <Link
            href="/websites"
            className="group flex flex-col rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616] hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#F5B700] transition-all"
          >
            <span className="text-2xl leading-none" aria-hidden="true">🌐</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold text-[#C4160B] mt-2.5">Give him a home</span>
            <h3 className="font-display italic font-black text-xl text-[#161616] mt-1">A Website That Works</h3>
            <p className="font-body text-[13px] text-[#161616]/70 mt-2 leading-relaxed flex-1">Your Sidekick answers right on a site built to capture the lead. Website plus receptionist plus the free command center is the whole system.</p>
            <span className="font-sans font-bold text-[11px] uppercase tracking-[0.14em] text-[#161616] mt-4 inline-flex items-center gap-1.5">See it <span className="group-hover:translate-x-1 transition-transform" aria-hidden="true">→</span></span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Boundaries() {
  return (
    <section className="py-16 md:py-24 bg-[#161616]" aria-labelledby="boundaries-heading">
      <div className="max-w-5xl mx-auto px-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#F5B700] font-bold mb-3 text-center">[ The honest part ]</p>
        <h2 id="boundaries-heading" className="font-display text-3xl md:text-5xl font-black text-[#FBF6EA] tracking-tight text-center leading-[1.05]">
          What he handles. What he hands to you.
        </h2>
        <p className="font-body text-[#FBF6EA]/60 text-center max-w-2xl mx-auto mt-4">
          A receptionist who never bluffs is worth more than one who always answers. This table is part of the deal, in writing.
        </p>
        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <div className="rounded-2xl border-2 border-[#F5B700] bg-[#161616] p-7">
            <h3 className="font-mono text-xs uppercase tracking-[0.28em] font-bold text-[#F5B700] mb-5">He handles</h3>
            <ul className="space-y-3">
              {sidekickBoundaries.handles.map((line) => (
                <li key={line} className="flex gap-3 font-body text-[14.5px] text-[#FBF6EA]/85 leading-snug">
                  <span className="text-[#F5B700] font-black" aria-hidden="true">✓</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-[#FBF6EA]/25 bg-[#161616] p-7">
            <h3 className="font-mono text-xs uppercase tracking-[0.28em] font-bold text-[#FBF6EA]/60 mb-5">He routes to you (on purpose)</h3>
            <ul className="space-y-3">
              {sidekickBoundaries.routes.map((line) => (
                <li key={line} className="flex gap-3 font-body text-[14.5px] text-[#FBF6EA]/70 leading-snug">
                  <span className="text-[#FBF6EA]/45 font-black" aria-hidden="true">→</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section className="py-16 md:py-24" aria-labelledby="faq-heading">
      <div className="max-w-3xl mx-auto px-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold mb-3 text-center">[ Asked constantly ]</p>
        <h2 id="faq-heading" className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight text-center leading-[1.05]">
          Fair questions, straight answers.
        </h2>
        <div className="mt-10 space-y-3">
          {sidekickFaq.map((f) => (
            <details key={f.q} className="group rounded-xl border-2 border-[#161616] bg-white shadow-[4px_4px_0_0_#161616] open:shadow-[4px_4px_0_0_#F5B700] transition-shadow">
              <summary className="cursor-pointer list-none px-5 py-4 font-sans font-bold text-[15px] text-[#161616] flex items-center justify-between gap-4">
                {f.q}
                <span className="font-display text-xl text-[#F5B700] group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
              </summary>
              <p className="px-5 pb-5 font-body text-sm text-[#161616]/70 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MeetTheTrainer() {
  return (
    <section className="py-16 md:py-24 bg-white border-y-2 border-[#161616]" aria-labelledby="trainer-heading">
      <div className="max-w-4xl mx-auto px-5 flex flex-col md:flex-row items-center gap-10">
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-2xl bg-[#F5B700] border-2 border-[#161616]" aria-hidden="true" />
          <Image
            src="/brand/mascot.png"
            alt="Mr. Mustard, the AI who trains every Sidekick"
            width={220}
            height={220}
            className="relative rounded-2xl border-2 border-[#161616] bg-[#FBF6EA]"
          />
        </div>
        <div className="text-center md:text-left">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold mb-3">[ The trainer ]</p>
          <h2 id="trainer-heading" className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight leading-[1.05]">
            Every Sidekick trains under Mr. Mustard.
          </h2>
          <p className="font-body text-[#161616]/70 leading-relaxed mt-4">
            He answers Modern Mustard Seed&apos;s own phones, books Sarah&apos;s calendar, and has taken more curveballs than any receptionist in Montana.
            Don&apos;t take our word for it. Interview the trainer himself, day or night, at{' '}
            <a href="tel:+14063121223" className="font-bold text-[#1E50C8] underline underline-offset-2 whitespace-nowrap">{SIDEKICK.phoneLine}</a>.
          </p>
          <p className="font-body text-sm text-[#161616]/70 mt-3">
            Yes, that is a real number. Yes, he answers. Ask him anything, including what his trainees can do for you.
          </p>
        </div>
      </div>
    </section>
  );
}

export function CrossSell() {
  return (
    <section className="py-16 md:py-20">
      {/* The Chief: the natural graduation from an inbound Sidekick to a personal chief of staff. */}
      <div className="max-w-5xl mx-auto px-5 mb-6">
        <div className="rounded-2xl border-2 border-[#161616] bg-[#F5B700] p-7 md:p-9 shadow-[8px_8px_0_0_#161616] flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#161616] font-bold">The other half of Mr. Mustard</p>
            <h3 className="font-display italic text-2xl md:text-3xl font-black text-[#161616] mt-1.5 leading-[1.05]">
              Your Sidekick answers your customers. The Chief works for you.
            </h3>
            <p className="font-body text-sm text-[#161616]/80 mt-2.5 leading-relaxed max-w-2xl">
              Meet his big brother: a personal AI chief of staff who runs your calendar, drafts your email, makes your
              calls, preps your pitches, and wakes you with a verse. Call, text, or type to him any hour. From $597/mo, a
              fraction of a human assistant.
            </p>
          </div>
          <Link
            href="/chief"
            className="shrink-0 self-start md:self-center inline-block border-2 border-[#161616] bg-[#161616] text-[#F5B700] rounded-full px-7 py-4 font-sans font-extrabold text-[11px] uppercase tracking-[0.16em] shadow-[4px_4px_0_0_#FBF6EA] hover:-translate-y-0.5 transition-all"
          >
            Meet The Chief →
          </Link>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-5 grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616]">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-bold">Bigger phones?</p>
          <h3 className="font-display text-xl font-black text-[#161616] mt-1.5">The full custom concierge</h3>
          <p className="font-body text-sm text-[#161616]/70 mt-2 leading-relaxed">
            Franchises and high-volume lines get a fully custom build: your voice, your systems, your integrations. This is the big-league version of what you just met.
          </p>
          <Link href="/voice-agents" className="inline-block mt-4 font-sans font-extrabold text-xs uppercase tracking-[0.18em] text-[#1E50C8] underline underline-offset-4">
            Explore voice agents →
          </Link>
        </div>
        <div className="rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616]">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-bold">Rather build?</p>
          <h3 className="font-display text-xl font-black text-[#161616] mt-1.5">Learn the method in MUSTARD MODE</h3>
          <p className="font-body text-sm text-[#161616]/70 mt-2 leading-relaxed">
            Mr. Mustard also coaches humans. Learn Claude and ship your own tools with the same trainer who forged your Sidekick.
          </p>
          <Link href="/mustard-mode" className="inline-block mt-4 font-sans font-extrabold text-xs uppercase tracking-[0.18em] text-[#1E50C8] underline underline-offset-4">
            [ MUSTARD MODE: ON ] →
          </Link>
        </div>
      </div>
    </section>
  );
}
