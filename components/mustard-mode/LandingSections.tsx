'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { tracks } from '@/data/mustard-mode/curriculum';
import Reveal from './Reveal';
import ClaudeCodeReplay from './ClaudeCodeReplay';

const ERA_WORDS = ['founders', 'operators', 'makers', 'second-act dreamers', 'small-town builders', 'first-time creators'];

/** Rotates through ERA_WORDS every 2.4s. Isolated so only this bit re-renders. */
function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % ERA_WORDS.length), 2400);
    return () => clearInterval(id);
  }, []);
  return (
    <span key={i} className="inline-block font-display italic font-black text-[#F5B700] text-2xl md:text-3xl tracking-tight">
      {ERA_WORDS[i]}
    </span>
  );
}

/** Diagonal mono marquee ticker between sections. */
export function Ticker({ reverse = false }: { reverse?: boolean }) {
  const line = 'SHIP MORE // DESIGN MORE // IDEATE MORE // COWORK WITH AI // ';
  return (
    <div className="relative overflow-hidden border-y-2 border-[#161616] bg-[#F5B700] py-2.5 select-none" aria-hidden>
      <style>{`
        @keyframes mm-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { .mm-marquee { animation: none !important; } }
      `}</style>
      <div
        className="mm-marquee whitespace-nowrap font-mono font-bold text-[13px] tracking-[0.12em] text-[#161616]"
        style={{ animation: `mm-marquee 28s linear infinite${reverse ? ' reverse' : ''}`, width: 'max-content' }}
      >
        {line.repeat(8)}
      </div>
    </div>
  );
}

