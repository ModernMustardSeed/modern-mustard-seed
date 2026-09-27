'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { trackLead, metaDedup } from '@/lib/analytics';
import s from './InquiryPopup.module.css';

/**
 * "What are you building?" After fifteen seconds on the site (counted across
 * pages, per visit) a small graffiti card asks the visitor what they are
 * building. It posts to /api/contact like the /inquire form, so it lands as a
 * lead in the admin and in Sarah's inbox (Sarah, 2026-09-26).
 *
 * Never on a page that is already an ask (/inquire, /contact, /book) or on the
 * app shells, shown once a visit, and not again for 21 days after a dismissal
 * or ever after a send.
 */

const DELAY_MS = 15000;
const START_KEY = 'mms-ask-start';
const SEEN_KEY = 'mms-ask-seen';
const SNOOZE_DAYS = 21;
const SKIP = ['/inquire', '/contact', '/book', '/intake', '/presence-audit', '/demos', '/proposal', '/sample-proposal', '/pay', '/store', '/welcome', '/r/', '/audit/', '/s/'];

function read(k: string, store: 'local' | 'session') {
  try { return (store === 'local' ? localStorage : sessionStorage).getItem(k); } catch { return null; }
}
function write(k: string, v: string, store: 'local' | 'session') {
  try { (store === 'local' ? localStorage : sessionStorage).setItem(k, v); } catch { /* private mode */ }
}

type Phase = 'form' | 'sending' | 'done';

export default function InquiryPopup() {
  const path = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState('');
  const [v, setV] = useState({ building: '', name: '', email: '', phone: '' });
  const first = useRef<HTMLTextAreaElement | null>(null);
  const dialog = useRef<HTMLDivElement | null>(null);
  const skipped = SKIP.some((p) => path === p || path.startsWith(p.endsWith('/') ? p : p + '/'));

  useEffect(() => {
    if (skipped || open) return;
    const seen = read(SEEN_KEY, 'local');
    if (seen === 'sent') return;
    if (seen && Date.now() - Number(seen) < SNOOZE_DAYS * 864e5) return;
    let start = Number(read(START_KEY, 'session'));
    if (!start) { start = Date.now(); write(START_KEY, String(start), 'session'); }
    const wait = Math.max(0, start + DELAY_MS - Date.now());
    const t = window.setTimeout(() => {
      // Never stack on top of another open dialog (a demo intake, the talk panel).
      // (The closed site menu is a hidden aria-modal dialog; it does not count.)
      const openDialog = [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')]
        .some((d) => !d.hidden && d.getAttribute('aria-hidden') !== 'true' && d.getClientRects().length > 0);
      if (openDialog) return;
      setOpen(true);
    }, wait);
    return () => window.clearTimeout(t);
  }, [path, skipped, open]);

  function close() {
    setOpen(false);
    if (phase !== 'done') write(SEEN_KEY, String(Date.now()), 'local');
  }

  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'sending') close();
      if (e.key !== 'Tab' || !dialog.current) return;
      const items = dialog.current.querySelectorAll<HTMLElement>('button, input, textarea, a[href]');
      if (!items.length) return;
      const a = items[0], z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase]);


  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phase === 'sending') return;
    setPhase('sending'); setError('');
    const message = [
      v.building.trim(),
      '',
      '---',
      'Asked on the site: What are you building?',
      `Page: ${path}`,
      `Phone: ${v.phone.trim() || 'Not given'}`,
    ].join('\n');
    try {
      const dedup = metaDedup();
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), message, source: 'inquiry-popup', ...dedup }),
      });
      if (!res.ok) throw new Error('bad');
      trackLead({ source: 'inquiry-popup', eventId: dedup.metaEventId });
      write(SEEN_KEY, 'sent', 'local');
      setPhase('done');
    } catch {
      setPhase('form');
      setError('That did not go through. Try again, or email sarah@modernmustardseed.com.');
    }
  };

  if (!open) return null;
  return (
    <div className={s.overlay} onClick={(e) => { if (e.target === e.currentTarget && phase !== 'sending') close(); }}>
      <div ref={dialog} className={s.card} role="dialog" aria-modal="true" aria-labelledby="ask-title">
        <div className={s.head}>
          <p className={s.tag}>Quick question</p>
          <h2 id="ask-title" className={s.title}>What are you <em>building?</em></h2>
          <button type="button" className={s.x} onClick={close} disabled={phase === 'sending'} aria-label="Close">×</button>
        </div>
        <div className={s.body}>
          {phase === 'done' ? (
            <div className={s.done} role="status">
              <p className={s.doneBig}>Got it. It is with Sarah.</p>
              <p>She reads every one herself and replies inside one business day.</p>
              <button type="button" className={s.send} onClick={() => setOpen(false)}>Keep looking around <span aria-hidden="true">↗</span></button>
            </div>
          ) : (
            <form onSubmit={send} className={s.form}>
              <p className={s.lead}>A website, an app, a voice agent, something with no name yet. Tell us in a sentence or two and Sarah will write back herself.</p>
              <label className={s.field}>
                <span>What are you building?</span>
                <textarea ref={first} required rows={3} value={v.building} onChange={set('building')} placeholder="A booking site for my salon, an app for my crew, a voice agent for after hours..." />
              </label>
              <div className={s.row}>
                <label className={s.field}><span>Your name</span><input required value={v.name} onChange={set('name')} autoComplete="name" /></label>
                <label className={s.field}><span>Email</span><input required type="email" value={v.email} onChange={set('email')} autoComplete="email" /></label>
              </div>
              <label className={s.field}><span>Phone <i>(optional)</i></span><input type="tel" value={v.phone} onChange={set('phone')} autoComplete="tel" /></label>
              {error && <p className={s.error} role="alert">{error}</p>}
              <button type="submit" className={s.send} disabled={phase === 'sending'}>{phase === 'sending' ? 'Sending…' : 'Send it to Sarah'} <span aria-hidden="true">↗</span></button>
              <button type="button" className={s.later} onClick={close}>Just looking for now</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
