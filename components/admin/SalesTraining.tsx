'use client';

import Link from 'next/link';
import { useState } from 'react';
import AdminHeader from './AdminHeader';
import {
  TRAINING_INTRO,
  DAILY_GUIDE,
  MINDSET,
  SALES_ARC,
  CHANNELS,
  VOICE_DEMO_PLAY,
  WHAT_WE_SELL,
  OBJECTIONS,
  ACTIVITY,
  PRACTICE,
  personalize,
} from '@/data/sales-training';

export default function SalesTraining({ bookDisplay }: { bookDisplay: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  const px = (t: string) => personalize(t, bookDisplay);

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="training" title="Sales Training" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Hero */}
        <div className="halftone-bg -mx-6 px-6 pt-2 pb-8 mb-6 border-b-2 border-[#161616]/10">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">{TRAINING_INTRO.eyebrow}</span>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">{TRAINING_INTRO.title}</h1>
          <p className="mt-4 text-[#161616] font-body text-lg leading-relaxed font-medium max-w-2xl">{TRAINING_INTRO.lede}</p>
          <p className="mt-3 text-[#3A3733] font-body leading-relaxed max-w-2xl">{TRAINING_INTRO.body}</p>
          <a
            href="/api/admin/sales-training/pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-5 px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
          >
            Download as PDF ↓
          </a>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href="#daily" className="px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-semibold bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all">Daily plan</a>
            <a href="#channels" className="px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-semibold bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all">The 3 ways to sell</a>
            <a href="#voice" className="px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-semibold bg-[#F5B700] border-2 border-[#161616] rounded-full hover:-translate-y-0.5 transition-all">The voice agent play</a>
            <a href="#sell" className="px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-semibold bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all">What we sell</a>
            <a href="#objections" className="px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] font-sans font-semibold bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all">Objections</a>
          </div>
        </div>

        {/* Daily game plan */}
        <Section id="daily" eyebrow="Start here" title={DAILY_GUIDE.title}>
          <p className="text-[#3A3733] font-body mb-5 max-w-2xl">{DAILY_GUIDE.intro}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {DAILY_GUIDE.blocks.map((b) => (
              <div key={b.title} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5">
                <span className="inline-block text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-[#FBF6EA] bg-[#2D6A4F] rounded-md px-2.5 py-1 mb-2.5">{b.time}</span>
                <h3 className="font-sans font-bold mb-1">{b.title}</h3>
                <p className="text-[#3A3733] font-body text-sm leading-relaxed">{b.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-[#161616] rounded-2xl p-5 shadow-[4px_4px_0_0_#F5B700]">
            <p className="text-[#FBF6EA] font-body leading-relaxed"><span className="text-[#F5B700] font-bold">North star: </span>{DAILY_GUIDE.northStar}</p>
            <p className="text-[#FBF6EA]/60 font-mono text-xs mt-2">Your booking link: {bookDisplay}</p>
          </div>
        </Section>

        {/* Mindset */}
        <Section id="mindset" eyebrow="Before anything else" title={MINDSET.title}>
          <div className="space-y-3">
            {MINDSET.points.map((p) => (
              <div key={p.h} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[3px_3px_0_0_#161616] p-5">
                <h3 className="font-sans font-bold text-[#161616] mb-1">{p.h}</h3>
                <p className="text-[#3A3733] font-body text-sm leading-relaxed">{p.b}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Sales arc */}
        <Section id="arc" eyebrow="The fundamentals" title={SALES_ARC.title}>
          <p className="text-[#3A3733] font-body mb-5 max-w-2xl">{SALES_ARC.intro}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {SALES_ARC.steps.map((s) => (
              <div key={s.n} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[3px_3px_0_0_#161616] p-5 flex gap-3">
                <span className="font-display text-2xl font-bold text-[#F5B700] leading-none">{s.n}</span>
                <div>
                  <h3 className="font-sans font-bold mb-1">{s.label}</h3>
                  <p className="text-[#3A3733] font-body text-sm leading-relaxed">{s.say}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Channels */}
        <Section id="channels" eyebrow="The three ways you sell" title="Calls, posts, and walk-ins">
          <div className="space-y-4">
            {CHANNELS.map((c) => (
              <div key={c.key} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 md:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                  <h3 className="font-display text-2xl font-semibold">{c.name}</h3>
                  <span className="text-[#161616]/55 font-body text-sm italic">{c.tagline}</span>
                </div>
                <p className="text-[#1E50C8] font-body text-sm font-semibold mb-3">{c.tool}</p>
                <ul className="space-y-1.5">
                  {c.steps.map((s) => (
                    <li key={s} className="text-[#3A3733] font-body text-sm flex gap-2 leading-relaxed"><span className="text-[#F5B700] mt-0.5">●</span>{px(s)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* Voice demo play (signature) */}
        <section id="voice" className="py-10 scroll-mt-24">
          <div className="bg-[#161616] rounded-3xl p-6 md:p-9 shadow-[8px_8px_0_0_#F5B700]">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#F5B700] font-mono font-bold block mb-2">Your secret weapon</span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#FBF6EA] mb-3">{VOICE_DEMO_PLAY.title}</h2>
            <p className="text-[#FBF6EA]/75 font-body leading-relaxed max-w-2xl mb-6">{VOICE_DEMO_PLAY.intro}</p>
            <a href="https://modernmustardseed.com/voice-agents" target="_blank" rel="noopener noreferrer" className="inline-block mb-7 px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#F5B700] rounded-full hover:bg-[#FFD23F] transition-all">Open the live demo (/voice-agents) →</a>

            <div className="space-y-3">
              {VOICE_DEMO_PLAY.steps.map((s, i) => (
                <div key={i} className="bg-[#FBF6EA] border-2 border-[#F5B700] rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-display text-xl font-bold text-[#E0301E] leading-none">{i + 1}</span>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[#161616] font-mono font-bold">{s.label}</span>
                    </div>
                    <button
                      onClick={() => copy(`v-${i}`, px(s.script))}
                      className="px-3 py-1 text-[9px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full hover:bg-[#FFD23F] transition-all shrink-0"
                    >
                      {copied === `v-${i}` ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="font-body text-[15px] text-[#161616] leading-relaxed italic">"{px(s.script)}"</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid sm:grid-cols-2 gap-2.5">
              {VOICE_DEMO_PLAY.tips.map((t) => (
                <p key={t} className="text-[#FBF6EA]/80 font-body text-sm flex gap-2 leading-relaxed"><span className="text-[#F5B700] mt-0.5">★</span>{t}</p>
              ))}
            </div>
          </div>
        </section>

        {/* What we sell */}
        <Section id="sell" eyebrow="In plain words" title="How to talk about what we sell">
          <p className="text-[#3A3733] font-body mb-5 max-w-2xl">You do not need to be technical. For each one: what it is, what it does for them, and when to bring it up.</p>
          <div className="space-y-3">
            {WHAT_WE_SELL.map((w) => (
              <div key={w.name} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[3px_3px_0_0_#161616] p-5">
                <h3 className="font-display text-xl font-semibold mb-2">{w.name}</h3>
                <p className="text-[#3A3733] font-body text-sm leading-relaxed mb-1"><span className="text-[#E0301E] font-mono text-[10px] uppercase tracking-[0.15em] mr-1.5">What it is</span>{w.isWhat}</p>
                <p className="text-[#3A3733] font-body text-sm leading-relaxed mb-1"><span className="text-[#1E50C8] font-mono text-[10px] uppercase tracking-[0.15em] mr-1.5">What it does</span>{w.doesWhat}</p>
                <p className="text-[#3A3733] font-body text-sm leading-relaxed"><span className="text-[#2D6A4F] font-mono text-[10px] uppercase tracking-[0.15em] mr-1.5">Bring it up</span>{w.bringUp}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Objections */}
        <Section id="objections" eyebrow="When they push back" title="What to say to the common ones">
          <div className="space-y-3">
            {OBJECTIONS.map((o, i) => (
              <details key={i} className="group bg-white border-2 border-[#161616] rounded-2xl shadow-[3px_3px_0_0_#161616] overflow-hidden">
                <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3 hover:bg-[#FFF8E6] transition-colors">
                  <span className="font-sans font-bold text-[#161616] text-[15px]">{o.q}</span>
                  <span className="text-[#F5B700] text-xl font-bold shrink-0 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-5 pb-5 pt-0 flex items-start justify-between gap-3">
                  <p className="font-body text-[15px] text-[#3A3733] leading-relaxed italic">"{px(o.a)}"</p>
                  <button
                    onClick={() => copy(`o-${i}`, px(o.a))}
                    className="px-3 py-1 text-[9px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full hover:bg-[#FFD23F] transition-all shrink-0 mt-0.5"
                  >
                    {copied === `o-${i}` ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </details>
            ))}
          </div>
        </Section>

        {/* Activity + practice */}
        <Section id="numbers" eyebrow="Make it a habit" title={ACTIVITY.title}>
          <p className="text-[#3A3733] font-body mb-4 max-w-2xl">{ACTIVITY.intro}</p>
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 mb-4">
            <ul className="space-y-2">
              {ACTIVITY.targets.map((t) => (
                <li key={t} className="text-[#3A3733] font-body text-sm flex gap-2 leading-relaxed"><span className="text-[#F5B700] mt-0.5">●</span>{t}</li>
              ))}
            </ul>
          </div>
          <p className="text-[#161616] font-body text-sm bg-[#FFF8E6] border-l-4 border-[#F5B700] rounded-r-xl px-5 py-4 leading-relaxed">{ACTIVITY.note}</p>

          <h3 className="font-display text-2xl font-semibold mt-8 mb-4">{PRACTICE.title}</h3>
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5">
            <ul className="space-y-2.5">
              {PRACTICE.points.map((p) => (
                <li key={p} className="text-[#3A3733] font-body text-sm flex gap-2 leading-relaxed"><span className="text-[#2D6A4F] mt-0.5">✓</span>{p}</li>
              ))}
            </ul>
          </div>
          <p className="text-[#161616]/55 font-body text-sm mt-5 text-center">
            Pair this with the <Link href="/admin/call-script" className="text-[#1E50C8] font-semibold underline underline-offset-2">call script</Link> and the onboarding guide. When stuck, ask Mr. Mustard.
          </p>
        </Section>
      </main>
    </div>
  );
}

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="py-8 border-b-2 border-[#161616]/10 scroll-mt-24">
      <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-2">{eyebrow}</span>
      <h2 className="font-display text-3xl font-semibold tracking-tight mb-6">{title}</h2>
      {children}
    </section>
  );
}
