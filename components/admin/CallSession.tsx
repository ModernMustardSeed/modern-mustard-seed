'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Prospect, ProspectStatus } from '@/lib/prospects';
import { buildLeadScript } from '@/lib/lead-script';

/**
 * The WOW: a focused power-dialer. One lead at a time, full screen, with the
 * personalized script, tap-to-dial, one-tap outcome buttons that auto-advance,
 * keyboard shortcuts, live session stats, and a confetti celebration when a demo
 * gets booked. Turns the tracker from a list into a guided calling session.
 *
 * Cut-off-safe: a height-locked flex column (header + scrolling middle + pinned
 * action bar), so nothing ever clips on a short screen.
 */

const CONFETTI_COLORS = ['#F5B700', '#E0301E', '#1E50C8', '#2D6A4F', '#FF6B35', '#161616'];

export default function CallSession({
  leads,
  repName,
  bookDisplay,
  onStatus,
  onClose,
}: {
  leads: Prospect[];
  repName: string;
  bookDisplay: string;
  onStatus: (id: string, status: ProspectStatus) => void;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [dialed, setDialed] = useState(0);
  const [booked, setBooked] = useState(0);
  const [celebrate, setCelebrate] = useState(false);

  const total = leads.length;
  const done = idx >= total;
  const lead = done ? null : leads[idx];

  const advance = useCallback(() => setIdx((i) => i + 1), []);

  const outcome = useCallback(
    (status: ProspectStatus) => {
      const cur = leads[idx];
      if (!cur) return;
      onStatus(cur.id, status);
      if (status !== 'to-contact') setDialed((d) => d + 1);
      if (status === 'booked') {
        setBooked((b) => b + 1);
        setCelebrate(true);
        setTimeout(() => { setCelebrate(false); advance(); }, 1200);
      } else {
        advance();
      }
    },
    [leads, idx, onStatus, advance]
  );

  // Keyboard shortcuts: dial and deliver without the mouse.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose();
      if (celebrate || done) return;
      const k = e.key.toLowerCase();
      if (k === 'b') outcome('booked');
      else if (k === 'm') outcome('contacted');
      else if (k === 'x') outcome('not-interested');
      else if (k === 's' || e.key === 'ArrowRight') advance();
      else if (k === 'c') {
        const cur = leads[idx];
        if (cur?.phone) window.location.href = `tel:${cur.phone.replace(/[^0-9+]/g, '')}`;
      }
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [outcome, advance, onClose, celebrate, done, leads, idx]);

  const script = lead ? buildLeadScript(lead, repName, bookDisplay) : null;
  const telHref = lead?.phone ? `tel:${lead.phone.replace(/[^0-9+]/g, '')}` : null;
  const pct = total ? Math.round((Math.min(idx, total) / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[130] flex flex-col bg-[#FBF6EA] animate-fade-in">
      <style>{`@keyframes csFall{0%{transform:translateY(-15vh) rotate(0);opacity:1}100%{transform:translateY(85vh) rotate(680deg);opacity:0}}`}</style>

      {/* Top bar */}
      <header className="shrink-0 border-b-2 border-[#161616] bg-[#FBF6EA] px-5 md:px-8 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="text-[9px] uppercase tracking-[0.35em] text-[#E0301E] font-mono font-bold block">Call session</span>
          <p className="font-sans text-sm font-bold text-[#161616]">{done ? 'Session complete' : `Lead ${idx + 1} of ${total}`}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono">
            <span className="text-[#161616]/60">{dialed} dialed</span>
            <span className="text-[#2D6A4F] font-bold">{booked} booked</span>
          </div>
          <button onClick={onClose} className="px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-sans font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all">Exit</button>
        </div>
      </header>
      {/* Progress bar */}
      <div className="shrink-0 h-1.5 bg-[#161616]/10">
        <div className="h-full bg-[#F5B700] transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>

      {/* Body */}
      {done ? (
        <div className="grow flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">🌱</div>
            <h2 className="font-display text-4xl font-bold text-[#161616] mb-3">Session complete</h2>
            <p className="text-[#3A3733] font-body text-lg mb-2">You dialed <strong>{dialed}</strong> and booked <strong className="text-[#2D6A4F]">{booked}</strong> {booked === 1 ? 'demo' : 'demos'}.</p>
            <p className="text-[#161616]/55 font-body text-sm mb-8">{booked > 0 ? 'That is real pipeline. Nicely done.' : 'Every no gets you closer. Come back and run another set.'}</p>
            <button onClick={onClose} className="px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all">Back to the tracker</button>
          </div>
        </div>
      ) : (
        <div className="grow overflow-y-auto">
          <div className="max-w-2xl mx-auto px-5 md:px-8 py-6">
            {/* Lead + dial */}
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block">{lead!.city ?? ''}{script!.category ? ' · ' + script!.category : ''}</span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-[#161616] tracking-tight leading-[1.05] mt-1 mb-4">{lead!.business}</h1>
            {telHref ? (
              <a href={telHref} className="inline-flex items-center gap-2 px-7 py-4 text-lg font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all">📞 Call {lead!.phone}</a>
            ) : (
              <p className="text-[#161616]/55 font-body text-sm italic">No phone on file{lead!.notes?.includes('Email:') ? ' — use the email in the notes.' : ' — look it up on Google Maps.'}</p>
            )}

            <p className="text-[#161616]/50 font-body text-xs mt-5 mb-3">Read it top to bottom. Pause and let them answer. You are just booking a quick demo.</p>

            {/* Script */}
            <div className="space-y-2.5">
              {script!.steps.map((step, i) => (
                <div key={i} className="bg-white border-2 border-[#161616] rounded-xl p-4">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[#E0301E] font-mono font-bold flex items-center gap-2 mb-1.5"><span className="font-display text-base text-[#F5B700]">{i + 1}</span>{step.label}</span>
                  <p className="font-body text-[16px] leading-relaxed text-[#161616]">{step.line}</p>
                </div>
              ))}
              <div className="bg-[#FFF8E6] border-2 border-[#161616] rounded-xl p-4">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[#E0301E] font-mono font-bold block mb-1.5">If you get voicemail</span>
                <p className="font-body text-[15px] leading-relaxed text-[#161616] italic">{script!.voicemail}</p>
              </div>
              <details className="group bg-white border-2 border-[#161616] rounded-xl overflow-hidden">
                <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between hover:bg-[#FFF8E6]">
                  <span className="text-[11px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616]">If they push back</span>
                  <span className="text-[#F5B700] text-xl font-bold group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-4 pb-4 space-y-3">
                  {script!.objections.map((o, i) => (
                    <div key={i}>
                      <p className="font-sans font-bold text-sm text-[#161616]">{o.q}</p>
                      <p className="font-body text-sm text-[#3A3733] leading-relaxed italic">"{o.a}"</p>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Pinned outcome bar */}
      {!done && (
        <footer className="shrink-0 border-t-2 border-[#161616] bg-[#FBF6EA] px-5 md:px-8 py-3">
          <div className="max-w-2xl mx-auto flex flex-wrap items-center gap-2">
            <button onClick={() => outcome('booked')} className="flex-1 min-w-[130px] px-4 py-3 text-[11px] uppercase tracking-[0.18em] font-sans font-extrabold text-white bg-[#2D6A4F] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all">Booked a demo <span className="opacity-60 font-mono">B</span></button>
            <button onClick={() => outcome('contacted')} className="px-4 py-3 text-[11px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all">Talked <span className="opacity-40 font-mono">M</span></button>
            <button onClick={() => outcome('not-interested')} className="px-4 py-3 text-[11px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all">No <span className="opacity-40 font-mono">X</span></button>
            <button onClick={advance} className="px-4 py-3 text-[11px] uppercase tracking-[0.15em] font-sans font-bold text-[#161616]/60 hover:text-[#161616] transition-all">Skip <span className="opacity-40 font-mono">S</span></button>
          </div>
          <p className="max-w-2xl mx-auto text-[10px] text-[#161616]/40 font-mono mt-1.5 hidden sm:block">Shortcuts: C call · B booked · M talked · X no · S skip · Esc exit</p>
        </footer>
      )}

      {/* Celebration */}
      {celebrate && (
        <div className="fixed inset-0 z-[140] pointer-events-none overflow-hidden">
          {Array.from({ length: 44 }).map((_, i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 0.25;
            const dur = 1.3 + Math.random() * 1;
            const sz = 7 + Math.random() * 9;
            const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
            return (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  top: 0,
                  width: sz,
                  height: sz * 0.6,
                  background: color,
                  borderRadius: 2,
                  animation: `csFall ${dur}s linear ${delay}s forwards`,
                }}
              />
            );
          })}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-[#161616] text-[#FBF6EA] rounded-2xl px-8 py-5 shadow-[6px_6px_0_0_#F5B700] animate-pop-in text-center">
              <p className="text-3xl mb-1">🎉</p>
              <p className="font-display text-2xl font-bold">Booked it!</p>
              <p className="font-body text-sm text-[#FBF6EA]/70">On to the next one.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
