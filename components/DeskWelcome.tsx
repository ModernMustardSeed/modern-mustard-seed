'use client';

import { useEffect, useState } from 'react';

/**
 * Brief first-visit welcome for the client portal and the partner dashboard.
 *
 * Two short cards that orient a new person, and the last card always points at
 * the same thing: if you get stuck, just ask Mr. Mustard. He is on every one of
 * these surfaces as a live voice line (the gold "Talk to Mr. Mustard" button in
 * the corner) and he can even email you a link on the spot. The admin shell has
 * its own richer WelcomeTour; this is the lighter-weight sibling for the two
 * outside-facing portals that had no onboarding of their own.
 *
 * Shows once per person, keyed by email in localStorage. Modal is built as a
 * height-capped flex column so it never clips its top on a short screen.
 */

const INK = '#161616';
const CREAM = '#FBF6EA';
const GOLD = '#F5B700';
const RED = '#E0301E';

type Step = { badge: string; title: string; body: string };

function stepsFor(surface: 'client' | 'partner', first: string): Step[] {
  if (surface === 'partner') {
    return [
      {
        badge: '🌱 Welcome',
        title: `Welcome, ${first}.`,
        body:
          'This is your partner dashboard. Your promo kit, your links, the forge, and your earnings all live on this one page. Share what you believe in and you earn on everything you send our way.',
      },
      {
        badge: 'Stuck? Just ask',
        title: 'Mr. Mustard keeps your books.',
        body:
          'Any time you want clarity, ask Mr. Mustard. Tap the gold "Talk to Mr. Mustard" button in the corner and just ask him anything: your links, your earnings, or your next best move. He can even email you your referral links on the spot, already carrying your code.',
      },
    ];
  }
  return [
    {
      badge: '🌱 Welcome',
      title: `Welcome in, ${first}.`,
      body:
        'This is your home base with Modern Mustard Seed. Your project status, files, billing, and edits all live on this one page, and everything here is private to you. Have a look around.',
    },
    {
      badge: 'Stuck? Just ask',
      title: 'Mr. Mustard is right here to help.',
      body:
        'Whenever you are unsure or need something, ask Mr. Mustard. The guide on the right answers in writing, and the gold "Talk to Mr. Mustard" button in the corner is a real voice line. He can walk you through anything, pass a note to Sarah, and even email you a link on the spot.',
    },
  ];
}

export default function DeskWelcome({
  surface,
  name,
  email,
}: {
  surface: 'client' | 'partner';
  name?: string | null;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const first = (name || email.split('@')[0] || 'there').trim().split(/\s+/)[0];
  const key = `mms_desk_welcome_${surface}_${(email || '').toLowerCase()}`;

  useEffect(() => {
    try {
      if (email && !window.localStorage.getItem(key)) setOpen(true);
    } catch {
      /* storage blocked */
    }
  }, [key, email]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(key, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  const steps = stepsFor(surface, first);
  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome"
      onClick={dismiss}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(22,22,22,0.55)', backdropFilter: 'blur(2px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] max-h-[90vh] flex flex-col overflow-hidden rounded-[18px]"
        style={{ background: CREAM, color: INK, border: `2px solid ${INK}`, boxShadow: `7px 7px 0 ${INK}` }}
      >
        <div className="overflow-y-auto px-6 pt-7 pb-5 sm:px-7">
          <span
            className="inline-block font-mono uppercase tracking-[0.16em] text-[11px] font-bold rounded-full px-3 py-1 mb-4"
            style={{ color: INK, background: GOLD, border: `2px solid ${INK}` }}
          >
            {s.badge}
          </span>
          <h2 className="font-display font-bold leading-[1.14] text-[25px] mb-3" style={{ color: INK }}>
            {s.title}
          </h2>
          <p className="font-body text-[15.5px] leading-[1.62]" style={{ color: '#3A3733' }}>
            {s.body}
          </p>

          <div className="flex gap-1.5 mt-6 mb-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className="h-[5px] flex-1 rounded-full transition-colors"
                style={{ background: i <= step ? RED : 'rgba(22,22,22,0.14)' }}
              />
            ))}
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 sm:px-7 border-t-2" style={{ borderColor: 'rgba(22,22,22,0.1)' }}>
          <button
            onClick={dismiss}
            className="font-mono uppercase tracking-[0.08em] text-[12px] px-1 py-2"
            style={{ color: 'rgba(22,22,22,0.55)' }}
          >
            Skip
          </button>
          {last ? (
            <button
              onClick={dismiss}
              className="font-mono uppercase tracking-[0.08em] text-[13px] font-bold rounded-[12px] px-6 py-3"
              style={{ background: GOLD, color: INK, border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}` }}
            >
              Got it, thanks
            </button>
          ) : (
            <button
              onClick={() => setStep((x) => x + 1)}
              className="font-mono uppercase tracking-[0.08em] text-[13px] font-bold rounded-[12px] px-6 py-3"
              style={{ background: INK, color: CREAM, border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${GOLD}` }}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
