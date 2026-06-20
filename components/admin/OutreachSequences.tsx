'use client';

import { useState } from 'react';
import { outreachSequences } from '@/data/outreach-sequences';

// Reusable outreach sequences (templates) for the admin Outreach page. Collapsed
// by default. Each touch has a copy button so Sarah can grab the DM or email,
// swap the {{tokens}}, and send. Separate from the per-prospect AI drafter above.

export default function OutreachSequences() {
  const [openSeq, setOpenSeq] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6 mb-8">
      <div className="flex items-center justify-between gap-4 mb-1">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">
          Outreach sequences
        </span>
        <span className="text-[9px] uppercase tracking-[0.15em] font-mono text-[#161616]/45">
          {outreachSequences.length} ready
        </span>
      </div>
      <p className="text-[#161616]/55 font-body text-xs mb-4">
        Proven multi-touch sequences. Copy a touch, swap the tokens, send. Personalize from real
        details, never blast.
      </p>

      <div className="space-y-3">
        {outreachSequences.map((seq) => {
          const isOpen = openSeq === seq.id;
          return (
            <div key={seq.id} className="border-2 border-[#161616]/15 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenSeq(isOpen ? null : seq.id)}
                className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-[#F5B700]/[0.06] transition-colors"
              >
                <div className="min-w-0">
                  <span className="text-[#161616] font-body font-semibold block">{seq.name}</span>
                  <span className="text-[#161616]/55 font-body text-xs block truncate">
                    {seq.touches.length} touches . {seq.audience}
                  </span>
                </div>
                <span className="text-[#161616]/45 text-xs flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-[#161616]/10 pt-4 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] uppercase tracking-[0.15em] font-mono text-[#161616]/45">Tokens:</span>
                    {seq.tokens.map((t) => (
                      <span key={t} className="text-[10px] font-mono text-[#1E50C8] bg-[#1E50C8]/10 border border-[#1E50C8]/25 rounded px-1.5 py-0.5">
                        {t}
                      </span>
                    ))}
                  </div>
                  <p className="text-[#161616]/55 font-body text-xs">
                    <span className="text-[#161616]/45">Goal:</span> {seq.goal}
                  </p>

                  {seq.touches.map((touch, idx) => {
                    const key = `${seq.id}-${idx}`;
                    const full = touch.subject ? `Subject: ${touch.subject}\n\n${touch.body}` : touch.body;
                    return (
                      <div key={key} className="bg-[#FBF6EA] border-2 border-[#161616]/15 rounded-xl p-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] uppercase tracking-[0.15em] font-mono font-bold px-2 py-0.5 rounded border ${touch.channel === 'Email' ? 'bg-[#1E50C8]/10 text-[#1E50C8] border-[#1E50C8]/30' : 'bg-[#F5B700]/20 text-[#161616] border-[#161616]/25'}`}>
                              {touch.channel}
                            </span>
                            <span className="text-[9px] uppercase tracking-[0.15em] font-mono text-[#161616]/50">
                              {touch.day === 0 ? 'Day 0' : `Day ${touch.day}`}
                            </span>
                          </div>
                          <button
                            onClick={() => copy(full, key)}
                            className="px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616] bg-white border-2 border-[#161616] shadow-[2px_2px_0_0_#161616] rounded-full hover:-translate-y-0.5 transition-all"
                          >
                            {copied === key ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        {touch.subject && (
                          <p className="text-[#161616] font-body text-sm font-semibold mb-1">{touch.subject}</p>
                        )}
                        <p className="text-[#3A3733] font-body text-sm leading-relaxed whitespace-pre-wrap">{touch.body}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
