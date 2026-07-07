/**
 * The story around the Screen Test: how the studio works, the reel of films
 * this pipeline actually shipped (the proof), FAQ, cross-sells. Server-rendered.
 */

import Link from 'next/link';
import Image from 'next/image';
import { picturesFaq } from '@/data/pictures';

export function HowTheStudioWorks() {
  const steps = [
    {
      n: '01',
      title: 'The Screen Test (free)',
      body: 'Tell Mr. Mustard your story. He writes your logline, a six-shot storyboard, and three taglines on the spot, then paints the hero frame of your film.',
    },
    {
      n: '02',
      title: 'Roll film',
      body: 'Pick your tier and the studio shoots from your approved treatment: your trade, your town, your colors. No stock footage exists in this building.',
    },
    {
      n: '03',
      title: 'Opening night',
      body: 'Sarah reviews every frame by hand, then the cuts land in your inbox: widescreen, vertical, and square, captioned, scored, and ready to run anywhere.',
    },
  ];
  return (
    <section className="py-16 md:py-24" aria-labelledby="how-heading">
      <div className="max-w-5xl mx-auto px-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-3 text-center">[ How the studio works ]</p>
        <h2 id="how-heading" className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight text-center leading-[1.05]">
          Screen test to opening night in days.
        </h2>
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616]">
              <p className="font-display italic text-4xl font-black text-[#F5B700]" aria-hidden="true">{s.n}</p>
              <h3 className="font-display text-xl font-black text-[#161616] mt-3">{s.title}</h3>
              <p className="font-body text-sm text-[#161616]/70 leading-relaxed mt-2.5">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The proof: films this exact studio pipeline shipped for our own brand. */
export function TheReel() {
  const films = [
    { src: '/video/night-shift-16x9.mp4', title: 'Night Shift', note: 'The one that started the studio.' },
    { src: '/ads/sidekick-16x9.mp4', title: 'The Graduate', note: 'Two characters, one diploma.' },
    { src: '/video/mustard-mode-16x9.mp4', title: 'Mustard Mode', note: 'The arcade spot.' },
  ];
  return (
    <section className="py-16 md:py-24 bg-[#161616]" aria-labelledby="reel-heading">
      <div className="max-w-5xl mx-auto px-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#F5B700] font-bold mb-3 text-center">[ The studio reel ]</p>
        <h2 id="reel-heading" className="font-display text-3xl md:text-5xl font-black text-[#FBF6EA] tracking-tight text-center leading-[1.05]">
          Watch what this studio ships.
        </h2>
        <p className="font-body text-[#FBF6EA]/60 text-center max-w-2xl mx-auto mt-4">
          These are our own commercials, made on the exact pipeline that will make yours. We eat here too.
        </p>
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {films.map((f) => (
            <figure key={f.src} className="rounded-2xl border-2 border-[#F5B700]/60 overflow-hidden bg-black">
              <video controls preload="metadata" className="w-full block" src={f.src} />
              <figcaption className="px-4 py-3 bg-[#161616]">
                <p className="font-display text-base font-black text-[#FBF6EA]">{f.title}</p>
                <p className="font-body text-xs text-[#FBF6EA]/55">{f.note}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PicturesFaqSection() {
  return (
    <section className="py-16 md:py-24" aria-labelledby="faq-heading">
      <div className="max-w-3xl mx-auto px-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-3 text-center">[ Asked at every premiere ]</p>
        <h2 id="faq-heading" className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight text-center leading-[1.05]">
          Fair questions, straight answers.
        </h2>
        <div className="mt-10 space-y-3">
          {picturesFaq.map((f) => (
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

export function StudioCrossSell() {
  return (
    <section className="py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-5 grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616]">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-bold">The other star</p>
          <h3 className="font-display text-xl font-black text-[#161616] mt-1.5">Your ad brings the calls. He answers them.</h3>
          <p className="font-body text-sm text-[#161616]/70 mt-2 leading-relaxed">
            Mr. Mustard also trains AI receptionists. Forge one for your business free, hear it answer as YOUR front desk, and never miss the customers your new commercial sends.
          </p>
          <Link href="/sidekick" className="inline-block mt-4 font-sans font-extrabold text-xs uppercase tracking-[0.18em] text-[#1E50C8] underline underline-offset-4">
            The Sidekick Forge →
          </Link>
        </div>
        <div className="rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616]">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-bold">Bigger picture?</p>
          <h3 className="font-display text-xl font-black text-[#161616] mt-1.5">A whole presence, built for you</h3>
          <p className="font-body text-sm text-[#161616]/70 mt-2 leading-relaxed">
            Sites, stores, funnels, and AI systems, shipped in weeks by the studio that makes its own commercials. Fixed quote before work starts.
          </p>
          <Link href="/work-with-us" className="inline-block mt-4 font-sans font-extrabold text-xs uppercase tracking-[0.18em] text-[#1E50C8] underline underline-offset-4">
            Work with the studio →
          </Link>
        </div>
      </div>
    </section>
  );
}