/** How it works: the method in three beats. */
export function MethodSection() {
  const beats = [
    { n: '01', title: 'Mr. Mustard trains you', body: 'A live AI coach who knows your track, your mission, and the thing you said you want to build. He gives you the next rep, checks your work, and keeps score.' },
    { n: '02', title: 'Claude does the reps', body: 'Every mission is built on your own Claude subscription. You learn by shipping real artifacts (apps, pages, specs, systems), never by watching videos.' },
    { n: '03', title: 'You keep the multiplier', body: 'XP and streaks are the game. The prize is the skill: after four tracks you run Claude like the studio does, on everything, forever.' },
  ];
  return (
    <section className="bg-[#FBF6EA] py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal variant="eyebrow">
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#E0301E] uppercase">The method // How it plays</p>
        </Reveal>
        <Reveal variant="slam" delay={120}>
          <h2 className="font-display italic font-extrabold text-4xl md:text-6xl text-[#161616] mt-3 max-w-3xl leading-[1.02]">
            A coach, a game, and a machine that builds.
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {beats.map((b, i) => (
            <Reveal key={b.n} variant="rise" delay={160 + i * 120}>
              <div className="pop-card p-7 rounded-none h-full">
                <span className="font-mono font-bold text-2xl text-[#F5B700]" style={{ textShadow: '1.5px 1.5px 0 #161616' }}>{b.n}</span>
                <h3 className="font-display font-extrabold text-xl text-[#161616] mt-3">{b.title}</h3>
                <p className="font-sans text-sm text-[#161616]/75 mt-2 leading-relaxed">{b.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The machine, running: a real Claude Code session replayed in a midnight pane. */
export function ReplaySection() {
  return (
    <section className="bg-[#FBF6EA] pb-20 md:pb-28">
      <div className="max-w-4xl mx-auto px-6">
        <Reveal variant="eyebrow">
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#E0301E] uppercase">The machine // A real session, replayed</p>
        </Reveal>
        <Reveal variant="slam" delay={120}>
          <h2 className="font-display italic font-extrabold text-4xl md:text-6xl text-[#161616] mt-3 leading-[1.02] mb-10">
            This is what an evening looks like.
          </h2>
        </Reveal>
        <Reveal variant="rise" delay={200}>
          <ClaudeCodeReplay />
        </Reveal>
      </div>
    </section>
  );
}

/** The four track cabinet cards. Desktop: snap rail bleeding right. Mobile: stack. */
export function TrackRail() {
  return (
    <section className="bg-[#FBF6EA] pb-20 md:pb-28 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal variant="eyebrow">
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#E0301E] uppercase">Four tracks // 28 missions // 4 boss fights</p>
        </Reveal>
        <Reveal variant="slam" delay={120}>
          <h2 className="font-display italic font-extrabold text-4xl md:text-6xl text-[#161616] mt-3 leading-[1.02]">Pick your cabinet.</h2>
        </Reveal>
      </div>
      <div className="mt-10 md:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]">
        <div className="flex flex-col md:flex-row gap-6 px-6 md:px-0 md:overflow-x-auto md:snap-x md:snap-mandatory md:pb-6 md:pr-12 mm-rail">
          <style>{`
            .mm-rail::-webkit-scrollbar { height: 8px; }
            .mm-rail::-webkit-scrollbar-track { background: #16161622; }
            .mm-rail::-webkit-scrollbar-thumb { background: #F5B700; border: 1px solid #161616; }
          `}</style>
          {tracks.map((t, i) => (
            <div
              key={t.slug}
              className="md:snap-start md:shrink-0 md:w-[380px] bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-7 flex flex-col"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[11px] tracking-[0.14em]" style={{ color: t.color === '#F5B700' ? '#8A6A00' : t.color }}>
                  [ TRACK 0{i + 1}/04 ]
                </span>
                <span className="font-mono font-bold text-[10px] text-[#161616]/50">{t.missions.length} MISSIONS</span>
              </div>
              <h3 className="font-display italic font-extrabold text-3xl text-[#161616] mt-4">{t.name}</h3>
              <p className="font-sans text-sm text-[#161616]/75 mt-2 leading-relaxed flex-1">{t.tagline}</p>
              <div className="mt-6 border-t-2 border-dashed border-[#161616]/20 pt-4">
                <p className="font-mono font-bold text-[10px] tracking-wider text-[#E0301E] uppercase">Boss mission</p>
                <p className="font-sans text-sm font-medium text-[#161616] mt-1">{t.bossMission}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {t.missions.slice(0, 3).map((m) => (
                  <span key={m.id} className="font-mono text-[10px] font-bold text-[#161616] border border-[#161616] px-2 py-1 bg-[#FBF6EA]">
                    {m.title}
                  </span>
                ))}
                <span className="font-mono text-[10px] font-bold px-2 py-1 text-[#161616]/50">+{t.missions.length - 3} more</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The manifesto beat. Revives "The Era of the Entrepreneur" (the studio's
 * original brand manifesto) rewritten for MUSTARD MODE: the emotional peak
 * right before the ask, not a generic pep talk. Rotating word + halftone
 * field, dark canvas so it reads as a distinct beat from the cream sections
 * around it.
 */
export function EraOfEntrepreneur() {
  return (
    <section className="relative bg-[#080C16] border-y-2 border-[#161616] py-24 md:py-32 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{ backgroundImage: 'radial-gradient(#F5B700 1.6px, transparent 1.8px)', backgroundSize: '20px 20px' }}
        aria-hidden
      />
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <Reveal variant="eyebrow">
          <p className="font-mono font-bold text-[11px] tracking-[0.28em] text-[#E0301E] uppercase">A manifesto</p>
        </Reveal>
        <Reveal variant="slam" delay={100}>
          <h2 className="font-display italic font-extrabold text-white leading-[0.98] tracking-tight text-4xl md:text-6xl lg:text-7xl mt-5">
            The <span className="text-[#F5B700]">era</span> of the <span className="text-[#F5B700]">entrepreneur</span>
          </h2>
        </Reveal>
        <Reveal variant="rise" delay={220}>
          <p className="font-sans text-lg md:text-xl text-white/85 max-w-2xl mx-auto mt-8 leading-relaxed">
            One person with a coach and Claude can now build what used to take a team of fifty.
          </p>
          <p className="font-sans font-bold text-white/60 max-w-xl mx-auto mt-3">
            That is the era we are in. MUSTARD MODE exists to hand you the tools and the reps.
          </p>
        </Reveal>
        <Reveal variant="rise" delay={340}>
          <div className="text-xl md:text-2xl font-sans text-white/70 mt-10 flex items-center justify-center flex-wrap gap-x-3 gap-y-2">
            <span>Built for</span>
            <span className="inline-block min-w-[210px] text-left">
              <RotatingWord />
            </span>
          </div>
        </Reveal>
        <Reveal variant="drop" delay={440}>
          <a
            href="#levels"
            className="inline-block mt-10 font-sans font-bold bg-[#F5B700] text-[#161616] border-2 border-[#161616] shadow-[5px_5px_0_0_#FFDD55] px-8 py-3.5 hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_#FFDD55] transition-all"
          >
            Get your tools
          </a>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Trust, not preaching. The coach's stance on honest AI use, right before
 * the offer: what MUSTARD MODE teaches you to build with, not to fake.
 */
export function IntegritySection() {
  const principles = [
    {
      t: 'You own what you ship',
      d: 'Claude writes the code. You make the calls. Every mission ends with you understanding what you built well enough to explain it, not just paste it.',
    },
    {
      t: 'Say when AI built it',
      d: 'If a client, a boss, or a reader would care that AI was in the loop, tell them. Speed is not a reason to be quiet about how the work got made.',
    },
    {
      t: 'Amplify skill, never replace judgment',
      d: 'The coach exists to make your taste and your standards travel faster, not to make them optional. A tool that thinks for you stops working the day you need it most.',
    },
  ];
  return (
    <section className="bg-[#FBF6EA] py-20 md:py-24">
      <div className="max-w-5xl mx-auto px-6">
        <Reveal variant="eyebrow">
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#E0301E] uppercase">Where we stand</p>
        </Reveal>
        <Reveal variant="slam" delay={100}>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl text-[#161616] mt-3 max-w-2xl leading-[1.05]">
            Integrity in AI is not a footnote here.
          </h2>
        </Reveal>
        <Reveal variant="rise" delay={200}>
          <p className="font-sans text-[#161616]/75 max-w-2xl mt-5 leading-relaxed">
            A coach who only cared about speed would teach you shortcuts. Ours cares about the name on the
            work. MUSTARD MODE is built on three rules that do not bend, whether you are shipping a hobby
            project or something your business depends on.
          </p>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6 mt-10">
          {principles.map((p, i) => (
            <Reveal key={p.t} variant="rise" delay={260 + i * 120}>
              <div className="pop-card rounded-none p-6 h-full">
                <span className="font-mono font-bold text-[10px] tracking-wider text-[#1E50C8]">[ 0{i + 1} ]</span>
                <h3 className="font-display font-extrabold text-lg text-[#161616] mt-2">{p.t}</h3>
                <p className="font-sans text-[13px] text-[#161616]/75 mt-2 leading-relaxed">{p.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Honest proof: the method is the studio's own operating system. */
export function ProofSection() {
  const stats = [
    { n: '30+', label: 'products and client systems shipped by this studio with Claude, most by one person' },
    { n: '4', label: 'live AI voice agents answering real phone numbers, built the same way you will learn' },
    { n: '1', label: 'method. The one Modern Mustard Seed runs every single day. Now with a coach.' },
  ];
  return (
    <section className="bg-[#080C16] py-20 md:py-28 border-y-2 border-[#161616]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <Reveal variant="eyebrow">
              <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#FFDD55] uppercase">Proof // Not theory</p>
            </Reveal>
            <Reveal variant="slam" delay={120}>
              <h2 className="font-display italic font-extrabold text-4xl md:text-6xl text-white mt-3 leading-[1.02] max-w-2xl">
                This is the studio&apos;s own operating system.
              </h2>
            </Reveal>
          </div>
          <div className="relative w-28 h-28 md:w-36 md:h-36 shrink-0 rotate-[-4deg]">
            <Image src="/brand/mascot.png" alt="Mr. Mustard, your coach" fill sizes="144px" className="object-contain drop-shadow-[4px_4px_0_rgba(245,183,0,0.9)]" />
          </div>
        </div>
        <p className="font-sans text-white/70 max-w-2xl mt-6">
          Nothing in MUSTARD MODE is a course-creator theory. Every mission, prompt, and blueprint is the
          working method behind the storefronts, voice agents, client builds, and tools Modern Mustard
          Seed ships solo, daily, with Claude. You are not buying information. You are installing an
          operating system that is already running a real studio.
        </p>
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {stats.map((s) => (
            <div key={s.label} className="border-2 border-white/15 bg-[#0F1422] p-6">
              <span className="font-mono font-bold text-5xl text-[#F5B700]">{s.n}</span>
              <p className="font-sans text-sm text-white/65 mt-3 leading-relaxed">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
