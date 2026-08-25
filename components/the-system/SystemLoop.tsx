'use client';

import { useEffect, useRef, useState } from 'react';
import { STATIONS } from '@/data/the-system';

/**
 * The loop, drawn as a ring of eight stations around one brain.
 *
 * It advances on its own every few seconds so a visitor who never touches it
 * still watches a lead travel the whole cycle. Hover or focus any station to
 * stop the clock and read it; leave and it starts again. Reduced-motion users
 * get a still ring with the first station open and full keyboard control.
 */

const SIZE = 640;
const CENTER = SIZE / 2;
const RADIUS = 210;
const NODE = 34;
const AUTO_MS = 3400;

function pointAt(index: number, count: number, radius = RADIUS) {
  // Start at 12 o'clock, travel clockwise.
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return { x: CENTER + Math.cos(angle) * radius, y: CENTER + Math.sin(angle) * radius };
}

export default function SystemLoop() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (paused || reduced.current) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % STATIONS.length), AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const station = STATIONS[active];
  const count = STATIONS.length;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % count);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + count) % count);
    }
  };

  return (
    <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-10 lg:gap-14 items-center">
      {/* The ring. The -mx-6/px-6 clip lets side labels use the page gutter
          on phones without ever widening the document. */}
      <div className="-mx-6 px-6 overflow-hidden lg:mx-0 lg:px-0 lg:overflow-visible">
      <div
        className="relative mx-auto w-full max-w-[600px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onKeyDown={onKey}
        role="group"
        aria-label="The loop: eight stations a lead travels through, from found to grown"
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-auto select-none" aria-hidden="true">
          {/* Outer halftone disc */}
          <defs>
            <pattern id="loop-dots" width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="7" cy="7" r="1.6" fill="#F5B700" opacity="0.55" />
            </pattern>
          </defs>
          <circle cx={CENTER} cy={CENTER} r={RADIUS + 58} fill="url(#loop-dots)" />

          {/* Track */}
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#161616" strokeWidth="3" />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="#F5B700"
            strokeWidth="10"
            strokeDasharray="14 10"
            strokeLinecap="round"
            opacity="0.9"
          >
            <animateTransform attributeName="transform" type="rotate" from={`0 ${CENTER} ${CENTER}`} to={`360 ${CENTER} ${CENTER}`} dur="48s" repeatCount="indefinite" />
          </circle>

          {/* Direction arrows between stations */}
          {STATIONS.map((_, i) => {
            const mid = pointAt(i + 0.5, count, RADIUS);
            const next = pointAt(i + 0.58, count, RADIUS);
            const angle = (Math.atan2(next.y - mid.y, next.x - mid.x) * 180) / Math.PI;
            return (
              <g key={`arrow-${i}`} transform={`translate(${mid.x} ${mid.y}) rotate(${angle})`}>
                <path d="M -7 -7 L 7 0 L -7 7 Z" fill="#161616" />
              </g>
            );
          })}

          {/* Centre: one brain */}
          <circle cx={CENTER} cy={CENTER} r={96} fill="#161616" />
          <circle cx={CENTER} cy={CENTER} r={84} fill="none" stroke="#F5B700" strokeWidth="2" strokeDasharray="4 6" />
          <text x={CENTER} y={CENTER - 14} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="11" fill="#F5B700" fontWeight="700" letterSpacing="3">
            ONE BOARD
          </text>
          <text x={CENTER} y={CENTER + 18} textAnchor="middle" fontFamily="'Playfair Display', Georgia, serif" fontSize="30" fontStyle="italic" fontWeight="800" fill="#FBF6EA">
            one brain
          </text>

          {/* Spokes from brain to the active station */}
          {STATIONS.map((_, i) => {
            const p = pointAt(i, count);
            const isActive = i === active;
            return (
              <line
                key={`spoke-${i}`}
                x1={CENTER}
                y1={CENTER}
                x2={p.x}
                y2={p.y}
                stroke={isActive ? '#E0301E' : '#161616'}
                strokeWidth={isActive ? 4 : 1.5}
                strokeDasharray={isActive ? '0' : '3 7'}
                opacity={isActive ? 1 : 0.35}
                style={{ transition: 'stroke 300ms, stroke-width 300ms, opacity 300ms' }}
              />
            );
          })}
        </svg>

        {/* Stations as real buttons over the SVG for hit targets and a11y */}
        {STATIONS.map((s, i) => {
          const p = pointAt(i, count);
          const isActive = i === active;
          return (
            <button
              key={s.code}
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              aria-pressed={isActive}
              aria-label={`Station ${s.code}, ${s.verb}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#161616] font-mono font-extrabold text-[11px] uppercase tracking-[0.12em] transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1E50C8]/50"
              style={{
                left: `${(p.x / SIZE) * 100}%`,
                top: `${(p.y / SIZE) * 100}%`,
                width: `${((NODE * 2) / SIZE) * 100}%`,
                aspectRatio: '1 / 1',
                background: isActive ? '#E0301E' : '#FFFFFF',
                color: isActive ? '#FBF6EA' : '#161616',
                boxShadow: isActive ? '4px 4px 0 0 #161616' : '3px 3px 0 0 #161616',
                transform: `translate(-50%, -50%) scale(${isActive ? 1.18 : 1})`,
              }}
            >
              {s.code}
            </button>
          );
        })}

        {/* Station labels, anchored away from their node so none overlap it */}
        {STATIONS.map((s, i) => {
          const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const side = cos > 0.3 ? 'right' : cos < -0.3 ? 'left' : 'mid';
          const r = side === 'mid' ? RADIUS + NODE + 26 : RADIUS + NODE + 6;
          const p = { x: CENTER + cos * r, y: CENTER + sin * r };
          const isActive = i === active;
          const translate = side === 'right' ? 'translate(0, -50%)' : side === 'left' ? 'translate(-100%, -50%)' : 'translate(-50%, -50%)';
          return (
            <span
              key={`label-${s.code}`}
              aria-hidden="true"
              className="absolute font-sans font-extrabold uppercase text-[9px] tracking-[0.1em] sm:text-[11px] sm:tracking-[0.14em] whitespace-nowrap pointer-events-none transition-colors duration-300"
              style={{
                left: `${(p.x / SIZE) * 100}%`,
                top: `${(p.y / SIZE) * 100}%`,
                transform: translate,
                color: isActive ? '#E0301E' : '#161616',
              }}
            >
              {s.verb}
            </span>
          );
        })}
      </div>
      </div>

      {/* The reading panel */}
      <div className="pop-card p-7 md:p-9 relative min-h-[360px] flex flex-col" aria-live="polite">
        <span className="absolute -top-4 left-6 inline-block bg-[#E0301E] text-[#FBF6EA] font-mono font-bold text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] -rotate-2">
          Station {station.code} of {count}
        </span>
        <div className="flex items-center gap-3 mt-2">
          <span className="font-display italic font-extrabold text-5xl md:text-6xl text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
            {station.verb}
          </span>
        </div>
        <h3 className="font-display font-extrabold text-2xl md:text-[1.75rem] leading-[1.1] mt-4 text-[#161616]">{station.title}</h3>
        <p className="font-body text-[15px] leading-relaxed text-[#161616]/75 mt-4">{station.blurb}</p>
        <dl className="mt-6 grid sm:grid-cols-2 gap-4 border-t-2 border-dashed border-[#161616]/20 pt-5">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#C4160B] font-bold">Runs on</dt>
            <dd className="font-sans font-bold text-[14px] text-[#161616] mt-1">{station.runsOn}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#C4160B] font-bold">What you see</dt>
            <dd className="font-sans text-[14px] text-[#161616]/80 mt-1">{station.proof}</dd>
          </div>
        </dl>
        <div className="mt-auto pt-6 flex items-center justify-between gap-4">
          <div className="flex gap-1.5" aria-hidden="true">
            {STATIONS.map((s, i) => (
              <span
                key={s.code}
                className="h-2 rounded-full border border-[#161616] transition-all duration-300"
                style={{ width: i === active ? 22 : 8, background: i === active ? '#E0301E' : '#FFFFFF' }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActive((a) => (a - 1 + count) % count)}
              className="w-10 h-10 rounded-full bg-white border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] font-bold hover:-translate-y-0.5 transition-transform"
              aria-label="Previous station"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setActive((a) => (a + 1) % count)}
              className="w-10 h-10 rounded-full bg-[#F5B700] border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] font-bold hover:-translate-y-0.5 transition-transform"
              aria-label="Next station"
            >
              →
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
