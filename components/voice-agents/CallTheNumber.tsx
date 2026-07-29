'use client';

import { useEffect, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { DEMO_LINE } from '@/data/trade-pages';

/**
 * THE signature moment on /voice-agents: the phone number, screenprinted at
 * poster scale, ringing.
 *
 * Three offset color plates (red / blue / gold) fake the misregistration of a
 * mid-century screenprint, concentric ring waves pulse out from behind it, and
 * the whole thing is one giant tel: link. Below it, a rotating list of things
 * to actually ask Mr. Mustard, because "call this number" converts far better
 * when the visitor knows what to say when he picks up.
 */

const ASKS = [
  'Pretend you are answering the phone for my landscaping company.',
  'A customer is calling at 2am with a burst pipe. Go.',
  'How would you handle my Friday dinner rush?',
  'What would you do for a med spa with two front desk staff?',
  'Book me a real call with Sarah, right now, without hanging up.',
  'Say all of that again in Spanish.',
];

/**
 * One chunk of the number, printed in three misregistered color plates
 * (red / blue / gold). The offsets are text-shadows, not duplicated text
 * nodes, so screen readers and Lighthouse see exactly one phone number. The
 * misregistration widens on hover, the way a press drifts.
 */
function Plate({ text }: { text: string }) {
  return (
    <span className="text-[#F5B700] transition-all duration-500 ease-out [text-shadow:-0.03em_-0.024em_0_#E0301E,0.03em_0.024em_0_#1E50C8] group-hover:[text-shadow:-0.062em_-0.05em_0_#E0301E,0.062em_0.05em_0_#1E50C8]">
      {text}
    </span>
  );
}

export default function CallTheNumber({ location = 'voice-agents-hero' }: { location?: string }) {
  const [ask, setAsk] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setAsk((n) => (n + 1) % ASKS.length), 4200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative">
      {/* Ring waves radiating off the number */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="ring-wave"
            style={{
              width: 'min(560px, 78vw)',
              height: 'min(560px, 78vw)',
              animationDelay: `${i * 1.05}s`,
            }}
          />
        ))}
      </div>

      <div className="relative text-center">
        <span className="inline-flex items-center gap-2.5 rounded-full border-2 border-[#F5B700] bg-[#F5B700]/10 px-4 py-1.5 font-mono text-[10px] md:text-[11px] font-bold uppercase tracking-[0.22em] text-[#F5B700]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E0301E] opacity-80" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#E0301E]" />
          </span>
          The Line Is Open. Right Now.
        </span>

        <p className="mt-7 font-body text-base md:text-lg text-[#FBF6EA]/70">
          Call it. Ask what he could do for your business.
        </p>

        {/* The number, at poster scale */}
        <a
          href={`tel:${DEMO_LINE.tel}`}
          onClick={() => trackEvent('call_the_number', { location, number: DEMO_LINE.display })}
          aria-label={`Call Mr. Mustard at ${DEMO_LINE.display}`}
          className="group mt-3 block select-none focus:outline-none focus-visible:ring-4 focus-visible:ring-[#F5B700]/60 rounded-3xl"
        >
          <span className="block text-center font-display font-black leading-[0.9] tracking-[-0.02em] text-[clamp(3.75rem,11.5vw,9rem)] transition-transform duration-500 ease-out group-hover:-translate-y-1">
            <Plate text={DEMO_LINE.display} />
          </span>
        </a>

        {/* Sound bars: he is on the line */}
        <div aria-hidden="true" className="mt-6 flex items-end justify-center gap-[4px] h-9">
          {[0.5, 0.9, 0.35, 1, 0.6, 0.85, 0.4, 0.95, 0.55, 0.75, 0.3, 0.9, 0.45, 0.7, 0.35].map((h, i) => (
            <span
              key={i}
              className="w-[4px] rounded-full bg-[#F5B700]/75 origin-bottom animate-eq"
              style={{ height: `${h * 36}px`, animationDelay: `${i * 0.09}s` }}
            />
          ))}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={`tel:${DEMO_LINE.tel}`}
            onClick={() => trackEvent('call_the_number', { location: `${location}-button` })}
            className="w-full sm:w-auto rounded-full border-2 border-[#161616] bg-[#F5B700] px-9 py-4 font-sans text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#161616] shadow-[5px_5px_0_0_#FBF6EA] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#FBF6EA]"
          >
            ☎ Tap To Call Him
          </a>
          <a
            href="#browser-demo"
            className="w-full sm:w-auto rounded-full border-2 border-[#FBF6EA]/45 bg-transparent px-9 py-4 font-sans text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#FBF6EA] transition-all hover:border-[#FBF6EA] hover:-translate-y-0.5"
          >
            Or Talk In This Browser
          </a>
        </div>

        {/* Rotating "what to ask him" line */}
        <div className="mt-9 min-h-[3.5rem] flex items-start justify-center px-2">
          <p className="max-w-lg font-body text-sm md:text-[15px] leading-relaxed text-[#FBF6EA]/60">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#F5B700] mr-2">
              Try This
            </span>
            <span key={ask} className="italic animate-fade-in">
              &ldquo;{ASKS[ask]}&rdquo;
            </span>
          </p>
        </div>

        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#FBF6EA]/55">
          Free · No script · He tells you he is an AI in the first sentence
        </p>
      </div>
    </div>
  );
}
