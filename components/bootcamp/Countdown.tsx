'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BOOTCAMP, fmtMountain, fmtMountainTime } from '@/data/bootcamp';

/**
 * The clock on the door. Before January 26 it counts to the free masterclass;
 * after, to Day 1. `serverNow` seeds the first paint so the server HTML and
 * the first client render match byte for byte (the LaunchCountdown pattern);
 * the live clock takes over in an effect.
 */

type Target = { key: 'masterclass' | 'day1' | 'live' | 'done'; iso: string };

function pick(now: number): Target {
  const mc = new Date(BOOTCAMP.dates.masterclass).getTime();
  const d1 = new Date(BOOTCAMP.dates.day1).getTime();
  const d3 = new Date(BOOTCAMP.dates.day3).getTime() + 90 * 60 * 1000;
  if (now < mc) return { key: 'masterclass', iso: BOOTCAMP.dates.masterclass };
  if (now < d1) return { key: 'day1', iso: BOOTCAMP.dates.day1 };
  if (now < d3) return { key: 'live', iso: BOOTCAMP.dates.day3 };
  return { key: 'done', iso: BOOTCAMP.dates.day3 };
}

function split(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

const PAD = (n: number) => String(n).padStart(2, '0');

function Cell({ value, label, big = false }: { value: string; label: string; big?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`${big ? 'bg-[#f5b700]' : 'bg-white'} border-2 border-[#0b3b44] rounded-xl shadow-[4px_4px_0_0_#0b3b44] px-2.5 sm:px-5 py-3 sm:py-4 min-w-[64px] sm:min-w-[92px]`}>
        <span className="block font-display font-black tabular-nums leading-none text-center text-[#0b3b44] text-3xl sm:text-5xl md:text-6xl">{value}</span>
      </div>
      <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.25em] font-bold text-[#0b3b44]/70 mt-2.5">{label}</span>
    </div>
  );
}

export default function Countdown({ serverNow }: { serverNow: number }) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const target = pick(now);
  const t = split(new Date(target.iso).getTime() - now);
  const when = `${fmtMountain(target.iso)} at ${fmtMountainTime(target.iso)} ${BOOTCAMP.tzLabel}`;

  const heading =
    target.key === 'masterclass' ? 'The free masterclass starts in'
    : target.key === 'day1' ? 'Day 1 starts in'
    : target.key === 'live' ? 'The bootcamp is live this week.'
    : 'This run has wrapped.';
  const line =
    target.key === 'masterclass' ? `${when}. Sixty minutes, free, the whole studio on screen. The ticket comes after.`
    : target.key === 'day1' ? `${when}. Kickoff is the day before, so Day 1 starts at speed.`
    : target.key === 'live' ? `Day 3 is ${when}. Replays go up the same evening.`
    : 'Replays are up for everyone who holds a ticket. The next run is announced to the list first.';
  const counting = target.key === 'masterclass' || target.key === 'day1';

  return (
    <section id="countdown" className="relative border-y-2 border-[#0b3b44] bg-[#ffc933] halftone-bg overflow-hidden scroll-mt-24" aria-labelledby="countdown-heading">
      <div className="relative max-w-4xl mx-auto px-5 py-12 md:py-16 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#0b3b44] font-bold">[ {BOOTCAMP.tzLabel} ]</p>
        <h2 id="countdown-heading" className="font-display text-3xl md:text-5xl font-black tracking-tight mt-3 text-[#0b3b44]">{heading}</h2>
        <p className="font-body text-base text-[#0b3b44]/80 max-w-xl mx-auto mt-3">{line}</p>
        <p className="sr-only">{counting ? `${t.days} days, ${t.hours} hours, ${t.minutes} minutes.` : heading}</p>
        {counting && (
          <div className="flex justify-center gap-2 sm:gap-4 mt-8" aria-hidden="true">
            <Cell value={String(t.days)} label="Days" big />
            <Cell value={PAD(t.hours)} label="Hours" />
            <Cell value={PAD(t.minutes)} label="Minutes" />
            <Cell value={PAD(t.seconds)} label="Seconds" />
          </div>
        )}
        <div className="mt-9 flex flex-col sm:flex-row justify-center gap-3">
          {target.key === 'masterclass' ? (
            <>
              <Link href="/bootcamp/masterclass" className="inline-flex items-center justify-center rounded-full bg-[#0b3b44] border-2 border-[#0b3b44] px-7 py-3.5 font-sans font-extrabold text-xs uppercase tracking-[0.18em] text-[#fbf5ea] shadow-[4px_4px_0_0_#fbf5ea]">Save my free seat</Link>
              <a href="#tiers" className="inline-flex items-center justify-center rounded-full bg-white border-2 border-[#0b3b44] px-7 py-3.5 font-sans font-extrabold text-xs uppercase tracking-[0.18em] text-[#0b3b44]">Skip ahead, take a seat</a>
            </>
          ) : (
            <a href="#tiers" className="inline-flex items-center justify-center rounded-full bg-[#0b3b44] border-2 border-[#0b3b44] px-7 py-3.5 font-sans font-extrabold text-xs uppercase tracking-[0.18em] text-[#fbf5ea] shadow-[4px_4px_0_0_#fbf5ea]">
              {target.key === 'day1' ? 'Take a seat' : 'See the seats'}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
