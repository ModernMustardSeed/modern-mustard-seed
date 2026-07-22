'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * First-login welcome tour for the team-partners (Sarah, Polly, Easton, Anthony,
 * and anyone added after). Everyone on the team is BOTH a partner (they earn on
 * what they refer) and an operator (they call, post, and book for us), so the
 * tour points at the handful of places that matter: the dial floor, their
 * partner earnings, the ads to post, and the academy that trains the rest.
 *
 * Shows once per person (keyed by email in localStorage), for every role. Owners
 * can skip in one tap. Pop-art cabin brand tokens, inline-styled so it renders
 * correctly the instant the admin shell mounts.
 */

const INK = '#161616';
const CREAM = '#FBF6EA';
const GOLD = '#F5B700';
const RED = '#E0301E';
const BLUE = '#1E50C8';
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const SANS = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace";

/** Fired to re-open the tour from the top. WelcomeTour is mounted in the admin
 *  layout, so a "Replay tour" link on any admin page can dispatch this. */
export const WELCOME_TOUR_EVENT = 'mms:welcome-tour:open';

/** Re-open the welcome tour from anywhere in the admin. */
export function openWelcomeTour() {
  try {
    window.dispatchEvent(new Event(WELCOME_TOUR_EVENT));
  } catch {
    /* no window (SSR): nothing to open */
  }
}

export default function WelcomeTour({ name, email }: { name: string; email: string; role?: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const first = (name || 'there').trim().split(/\s+/)[0];
  const key = `mms_welcome_dismissed_${(email || '').toLowerCase()}`;

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(key)) setOpen(true);
    } catch {}
  }, [key]);

  // A "Replay tour" link anywhere in the admin re-opens it from the first step.
  useEffect(() => {
    const reopen = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(WELCOME_TOUR_EVENT, reopen);
    return () => window.removeEventListener(WELCOME_TOUR_EVENT, reopen);
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(key, new Date().toISOString());
    } catch {}
    setOpen(false);
  };

  if (!open) return null;

  const steps = [
    {
      badge: '🌱 Welcome to the family',
      title: `Hey ${first}, welcome to the Mustard family.`,
      body: 'You are a Modern Mustard Seed partner and part of the team now. That means you get to learn and earn: call for us, post for us, and bring us deals, and you earn on everything you refer. This 30-second tour shows you where the important things live.',
    },
    {
      badge: 'Your dial floor',
      title: 'Outbound is where the work happens.',
      body: 'On your admin home, use the gold "Jump to" row and tap Outbound. That is your dial floor: your leads, the exact words to say on screen, one-tap outcome buttons, and a way to book a demo or a call. No quotas, just friendly calls when you have time.',
    },
    {
      badge: 'How you earn',
      title: 'Your partner code pays you, forever.',
      body: 'You earn on everything you send us: 50% on every product, 25% of the monthly bill for a year on any business you put on an AI receptionist, and 10 to 20% on custom builds. Open Partner Hub in the top bar: your code, your link, your earnings, and every teammate’s code live there.',
    },
    {
      badge: 'Post for us',
      title: 'Ready-made ads, yours to share.',
      body: 'Partner Hub has ready-to-post copy for every offer with your link already in it, plus the Mr. Mustard commercials under Ads Playbook. Copy, lightly reword so it sounds like you, and post. A post with your link can turn into a check.',
    },
    {
      badge: 'Everything else',
      title: 'Your academy and a helper on every page.',
      body: 'The Onboarding academy trains you step by step and ranks you up as you go. The real work runs out of two rooms: Outbound, where you start the conversations, and Delivery, where a yes turns into a built, handed-off client. Inbox and Campaigns are there to back you up, Inbox for the replies that come in and Campaigns for the follow-up. And Mr. Mustard is on every page to help: the "Ask Mr. Mustard" chat answers in writing, and the gold "Talk to Mr. Mustard" button in the bottom-right is a live voice line that knows the whole operation and can even email you (or a lead) a link on the spot. One rule on calls: business lines only, and if anyone asks you to stop, thank them and mark "Not interested."',
    },
  ];

  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
      onClick={dismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(22,22,22,0.55)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 470,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: CREAM,
          color: INK,
          border: `2px solid ${INK}`,
          borderRadius: 18,
          boxShadow: `7px 7px 0 ${INK}`,
          padding: '28px 26px 22px',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            fontFamily: MONO,
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            fontSize: 11,
            fontWeight: 700,
            color: INK,
            background: GOLD,
            border: `2px solid ${INK}`,
            borderRadius: 999,
            padding: '4px 12px',
            marginBottom: 16,
          }}
        >
          {s.badge}
        </div>
        <h2 style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1.14, margin: '0 0 12px', fontWeight: 700 }}>
          {s.title}
        </h2>
        <p style={{ fontFamily: SANS, fontSize: 15.5, lineHeight: 1.62, margin: 0, color: '#3A3733' }}>
          {s.body}
        </p>

        <div style={{ display: 'flex', gap: 6, margin: '22px 0 18px' }}>
          {steps.map((_, i) => (
            <span
              key={i}
              style={{
                height: 5,
                flex: 1,
                borderRadius: 999,
                background: i <= step ? RED : 'rgba(22,22,22,0.14)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={dismiss}
            style={{
              fontFamily: MONO,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontSize: 12,
              background: 'transparent',
              border: 'none',
              color: 'rgba(22,22,22,0.55)',
              cursor: 'pointer',
              padding: '8px 4px',
            }}
          >
            Skip
          </button>

          {last ? (
            <Link
              href="/admin/onboarding"
              onClick={dismiss}
              style={{
                fontFamily: MONO,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontSize: 13,
                fontWeight: 700,
                background: GOLD,
                color: INK,
                border: `2px solid ${INK}`,
                borderRadius: 12,
                padding: '11px 20px',
                textDecoration: 'none',
                boxShadow: `3px 3px 0 ${INK}`,
              }}
            >
              Start my onboarding →
            </Link>
          ) : (
            <button
              onClick={() => setStep((x) => x + 1)}
              style={{
                fontFamily: MONO,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontSize: 13,
                fontWeight: 700,
                background: INK,
                color: CREAM,
                border: `2px solid ${INK}`,
                borderRadius: 12,
                padding: '11px 22px',
                cursor: 'pointer',
                boxShadow: `3px 3px 0 ${GOLD}`,
              }}
            >
              Next
            </button>
          )}
        </div>

        {step === 0 && (
          <p style={{ fontFamily: SANS, fontSize: 12, color: 'rgba(22,22,22,0.45)', margin: '14px 0 0', textAlign: 'center' }}>
            You can reopen this anytime from <Link href="/admin/onboarding" style={{ color: BLUE, fontWeight: 600 }}>Onboarding</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
