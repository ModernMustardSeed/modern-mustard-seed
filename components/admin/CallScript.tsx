'use client';

import Link from 'next/link';
import { useState } from 'react';
import AdminHeader from './AdminHeader';
import {
  CALL_GOAL,
  BEFORE_CALL,
  CALL_STEPS,
  LANE_CHEATSHEET,
  OBJECTIONS,
  AFTER_CALL,
  DO_LIST,
  DONT_LIST,
} from '@/data/sales-call-script';

export default function CallScript() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="script" title="Sales Call Script" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Goal banner */}
        <div className="bg-[#161616] rounded-2xl shadow-[5px_5px_0_0_#F5B700] p-6 md:p-7 mb-6">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#F5B700] font-mono font-bold block mb-2">The goal of every call</span>
          <p className="text-[#FBF6EA] font-body text-lg leading-relaxed">{CALL_GOAL}</p>
          <Link href="/admin/intake-call" className="inline-block mt-4 px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#F5B700] rounded-full hover:bg-[#FFD23F] transition-all">
            Open the Call companion to take notes →
          </Link>
        </div>

        {/* Before the call */}
        <Card>
          <Eyebrow>Prep</Eyebrow>
          <H>{BEFORE_CALL.title}</H>
          <ul className="space-y-2 mt-3">
            {BEFORE_CALL.items.map((it) => (
              <li key={it} className="text-[#3A3733] font-body text-sm flex gap-2.5 leading-relaxed"><span className="text-[#F5B700] mt-0.5">●</span>{it}</li>
            ))}
          </ul>
        </Card>

        {/* Lane cheat sheet */}
        <Card>
          <Eyebrow>Quick reference</Eyebrow>
          <H>What they say, what you say</H>
          <p className="text-[#3A3733] font-body text-sm mb-4">Listen for which one this is. Name only the lane that fits, in plain words.</p>
          <div className="space-y-3">
            {LANE_CHEATSHEET.map((l) => (
              <div key={l.lane} className="border-2 border-[#161616] rounded-xl p-4 bg-[#FFFDF6]">
                <span className="inline-block text-[9px] uppercase tracking-[0.2em] font-mono font-bold text-white bg-[#2D6A4F] rounded-md px-2.5 py-1 mb-2">{l.lane}</span>
                <p className="text-[#161616]/70 font-body text-sm"><span className="text-[#E0301E] font-mono text-[10px] uppercase tracking-[0.15em] mr-1.5">They say</span>{l.theySay}</p>
                <p className="text-[#161616] font-body text-sm mt-1"><span className="text-[#1E50C8] font-mono text-[10px] uppercase tracking-[0.15em] mr-1.5">You say</span>{l.youSay}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* The arc */}
        <div className="mt-8 mb-3">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-1">The call, step by step</span>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Follow the rail</h2>
        </div>
        <div className="space-y-4">
          {CALL_STEPS.map((s, i) => (
            <div key={i} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 md:p-6">
              <div className="flex items-start gap-3 mb-3">
                <span className="font-display text-2xl font-bold text-[#F5B700] leading-none">{i + 1}</span>
                <div>
                  <h3 className="font-sans font-bold text-[#161616] text-lg leading-tight">{s.label}</h3>
                  <p className="text-[#161616]/55 font-body text-xs mt-0.5">{s.goal}</p>
                </div>
              </div>
              <div className="space-y-2">
                {s.say.map((line, j) => (
                  <div key={j} className="flex items-start justify-between gap-3 rounded-lg bg-[#FFF8E6] border border-[#161616]/12 p-3">
                    <p className="font-body text-[15px] text-[#161616] leading-relaxed italic">"{line}"</p>
                    <button
                      onClick={() => copy(`${i}-${j}`, line)}
                      className="px-2.5 py-1 text-[9px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full hover:bg-[#FFD23F] transition-all shrink-0"
                    >
                      {copied === `${i}-${j}` ? '✓' : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[#161616]/55 font-body text-xs mt-3 leading-relaxed border-l-2 border-[#F5B700] pl-3"><span className="font-bold text-[#161616]/70 uppercase tracking-[0.1em] text-[10px]">Why </span>{s.note}</p>
            </div>
          ))}
        </div>

        {/* Objections */}
        <div className="mt-8 mb-3">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-1">When they push back</span>
          <h2 className="font-display text-3xl font-semibold tracking-tight">Handling objections</h2>
        </div>
        <div className="space-y-3">
          {OBJECTIONS.map((o, i) => (
            <details key={i} className="group bg-white border-2 border-[#161616] rounded-2xl shadow-[3px_3px_0_0_#161616] overflow-hidden">
              <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3 hover:bg-[#FFF8E6] transition-colors">
                <span className="font-sans font-bold text-[#161616] text-[15px]">{o.q}</span>
                <span className="text-[#F5B700] text-xl font-bold shrink-0 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-5 pb-5 pt-0">
                <p className="font-body text-[15px] text-[#3A3733] leading-relaxed italic">"{o.a}"</p>
              </div>
            </details>
          ))}
        </div>

        {/* After the call */}
        <Card className="mt-8">
          <Eyebrow>Close the loop</Eyebrow>
          <H>{AFTER_CALL.title}</H>
          <ul className="space-y-2 mt-3">
            {AFTER_CALL.items.map((it) => (
              <li key={it} className="text-[#3A3733] font-body text-sm flex gap-2.5 leading-relaxed"><span className="text-[#F5B700] mt-0.5">●</span>{it}</li>
            ))}
          </ul>
        </Card>

        {/* Do / Don't */}
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] overflow-hidden">
            <div className="bg-[#2D6A4F] px-5 py-2.5"><span className="text-[11px] uppercase tracking-[0.25em] font-sans font-bold text-white">Do</span></div>
            <ul className="p-5 space-y-2">
              {DO_LIST.map((d) => (
                <li key={d} className="text-[#3A3733] font-body text-sm flex gap-2 leading-relaxed"><span className="text-[#2D6A4F] mt-0.5">✓</span>{d}</li>
              ))}
            </ul>
          </div>
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] overflow-hidden">
            <div className="bg-[#9B3022] px-5 py-2.5"><span className="text-[11px] uppercase tracking-[0.25em] font-sans font-bold text-white">Don't</span></div>
            <ul className="p-5 space-y-2">
              {DONT_LIST.map((d) => (
                <li key={d} className="text-[#3A3733] font-body text-sm flex gap-2 leading-relaxed"><span className="text-[#9B3022] mt-0.5">✕</span>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 md:p-6 mb-4 ${className}`}>{children}</div>;
}
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-1">{children}</span>;
}
function H({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-2xl font-semibold text-[#161616]">{children}</h2>;
}
