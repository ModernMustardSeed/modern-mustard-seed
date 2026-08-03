'use client';

import { useEffect, useMemo, useState } from 'react';
import { smsHref, displayPhone, toAscii } from '@/lib/tap-text';

/**
 * The tap-to-text composer. Writes the text for you, then hands it to YOUR phone
 * to send. Nothing is transmitted by the server (see lib/tap-text.ts for why).
 *
 * The two surfaces behave differently on purpose, because their capabilities
 * genuinely differ rather than because we are guessing at a device:
 *
 *  - On a phone (coarse pointer), "Open in Messages" follows the `sms:` link into
 *    the native app with the number and body prefilled, and logs the touch on the
 *    way out, since tapping it means the text is about to go.
 *  - On a desktop, an `sms:` link does nothing useful, so "Copy the text" is the
 *    primary action and logging is an explicit button. We do not pretend to know
 *    whether a copied message was ever actually sent.
 *
 * `variant` matches the host surface: 'pop' for the pop-art Tracker (CallCard),
 * 'cockpit' for the Outbound dial floor.
 */

type Variant = 'pop' | 'cockpit';

const THEME: Record<Variant, {
  shell: string; label: string; meter: string; area: string;
  ghost: string; solid: string; go: string; dead: string; hint: string; ok: string;
}> = {
  pop: {
    shell: 'mt-3 rounded-xl border-2 border-[#161616] bg-[#FFFDF6] p-3',
    label: 'text-[10px] uppercase tracking-[0.18em] text-[#2D6A4F] font-mono font-bold',
    meter: 'text-[11px] font-mono text-[#161616]/45',
    area: 'w-full rounded-lg border-2 border-[#161616] px-3 py-2 text-sm font-body text-[#161616] bg-white focus:outline-none focus:ring-2 focus:ring-[#F5B700] disabled:bg-[#161616]/5',
    ghost: 'px-4 py-2 text-[10px] uppercase tracking-[0.15em] font-sans font-bold rounded-full border-2 transition-all disabled:opacity-40 bg-white text-[#161616] border-[#161616] hover:bg-[#FFF8E6]',
    solid: 'px-4 py-2 text-[10px] uppercase tracking-[0.15em] font-sans font-bold rounded-full border-2 transition-all disabled:opacity-40 bg-[#161616] text-[#FBF6EA] border-[#161616] hover:opacity-90',
    go: 'px-4 py-2 text-[10px] uppercase tracking-[0.15em] font-sans font-bold rounded-full border-2 transition-all disabled:opacity-40 bg-[#2D6A4F] text-white border-[#2D6A4F] hover:opacity-90',
    dead: 'px-4 py-2 text-[10px] uppercase tracking-[0.15em] font-sans font-bold rounded-full border-2 bg-[#161616]/10 text-[#161616]/40 border-[#161616]/20',
    hint: 'text-[#161616]/45 font-body text-[11px] mt-2',
    ok: 'text-[#2D6A4F] font-bold',
  },
  cockpit: {
    shell: 'mt-3 rounded-2xl border-2 border-[#1a1815]/15 bg-[#f7f3e9] p-3.5',
    label: 'text-[10px] uppercase tracking-[0.2em] text-[#3f5d34] font-oswald font-semibold',
    meter: 'text-[11px] font-sans text-[#1a1815]/45 tabular-nums',
    area: 'w-full rounded-xl border-2 border-[#1a1815]/20 px-3 py-2 text-sm font-sans text-[#1a1815] bg-white focus:outline-none focus:border-[#b58a2a] disabled:bg-[#1a1815]/5',
    ghost: 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 font-oswald font-semibold uppercase tracking-[0.08em] text-xs transition-all disabled:opacity-40 bg-white text-[#1a1815]/75 border-[#1a1815]/30 hover:border-[#1a1815]',
    solid: 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 font-oswald font-semibold uppercase tracking-[0.08em] text-xs transition-all disabled:opacity-40 bg-[#1a1815] text-[#b58a2a] border-[#1a1815] hover:-translate-y-0.5 shadow-[3px_3px_0_0_#b58a2a]',
    go: 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 font-oswald font-semibold uppercase tracking-[0.08em] text-xs transition-all disabled:opacity-40 bg-[#3f5d34] text-[#f7f3e9] border-[#1a1815] hover:-translate-y-0.5 shadow-[3px_3px_0_0_#1a1815]',
    dead: 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 font-oswald font-semibold uppercase tracking-[0.08em] text-xs bg-[#1a1815]/[0.06] text-[#1a1815]/35 border-[#1a1815]/15',
    hint: 'text-[#1a1815]/50 font-sans text-[11px] mt-2 leading-relaxed',
    ok: 'text-[#3f5d34] font-semibold',
  },
};

export default function TapText({
  phone,
  body,
  onBodyChange,
  onLogged,
  loading = false,
  note,
  variant = 'pop',
}: {
  phone: string | null;
  body: string;
  onBodyChange: (v: string) => void;
  /** Records the outbound message on the lead's thread. */
  onLogged: () => Promise<void> | void;
  loading?: boolean;
  note?: string;
  variant?: Variant;
}) {
  const t = THEME[variant];
  const [copied, setCopied] = useState(false);
  const [logged, setLogged] = useState(false);
  const [logging, setLogging] = useState(false);
  // Assume desktop until the media query resolves, so the copy path (which works
  // everywhere) is what renders during hydration.
  const [onPhone, setOnPhone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(pointer: coarse)');
    setOnPhone(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setOnPhone(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // A hand-edit invalidates the "already logged" state: the next send is a
  // different message and deserves its own row on the thread.
  useEffect(() => { setLogged(false); }, [body]);

  const href = useMemo(() => smsHref(phone, body), [phone, body]);
  const pretty = displayPhone(phone);

  const log = async () => {
    if (logging) return;
    setLogging(true);
    try {
      await onLogged();
      setLogged(true);
    } finally {
      setLogging(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked, the textarea is still selectable */ }
  };

  return (
    <div className={t.shell}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={t.label}>Text it from your phone</span>
        {pretty && <span className={t.meter}>{pretty}</span>}
      </div>

      <textarea
        value={body}
        onChange={(e) => onBodyChange(toAscii(e.target.value))}
        rows={4}
        aria-label="Text message body"
        placeholder={
          loading ? 'Writing a personalized draft...' : phone ? 'Write the text...' : 'No phone number on file for this lead.'
        }
        disabled={!phone}
        className={t.area}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
        {/* Char count only. Segment count is deliberately NOT shown: it mattered
            when Twilio billed per segment, and means nothing for a text leaving
            an unlimited personal plan. */}
        <span className={t.meter}>{body.length} chars</span>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={copy} disabled={!body.trim()} className={onPhone ? t.ghost : t.solid}>
            {copied ? 'Copied ✓' : 'Copy the text'}
          </button>

          {onPhone ? (
            href && body.trim() ? (
              <a href={href} onClick={log} className={t.go}>💬 Open in Messages</a>
            ) : (
              <span className={t.dead}>💬 Open in Messages</span>
            )
          ) : (
            <button onClick={log} disabled={!phone || !body.trim() || logging || logged} className={t.go}>
              {logged ? 'Logged ✓' : logging ? 'Logging...' : 'Mark as texted'}
            </button>
          )}
        </div>
      </div>

      <p className={t.hint}>
        {onPhone
          ? 'Opens your Messages app with the number and text already filled in. You still hit send.'
          : 'Copy it, then send from your iPhone. A text from your own phone needs no carrier registration, so it always goes through.'}
        {logged && <span className={t.ok}> Logged on their thread.</span>}
      </p>
      {note && <p className={t.hint}>{note}</p>}
    </div>
  );
}
