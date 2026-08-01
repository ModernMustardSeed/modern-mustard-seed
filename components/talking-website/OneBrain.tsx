'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The signature moment for /talking-website.
 *
 * The whole product thesis is "one brain answers the page and the phone," so
 * this proves it instead of claiming it: pick a real customer question and
 * watch the SAME answer arrive in both places at once, the website on the left
 * and the 11pm phone call on the right. The phone lags a beat behind the page
 * because a voice has to actually say the words.
 *
 * Honesty: this is a scripted example for a made-up roofing company, labeled as
 * such on the card. It is a demonstration of the idea, not a recording of a
 * live call (see mms-work-reel-copy-honesty).
 *
 * prefers-reduced-motion gets the full answer instantly, no typing, no waveform.
 */

type Exchange = { q: string; short: string; a: string };

const EXCHANGES: Exchange[] = [
  {
    q: 'Do you have anything today?',
    short: 'Today?',
    a: 'We hold two same-day slots every weekday and the 2:15 is still open. I can put you in it right now and text you the confirmation before we hang up.',
  },
  {
    q: 'How much is a roof inspection?',
    short: 'How much?',
    a: 'The inspection is free and takes about half an hour. If you need work done, you get the number in writing that same visit, and nothing is ordered until you approve it.',
  },
  {
    q: 'Are you open on Sunday?',
    short: 'Open Sunday?',
    a: 'The crew is off Sundays, but I am here around the clock. Tell me what is going on and I will book you first thing Monday at 7:30 and send you the details.',
  },
  {
    q: 'Do you cover Whitefish?',
    short: 'My area?',
    a: 'We cover the whole Flathead Valley, Kalispell through Whitefish and Columbia Falls. Give me the address and I will confirm it and get you on the schedule.',
  },
];

const TYPE_MS = 16; // per character
const PHONE_LAG_MS = 420; // the voice needs a beat before it speaks

/** `nonce` re-triggers the typing when the same question is picked again. */
function useTypedAnswer(text: string, delay: number, instant: boolean, nonce: number) {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (instant) {
      setShown(text);
      return;
    }
    setShown('');
    let i = 0;
    let typer: ReturnType<typeof setInterval>;
    const starter = setTimeout(() => {
      typer = setInterval(() => {
        i += 1;
        setShown(text.slice(0, i));
        if (i >= text.length) clearInterval(typer);
      }, TYPE_MS);
    }, delay);

    return () => {
      clearTimeout(starter);
      clearInterval(typer);
    };
  }, [text, delay, instant, nonce]);

  return shown;
}

/** Twelve bars that only move while the voice is still talking. */
function Waveform({ live }: { live: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-6" aria-hidden>
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-[#F5B700] origin-center"
          style={{
            height: live ? undefined : '4px',
            animation: live ? `tw-bar 900ms ease-in-out ${i * 70}ms infinite` : 'none',
          }}
        />
      ))}
    </div>
  );
}

