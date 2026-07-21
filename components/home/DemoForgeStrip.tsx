'use client';

/**
 * THE FORGE WIRE. Homepage-only broadcast strip pinned directly under the
 * fixed navbar: a live forge terminal ticking through what the Demo Station
 * builds free, with one hard CTA to /demos. Dark is reserved for terminal
 * panes site-wide; this IS a terminal pane, so the ink band is on-language.
 *
 * SSR renders a static promise line; the typing loop progressively enhances
 * it client-side and stands down under prefers-reduced-motion.
 */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { track } from '@vercel/analytics';

const STATIC_LINE = 'we forge your website, receptionist, and command center FREE, before you pay a cent';

const FORGE_LINES = [
  'forging: a website for a roofing crew... live tour in 61 seconds',
  'forging: an AI receptionist for a med spa... she answers on the first ring',
  'forging: a command center for a food truck... every order on one screen',
  'forging: the whole system for a dental office... one login runs it all',
  'your business is next. no card, no call, just your name and trade',
];

function useForgeTyping(enabled: boolean) {
  const [text, setText] = useState(STATIC_LINE);
  const idx = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    const typeLine = (line: string, pos: number) => {
      if (!alive) return;
      setText(line.slice(0, pos));
      if (pos < line.length) {
        timer = setTimeout(() => typeLine(line, pos + 1), 24 + Math.random() * 26);
      } else {
        timer = setTimeout(nextLine, 2100);
      }
    };

    const nextLine = () => {
      if (!alive) return;
      idx.current = (idx.current + 1) % FORGE_LINES.length;
      typeLine(FORGE_LINES[idx.current], 0);
    };

    timer = setTimeout(() => typeLine(FORGE_LINES[0], 0), 900);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [enabled]);

  return text;
}

export default function DemoForgeStrip() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const line = useForgeTyping(animate);

  return (
    <Link
      href="/demos"
      onClick={() => track('demo_forge_strip_click')}
      aria-label="The Demo Forge: we build your website, AI receptionist, and command center free, before you pay a cent. See yours built at the Demo Station."
      className="group relative block w-full overflow-hidden border-b-2 border-[#161616] bg-[#080C16] mt-[66px] md:mt-[70px]"
    >
      <style>{`
        @keyframes mm-forge-sheen { 0% { transform: translateX(-130%) skewX(-18deg); } 100% { transform: translateX(430%) skewX(-18deg); } }
        @keyframes mm-forge-ping { 0% { transform: scale(1); opacity: .8; } 70%, 100% { transform: scale(2.4); opacity: 0; } }
        @keyframes mm-forge-caret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .mm-forge-sheen, .mm-forge-ping-dot, .mm-forge-caret { animation: none !important; }
        }
      `}</style>

      {/* ember glow + passing sheen */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: 'radial-gradient(60% 140% at 12% 50%, rgba(245,183,0,0.22), transparent 60%)' }}
      />
      <span
        aria-hidden
        className="mm-forge-sheen pointer-events-none absolute inset-y-0 w-1/4"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,221,85,0.14), transparent)', animation: 'mm-forge-sheen 5.5s linear infinite' }}
      />

      <span className="relative mx-auto flex max-w-7xl items-center gap-3 md:gap-5 px-4 md:px-8 py-3 md:py-3.5">
        {/* live dot + label */}
        <span className="flex shrink-0 items-center gap-2">
          <span aria-hidden className="relative flex h-2.5 w-2.5">
            <span className="mm-forge-ping-dot absolute inline-flex h-full w-full rounded-full bg-[#E0301E]" style={{ animation: 'mm-forge-ping 1.6s cubic-bezier(0,0,.2,1) infinite' }} />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#E0301E]" />
          </span>
          <span className="font-mono text-[10px] md:text-[11px] font-bold uppercase tracking-[0.28em] text-[#FFDD55]">
            The Demo Forge
          </span>
          <span aria-hidden className="hidden sm:inline font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#F5B700]/50">
            // Live
          </span>
        </span>

        {/* the wire: typing on md+, hard promise on small screens */}
        <span aria-hidden className="hidden md:block min-w-0 flex-1 truncate font-mono text-[12px] font-medium tracking-[0.04em] text-[#F5B700]">
          <span className="text-[#F5B700]/60">&gt; </span>
          {line}
          <span className="mm-forge-caret inline-block w-[7px] -mb-[2px] border-b-2 border-[#FFDD55] ml-0.5" style={{ animation: 'mm-forge-caret 1s step-end infinite' }} />
        </span>
        <span aria-hidden className="hidden sm:block md:hidden min-w-0 flex-1 truncate font-mono text-[11px] font-medium text-[#F5B700]">
          Your demo, built free, before you pay a cent
        </span>

        {/* the ask */}
        <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#F5B700] px-3.5 md:px-5 py-1.5 font-sans text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#161616] shadow-[0_0_0_1px_#161616,3px_3px_0_0_rgba(245,183,0,0.25)] transition-all group-hover:-translate-y-[1px] group-hover:gap-2.5">
          <span className="hidden sm:inline">See Yours Built</span>
          <span className="sm:hidden">See Yours</span>
          <span aria-hidden>→</span>
        </span>
      </span>
    </Link>
  );
}
