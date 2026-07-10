'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * A gentle first-login tour for a part-time caller (role 'staff'), so they land,
 * find Outbound, and start dialing without being overwhelmed by the whole admin.
 * Owners never see it. Keyed by email in localStorage, so it shows once.
 */
export default function WelcomeTour({ name, email, role }: { name: string; email: string; role: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const first = (name || 'there').trim().split(/\s+/)[0];
  const key = `mms_welcome_dismissed_${(email || '').toLowerCase()}`;

  useEffect(() => {
    if (role !== 'staff') return; // owners (Sarah, Polly, Chloe) don't get the tour
    try {
      if (!window.localStorage.getItem(key)) setOpen(true);
    } catch {}
  }, [role, key]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(key, new Date().toISOString());
    } catch {}
    setOpen(false);
  };

  if (!open) return null;

  const steps = [
    {
      badge: '🌱 Welcome',
      title: `Hey ${first}, welcome to the team.`,
      body: 'This is your Modern Mustard Seed home base. You are here to make friendly calls to local businesses whenever you have some free time. No quotas, no pressure. This quick tour takes 20 seconds.',
    },
    {
      badge: 'Step 1',
      title: 'Your one spot: Outbound.',
      body: 'In the top menu, open the "Sales" group and click Outbound. That is your dial floor, the only page you really need. Everything for calling lives there.',
    },
    {
      badge: 'Step 2',
      title: 'Your 200 Kansas City leads are loaded.',
      body: 'They are all local KC businesses, picked just for you. Tap a phone number to call, open with "Hi, I am Easton, I am local here in Kansas City," then tap one outcome button (Convo, Callback, No answer). The words to say are right on the screen. Just read them.',
    },
    {
      badge: 'Step 3',
      title: 'Two helpers, then you are set.',
      body: 'The gold "Ask Mr. Mustard" button (bottom right of any page) answers any question, any time. The Training tab has simple tips if you want them. One rule: call business lines only, and if anyone asks you to stop, thank them and mark "Not interested." That is it.',
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
        background: 'rgba(26,24,21,0.55)',
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
          maxWidth: 460,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#f7f3e9',
          color: '#1a1815',
          border: '2px solid #1a1815',
          borderRadius: 18,
          boxShadow: '6px 6px 0 #1a1815',
          padding: '28px 26px 22px',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            fontFamily: 'Oswald, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            fontSize: 12,
            fontWeight: 600,
            color: '#7a5c1a',
            background: '#b58a2a22',
            border: '1px solid #b58a2a66',
            borderRadius: 999,
            padding: '4px 12px',
            marginBottom: 14,
          }}
        >
          {s.badge}
        </div>
        <h2 style={{ fontFamily: 'Oswald, sans-serif', fontSize: 25, lineHeight: 1.15, margin: '0 0 12px', fontWeight: 600 }}>
          {s.title}
        </h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15.5, lineHeight: 1.6, margin: 0, color: '#1a1815cc' }}>
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
                background: i <= step ? '#3f5d34' : '#1a181522',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={dismiss}
            style={{
              fontFamily: 'Oswald, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontSize: 12.5,
              background: 'transparent',
              border: 'none',
              color: '#1a181588',
              cursor: 'pointer',
              padding: '8px 4px',
            }}
          >
            Skip
          </button>

          {last ? (
            <Link
              href="/admin/outbound"
              onClick={dismiss}
              style={{
                fontFamily: 'Oswald, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontSize: 14,
                fontWeight: 600,
                background: '#b58a2a',
                color: '#1a1815',
                border: '2px solid #1a1815',
                borderRadius: 12,
                padding: '11px 20px',
                textDecoration: 'none',
                boxShadow: '3px 3px 0 #1a1815',
              }}
            >
              Take me to Outbound →
            </Link>
          ) : (
            <button
              onClick={() => setStep((x) => x + 1)}
              style={{
                fontFamily: 'Oswald, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontSize: 14,
                fontWeight: 600,
                background: '#1a1815',
                color: '#f7f3e9',
                border: '2px solid #1a1815',
                borderRadius: 12,
                padding: '11px 22px',
                cursor: 'pointer',
                boxShadow: '3px 3px 0 #b58a2a',
              }}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
