'use client';

/**
 * A DAY WITH YOUR CHIEF. The signature moment for /chief.
 *
 * A single day, from the 6:30 wake-up call to the 9pm wind-down, scrubbed on a
 * slider. As you drag, the sky rises and sets and the sun arcs overhead into a
 * moon at night, while the moment card crossfades to the one real thing The
 * Chief handled at that hour. Fully keyboard accessible (native range input,
 * arrow keys move stop to stop) and reduced-motion safe. No libraries, no
 * external art, everything CSS so it stays fast.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { chiefDay, type ChiefMoment } from '@/data/chief';

/** Sky span the sun travels across: 6:00a to 10:00p. */
const DAY_START = 360;
const DAY_END = 1320;

/** Art-directed sky per moment, bottom-to-top read as horizon-to-zenith. */
const SKY: Record<ChiefMoment['prop'], string> = {
  sunrise: 'linear-gradient(180deg,#33265c 0%,#a75f7e 46%,#f0a15f 100%)',
  inbox: 'linear-gradient(180deg,#6f8fc9 0%,#c8a9a2 58%,#f4d9a8 100%)',
  calendar: 'linear-gradient(180deg,#6ea8de 0%,#bcd9ec 55%,#f3ead0 100%)',
  research: 'linear-gradient(180deg,#5a9fda 0%,#bfe0ef 58%,#eef4f2 100%)',
  followup: 'linear-gradient(180deg,#4f9bdc 0%,#cfe8f2 58%,#f4f4e6 100%)',
  roleplay: 'linear-gradient(180deg,#3f92dc 0%,#cfe9f4 54%,#fbf6ea 100%)',
  leads: 'linear-gradient(180deg,#5a9fd6 0%,#d7e6ea 55%,#f6e9c8 100%)',
  errand: 'linear-gradient(180deg,#7a9fc4 0%,#e2c79f 68%,#f4c98a 100%)',
  brief: 'linear-gradient(180deg,#8a5a86 0%,#d97b4a 54%,#f4b25f 100%)',
  moon: 'linear-gradient(180deg,#05060f 0%,#141a3e 56%,#2a2f5c 100%)',
};

function sunAt(minutes: number) {
  const t = Math.min(1, Math.max(0, (minutes - DAY_START) / (DAY_END - DAY_START)));
  const elevation = Math.sin(t * Math.PI); // 0 at horizons, 1 at zenith
  return {
    left: t * 100,
    top: 76 - 60 * elevation, // % from top: low at dawn/dusk, high at midday
    night: minutes >= 1200,
    // warm at the horizons, bright and pale at the top of the day
    tint: minutes >= 1200 ? '#e8ecf7' : elevation > 0.6 ? '#fff3c4' : '#ffcf87',
    glow: minutes >= 1200 ? 'rgba(210,220,245,0.55)' : elevation > 0.6 ? 'rgba(255,231,150,0.85)' : 'rgba(255,168,92,0.8)',
  };
}

