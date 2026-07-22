'use client';

import { useState } from 'react';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import { GOALS, deptByKey } from '@/data/services-hub';

/**
 * The signature moment for /services: a goal router. The visitor picks what they
 * are actually trying to do, and the right doors surface with a one-tap path in.
 * Turns a wall of services into "here is exactly where you go." Pop-art cabin.
 */

export default function PathFinder() {
  const [i, setI] = useState(0);
  const goal = GOALS[i];
  const depts = goal.deptKeys.map((k) => deptByKey[k]).filter(Boolean);

  const pick = (idx: number) => {
    setI(idx);
    track('services_pathfinder', { goal: GOALS[idx].label });
  };

  return (
    <div className="rounded-2xl border-2 border-[#161616] bg-white shadow-[8px_8px_0_0_#161616] p-6 md:p-8">
      <span className="font-mono font-bold text-[10px] uppercase tracking-[0.28em] text-[#C4160B] block">
        I want to…
      </span>

      {/* Goal chips */}
      <div className="mt-4 flex flex-wrap gap-2.5">
        {GOALS.map((g, idx) => {
          const on = idx === i;
          return (
            <button
              key={g.label}
              type="button"
              onClick={() => pick(idx)}
              aria-pressed={on}
              className={`inline-flex items-center gap-2 rounded-full border-2 border-[#161616] px-4 py-2 text-[13px] font-sans font-bold transition-all ${
                on ? 'bg-[#161616] text-[#F5B700] shadow-[3px_3px_0_0_#F5B700]' : 'bg-[#FBF6EA] text-[#161616] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#161616]'
              }`}
            >
              <span aria-hidden>{g.emoji}</span> {g.label}
            </button>
          );
        })}
      </div>

      {/* The recommendation */}
      <div className="mt-7 border-t-2 border-dashed border-[#161616]/20 pt-6">
        <p className="font-body text-[15px] text-[#161616]/80 leading-relaxed max-w-2xl">
          <span className="font-bold text-[#161616]">Start here.</span> {goal.note}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {depts.map((d) => (
            <Link
              key={d.key}
              href={d.href}
              onClick={() => track('services_pathfinder_dept', { dept: d.key })}
              className="group flex flex-col rounded-2xl border-2 border-[#161616] bg-[#FBF6EA] p-5 shadow-[4px_4px_0_0_#161616] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#F5B700] transition-all animate-[pfIn_.4s_ease-out_both]"
            >
              <span className="text-2xl leading-none" aria-hidden>{d.icon}</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] font-bold text-[#C4160B] mt-2.5">{d.tag}</span>
              <span className="font-display italic font-extrabold text-xl text-[#161616] mt-1 leading-tight">{d.name}</span>
              <span className="font-body text-[12.5px] text-[#161616]/75 mt-2 leading-relaxed flex-1">{d.blurb}</span>
              <span className="font-sans font-bold text-[11px] uppercase tracking-[0.14em] text-[#161616] mt-4 inline-flex items-center gap-1">
                Open it <span className="group-hover:translate-x-1 transition-transform" aria-hidden>→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
      <style>{`@keyframes pfIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
