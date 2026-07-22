'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Niche } from '@/lib/outbound';
import { TRADE_PRESETS, TICKET_WORD } from '@/data/demo-os-trades';
import type { OsTradeKey } from '@/data/demo-os-trades';
import MakeItRealCTA from '@/components/demo/MakeItRealCTA';
import type { DemoProductKey } from '@/lib/demo-order';

/**
 * The Demo Suite hub, prospect-facing and unapologetically adorable: Mr.
 * Mustard bobbing with a typed speech bubble, his welcome video, three demo
 * doors, and the Recovery Calculator that turns missed calls into a monthly
 * dollar leak they can feel. Pop-art MMS system: cream, ink borders, gold.
 */

/** Legacy niche fallback for hubs rendered without a detected trade. */
const AVG_JOB: Record<Niche, { label: string; value: number }> = {
  restaurant: { label: 'average ticket', value: 65 },
  home_service: { label: 'average job', value: 450 },
  dental_medspa: { label: 'average visit', value: 320 },
  real_estate: { label: 'average commission', value: 7500 },
  other: { label: 'average sale', value: 250 },
};

/** Round a slider ceiling to something a human would pick. */
function niceMax(v: number): number {
  const raw = v * 2.5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  return Math.ceil(raw / mag) * mag;
}

function useCountUp(target: number, ms = 900): number {
  const [v, setV] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/** Types the line out, and reports when it is finished so the caret can leave.
 *  A caret that keeps blinking after the sentence lands reads like a bug. */
function useTyped(text: string, speed = 28): { shown: string; typing: boolean } {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const t = window.setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), speed);
    return () => window.clearInterval(t);
  }, [text, speed]);
  return { shown: text.slice(0, n), typing: n < text.length };
}