export default function OneBrain() {
  const [active, setActive] = useState(0);
  // Typing stays OFF until the section is actually scrolled to. Otherwise
  // hundreds of state updates run during page load for an animation nobody is
  // looking at yet, which costs real FCP and blocking time. Until then the
  // answer simply renders in full, so it is correct without JS too.
  const [armed, setArmed] = useState(false);
  const [instant, setInstant] = useState(false);
  const [round, setRound] = useState(0); // forces a re-type when the same question is re-picked
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setInstant(calm);
    if (calm) return;

    const wrap = wrapRef.current;
    if (!wrap) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setArmed(true);
      },
      { rootMargin: '0px 0px -20% 0px' }
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, []);

  const ex = EXCHANGES[active];
  const still = instant || !armed;
  const pageText = useTypedAnswer(ex.a, 0, still, round);
  const phoneText = useTypedAnswer(ex.a, PHONE_LAG_MS, still, round);
  const phoneTalking = !still && phoneText.length > 0 && phoneText.length < ex.a.length;

  function pick(i: number) {
    setActive(i);
    setRound((r) => r + 1);
  }

  return (
    <div ref={wrapRef} className="relative">
      <style>{`
        @keyframes tw-bar {
          0%, 100% { height: 4px; }
          50% { height: 22px; }
        }
        @keyframes tw-pulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* The question chips: a real customer, picking their words. */}
      <div className="flex flex-wrap gap-2.5">
        {EXCHANGES.map((e, i) => (
          <button
            key={e.q}
            type="button"
            onClick={() => pick(i)}
            aria-pressed={i === active}
            className={`rounded-full border-2 border-[#161616] px-4 py-2.5 font-sans text-[12.5px] font-bold transition-all ${
              i === active
                ? 'bg-[#161616] text-[#F5B700] shadow-[3px_3px_0_0_#F5B700]'
                : 'bg-white text-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5'
            }`}
          >
            <span className="sm:hidden">{e.short}</span>
            <span className="hidden sm:inline">{e.q}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 grid lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-4 items-stretch">
        {/* ── The website ── */}
        <div className="flex flex-col rounded-2xl border-2 border-[#161616] bg-white shadow-[6px_6px_0_0_#161616] overflow-hidden">
          <div className="flex items-center gap-2 px-4 h-10 border-b-2 border-[#161616] bg-[#FBF6EA]">
            <span className="flex gap-1.5">
              {['#E0301E', '#F5B700', '#8FA98F'].map((c) => (
                <span key={c} className="h-3 w-3 rounded-full border border-[#161616]" style={{ background: c }} />
              ))}
            </span>
            <span className="ml-2 flex-1 truncate rounded-full border border-[#161616]/30 bg-white px-3 py-1 font-mono text-[11px] text-[#161616]/65">
              summitridgeroofing.com
            </span>
          </div>
          <div className="p-6 flex-1 flex flex-col">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#C4160B] font-bold">
              On the website
            </p>
            <p className="font-body text-[13.5px] text-[#161616]/70 mt-3">{ex.q}</p>
            <p className="font-body text-[15px] text-[#161616] mt-2 leading-relaxed flex-1">
              {pageText}
              {!still && pageText.length < ex.a.length && (
                <span className="inline-block w-[2px] h-[1.1em] align-[-0.15em] ml-[1px] bg-[#161616] animate-pulse" aria-hidden />
              )}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#161616]/70 mt-5 pt-4 border-t-2 border-dashed border-[#161616]/20">
              Typed in the chat, 11:04pm
            </p>
          </div>
        </div>

        {/* ── The brain in the middle ── */}
        <div className="flex lg:flex-col items-center justify-center gap-3 lg:w-24">
          <span className="hidden lg:block h-full w-[2px] bg-[#161616]/15" aria-hidden />
          <div className="shrink-0 rounded-full border-2 border-[#161616] bg-[#F5B700] px-4 py-3 shadow-[3px_3px_0_0_#161616] text-center">
            <span className="block font-mono text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#161616] leading-tight">
              One
              <br />
              brain
            </span>
          </div>
          <span className="hidden lg:block h-full w-[2px] bg-[#161616]/15" aria-hidden />
          <span className="lg:hidden h-[2px] flex-1 bg-[#161616]/15" aria-hidden />
        </div>

        {/* ── The phone call ── */}
        <div className="flex flex-col rounded-2xl border-2 border-[#161616] bg-[#161616] shadow-[6px_6px_0_0_#F5B700] overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 h-10 border-b-2 border-[#F5B700]/25 bg-[#0F1422]">
            <span className="h-2 w-2 rounded-full bg-[#8FA98F]" style={{ animation: 'tw-pulse 1.6s ease-in-out infinite' }} aria-hidden />
            <span className="font-mono text-[11px] text-[#FBF6EA]/70">Incoming call, 11:04pm</span>
          </div>
          <div className="p-6 flex-1 flex flex-col">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F5B700] font-bold">On the phone</p>
            <p className="font-body text-[13.5px] text-[#FBF6EA]/55 mt-3">{ex.q}</p>
            <p className="font-body text-[15px] text-[#FBF6EA] mt-2 leading-relaxed flex-1">
              {phoneText}
              {phoneTalking && (
                <span className="inline-block w-[2px] h-[1.1em] align-[-0.15em] ml-[1px] bg-[#F5B700] animate-pulse" aria-hidden />
              )}
            </p>
            <div className="mt-5 pt-4 border-t-2 border-dashed border-[#FBF6EA]/20 flex items-center justify-between gap-3">
              <Waveform live={phoneTalking} />
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#FBF6EA]/50">Answered on ring one</p>
            </div>
          </div>
        </div>
      </div>

      <p className="font-body text-[13px] text-[#161616]/70 mt-5">
        An example built for a roofing company. Same answer, same manners, same hours, because the page and the phone
        read from one brain. Change your price once and both mouths change with it.
      </p>
    </div>
  );
}