export default function DayWithYourChief() {
  const [i, setI] = useState(0);
  const [touched, setTouched] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const region = useRef<HTMLDivElement | null>(null);

  const stop = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const onUser = useCallback((next: number) => {
    setTouched(true);
    stop();
    setI(next);
  }, []);

  // Gentle one-pass auto-demo on first view, only if the user has not grabbed
  // it and only if they are okay with motion. It stops the moment they touch.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const el = region.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !touched && !timer.current) {
            timer.current = setInterval(() => {
              setI((prev) => {
                if (touched) return prev;
                if (prev >= chiefDay.length - 1) {
                  stop();
                  return prev;
                }
                return prev + 1;
              });
            }, 2600);
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop();
    };
  }, [touched]);

  const m = chiefDay[i];
  const sun = sunAt(m.at);

  return (
    <div
      ref={region}
      className="relative overflow-hidden rounded-2xl border-2 border-[#161616] shadow-[8px_8px_0_0_#161616]"
    >
      {/* ── Sky: stacked gradients, crossfaded by opacity ── */}
      <div className="relative h-[300px] sm:h-[360px]">
        {chiefDay.map((moment, idx) => (
          <div
            key={moment.time}
            aria-hidden
            className="absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none"
            style={{ background: SKY[moment.prop], opacity: idx === i ? 1 : 0 }}
          />
        ))}

        {/* Stars, only lit at night */}
        <div
          aria-hidden
          className="absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none"
          style={{ opacity: sun.night ? 1 : 0 }}
        >
          {[
            [12, 22], [24, 40], [38, 16], [52, 30], [63, 14], [71, 38], [83, 20], [90, 44], [46, 48], [17, 54],
          ].map(([l, t], s) => (
            <span
              key={s}
              className="absolute rounded-full bg-white"
              style={{ left: `${l}%`, top: `${t}%`, width: s % 3 ? 2 : 3, height: s % 3 ? 2 : 3, opacity: 0.85 }}
            />
          ))}
        </div>

        {/* Sun / moon on its arc */}
        <div
          aria-hidden
          className="absolute transition-all duration-700 ease-out motion-reduce:transition-none"
          style={{
            left: `${sun.left}%`,
            top: `${sun.top}%`,
            width: 64,
            height: 64,
            transform: 'translate(-50%,-50%)',
            borderRadius: '9999px',
            background: `radial-gradient(circle at 50% 45%, ${sun.tint} 0%, ${sun.tint} 55%, transparent 72%)`,
            boxShadow: `0 0 60px 14px ${sun.glow}`,
          }}
        />

        {/* Rolling hills, so the sun sets behind a horizon */}
        <svg aria-hidden className="absolute bottom-0 left-0 w-full" viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ height: 90 }}>
          <path d="M0,70 C220,20 380,96 620,70 C820,48 1000,104 1200,66 L1200,120 L0,120 Z" fill="#161616" opacity="0.92" />
          <path d="M0,96 C260,64 520,112 760,90 C980,70 1080,104 1200,92 L1200,120 L0,120 Z" fill="#161616" />
        </svg>

        {/* Time-of-day chip, top-left */}
        <div className="absolute left-4 top-4">
          <span className="font-mono font-bold text-[11px] uppercase tracking-[0.2em] text-white/95 bg-[#161616]/45 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/25">
            {m.time} // {m.tag}
          </span>
        </div>
      </div>

      {/* ── The moment card ── */}
      <div className="bg-[#FBF6EA] border-t-2 border-[#161616] px-5 py-6 sm:px-8 sm:py-7">
        <div key={m.time} className="cxc-fade min-h-[128px] sm:min-h-[112px]">
          <h3 className="font-display italic font-extrabold text-2xl sm:text-[1.9rem] leading-[1.05]">{m.title}</h3>
          <p className="font-body text-[14.5px] sm:text-[15px] text-[#161616]/75 mt-2.5 leading-relaxed max-w-2xl">{m.line}</p>
        </div>

        {/* Scrubber */}
        <div className="mt-6">
          <label htmlFor="chief-day" className="sr-only">
            Scrub through a day with The Chief
          </label>
          <input
            id="chief-day"
            type="range"
            min={0}
            max={chiefDay.length - 1}
            step={1}
            value={i}
            onChange={(e) => onUser(Number(e.target.value))}
            onPointerDown={() => setTouched(true)}
            aria-valuetext={`${m.time}, ${m.title}`}
            className="chief-range w-full"
          />

          <div className="mt-3 flex items-center justify-between">
            {chiefDay.map((moment, idx) => (
              <button
                key={moment.time}
                type="button"
                onClick={() => onUser(idx)}
                aria-label={`${moment.time}, ${moment.tag}`}
                aria-pressed={idx === i}
                className="group flex flex-col items-center gap-1.5 py-1"
              >
                <span
                  className="block rounded-full border-2 border-[#161616] transition-all"
                  style={{
                    width: idx === i ? 13 : 9,
                    height: idx === i ? 13 : 9,
                    background: idx === i ? '#F5B700' : idx < i ? '#161616' : '#FBF6EA',
                  }}
                />
                <span
                  className={`font-mono text-[9px] sm:text-[10px] tracking-tight tabular-nums transition-colors ${
                    idx === i ? 'text-[#161616] font-bold' : 'text-[#161616]/40 group-hover:text-[#161616]/70'
                  }`}
                >
                  {moment.time}
                </span>
              </button>
            ))}
          </div>

          {!touched && (
            <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-[#8f6600] animate-pulse">
              Drag the day →
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        .cxc-fade {
          animation: cxcFade 500ms ease-out;
        }
        @keyframes cxcFade {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        :global(.chief-range) {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 9999px;
          background: #16161622;
          border: 2px solid #161616;
          outline-offset: 3px;
          cursor: pointer;
        }
        :global(.chief-range::-webkit-slider-thumb) {
          -webkit-appearance: none;
          appearance: none;
          width: 26px;
          height: 26px;
          border-radius: 9999px;
          background: #f5b700;
          border: 2px solid #161616;
          box-shadow: 3px 3px 0 0 #161616;
          cursor: grab;
          margin-top: -1px;
        }
        :global(.chief-range::-webkit-slider-thumb:active) {
          cursor: grabbing;
        }
        :global(.chief-range::-moz-range-thumb) {
          width: 26px;
          height: 26px;
          border-radius: 9999px;
          background: #f5b700;
          border: 2px solid #161616;
          box-shadow: 3px 3px 0 0 #161616;
          cursor: grab;
        }
        @media (prefers-reduced-motion: reduce) {
          .cxc-fade {
            animation: none;
          }
          :global(.animate-pulse) {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