export default function DemoHub({
  hubId,
  business,
  ownerFirst,
  niche,
  trade,
  city,
  film = 'demo-welcome',
  personalVideoUrl,
  voiceUrl,
  siteUrl,
  sitePending,
  osUrl,
  presenter,
}: {
  hubId: string;
  business: string;
  ownerFirst: string | null;
  niche: Niche;
  /** Specific detected trade; when present the calculator speaks it. */
  trade?: OsTradeKey;
  city: string | null;
  /** Which welcome film matches the forged set (trifecta or a single cut), or
   *  Sarah's personal hello once that film is live. */
  film?: 'demo-welcome' | 'demo-welcome-voice' | 'demo-welcome-site' | 'demo-welcome-os' | 'demo-welcome-sarah';
  /** A face-to-camera video Sarah recorded for THIS lead. When present it
   *  replaces the generic welcome film (signed booth URL, .webm). */
  personalVideoUrl?: string | null;
  voiceUrl: string | null;
  siteUrl: string | null;
  sitePending: string | null;
  osUrl: string | null;
  /** Partner who minted this suite ("Presented by X with Modern Mustard Seed"). */
  presenter?: string | null;
}) {
  const { shown: bubble, typing } = useTyped(`Hi${ownerFirst ? ` ${ownerFirst}` : ''}! We made ${business} some presents. Open them!`);

  // Presence beat: while the hub is open the dial floor sees "watching right
  // now". Bounded server-side (one stamp a minute), silent on any failure.
  useEffect(() => {
    const beat = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const url = `/api/demo-hub/${hubId}/beat`;
      try {
        if (!navigator.sendBeacon(url)) void fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
      } catch {
        void fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
      }
    };
    beat();
    const t = window.setInterval(beat, 45_000);
    return () => window.clearInterval(t);
  }, [hubId]);

  /* ------------------------------ calculator ------------------------------ */
  const tp = trade ? TRADE_PRESETS[trade] : null;
  const job = tp
    ? { label: `average ${TICKET_WORD[trade!] ?? tp.jobWord}`, value: tp.avgTicket }
    : (AVG_JOB[niche] ?? AVG_JOB.other);
  const sliderMax = niceMax(job.value);
  const [missed, setMissed] = useState(7);
  const [close, setClose] = useState(45);
  const [avg, setAvg] = useState(job.value);
  const leak = Math.round(missed * 4.33 * (close / 100) * avg);
  const caught = Math.round(leak * 0.75);
  const shown = useCountUp(leak);
  // The trade line lands hardest: dollars restated as whole jobs lost.
  const lostJobs = tp && tp.avgTicket >= 400 ? Math.round(leak / tp.avgTicket) : 0;
  const jobNoun = tp ? (TICKET_WORD[trade!] ?? tp.jobWord) : '';
  const reaction =
    lostJobs >= 1
      ? `That is ${lostJobs} ${jobNoun}${lostJobs === 1 ? '' : 's'} a month handed to whoever picks up the phone.`
      : leak >= 8000
        ? "That's someone's salary walking out the door."
        : leak >= 3000
          ? "That's a truck payment. Every month."
          : leak >= 1000
            ? 'That would cover this whole suite many times over.'
            : 'Even this adds up to real money over a year.';

  const doors = useMemo(
    () =>
      [
        voiceUrl && {
          href: voiceUrl,
          icon: '🎙',
          title: 'Your AI receptionist',
          desc: `It already answers as ${business}. Call it, pretend you are a customer, try to stump it.`,
          tone: 'dark' as const,
          cta: 'Talk to it',
        },
        (siteUrl || sitePending) && {
          href: (siteUrl || sitePending)!,
          icon: '🌐',
          title: 'Your new website',
          desc: siteUrl
            ? 'A real, working draft designed for your business. The receptionist lives on it too.'
            : 'Being forged right now. The page refreshes itself until it is ready.',
          tone: 'gold' as const,
          cta: siteUrl ? 'See it live' : 'Watch it forge',
        },
        osUrl && {
          href: osUrl,
          icon: '⚙',
          title: 'Your command center',
          desc: 'Every call transcribed, your website traffic, customers, reviews, quotes, and money on one board. Comes with your website or receptionist, nothing to install.',
          tone: 'ink' as const,
          cta: 'Open it',
          badge: 'Included free',
        },
      ].filter(Boolean) as { href: string; icon: string; title: string; desc: string; tone: 'dark' | 'gold' | 'ink'; cta: string; badge?: string }[],
    [voiceUrl, siteUrl, sitePending, osUrl, business],
  );

  const toneCls: Record<'dark' | 'gold' | 'ink', string> = {
    dark: 'bg-[#161616] text-[#FBF6EA]',
    gold: 'bg-[#F5B700] text-[#161616]',
    ink: 'bg-white text-[#161616]',
  };

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <style>{`
        @keyframes hubBob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-10px) rotate(2deg)}}
        @keyframes hubIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
      `}</style>

      {/* Hero */}
      <header className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-3xl mx-auto px-6 pt-10 pb-12 text-center">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold">
            {presenter ? `Presented by ${presenter} with Modern Mustard Seed` : 'Modern Mustard Seed presents'}
          </span>
          <div className="flex items-end justify-center gap-4 mt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mascot.png" alt="Mr. Mustard" width={110} height={110} className="animate-[hubBob_3.2s_ease-in-out_infinite]" />
            <div className="relative bg-white border-2 border-[#161616] rounded-2xl rounded-bl-none shadow-[4px_4px_0_0_#161616] px-4 py-3 mb-6 text-left max-w-[300px]">
              <p className="font-body text-[15px] leading-snug min-h-[42px]">
                {bubble}
                {typing && <span className="animate-pulse">▍</span>}
              </p>
            </div>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mt-4 leading-tight">
            The {business} Demo Suite
          </h1>
          <p className="font-body text-[#161616]/70 mt-3 max-w-xl mx-auto">
            {presenter
              ? `${presenter} asked us to build this for you${city ? ` in ${city}` : ''}. Free, no strings. Everything below is real and working. Go play.`
              : `Built for you${city ? ` in ${city}` : ''}, free, no strings. Everything below is real and working. Go play.`}
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {/* Welcome video: Sarah's personal one for this lead if she recorded it,
            otherwise the matched Mr. Mustard film. */}
        <section className="animate-[hubIn_.5s_ease-out_both]">
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] overflow-hidden">
            <video
              controls
              preload="metadata"
              poster={personalVideoUrl ? undefined : `/video/${film}-poster.jpg`}
              className="w-full aspect-video bg-[#161616]"
              src={personalVideoUrl ?? `/video/${film}.mp4`}
            />
            <p className="font-body text-[13px] text-[#161616]/60 px-4 py-3">
              {personalVideoUrl
                ? `A personal hello from Sarah, recorded just for ${business}.`
                : 'Thirty seconds from Mr. Mustard on what is in the box.'}
            </p>
          </div>
        </section>

        {/* The doors */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-4">Your {doors.length === 1 ? 'demo' : `${doors.length} demos`}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {doors.map((d, i) => (
              <a
                key={d.title}
                href={d.href}
                className={`${toneCls[d.tone]} relative border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] p-5 flex flex-col transition-transform hover:-translate-y-1.5 hover:rotate-[-0.5deg] animate-[hubIn_.5s_ease-out_both]`}
                style={{ animationDelay: `${120 + i * 110}ms` }}
              >
                {d.badge && (
                  <span className="absolute -top-3 -right-2 z-10 rotate-3 bg-[#E0301E] text-[#FBF6EA] border-2 border-[#161616] rounded-full px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-[0.12em] shadow-[3px_3px_0_0_#161616]">
                    {d.badge}
                  </span>
                )}
                <span className="text-3xl">{d.icon}</span>
                <h3 className="font-display text-xl font-bold mt-3 leading-tight">{d.title}</h3>
                <p className={`font-body text-[13px] leading-relaxed mt-2 flex-1 ${d.tone === 'dark' ? 'text-[#FBF6EA]/75' : 'text-[#161616]/70'}`}>{d.desc}</p>
                <span className={`mt-4 inline-flex self-start items-center gap-1.5 font-sans font-bold uppercase tracking-[0.1em] text-[12px] rounded-full border-2 px-3.5 py-1.5 ${d.tone === 'gold' ? 'bg-[#161616] text-[#F5B700] border-[#161616]' : 'bg-[#F5B700] text-[#161616] border-[#161616]'}`}>
                  {d.cta} →
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Recovery Calculator */}
        <section className="animate-[hubIn_.5s_ease-out_both]">
          <div className="bg-[#161616] border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#F5B700] p-6 sm:p-8">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-mono font-bold">The Recovery Calculator</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#FBF6EA] mt-2">What are missed calls costing {business}?</h2>
            <p className="font-body text-[14px] text-[#FBF6EA]/60 mt-2">Slide to match your week. Estimates, but honest ones.</p>

            <div className="grid sm:grid-cols-3 gap-5 mt-6">
              {[
                { label: 'Calls you miss per week', value: missed, set: setMissed, min: 1, max: 40, fmt: (v: number) => String(v) },
                { label: 'Would have hired you', value: close, set: setClose, min: 10, max: 90, fmt: (v: number) => `${v}%` },
                { label: `Your ${job.label}`, value: avg, set: setAvg, min: 20, max: tp ? sliderMax : niche === 'real_estate' ? 20000 : 3000, fmt: (v: number) => `$${v.toLocaleString()}` },
              ].map((s) => (
                <label key={s.label} className="block">
                  <span className="font-sans text-[11px] uppercase tracking-[0.14em] font-bold text-[#FBF6EA]/70">{s.label}</span>
                  <span className="block font-mono text-xl font-bold text-[#F5B700] mt-1">{s.fmt(s.value)}</span>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    value={s.value}
                    onChange={(e) => s.set(Number(e.target.value))}
                    className="w-full mt-2 accent-[#F5B700]"
                  />
                </label>
              ))}
            </div>

            {/* Neutral lifted ink, never a mustard wash: translucent mustard over
                ink mixes to a muddy brown, which is off-brand. Border carries the gold. */}
            <div className="mt-6 rounded-2xl border-2 border-[#F5B700] bg-[#1F1F1F] p-5 text-center">
              <p className="font-sans text-[11px] uppercase tracking-[0.2em] font-bold text-[#F5B700]">Leaking every month</p>
              <p className="font-display text-5xl sm:text-6xl font-bold text-[#FBF6EA] mt-1 tabular-nums">${shown.toLocaleString()}</p>
              <p className="font-body text-[14px] text-[#FBF6EA]/70 mt-2">
                If this suite caught even three quarters of those calls, that is about{' '}
                <strong className="text-[#F5B700]">${caught.toLocaleString()} a month</strong> back in the till, roughly{' '}
                <strong className="text-[#F5B700]">${(caught * 12).toLocaleString()} a year</strong>.
              </p>
              <div className="flex items-center justify-center gap-3 mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/mascot.png" alt="" width={40} height={40} />
                <p className="font-body text-[13px] italic text-[#FBF6EA]/80 bg-white/5 border border-[#FBF6EA]/15 rounded-xl px-3 py-2">{reaction}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Order it right here */}
        <MakeItRealCTA
          hubId={hubId}
          business={business}
          forged={[
            voiceUrl ? ('voice' as DemoProductKey) : null,
            siteUrl || sitePending ? ('site' as DemoProductKey) : null,
            osUrl ? ('os' as DemoProductKey) : null,
          ].filter(Boolean) as DemoProductKey[]}
        />

        <section className="text-center pb-6">
          <p className="font-mono text-[11px] text-[#161616]/40">
            Demos built with care by Modern Mustard Seed · Kalispell, MT · Yes, an AI answers our phone too. Try it.
          </p>
        </section>
      </main>
    </div>
  );
}
