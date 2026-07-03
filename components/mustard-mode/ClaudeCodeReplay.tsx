'use client';

/**
 * A midnight terminal replaying a real Claude Code session (the booking-page
 * build from the studio's own workflow), typed on when it scrolls into view,
 * then looping with a breath. This is the "real machine footage" of the page:
 * no video payload, always crisp, honest content.
 */

import { useEffect, useRef, useState } from 'react';

type Line = { kind: 'user' | 'think' | 'ok' | 'out' | 'claude'; text: string; pause?: number };

const SESSION: Line[] = [
  { kind: 'user', text: '> Build me a booking page for my photography studio. Three packages, a date picker, and an inquiry form that emails me.' },
  { kind: 'think', text: '✻ Planning… (reading CLAUDE.md for your brand + packages)' },
  { kind: 'ok', text: '✓ created app/book/page.tsx' },
  { kind: 'ok', text: '✓ created components/PackagePicker.tsx' },
  { kind: 'ok', text: '✓ created components/DateField.tsx' },
  { kind: 'ok', text: '✓ created app/api/inquiry/route.ts (sends you the email)' },
  { kind: 'out', text: '14 files · build passing · 2m 41s', pause: 700 },
  { kind: 'user', text: '> Now make it feel like MY studio. Warm, editorial, not a template.' },
  { kind: 'think', text: '✻ Redesigning… (loading your fonts, palette, photo crops)' },
  { kind: 'ok', text: '✓ typography: Fraunces display + your gallery grid' },
  { kind: 'ok', text: '✓ hero: your best shot, full bleed, name set large' },
  { kind: 'out', text: 'screenshot verified at 375 / 768 / 1440 · deployed preview', pause: 900 },
  { kind: 'claude', text: 'MR.MUSTARD: That is one evening, mission 6 of the Code track. Your turn.' },
];

export default function ClaudeCodeReplay() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [started, setStarted] = useState(false);
  const [visibleLines, setVisibleLines] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // Start when scrolled into view.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStarted(true);
      setVisibleLines(SESSION.length);
      setCharCount(Infinity);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The typewriter loop.
  useEffect(() => {
    if (!started || visibleLines >= SESSION.length + 1) return;
    if (charCount === Infinity) return;
    const line = SESSION[Math.min(visibleLines, SESSION.length - 1)];
    if (visibleLines >= SESSION.length) return;

    if (charCount < line.text.length) {
      const isTyped = line.kind === 'user';
      const t = setTimeout(() => setCharCount((c) => c + (isTyped ? 1 : 4)), isTyped ? 26 : 10);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setVisibleLines((l) => l + 1);
      setCharCount(0);
    }, line.pause ?? (line.kind === 'user' ? 500 : 180));
    return () => clearTimeout(t);
  }, [started, visibleLines, charCount]);

  // Loop after a long breath.
  useEffect(() => {
    if (visibleLines < SESSION.length || charCount === Infinity) return;
    const t = setTimeout(() => {
      setVisibleLines(0);
      setCharCount(0);
    }, 9000);
    return () => clearTimeout(t);
  }, [visibleLines, charCount]);

  const color = (k: Line['kind']) =>
    k === 'user' ? 'text-white' : k === 'think' ? 'text-[#7aa2ff]' : k === 'ok' ? 'text-[#7dd486]' : k === 'claude' ? 'text-[#FFDD55]' : 'text-[#5C7188]';

  return (
    <div ref={wrapRef} className="bg-[#080C16] border-2 border-[#161616] shadow-[8px_8px_0_0_#161616] overflow-hidden">
      <div className="flex items-center gap-2 bg-[#0F1422] px-4 py-2.5 border-b border-white/10">
        <span className="w-2.5 h-2.5 rounded-full bg-[#E0301E]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#F5B700]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#3fbf6b]" />
        <span className="font-mono text-[10px] text-[#5C7188] ml-2">claude — a real session, replayed</span>
        <span className="ml-auto font-mono text-[9px] font-bold text-[#E0301E] tracking-widest">● REC</span>
      </div>
      <div className="p-5 md:p-6 font-mono text-[12px] md:text-[13px] leading-[1.9] min-h-[340px]">
        {SESSION.slice(0, visibleLines).map((l, i) => (
          <div key={i} className={color(l.kind)}>{l.text}</div>
        ))}
        {visibleLines < SESSION.length && started && (
          <div className={color(SESSION[visibleLines].kind)}>
            {SESSION[visibleLines].text.slice(0, charCount)}
            <span className="inline-block w-2 h-4 bg-[#F5B700] align-[-2px] animate-pulse ml-0.5" />
          </div>
        )}
      </div>
    </div>
  );
}
