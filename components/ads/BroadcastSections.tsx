/**
 * Server sections for /ads: the Timberline confession (the proof device),
 * how it works, the FAQ, and the closing CTA band.
 */

/* eslint-disable @next/next/no-img-element */

import Reveal from '@/components/mustard-mode/Reveal';
import { broadcastFaq } from '@/data/ads';

const FILM_STRIP = [
  { src: '/ads/broadcast-demo-poster.jpg', caption: 'SHOT 01 · THE NAME IN THE GRASS' },
  { src: '/ads/broadcast-demo-still-2.jpg', caption: 'SHOT 02 · THE WORK, UP CLOSE' },
  { src: '/ads/broadcast-demo-still-3.jpg', caption: 'SHOT 03 · THE PAYOFF AT DUSK' },
  { src: '/ads/broadcast-demo-still-4.jpg', caption: 'SHOT 04 · THE END CARD' },
];

export function TimberlineConfession() {
  return (
    <section className="py-16 md:py-24 bg-[#FBF6EA] border-b-2 border-[#161616]">
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
          <div>
            <Reveal variant="eyebrow">
              <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-4">[ FULL DISCLOSURE ]</p>
            </Reveal>
            <Reveal variant="slam">
              <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.05]">
                None of these
                <br /> companies exist.
              </h2>
            </Reveal>
            <Reveal variant="rise" delay={100}>
              <div className="font-body text-[#161616]/75 mt-5 space-y-4 leading-relaxed max-w-xl">
                <p>
                  Ironwood Roofing, Timberline Lawn Co., Glacier Air. We invented all three to show you the treatment. The storm is real, the mountains are real, the pipeline is real. The roof that got hammered at 2 a.m. protects a family who does not exist.
                </p>
                <p>
                  Each film took the studio one afternoon: written, shot, scored, and cut. No camera crew, no location fees, no $10,000 production invoice. Which is the entire point:
                </p>
                <p className="font-sans font-extrabold text-[#161616] text-lg">
                  If we do this for companies that do not exist, imagine what we do with your real one.
                </p>
              </div>
            </Reveal>
            <Reveal variant="drop" delay={200}>
              <a
                href="#packages"
                className="inline-block mt-7 rounded-full bg-[#161616] border-2 border-[#161616] px-8 py-3.5 font-sans font-extrabold text-[#FBF6EA] text-sm uppercase tracking-[0.16em] shadow-[4px_4px_0_0_#F5B700] transition-all hover:-translate-y-0.5"
              >
                Put My Name In The Grass
              </a>
            </Reveal>
          </div>

          {/* The feed mockup: what the ad looks like where it runs */}
          <Reveal variant="rise" delay={150}>
            <div className="max-w-sm mx-auto w-full md:rotate-[1.2deg]">
              <div className="rounded-2xl bg-white border-2 border-[#161616] shadow-[8px_8px_0_0_#F5B700] overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-[#161616] flex items-center justify-center font-display font-black text-[#F5B700]" aria-hidden="true">T</div>
                  <div>
                    <p className="font-sans font-bold text-sm text-[#161616] leading-tight">Timberline Lawn Co.</p>
                    <p className="font-body text-xs text-[#161616]/55">Sponsored · Kalispell, MT</p>
                  </div>
                </div>
                <p className="px-4 pb-3 font-body text-sm text-[#161616]/85">
                  Spring books fast in the Flathead. Striped lawns, on time, every week. 🏔️
                </p>
                <img src="/ads/broadcast-demo-poster.jpg" alt="Still from the Timberline Lawn Co. demo commercial: a mower carving the company name into a striped lawn beneath snowcapped peaks" className="w-full block" loading="lazy" />
                <div className="flex items-center justify-between px-4 py-3 bg-[#FBF6EA] border-t border-[#161616]/15">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#161616]/55">timberlinelawn.co</p>
                    <p className="font-sans font-bold text-sm text-[#161616]">First mow free when you book the season</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-[#1E50C8] px-4 py-2 font-sans font-bold text-xs text-white">Get Quote</span>
                </div>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/50 text-center mt-3">How a spot looks in the feed</p>
            </div>
          </Reveal>
        </div>

        {/* Film strip */}
        <Reveal variant="rise" delay={220}>
          <div className="mt-14 border-y-8 border-[#161616] py-3 bg-[#161616]" style={{ borderImage: 'repeating-linear-gradient(90deg, #161616 0 14px, #FBF6EA 14px 22px) 8' }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#FBF6EA]/60 text-center pb-2.5">The Timberline shot list, start to finish</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-3">
              {FILM_STRIP.map((f) => (
                <figure key={f.src} className="m-0">
                  <img src={f.src} alt={f.caption.toLowerCase()} className="w-full aspect-video object-cover rounded border border-[#FBF6EA]/30" loading="lazy" />
                  <figcaption className="font-mono text-[9px] md:text-[10px] uppercase tracking-[0.14em] text-[#FBF6EA]/70 mt-1.5 text-center">{f.caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const STEPS = [
  {
    n: '01',
    title: 'We film',
    body: 'Tell us about your business (ten minutes, tops). Your 30-second commercial is written, shot, and scored within 2 business days. You approve every frame before it runs anywhere.',
  },
  {
    n: '02',
    title: 'We launch',
    body: 'We build the campaign inside YOUR ad account: targeting, budgets, placements, pixel. Your card pays Meta and Google directly, we never mark up spend, and you can see every dollar. Live within 7 days.',
  },
  {
    n: '03',
    title: 'We manage',
    body: 'Every week we tune budgets and audiences and swap tired creative. Every month you get a plain-English report: what ran, what it cost, what came in. No dashboards you need a translator for.',
  },
];

export function HowBroadcastWorks() {
  return (
    <section className="py-16 md:py-24 bg-[#FBF6EA] border-b-2 border-[#161616]">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-10 md:mb-14">
          <Reveal variant="eyebrow">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-4">[ HOW IT WORKS ]</p>
          </Reveal>
          <Reveal variant="slam">
            <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.05]">
              Three jobs. We take all three.
            </h2>
          </Reveal>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} variant="rise" delay={i * 110}>
              <div className="h-full rounded-2xl bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-7">
                <p className="font-display text-5xl font-black text-[#F5B700]" aria-hidden="true">{s.n}</p>
                <h3 className="font-sans font-extrabold text-xl text-[#161616] mt-3 uppercase tracking-wide">{s.title}</h3>
                <p className="font-body text-sm text-[#161616]/75 mt-2.5 leading-relaxed">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal variant="drop" delay={340}>
          <div className="max-w-5xl mx-auto mt-6">
            <div className="rounded-2xl bg-[#F5B700] border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] px-6 py-5 text-center md:-rotate-[0.4deg]">
              <p className="font-display text-2xl md:text-3xl font-black text-[#161616]">
                Your job: answer the phone. That is the whole job.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function BroadcastFaqSection() {
  return (
    <section id="faq" className="py-16 md:py-24 bg-[#FBF6EA] border-b-2 border-[#161616]">
      <div className="max-w-3xl mx-auto px-5">
        <div className="text-center mb-10">
          <Reveal variant="eyebrow">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-4">[ STRAIGHT ANSWERS ]</p>
          </Reveal>
          <Reveal variant="slam">
            <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.05]">
              Asked and answered.
            </h2>
          </Reveal>
        </div>
        <div className="space-y-3">
          {broadcastFaq.map((f, i) => (
            <Reveal key={f.q} variant="rise" delay={Math.min(i * 60, 240)}>
              <details className="group rounded-xl bg-white border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] px-5 py-4">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-sans font-bold text-[#161616]">
                  {f.q}
                  <span className="shrink-0 font-display text-xl text-[#8f6600] transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="font-body text-sm text-[#161616]/75 leading-relaxed mt-3">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BroadcastFinalCta() {
  return (
    <section className="py-16 md:py-24 bg-[#F5B700]">
      <div className="max-w-3xl mx-auto px-5 text-center">
        <Reveal variant="slam">
          <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.05]">
            Your competitors are boosting posts.
            <br className="hidden md:block" /> You could be on air.
          </h2>
        </Reveal>
        <Reveal variant="rise" delay={120}>
          <p className="font-body text-[#161616]/75 mt-4 max-w-xl mx-auto">
            A real commercial, real management, and a real report every month, for less than one slow week costs you.
          </p>
        </Reveal>
        <Reveal variant="drop" delay={220}>
          <a
            href="#packages"
            className="inline-block mt-8 rounded-full bg-[#161616] border-2 border-[#161616] px-10 py-4 font-sans font-extrabold text-[#FBF6EA] text-sm uppercase tracking-[0.18em] shadow-[5px_5px_0_0_#FBF6EA] transition-all hover:-translate-y-0.5"
          >
            See The Packages
          </a>
        </Reveal>
      </div>
    </section>
  );
}
