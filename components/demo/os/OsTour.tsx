'use client';

import { useEffect, useState } from 'react';
import { useOs } from './os-kit';

/**
 * ONBOARDING TOUR: a guided first-run walkthrough of the OS demo, so a prospect
 * knows exactly what they are looking at in 30 seconds. Each step switches the
 * underlying tab (via onGoTo) and explains it in one line, from a card anchored
 * at the bottom so the real module stays visible behind it. Skippable, and
 * replayable from the header. Shown once per demo (localStorage), never on
 * reduced-motion first paint.
 */

export type TourStep = { tab: string; eyebrow: string; title: string; body: string };

export default function OsTour({ onGoTo, onClose }: { onGoTo: (tab: string) => void; onClose: () => void }) {
  const { config, preset, theme } = useOs();
  const first = config.ownerFirst ? `, ${config.ownerFirst}` : '';

  const STEPS: TourStep[] = [
    { tab: 'today', eyebrow: 'Welcome', title: `This is ${config.business}'s command center`, body: `Everything it takes to run the business, in one place. Take 30 seconds${first} and I will show you what lives where.` },
    { tab: 'today', eyebrow: '1 · Today', title: 'Your day, already sorted', body: `While you slept, your AI receptionist answered the calls and filed them. This is what is waiting, in order.` },
    { tab: 'calendar', eyebrow: '2 · Calendar', title: 'One calendar, filled for you', body: `Your receptionist, your website, and you all book into the same place. No double-bookings, and you barely touch it.` },
    { tab: 'quotes', eyebrow: '3 · Quotes', title: 'Send a quote, get it signed', body: `Build a ${preset.jobWord} quote from your price book and send it in your brand. They sign it on their phone and it books itself.` },
    { tab: 'leadgen', eyebrow: '4 · Growth', title: 'We keep you busy', body: `Lead gen captures everyone who raises a hand and answers in seconds; Campaigns and Reviews bring more back, on autopilot.` },
    { tab: 'assistant', eyebrow: '5 · Your assistant', title: 'Ask it anything', body: `It can see the whole board. Ask about your day, draft a text, or tell it what you need. That is the tour, have a look around.` },
  ];

  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  // Drive the underlying tab as the tour advances.
  useEffect(() => { onGoTo(step.tab); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => { if (last) { onGoTo('today'); onClose(); } else setI((n) => n + 1); };

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center sm:justify-center p-3 sm:p-6 pointer-events-none">
      <div className="absolute inset-0 pointer-events-auto" style={{ background: 'rgba(2,4,10,0.35)' }} onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md rounded-2xl border-2 shadow-2xl p-5 pointer-events-auto animate-[osSlide_.35s_cubic-bezier(.2,.9,.3,1.1)_both]"
        style={{ background: theme.panel, borderColor: theme.accent }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.24em] font-bold" style={{ color: theme.accent }}>{step.eyebrow}</span>
          <button onClick={onClose} className="text-[10px] uppercase tracking-[0.16em] font-bold" style={{ color: theme.dim }}>Skip tour</button>
        </div>
        <h3 className="text-[19px] font-bold leading-tight mt-1.5" style={{ color: theme.text }}>{step.title}</h3>
        <p className="text-[13.5px] leading-relaxed mt-1.5" style={{ color: theme.dim }}>{step.body}</p>

        <div className="flex items-center gap-3 mt-4">
          <div className="flex items-center gap-1.5 flex-1">
            {STEPS.map((_, k) => (
              <span key={k} className="h-1.5 rounded-full transition-all" style={{ width: k === i ? 18 : 6, background: k <= i ? theme.accent : theme.line }} />
            ))}
          </div>
          <button
            onClick={next}
            className="rounded-xl px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] transition-transform hover:-translate-y-0.5"
            style={{ background: theme.accent, color: theme.accentInk }}
          >
            {last ? 'Explore it' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
