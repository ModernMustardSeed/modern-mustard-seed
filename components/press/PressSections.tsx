/**
 * The story around the Press Run: how the shop works, fresh proofs off the
 * press (real output), FAQ, cross-sells. Server-rendered.
 */

import Link from 'next/link';
import Image from 'next/image';
import { pressFaq } from '@/data/press';

export function HowThePressWorks() {
  const steps = [
    {
      n: '01',
      title: 'Paste it, messy',
      body: 'Your menu, rate sheet, or price list exactly as it lives in your texts and napkins. Typos, half-finished lines, "call for rates," all of it.',
    },
    {
      n: '02',
      title: 'Watch the type get set',
      body: 'Mr. Mustard sorts your sections, straightens your prices (never changes them), and pulls real type. You review every line before anything is final.',
    },
    {
      n: '03',
      title: 'Print it anywhere',
      body: 'The proof is free and yours. We quote the clean print-ready file in the conversation, ready for your local print shop, office printer or online printer.',
    },
  ];
  return (
    <section className="py-16 md:py-24" aria-labelledby="how-heading">
      <div className="max-w-5xl mx-auto px-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#0a7c78] font-bold mb-3 text-center">[ How the shop works ]</p>
        <h2 id="how-heading" className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight text-center leading-[1.05]">
          From napkin to print-ready in a minute.
        </h2>
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border-2 border-[#0b3b44] bg-white p-7 shadow-[6px_6px_0_0_#0b3b44]">
              <p className="font-display italic text-4xl font-black text-[#f5b700]" aria-hidden="true">{s.n}</p>
              <h3 className="font-display text-xl font-black text-[#0b3b44] mt-3">{s.title}</h3>
              <p className="font-body text-sm text-[#0b3b44]/70 leading-relaxed mt-2.5">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Real proofs from real messy lists (the kill-spike output, unretouched). */
export function FreshProofs() {
  const proofs = [
    { src: '/press/sample-diner.png', alt: 'A typeset diner menu proof', label: 'A diner menu, from nine messy lines' },
    { src: '/press/sample-plumber.png', alt: 'A typeset plumbing rate sheet proof', label: 'A plumber’s rate sheet, "call for rates" and all' },
    { src: '/press/sample-salon.png', alt: 'A typeset salon price list proof', label: 'A salon list with four sections and a bridal note' },
  ];
  return (
    <section className="py-16 md:py-24 bg-[#0b3b44]" aria-labelledby="proofs-heading">
      <div className="max-w-5xl mx-auto px-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#f5b700] font-bold mb-3 text-center">[ Fresh off the press ]</p>
        <h2 id="proofs-heading" className="font-display text-3xl md:text-5xl font-black text-[#fbf5ea] tracking-tight text-center leading-[1.05]">
          Real pastes. Real proofs. Zero retouching.
        </h2>
        <p className="font-body text-[#fbf5ea]/60 text-center max-w-2xl mx-auto mt-4">
          Each of these went in as a messy text blob and came off the press exactly like this, prices untouched.
        </p>
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {proofs.map((p) => (
            <figure key={p.src} className="rounded-xl border-2 border-[#f5b700]/60 overflow-hidden bg-[#fbf5ea]">
              <Image src={p.src} alt={p.alt} width={816} height={1056} className="w-full h-auto block" />
              <figcaption className="px-4 py-3 bg-[#0b3b44]">
                <p className="font-body text-xs text-[#fbf5ea]/70">{p.label}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PressFaqSection() {
  return (
    <section className="py-16 md:py-24" aria-labelledby="faq-heading">
      <div className="max-w-3xl mx-auto px-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#0a7c78] font-bold mb-3 text-center">[ Asked at the counter ]</p>
        <h2 id="faq-heading" className="font-display text-3xl md:text-5xl font-black text-[#0b3b44] tracking-tight text-center leading-[1.05]">
          Fair questions, straight answers.
        </h2>
        <div className="mt-10 space-y-3">
          {pressFaq.map((f) => (
            <details key={f.q} className="group rounded-xl border-2 border-[#0b3b44] bg-white shadow-[4px_4px_0_0_#0b3b44] open:shadow-[4px_4px_0_0_#f5b700] transition-shadow">
              <summary className="cursor-pointer list-none px-5 py-4 font-sans font-bold text-[15px] text-[#0b3b44] flex items-center justify-between gap-4">
                {f.q}
                <span className="font-display text-xl text-[#f5b700] group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
              </summary>
              <p className="px-5 pb-5 font-body text-sm text-[#0b3b44]/70 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PressCrossSell() {
  return (
    <section className="py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-5 grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border-2 border-[#0b3b44] bg-white p-7 shadow-[6px_6px_0_0_#0b3b44]">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#0a7c78] font-bold">Same studio, moving pictures</p>
          <h3 className="font-display text-xl font-black text-[#0b3b44] mt-1.5">Your menu deserves a trailer too</h3>
          <p className="font-body text-sm text-[#0b3b44]/70 mt-2 leading-relaxed">
            MUSTARD PICTURES storyboards a commercial for your business on the spot, free, and quotes the finished film with you.
          </p>
          <Link href="/pictures" className="inline-block mt-4 font-sans font-extrabold text-xs uppercase tracking-[0.18em] text-[#0a7c78] underline underline-offset-4">
            Take the free Screen Test →
          </Link>
        </div>
        <div className="rounded-2xl border-2 border-[#0b3b44] bg-white p-7 shadow-[6px_6px_0_0_#0b3b44]">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#0a7c78] font-bold">And the phones?</p>
          <h3 className="font-display text-xl font-black text-[#0b3b44] mt-1.5">The prices are handled. The calls can be too.</h3>
          <p className="font-body text-sm text-[#0b3b44]/70 mt-2 leading-relaxed">
            Mr. Mustard trains a voice agent on your business, free, then it answers your real line 24/7.
          </p>
          <Link href="/demos" className="inline-block mt-4 font-sans font-extrabold text-xs uppercase tracking-[0.18em] text-[#0a7c78] underline underline-offset-4">
            Build yours, free →
          </Link>
        </div>
      </div>
    </section>
  );
}
